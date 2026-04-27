---
title: "Pilot-aware architecture: managing experimental traffic in event-driven systems"
summary: Canary deployments and business pilots in HTTP-based systems rely on a proxy that intercepts traffic before it reaches the service. Kafka has no such proxy. This post explains how to design a header-based filtering contract that supports segmented pilots, canary deployments, and blue/green strategies across REST and Kafka using the same mechanism.
date: 2026-04-27
tags:
  - Kafka
  - EDA
  - AsyncAPI
  - Spring Boot
  - Architecture
featured: false
featuredImage: assets/articles/2026-04-27-pilot-aware-architecture-experimental-traffic-eda/pilot-aware-architecture.png
featuredImageAlt: "Pilot-aware architecture: managing experimental traffic in event-driven systems"
readingTime: "12 min read"

draft: true
---

## The problem HTTP does not have in Kafka

In HTTP-based architectures, running a canary deployment is mostly an infrastructure concern. You deploy two versions behind a load balancer or API gateway, configure a routing rule â€” send 5% of traffic to version B â€” and the problem is solved at the edge. Services themselves do not need to know a pilot is running. They just receive requests.

Kafka is different. There is no proxy sitting in front of your consumers that can intercept a message and decide which service version should process it. When a message lands on a topic, every consumer group subscribed to that topic receives it. If you run two versions of a service â€” one stable, one pilot â€” both instances will attempt to consume every message unless you explicitly prevent it.

This creates a fundamental design challenge: **in event-driven systems, the decision about which version processes a message cannot live in the infrastructure alone. It must be negotiated through the message itself.**

## What piloting means in EDA and why it is different

Before discussing solutions, it helps to be precise about what "piloting" covers, because the word is used for very different things:

- **Canary deployment**: a technical strategy where a new artifact version is exposed to a percentage of production traffic (1%, 5%, 10%...) to monitor infrastructure stability before full rollout.
- **Targeted launch**: a business validation strategy where a new functionality is released to a specific group â€” employees, early adopters, a specific region â€” before going live for everyone.
- **Feature toggling**: runtime switches that activate or deactivate functionality without redeployment.
- **A/B testing**: two variants running simultaneously for UX comparison and conversion measurement.

In HTTP systems, these are often handled by completely different mechanisms. In event-driven systems, they share a fundamental complication: **the pilot context must travel with the event through the entire processing chain.**

Consider a typical flow: an HTTP request enters through an API Gateway, triggers a domain service, which publishes an event to Kafka. That event is consumed by service B, which emits another event consumed by service C. If the original request was part of a pilot, every service in that chain needs to know â€” or needs to be shielded from knowing â€” that it is handling pilot traffic.

This propagation requirement is what makes EDA piloting structurally different from HTTP piloting. There is no single traffic control point. An event can activate multiple consumers. Pilot-aware and pilot-agnostic consumers coexist on the same topics. The pilot context must travel with the event â€” and a pilot-agnostic service that republishes downstream becomes a **pilot breaker** if it silently drops that context.

## Two governance options: separate topics vs context in the message

When you first confront this problem, two approaches seem natural.

**Option 1: Physical isolation via separate topics**

Deploy a complete parallel set of topics for the pilot. Pilot producers publish to `orders.pilot`, pilot consumers read from `orders.pilot`, while production runs on `orders`. The pilot environment is fully isolated.

This approach has genuine strengths: complete traffic isolation, no risk of pilot messages reaching production consumers, and clean observability by topic. But it comes with significant costs:

- Topic proliferation multiplied by every pilot and every topic in the affected domain
- Duplicate consumer deployments for every service in the downstream chain
- Schema registry entries need to be maintained for both topic families
- Exit strategy requires migrating consumers from pilot topics back to production topics â€” and that migration is operational complexity, not just a configuration change

**Option 2: Logical separation via message context**

Keep existing topics. Add context to the message that identifies it as pilot traffic. Consumers that want to participate in the pilot read their configuration and decide whether to process or skip a message based on that context.

This approach keeps infrastructure stable and avoids topic proliferation. The challenge â€” which the rest of this post addresses â€” is designing a filtering contract that is simple enough to implement consistently and expressive enough to cover all pilot scenarios.

The recommendation: **prefer logical separation for most pilots.** Reserve physical isolation for cases requiring hard data separation guarantees (regulatory, compliance, or data residency requirements).

## The filtering contract: the rule that makes everything simple

The key insight that makes logical separation workable is a single, simple contract:

> **Production traffic never carries an `x-traffic-segment` header. If the header is present, the message belongs to a traffic segment.**

That is the entire contract. It encodes two things simultaneously:

1. **Absence means production.** A consumer that receives a message without `x-traffic-segment` is always processing production traffic. No special handling needed.
2. **Presence means segment.** A consumer that receives a message with `x-traffic-segment` is processing pilot or experimental traffic. The consumer can then decide what to do based on its own configuration.

This binary distinction is what enables **pilot-agnostic consumers** to coexist with pilot-aware ones on the same topic. A legacy service consuming an order event does not need any changes â€” it never sees `x-traffic-segment` in production traffic, so it processes everything normally. The pilot consumer alongside it uses the header to filter.

The contract also has a pleasant side effect for observability: any anomaly in metrics or logs that correlates with the presence of `x-traffic-segment` is by definition a pilot signal. You do not need separate dashboards.

## Operation modes: PRODUCTION_ONLY, SEGMENT_ONLY, ALL

Given this contract, each consumer instance can operate in one of three modes:

**PRODUCTION_ONLY** (explicit pilot-breaker mode for the existing production implementation of the same functionality being piloted)

Process messages that do NOT carry `x-traffic-segment`. A service running in this mode is shielded from segmented traffic because it is the non-piloted implementation of the same business functionality. Any message carrying a segment header is silently discarded and acknowledged â€” it will not be redelivered to this instance.

**SEGMENT_ONLY** (mode for pilot instances)

Process only messages that carry `x-traffic-segment` AND whose segment value matches the configured `accepted-segments` list. A service in this mode ignores all production traffic. It also ignores pilot traffic from other segments it is not configured to participate in.

**ALL**

Process everything, regardless of the header. In many setups this is the runtime default. It is appropriate for consumers that are intentionally supposed to see everything, and it can also be used during transition phases â€” but only after overlapping ownership has been fenced off.

The power of this model is that **mode changes require no code changes**. They are configuration properties. Entry into a pilot, expansion to more segments, and exit from a pilot are all configuration operations, not deployment operations.

## The code: RecordFilterStrategy as a minimal implementation

In Spring Kafka, the `RecordFilterStrategy` interface is the right hook for this. Rather than putting filtering logic inside each `@KafkaListener`, you attach it to the container itself via a `ContainerCustomizer`. This keeps individual listeners clean and pilot-agnostic.

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

A few things worth noting:

- The filter returns `true` to **discard** a record (Spring Kafka's convention: `true` means skip, `false` means process).
- `setAckDiscarded(true)` ensures discarded messages are acknowledged and will not be redelivered. Without this, filtered messages would be retried indefinitely and your consumer group would stall.
- The `PRODUCTION_ONLY` case discards any message that carries a segment header â€” it is a one-line guard for production instances.
- The `SEGMENT_ONLY` case discards messages whose segment is not in the accepted set, which naturally includes messages with no segment (production traffic), because `acceptedSegments.contains(null)` returns false.

The corresponding configuration in `application.yml` for a pilot instance:

```yaml
traffic:
  filter:
    mode: SEGMENT_ONLY
    accepted-segments:
      - pilot-feature-x
      - canary-v2.3
```

If `ALL` is the runtime default in your setup, the existing production implementation of the same functionality being piloted does need explicit `PRODUCTION_ONLY` configuration. Consumers that are intentionally allowed to see everything can stay on `ALL`.

Expanding the pilot to a new segment is a configuration-only change. You add the segment identifier to `accepted-segments` and either restart or refresh the configuration â€” no redeployment of application code required.

## Transparent propagation with Micrometer Tracing baggage

The filter solves consumption. But there is a second problem: how does `x-traffic-segment` travel from the HTTP request (where the API Gateway injects it) through a chain of services and Kafka topics without any service explicitly forwarding it?

Micrometer Tracing's baggage mechanism handles this transparently. When configured as a remote field, any header declared in `remote-fields` is automatically propagated across all transport boundaries â€” HTTP headers via `RestClient`/`WebClient`, Kafka record headers via the producer instrumentation, and back into the trace context on the consumer side. No custom interceptors needed, no application code changes.

```yaml
# application.yml â€” applied to all components in the processing chain
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

With this configuration in place:

- `RestClient` and `WebClient` automatically include the baggage fields in outbound HTTP headers.
- Kafka producer automatically includes them in record headers when publishing.
- Kafka consumer automatically reads them from record headers and restores them into the trace context.
- The correlation fields appear in every log line via MDC, so you can filter all logs for a specific pilot segment without any changes to your logging configuration.

**The key implication**: a service that sits in the middle of the chain â€” consuming from Kafka and publishing to another Kafka topic â€” propagates pilot context to its downstream events without any application code changes. It is purely a configuration concern. This solves the pilot-breaker problem: as long as every service in the chain has these fields declared in its `remote-fields`, the context flows end to end.

## Entry and exit strategies: segmented pilot, canary, blue/green

The filter modes do support the main rollout patterns, but only if you keep one operational rule in view:

> **Never let two live consumer groups accept the same traffic class from the same topic at the same time.**

With separate consumer groups, overlap only becomes a problem when two groups implement the same business functionality being piloted for the same traffic class. Different consumers may still read the same topic for different purposes. In practice that means:

- unsegmented production traffic must have exactly one active owner for a given responsibility
- a given segment value must have exactly one active owner for a given responsibility
- `ALL` is only safe after every other group that could accept those same messages for that responsibility has been fenced off

### Segmented pilot (targeted launch)

For a targeted launch, the production group stays in `PRODUCTION_ONLY` and the pilot group runs in `SEGMENT_ONLY` for one or more explicit audience segments.

**Start**: the gateway injects a segment such as `pilot.abc` for the chosen audience, and only the pilot group accepts it.

**Expand**: widen the audience at the gateway or add more accepted segments to the pilot group.

**Hold**: stop changing the audience and observe the pilot in a steady state.

**Rollback**: stop injecting the segment, leave production unchanged, let the pilot group drain the already tagged backlog, then remove it.

**Success path**: deploy the approved code to the production group, stop injection, keep production in `PRODUCTION_ONLY`, and let the pilot group drain the remaining tagged records before decommissioning it.

If you want the pilot fleet itself to become the new production fleet, you must fence the old production group first. `ALL` is only safe after that fence is in place.

### Canary deployment (percentage-based)

For a canary, the stable group stays in `PRODUCTION_ONLY` and the candidate group runs in `SEGMENT_ONLY` for a canary segment such as `canary.v2`.

**Start**: inject the canary segment for a small percentage of requests at the gateway.

**Promote gradually**: increase or decrease the percentage at the gateway only.

**Hold**: freeze the percentage and observe metrics, traces, logs, and downstream effects.

**Abort**: set the percentage to zero, let the canary group drain the already tagged backlog, then remove it.

**Success path**: deploy the candidate as the new stable production group, stop injection, and let the canary group drain before removing it.

If the canary fleet itself becomes the new production fleet, fence the old stable group first. Only then can the canary group move to `PRODUCTION_ONLY` or briefly to `ALL` if it still needs to finish a residual tagged backlog.

### Blue/green deployment

Blue/green uses the header for pre-cutover validation, not as the cutover mechanism itself.

**Preparation**: Blue remains the production owner in `PRODUCTION_ONLY`. Green is deployed in `SEGMENT_ONLY` for a validation segment such as `green.validation`.

**Validation / hold**: inject the validation segment only for internal or synthetic traffic and keep Green isolated there for as long as needed.

**Cutover**: first fence Blue so it no longer accepts production traffic, then stop validation injection, switch Green to `PRODUCTION_ONLY`, and decommission Blue.

That is why "Blue drains while Green runs in `ALL`" is not a safe default. With separate consumer groups, that would make both sides eligible to process production traffic.

**Rollback**: before cutover, stop validation injection and remove Green. After cutover, rollback is no longer a header-routing problem; once Green has consumed production events and produced side effects, recovery becomes an application and data concern.

## API-Gateway as the decision point: where the percentage lives

One question that surfaces immediately: who decides that a given request belongs to a pilot segment? And who controls the percentage for canary rollouts?

The API Gateway â€” not the services.

This is the correct separation of concerns. Services should not contain traffic routing logic. The gateway is already the traffic entry point, responsible for authentication, rate limiting, and TLS termination. Pilot injection is consistent with that role.

In practice:
- For **targeted launches**, the gateway evaluates the authenticated user against the audience definition (user IDs, group membership, tenant identifier) and injects `x-traffic-segment` when there is a match. The audience definition is a gateway configuration, not a service configuration.
- For **canary deployments**, the gateway uses a percentage-based routing rule per endpoint and injects the canary segment for the matching fraction. Changing the canary percentage is a gateway configuration change.
- For **blue/green**, the gateway acts as a switch â€” it injects the segment for internal traffic during validation, then performs the cutover by changing the routing target.

This means service teams do not need to change anything when the pilot audience changes or when the canary percentage is adjusted. The service only needs to know its own mode and its accepted segments.

There is an important corollary: **`x-traffic-segment` is injected at the edge, never modified by services in the chain, and propagated transparently**. No service in the middle should add, remove, or change it. It enters at the gateway and its lifecycle ends when the pilot ends.

## What this mechanism does not solve

This architecture handles traffic routing and propagation cleanly. But it is worth being explicit about what is out of scope.

**Topic retention and replay.** Messages published during a pilot carry `x-traffic-segment`. If those messages are replayed â€” for a consumer rebuild or a failed processing recovery â€” the filtering behavior depends on whether the consuming instance still has the segment configured. You need a deprecation plan for old segment identifiers, otherwise a consumer running in `SEGMENT_ONLY` mode will silently skip replayed messages from expired pilots.

**Dynamic feature toggling at consumption time.** This mechanism is for deployment-level pilots where the pilot population is defined at request-entry time by the gateway. It is not a feature flag system. If you need to toggle behavior for a specific user *after* the message has entered the Kafka pipeline â€” evaluating conditions inside the consumer â€” you need a dedicated feature flag service queried inside the consumer logic. The `x-feature-flags` header can carry flag names for pre-evaluated flags, but the evaluation itself happens at the gateway.

**Side effects from pilot consumers.** If the pilot consumer modifies a database, calls an external API, or triggers a financial transaction, the filtering contract does not help you. Filtering prevents production consumers from processing pilot traffic; it does not prevent the pilot consumer from producing real effects. Managing those effects â€” stub external calls, use shadow databases, gate side effects behind a flag â€” is a separate concern that depends on the nature of the pilot.

**Multiple simultaneous pilots affecting the same service with conflicting behaviors.** The current model assumes a service instance runs in one mode for a given segment set. If you need to run two pilots simultaneously that require different behavioral variants of the same service, the header family can carry the context, but the application logic must be designed to branch on it. This is not a limitation of the filtering contract â€” it is a domain modeling problem.

---

These constraints are not flaws â€” they are deliberate scope decisions. The mechanism is intentionally minimal: one header, three modes, one filtering rule. That simplicity is what makes it uniformly adoptable across teams and technology stacks. But `PRODUCTION_ONLY` is not something every service should adopt by default. It is the protection mode for the existing production implementation of the same functionality being piloted, while consumers that are intentionally meant to see everything can stay on `ALL`.

The companion post [Designing a header family for traffic segmentation: the decision process](/articles/2026-05-04-designing-header-family-traffic-segmentation) covers how we arrived at the header names and what alternatives were discarded along the way.
