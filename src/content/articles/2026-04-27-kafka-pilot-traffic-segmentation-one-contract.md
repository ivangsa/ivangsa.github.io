---
title: "Traffic segmentation across REST and Kafka: one contract for canary, pilot, and blue/green"
summary: HTTP pilots work because a gateway intercepts traffic before it reaches services. Kafka has no such proxy. This post explains how to design a single filtering contract (production traffic never carries x-traffic-segment) that covers canary deployments, segmented business pilots, and blue/green strategies across REST and Kafka without changing application code.
date: 2026-04-27
tags:
  - Kafka
  - EDA
  - AsyncAPI
  - Spring Boot
  - Architecture
featured: false
featuredImage: assets/articles/2026-04-27-pilot-aware-architecture-experimental-traffic-eda/pilot-aware-architecture.png
featuredImageAlt: "Traffic segmentation across REST and Kafka: one contract for canary, pilot, and blue/green"
readingTime: "12 min read"

draft: true
---

*Part 1 of 3: pilot-aware architecture in event-driven systems. Companion posts: [Part 2: why the header family looks like this](/articles/2026-05-04-designing-header-family-traffic-segmentation) Â· [Part 3: how propagation works across Kafka](/articles/2026-05-04-micrometer-baggage-kafka-pilot-context-propagation).*

---

There are two situations where piloting in an event-driven architecture is relatively straightforward. The first is when the component being piloted sits at the very edge: it receives external requests and the pilot ends there. Configure a routing rule at the gateway, direct a percentage of traffic to the new version, and you are done. No downstream services are involved. The second is when you build a full pilot lane: a dedicated shadow infrastructure where every component, from the first producer to the final consumer, is a pilot version deliberately separated from production. Expensive, but self-contained.

Both of these are real strategies. Both are also edge cases.

The architecture you actually operate in is neither of them. In practice, a pilot sits somewhere in a chain. The services upstream from the component being piloted were built before this pilot existed and have no concept of it. The services downstream are shared infrastructure that cannot be redeployed for every initiative. Some components are pilot-agnostic by necessity, others by choice, others simply because nobody thought to configure them. And further downstream, another team may be running their own separate pilot on a different component in the same flow.

The pilot context has to enter at the edge, travel through services that know nothing about it, reach the component being piloted, and continue propagating downstream, because the effects of the pilot span the whole chain, not just the one service. A segment of experimental traffic that reaches the wrong consumer is worse than no pilot at all: it corrupts production state, produces misleading metrics, and does so silently.

This mechanism is for that case: piloting in a mixed architecture, where pilot-aware and pilot-agnostic components coexist on the same event flows and the context has to survive the entire journey without requiring every service in the chain to understand pilots.

## What "piloting" actually covers

Piloting is not one strategy. Organizations use the word for canary deployments, targeted business launches, feature toggle activations, A/B experiments, blue/green switches, friends-and-family previews, and more. In HTTP-based systems, many of these are handled by separate mechanisms with different infrastructure.

This article covers three, in this order:

**Canary deployment**: a technical validation strategy. A new artifact version is exposed to a percentage of production traffic to detect regressions before full rollout. The audience is random; the question is whether the new version is stable.

**Targeted launch**: a business validation strategy. A new feature is released to a specific audience (internal employees, a regional branch, VIP customers) before general availability. The audience is intentional; the question is whether the feature works as expected under production conditions.

**Blue/green deployment**: a zero-downtime version switch. A new version is deployed and validated against a controlled segment of traffic before full cutover. The question is whether the switch can happen cleanly.

Feature toggling and A/B testing fit the same underlying mechanism â€” the header family described below carries flag names and segment identifiers for both â€” but their operational patterns are distinct enough to warrant separate treatment.

In event-driven systems, all three share one structural requirement: the context identifying which segment of traffic this is must travel with the event through every hop in the processing chain. A canary that only affects the first service in a five-service chain is not a canary; it is a partial experiment with misleading results.

## The problem that HTTP does not have

In an HTTP-based architecture, running a canary deployment is mostly an infrastructure concern. You put two versions behind a load balancer, configure a routing rule (send 5% of traffic to version B) and that is it. Services themselves do not need to know anything. They just receive requests.

Kafka is structurally different. There is no proxy in front of your consumers. There is no routing layer between the topic and the consumer group. When a message lands on a topic, every consumer group subscribed to it reads it. If you run two versions of a service, one stable, one canary, both will attempt to process every message unless you explicitly build in a mechanism to prevent it.

This is not a Kafka limitation. It is an architectural property of log-based messaging: the broker stores events, consumers pull what they need, and the decision about what to process belongs to the consumer.

Which means: **in event-driven systems, the decision about which version processes a message cannot live in the infrastructure alone. It has to be expressed through the message itself.**

## The pilot-breaker

Introduce pilot traffic onto a shared topic and a second problem immediately surfaces.

A service that was deployed before this pilot existed subscribes to that topic. It processes every message that arrives. It has no concept of pilots, no filtering logic, no configuration that mentions segments. Now pilot events start flowing through that topic alongside production traffic.

The pilot-aware consumer â€” the new instance deployed for this pilot â€” correctly filters: it reads the segment header and processes only messages tagged with its segment. But the existing agnostic service processes everything, including the pilot events it was never supposed to touch. It writes pilot data to production databases. It triggers real notifications for experimental transactions. It contaminates every metric it produces with events that were meant to be sandboxed.

The **pilot-breaker** is the capability we introduce to prevent this. It is not a failure mode â€” it is the mechanism added to the existing production implementation of the same business functionality being piloted, so it can discard traffic it should not process purely through configuration, with no pilot logic in the application code.

A service with a pilot-breaker configured as `PRODUCTION_ONLY` discards and acknowledges any message carrying `x-traffic-segment` before it ever reaches the listener. The service code sees nothing. The consumer group stays healthy. Pilot traffic cannot leak through.

This is why `PRODUCTION_ONLY` is the explicit configuration for the existing production implementation of the functionality being piloted. `ALL` is the default and the correct mode for consumers that do not share that business capability — an analytics consumer on the same topic does not implement the feature being piloted, so it stays in `ALL` and processes everything. The pilot-breaker is not a topic-wide setting. It is a contract between two implementations of the same business functionality: the one being piloted, and the one that must be shielded while the pilot runs.

## Two governance options: separate topics or context in the message

Given that consumers need to distinguish pilot traffic from production traffic, two structural approaches are available.

**Option 1: Physical isolation via separate topics**

Deploy a parallel set of topics for the pilot. Pilot producers publish to `orders.pilot`, production runs on `orders`. Each topic has its own consumer group. The environments are physically separated.

The strengths are real: complete traffic isolation, no risk of pilot messages reaching production consumers, clear topic-level observability. For cases with hard data separation requirements (regulatory, compliance, data residency), this is the right choice.

The costs, however, compound quickly in practice:

- Topic proliferation multiplies across every pilot and every topic in the affected domain. Three concurrent pilots across ten topics means thirty additional topics, plus schema registry entries, ACLs, and retention policies for each.
- Every downstream service in the chain needs a duplicate consumer group reading from the pilot topic. "Running a pilot" becomes "duplicating your consumer infrastructure."
- The exit strategy requires migrating consumer groups from pilot topics back to production topics. This is not a configuration change; it is a coordinated operational handover across all participating teams.
- Most critically: it does not solve the propagation problem. If service B is pilot-agnostic and publishes to a single downstream topic, having service A read from `orders.pilot` does not prevent service B from mixing pilot and production traffic in its output.

**Option 2: Logical separation via message context**

Keep existing topics. Add a header to each message that identifies whether it belongs to a traffic segment. Consumers read their configuration and decide whether to process or skip the message based on the header.

Infrastructure remains stable. No topic proliferation. No duplicate consumer group management. The pilot exits cleanly by stopping header injection at the gateway and removing the pilot instance, with no topic migration needed. And it solves the propagation problem at the infrastructure level, as we will see.

**The recommendation**: prefer logical separation for the vast majority of pilots. Reserve physical isolation for genuine hard isolation requirements: when regulations or compliance rules require that pilot data never land in the same storage as production data, or when a pilot involves sufficiently different schema versions that a shared topic would require complex compatibility management.

Everything that follows is about making logical separation work cleanly.

## Why the header name matters more than you think

The first instinct is to add a header called `x-pilot-id`. Add a value that identifies the pilot. Let consumers check it.

This works for one pilot, one consumer, one type of initiative. The moment complexity arrives (two concurrent pilots, a canary and a targeted launch running simultaneously, a new team implementing the same pattern independently), the name starts doing damage.

`x-pilot-id` names the organizational activity, not the traffic property. It implies that production traffic might carry `x-pilot-id: production` or `x-pilot-id: none`. It embeds "pilot" in an infrastructure-level contract that also needs to handle canary deployments, which are not pilots in any business sense.

The name we settled on is `x-traffic-segment`. And the contract that follows from it is:

> **Production traffic never carries `x-traffic-segment`. If the header is present, the message belongs to a traffic segment.**

That single sentence is the entire filtering contract. It works because "segment" names what the traffic *is* (a named partition distinct from production), not what the organization *calls it*. Production is not a segment. Production is the absence of a segment.

This makes the filter trivially expressible. Presence means experimental. Absence means production. No value parsing, no defensive handling of magic strings, no ambiguity.

## The header family

`x-traffic-segment` is the primary key, a unique identifier for the segment: `canary-v2.3`, `pilot-scoring`, `beta-feb-2026`. It is the only header the core filter reads.

Four companion headers carry enrichment for consumers that need it:

- **`x-traffic-segment-type`**: the classification: `CANARY`, `TARGETED`, `FEATURE_TOGGLE`. Used by monitoring and by consumers that need type-specific behavior.
- **`x-traffic-audience`**: the intended audience: `FRIENDS_FAMILY`, `VIP`, `BRANCH_ES_01`. Useful for observability and for consumers with audience-level business rules. Also surfaces in log correlation via MDC.
- **`x-traffic-segment-ver`**: the artifact version being piloted: `v2.3.1-canary`. Primarily for canary deployments where you need to correlate metric anomalies with a specific build.
- **`x-feature-flags`**: pre-evaluated feature flags: `new-scoring,alt-risk-limits`. Flag names evaluated at the gateway, carried for consumers that need to branch on them without an additional service call.

The hierarchy matters: `x-traffic-segment` is the gate. If it is absent, the other headers are irrelevant to filtering. Companion headers are enrichment for consumers that opt into pilot awareness. A pilot-agnostic consumer ignores all of them.

## Three modes, one filter

Given the contract, each consumer instance can operate in one of three modes:

**PRODUCTION_ONLY**: the pilot-breaker mode for the existing production implementation of the same business functionality being piloted. Process messages that do *not* carry `x-traffic-segment`. Any message carrying a segment header is discarded and acknowledged. Use this when the non-piloted implementation must be shielded from segmented traffic.

**SEGMENT_ONLY**: the pilot instance mode. Process only messages that carry `x-traffic-segment` *and* whose value is in the configured `accepted-segments` list. Ignores all production traffic and any segments not in the list.

**ALL**: process everything regardless of the header. This is the default. Consumers that do not share the business capability being piloted — analytics, audit, observability, downstream services with different domain responsibilities — stay in `ALL` and propagate context transparently. `ALL` is also used as a transition mode during handover, but only after the previous owner of production traffic has been fenced off.

Mode changes are configuration changes, not code changes. Expanding a pilot to a new segment, entering a transition period, completing a rollback: all of these are `accepted-segments` or `mode` updates.

## The implementation: RecordFilterStrategy

In Spring Kafka, attach the filter to the container via `ContainerCustomizer`, not to individual `@KafkaListener` methods. This keeps listeners clean and pilot-agnostic:

```java
@Bean
public ContainerCustomizer<AbstractMessageListenerContainer<?, ?>> trafficSegmentContainerCustomizer(
        @Value("${traffic.filter.mode:PRODUCTION}") String mode,
        @Value("${traffic.filter.accepted-segments:}") Set<String> acceptedSegments) {

    return container -> {
        container.setRecordFilterStrategy(record -> {
            Header header = record.headers().lastHeader("x-traffic-segment");
            String segment = header != null ? new String(header.value()) : null;
            return switch (mode) {
                case "PRODUCTION_ONLY" -> segment != null;
                case "SEGMENT_ONLY"    -> !acceptedSegments.contains(segment);
                case "ALL"             -> false;
                default                -> false;
            };
        });
        container.setAckDiscarded(true);
    };
}
```

Two things worth noting. First, `setAckDiscarded(true)` is essential; without it, filtered messages are not acknowledged and the consumer group stalls. Second, the filter returns `true` to *discard* (Spring Kafka's convention). The `SEGMENT_ONLY` branch discards when `acceptedSegments.contains(segment)` is false, which naturally handles both production traffic (segment is null) and traffic from other segments (segment is present but not in the list).

Configuration for a pilot instance:

```yaml
traffic:
  filter:
    mode: SEGMENT_ONLY
    accepted-segments:
      - pilot-scoring
      - canary-v2.3
```

Consumers that are supposed to see everything may need no explicit configuration if `ALL` is the default in your runtime. What does need explicit `PRODUCTION_ONLY` configuration is the existing production implementation of the same business functionality being piloted. Other consumers on the topic may still remain on `ALL` if their role is intentionally to observe or process everything.

## Transparent context propagation: Micrometer Tracing baggage

The pilot-breaker handles consumption. But there is a separate concern on the production side: a service that consumes a pilot event and publishes a downstream event needs to carry `x-traffic-segment` forward to its output, without any awareness of pilots in its application code. If it does not, the header is silently dropped and downstream services â€” even those with a pilot-breaker configured â€” can no longer filter correctly, because the context that would trigger the filter is gone.

Micrometer Tracing's baggage mechanism handles this. Any header declared as a `remote-field` in baggage configuration is automatically propagated across all transport boundaries: HTTP headers, Kafka record headers, and back. The service that is "pilot agnostic" carries the context forward because its transport instrumentation does it transparently.

```yaml
# application.yml â€” applied to every service in the chain
management:
  tracing:
    baggage:
      remote-fields:
        - x-traffic-segment
        - x-traffic-segment-type
        - x-traffic-segment-ver
        - x-traffic-audience
        - x-feature-flags
      correlation:
        # appear in logs via MDC
        fields:
          - x-traffic-segment
          # distinguish CANARY/FEATURE_TOGGLE in logs
          - x-traffic-audience
```

```xml
<dependencies>
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-tracing-bridge-otel</artifactId>
    </dependency>
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-observation</artifactId>
    </dependency>
</dependencies>
```

With these two dependencies and this YAML in every service, `RestClient`, `WebClient`, Kafka producers, and Kafka consumers all propagate the headers automatically. A service in the middle of the chain, consuming from one topic and publishing to another, propagates pilot context without a single line of pilot-related application code. The pilot-breaker problem is solved at the infrastructure configuration level.

The correlation fields surface `x-traffic-segment` and `x-traffic-audience` in every MDC log line. This means you can filter all logs for a specific pilot without any changes to your logging configuration.

## Deployment playbooks

The three modes are enough to express the main rollout strategies, but one safety rule comes first:

> **Never let two live consumer groups accept the same traffic class from the same topic at the same time.**

With separate consumer groups, overlap only becomes a problem when two groups implement the same **business functionality being piloted** for the same traffic class. Different consumers may still read the same topic for different purposes. That gives us three invariants for that functionality:

- Production traffic (messages without `x-traffic-segment`) must have exactly one active owner.
- A given segment value must have exactly one active owner.
- `ALL` is only safe once every other group that could accept those same messages for that responsibility has already been fenced off.

That is the lens for every playbook below. The playbooks govern the piloted implementation and the existing production implementation of that same functionality; they do not imply that every other consumer on the topic must also switch to `PRODUCTION_ONLY`.

### Targeted launch

This is the business rollout case: one audience gets the new behavior, everyone else stays on the stable path.

**Start**

Deploy the pilot consumer group as `SEGMENT_ONLY` with one accepted segment, for example `pilot.vip-q2`. Configure the gateway to inject `x-traffic-segment: pilot.vip-q2` only for the chosen audience. The production group stays in `PRODUCTION_ONLY`.

At this point, ownership is clean:

- Production group owns all unsegmented traffic.
- Pilot group owns only `pilot.vip-q2`.

**Expand**

To widen the rollout, change the audience definition at the gateway and, if needed, add more accepted segments to the pilot group. No service code changes are required. Holding the rollout is simply the decision to stop changing either of those two inputs.

**Rollback**

Rollback means stopping new traffic from entering the pilot, not magically undoing work that the pilot already performed. The operational move is:

1. Stop gateway injection for the segment.
2. Leave the production group unchanged in `PRODUCTION_ONLY`.
3. Let the pilot group drain the already tagged backlog.
4. Decommission the pilot group when the segment backlog reaches zero.

The production group does not need to switch to `ALL`. If it did while the pilot group was still alive, both groups could start accepting overlapping traffic.

**Graduate to general availability**

The cleanest promotion path is to deploy the now-approved code to the production group, keep it in `PRODUCTION_ONLY`, stop gateway injection, and let the pilot group drain the remaining tagged records before removing it.

There is also a cutover variant where the pilot fleet becomes the new production fleet. That is valid, but only if you first fence the old production group so there is never a moment when both groups accept unsegmented traffic. In that variant, `ALL` is a post-fencing transition mode, not a coexistence mode.

### Canary deployment

This is the technical rollout case: a percentage of real production traffic is tagged for the candidate version.

**Start**

Deploy the canary group in `SEGMENT_ONLY` with a segment such as `canary.checkout-v2`. Configure the gateway to inject that segment for a small percentage of requests. The stable group remains `PRODUCTION_ONLY`.

**Ramp up and ramp down**

Increasing the canary is a gateway-only change: raise the percentage of requests that receive the canary segment. Reducing exposure is the same operation in reverse. The consumer configuration does not change as long as the segment identifier stays the same.

**Hold**

Holding a canary means freezing the percentage and leaving both groups exactly as they are while you observe metrics, logs, traces, and downstream effects. The header contract is useful here because the canary population remains explicit all the way through Kafka.

**Abort**

An abort is operationally the same shape as the targeted-launch rollback:

1. Set canary injection to zero at the gateway.
2. Leave the stable group in `PRODUCTION_ONLY`.
3. Let the canary group drain the already tagged backlog.
4. Remove the canary group.

Again, the stable group should not be switched to `ALL` while the canary group is still running, because that would create overlapping ownership.

**Promote**

The simplest promotion path is replacement: deploy the candidate version as the new stable production group, stop canary injection, and let the canary group drain the remaining tagged records before removing it.

If you want the canary fleet itself to become the new production fleet, the sequence is stricter: fence the old stable group first, stop header injection, then switch the canary group to `PRODUCTION_ONLY` or, if it must finish a residual tagged backlog, briefly to `ALL`. The important point is that `ALL` is only safe after the previous owner of production traffic has stopped.

### Blue/green deployment

Blue/green is different from targeted launch and canary. The header is not the cutover mechanism itself; it is the validation mechanism before the cutover.

**Prepare**

Blue is the current production owner and stays in `PRODUCTION_ONLY`. Green is deployed in `SEGMENT_ONLY` for a validation segment such as `green.validation`. At this stage the gateway injects that segment only for internal users, smoke tests, or synthetic traffic.

**Validate and hold**

During validation, Green processes only the tagged validation traffic while Blue continues to own all production traffic. You can keep Green in this state for as long as needed. That is the safe "hold" phase for blue/green.

**Cut over**

The cutover is not "switch Green to `ALL` while Blue is still draining." That would make both consumer groups eligible to process production traffic.

The safe cutover sequence is:

1. Fence Blue so it no longer accepts production traffic.
2. Stop validation-segment injection at the gateway.
3. Switch Green to `PRODUCTION_ONLY`.
4. Decommission Blue.

If Green still needs to finish a small backlog of `green.validation` records after Blue has been fenced, Green may temporarily run in `ALL`. But that is only safe because Blue is already out of the way.

**Rollback**

Before cutover, rollback is easy: stop validation injection and remove Green. Blue was never touched.

After cutover, rollback is no longer a header-routing problem. Once Green has consumed production events and produced side effects, going back to Blue is an application and data recovery problem, not something `x-traffic-segment` can solve. The header contract helps you validate safely before cutover; it does not provide time travel after the cutover has happened.

## The gateway is the decision point

Who decides that a given request belongs to a specific segment? Who controls the canary percentage?

The API Gateway, not the services.

For targeted launches: the gateway evaluates the authenticated user against the audience definition and injects `x-traffic-segment` when there is a match. Changing the audience is a gateway configuration change. Services do not need to know.

For canary deployments: the gateway uses a percentage-based routing rule per endpoint. Changing the canary percentage is a gateway configuration change. Services do not need to know.

`x-traffic-segment` is injected at the edge, propagated transparently through the chain by Micrometer baggage, read only by the filter, and its lifecycle ends when the pilot ends. No service in the middle touches it. This is the correct separation of concerns.

## What this does not solve

**Replayed messages from retention**: Messages published during a pilot carry `x-traffic-segment`. If those messages are replayed for a consumer rebuild, the filter behavior depends on whether the consuming instance still has the segment configured. Old segment identifiers need a deprecation plan: a `SEGMENT_ONLY` consumer with an expired segment list will silently skip all replayed messages from that period.

**Feature flag evaluation at consumption time**: The `x-feature-flags` header carries pre-evaluated flags from the gateway. If you need to evaluate flags mid-pipeline, based on conditions only knowable at consumption time, this mechanism does not help. That requires a feature flag service call inside the consumer.

**Side effects from pilot consumers**: Filtering prevents production consumers from processing pilot traffic. It does not prevent pilot consumers from writing to shared databases, calling external APIs, or triggering financial transactions. Managing real effects (shadow writes, stubbed external calls, guarded side effects) is a separate concern that depends on what the pilot is validating.

**Concurrent pilots with conflicting behavior on the same service**: The model handles multiple segments (a service can accept `[pilot.abc, canary.v2]`), but if two concurrent pilots require genuinely different behavioral variants of the same service, you need application-level branching on `x-traffic-segment-type` or `x-traffic-segment`. The contract carries the context; the application decides what to do with it.

---

The mechanism is intentionally minimal: one header, three modes, one filtering rule. That minimalism is a feature. But `PRODUCTION_ONLY` is not a universal default for every consumer on the topic. It is the protection mode for the existing production implementation of the same business functionality being piloted. Consumers whose role is intentionally to see everything can remain on `ALL`. Pilot awareness only needs to be explicit at the edges: the gateway that injects, the piloted instance in `SEGMENT_ONLY`, and the non-piloted implementation of that same functionality in `PRODUCTION_ONLY`.

---

## In this mini-series: pilot-aware architecture in event-driven systems

1. **[Traffic segmentation across REST and Kafka: one contract for canary, pilot, and blue/green](/articles/2026-04-27-kafka-pilot-traffic-segmentation-one-contract)** *(this post)*: the contract, the three modes, and the deployment playbooks
2. **[Designing a header family for traffic segmentation: the decision process](/articles/2026-05-04-designing-header-family-traffic-segmentation)**: why the headers are named the way they are, and what was discarded
3. **[The silent pilot-breaker: transparent context propagation across Kafka with Micrometer baggage](/articles/2026-05-04-micrometer-baggage-kafka-pilot-context-propagation)**: how Micrometer baggage propagates pilot context through agnostic services without application code
