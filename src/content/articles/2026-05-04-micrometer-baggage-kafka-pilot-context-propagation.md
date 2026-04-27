---
title: "The silent pilot-breaker: transparent context propagation across Kafka with Micrometer baggage"
summary: The hardest part of piloting in event-driven systems is not filtering — it is keeping the pilot context alive as events flow through services that know nothing about pilots. Micrometer Tracing baggage solves this without a line of pilot-related application code. Here is how it works and why getting it right is what makes pilot-agnostic services actually work.
date: 2026-05-04
tags:
  - EDA
  - Kafka
  - Spring Boot
  - Micrometer
  - Architecture
featured: false
featuredImage: assets/articles/2026-05-04-designing-header-family-traffic-segmentation/header-design.png
featuredImageAlt: "Transparent context propagation across Kafka with Micrometer baggage"
readingTime: "6 min read"

draft: true
---

*Part 3 of 3: pilot-aware architecture in event-driven systems. Companion posts: [Part 1: the contract](/articles/2026-04-27-kafka-pilot-traffic-segmentation-one-contract) · [Part 2: why the header family looks like this](/articles/2026-05-04-designing-header-family-traffic-segmentation).*

---

There is a failure mode in EDA piloting that does not produce errors. No exceptions, no dead-letter queue, no alert fires. The pilot simply stops having any effect partway through the processing chain, and you only discover this when you compare business metrics and realize the pilot consumer was never actually doing the work you thought it was.

I call this the **pilot breaker**. Understanding it is the key to understanding why transparent context propagation is not an optional nicety — it is what makes the entire pilot architecture work.

## What a pilot-agnostic service actually does

When we talk about making services "pilot agnostic," we mean that most services in the chain should not need to know pilots exist. They should not have pilot-related configuration, pilot-related conditional logic, or pilot-related tests. They should just process events.

This is a good property to have. It means you can run pilots across a complex system without touching most of the codebase. But it creates a silent contract obligation that is easy to miss: **a pilot-agnostic service that consumes an event and publishes a new event must forward the pilot context to its downstream output, even though it knows nothing about pilots.**

If it does not, the pilot context dies at that service. The downstream consumers receive events with no segment header. From their perspective, this is production traffic. They process it as production. The pilot consumer downstream never sees the events it was supposed to process.

The consumer at the end of the chain is configured correctly. The filter is implemented correctly. But it never fires, because the context that would trigger it was dropped three services ago — silently, correctly, by a service doing exactly what it was designed to do.

## Why this does not happen in HTTP architectures

In REST-based systems, this problem is largely handled automatically. When service A receives an HTTP request with `x-traffic-segment: pilot-scoring` and calls service B over HTTP, RestTemplate, RestClient, and WebClient all propagate headers as part of standard HTTP semantics. Various tracing libraries have built automatic header forwarding for years. Context propagation is the default, not the exception.

Kafka is different. A Kafka producer publishes a record with headers set explicitly by the application code. There is no automatic "forward all incoming headers to the outgoing record" behavior. If the application code does not explicitly copy `x-traffic-segment` from the consumed record to the produced record, it is not copied.

This means every service in the chain that both consumes and produces would need explicit pilot-forwarding code — exactly the kind of pilot-awareness we are trying to avoid.

Micrometer Tracing baggage is the bridge.

## How baggage propagation works

Micrometer Tracing models distributed context as a set of key-value pairs attached to the current trace. Some of these — the `remote-fields` — are designated for propagation across transport boundaries. When a transport boundary is crossed, the instrumentation automatically reads the remote fields from the incoming context and writes them to the outgoing transport.

For HTTP: remote fields are read from inbound HTTP headers and written to outbound HTTP headers by the `RestClient`/`WebClient` instrumentation.

For Kafka: remote fields are read from inbound Kafka record headers by the consumer instrumentation and written to outbound Kafka record headers by the producer instrumentation.

A service that consumes from Kafka and publishes to Kafka — without a single line of pilot-related code — will propagate all remote-field baggage to its output records as long as it uses the instrumented producer that Micrometer wires in.

## The configuration

Two dependencies:

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

And in `application.yml` of every service in the chain:

```yaml
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

That is the complete configuration. No custom interceptors. No `KafkaTemplate` wrappers. No header copying code in producers. The instrumentation handles it.

With this in place:
- `RestClient` and `WebClient` include baggage fields in outbound HTTP headers automatically.
- Spring Kafka producers write baggage fields to outbound record headers automatically.
- Spring Kafka consumers restore baggage fields from incoming record headers into the trace context automatically.

A service in the middle of the chain never sees the pilot headers in its application code. It reads domain events, does domain work, publishes domain events. The pilot context travels invisibly alongside.

## What "correlation fields" add

The `correlation.fields` section does something different from `remote-fields`. It makes the designated fields available in MDC (Mapped Diagnostic Context), which means they appear in every log line produced while processing a record that carries those headers.

In practice, this means: if you are debugging an anomaly in the pilot, you can add `x-traffic-segment` as a filter in your log aggregator and see a complete trace of every log line produced by every service while handling that pilot event — including services that are fully pilot-agnostic, because their logs are automatically tagged by the baggage instrumentation.

This is a significant operational benefit. You do not need to add `log.info("processing segment: {}", segment)` anywhere. The correlation happens at the infrastructure level.

## The propagation contract: what teams need to agree on

For this to work reliably across teams and services, there is one shared responsibility: every service must declare the same remote fields in its baggage configuration.

If service B in the middle of the chain does not have `x-traffic-segment` in its `remote-fields`, the Micrometer instrumentation will not propagate it. The header arrives in the incoming record, is not loaded into the trace context (because it is not declared), and is therefore not written to the outgoing record. Context is silently lost, and any consumer downstream — including one correctly configured with `PRODUCTION_ONLY` or `SEGMENT_ONLY` — can no longer filter correctly.

This is why the baggage configuration belongs in a shared application baseline — a company-wide Spring Boot starter or a shared configuration module — rather than in individual service configurations. It should be invisible to teams that do not need to think about it, and automatically correct for teams that are running pilots.

The remote fields are stable. You add them once when the pilot architecture is adopted and they stay there. They have no runtime cost when no segment headers are present (baggage propagation is no-op for empty fields). Declaring them in every service has no downside.

## A note on reactive and non-reactive stacks

The propagation works identically for both `RestClient` (blocking) and `WebClient` (reactive), and for both `@KafkaListener`-based consumers and reactive Kafka consumers using `KafkaReceiver`. The Micrometer instrumentation covers all of them. You do not need to handle reactive context propagation manually — `reactor.util.context.Context` integration is included in the tracing bridge.

If you have services that use Kafka Streams, note that the Kafka Streams instrumentation for Micrometer Tracing is less mature and may require additional configuration to propagate baggage through topologies. For standard producer/consumer patterns, the configuration above is sufficient.

## What this mechanism is not responsible for

Transparent propagation solves the pilot-breaker problem — it keeps context alive through agnostic services. It does not decide whether a consumer processes a message. That is the responsibility of the filter described in [Part 1](/articles/2026-04-27-kafka-pilot-traffic-segmentation-one-contract).

The two concerns are deliberately separate:

- **Propagation** (`remote-fields`): ensures context travels end-to-end without pilot-aware code in intermediate services.
- **Filtering** (`RecordFilterStrategy`): decides, at each consumer, whether to process or discard based on the context that arrived.

A service that participates in the pilot needs both: the baggage configuration so it propagates context, and the filter so it correctly selects which messages to process.

Pilot-agnostic means the service is not part of a new deployment. But that does not mean every pilot-agnostic service configures its filter the same way. There are two cases:

- **Shares the business capability being piloted** (the existing production implementation of the feature under pilot): needs both baggage propagation and `PRODUCTION_ONLY` as its filter. It is the production counterpart of the pilot instance — the pilot-breaker is precisely its role.
- **Does not share the capability being piloted** (analytics, audit, observability, downstream services with different domain responsibilities): needs only baggage propagation. It stays in `ALL`, the default, and processes everything. Its role is to remain transparent to the pilot, not to gate it.

Propagation is a topic-wide infrastructure concern — every service in the chain configures it. Filtering is a service-pair concern — only the production counterpart of piloted business functionality explicitly opts into `PRODUCTION_ONLY`.

---

The architecture becomes legible once you separate these two problems. Context propagation is an infrastructure concern — configure it once, inherit it everywhere. Filtering is a deployment concern — configure it per instance, change it without code. The only thing teams producing or consuming events need to agree on is the remote-field list, and that agreement belongs in shared infrastructure, not in individual service decisions.

---

## In this mini-series: pilot-aware architecture in event-driven systems

1. **[Traffic segmentation across REST and Kafka: one contract for canary, pilot, and blue/green](/articles/2026-04-27-kafka-pilot-traffic-segmentation-one-contract)** — the contract, the three modes, and the deployment playbooks
2. **[Designing a header family for traffic segmentation: the decision process](/articles/2026-05-04-designing-header-family-traffic-segmentation)** — why the headers are named the way they are, and what was discarded
3. **[The silent pilot-breaker: transparent context propagation across Kafka with Micrometer baggage](/articles/2026-05-04-micrometer-baggage-kafka-pilot-context-propagation)** *(this post)*: how Micrometer baggage propagates pilot context through agnostic services without application code
