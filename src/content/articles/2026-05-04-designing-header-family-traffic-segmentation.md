---
title: "Designing a header family for traffic segmentation: the decision process"
summary: Most posts about canary deployments show you the implementation. This one shows the thinking behind the contract. How we went from x-pilot-id to a coherent family of headers that covers canary, segmented pilots, and feature toggling under a single filtering rule.
date: 2026-05-04
tags:
  - EDA
  - Architecture
  - Kafka
  - API Design
featured: false
featuredImage: assets/articles/2026-05-04-designing-header-family-traffic-segmentation/header-design.png
featuredImageAlt: "Designing a header family for traffic segmentation: the decision process"
readingTime: "5 min read"

draft: true
---

*Part 2 of 3: pilot-aware architecture in event-driven systems. Companion posts: [Part 1: the contract](/articles/2026-04-27-kafka-pilot-traffic-segmentation-one-contract) · [Part 3: how propagation works across Kafka](/articles/2026-05-04-micrometer-baggage-kafka-pilot-context-propagation).*

---

[Part 1 of this series](/articles/2026-04-27-kafka-pilot-traffic-segmentation-one-contract) describes the filtering contract and its implementation. This one is about how we arrived at it — the naming decisions, the alternatives we discarded, and why the filtering rule is a consequence of the names rather than an independent design choice.

## The starting point: x-pilot-id and its limitations

The first idea is almost always the same: add a header that identifies the pilot.

```
x-pilot-id: pilot-scoring-v2
```

Simple. Obvious. And it works for exactly one case.

The moment you ask "what if two pilots run simultaneously?", or "how should a consumer distinguish a canary from a targeted business launch?", or "what happens when we expand the pilot to a second audience group?", the single identifier starts to strain.

You could solve each of those problems with additional values stuffed into `x-pilot-id`. You could use a composite format: `canary:scoring-v2:vip-customers`. But now you have encoding conventions, parsing logic distributed across consumers, and no clear schema. What started as a header has become an informal protocol.

More fundamentally, `x-pilot-id` names the wrong thing. It names the organizational activity (a pilot) and frames it as an identity (an ID). But identity is not what the infrastructure needs. The infrastructure needs to know whether traffic is experimental and which segment it belongs to. Those are different concepts.

## Why naming matters: headers as contracts, not implementation details

Headers in distributed systems are not implementation details. They are contracts between producers and consumers.

A header you introduce today may be read by dozens of services, logged in monitoring systems, evaluated by gateways for routing decisions, and appear in audit trails — all without your direct involvement. The name you choose encodes assumptions about semantics, cardinality, and expected values that will outlast the original context.

This has a practical consequence: names should communicate intent at the right level of abstraction, for the right audience.

`x-pilot-id` communicates at the business level (we're running a pilot). The infrastructure layer — gateways, Kafka consumers, tracing systems — does not care what the organization calls it. It cares about traffic classification.

## From identity to segment: the conceptual shift

The critical naming decision was replacing "pilot" with "segment" as the core concept, and replacing "id" with a segment identifier.

`x-traffic-segment` instead of `x-pilot-id`.

This is not just renaming. It is a conceptual shift.

**"Pilot" is a use-case label.** It describes what the organization is doing. It does not describe what the traffic is.

**"Traffic segment" is a structural label.** It describes the nature of the traffic itself — it belongs to a named segment that is distinct from production. The mechanism is the same whether you call the segment a pilot, a canary, a beta, or a friends-and-family launch. The organizational vocabulary disappears from the infrastructure layer.

The "traffic" prefix was chosen over "experiment" or "pilot" because it is neutral with respect to the type of initiative. Canary deployments are not experiments in the user-facing sense, but they are traffic segments. The prefix also groups the related headers naturally: `x-traffic-segment`, `x-traffic-segment-type`, `x-traffic-audience`, `x-traffic-segment-ver`.

## Unifying canary and pilot under the same mechanism

A tempting design choice is to give canary deployments and business pilots separate header namespaces. They feel like different things: one is a technical deployment strategy, the other is a business validation exercise.

The question that resolved this was: from the perspective of a downstream Kafka consumer, what actually differs between canary traffic and pilot traffic?

The answer, in most cases, is nothing structural. Both are non-production segments. Both need to be filtered. Both travel through the same pipeline. Both need transparent propagation. The consumer's decision — process this message or not — follows the same logic in both cases.

`x-traffic-segment-type` is where the distinction lives for consumers that genuinely need it. A consumer that should behave differently for a `CANARY` versus a `TARGETED` launch can branch on the type. But the core filter — the `RecordFilterStrategy` operating on `x-traffic-segment` — is identical.

Keeping one filtering mechanism for all segment types means a pilot-agnostic service remains agnostic without modification when the organization introduces new initiative types in the future. The contract does not need to change.

## The full family: each header and why it exists

**`x-traffic-segment`** — The primary key. A unique, opaque identifier for the traffic segment: `canary-v2.3`, `pilot-scoring`, `beta-feb-2026`. Its *presence* is the signal that distinguishes experimental from production. Its *value* identifies which experiment. This is the only header the core filter reads.

**`x-traffic-segment-type`** — The classification of the initiative. Values: `CANARY`, `TARGETED`, `FEATURE_TOGGLE`. Used by consumers that need type-specific behavior, and by monitoring to produce initiative-type-level metrics.

**`x-traffic-audience`** — The intended audience for the segment: `FRIENDS_FAMILY`, `VIP`, `BRANCH_ES_01`. Useful for observability and for consumers with audience-level business logic. Also appears in MDC via the Micrometer correlation configuration, making it possible to filter logs by audience.

**`x-traffic-segment-ver`** — The artifact version being piloted: `v2.3.1-canary`, `v1.0.0-beta`. Used primarily for canary deployments where multiple versions run simultaneously and you need to correlate a metric anomaly with a specific build.

**`x-feature-flags`** — Active feature flags for this request: `new-scoring,alt-risk-limits`. A comma-separated list of flag names. This header carries flags that were already evaluated at the gateway, so consumers can activate specific code paths without an additional feature flag service call at consumption time.

The family has an internal hierarchy: `x-traffic-segment` is the gate. If it is absent, the other headers are irrelevant to filtering. `x-traffic-segment-type` and `x-traffic-audience` are enrichment. `x-feature-flags` is orthogonal — it can travel on production traffic as well when feature flags apply outside of pilot contexts.

## What was discarded and why

**`x-pilot-segment`**: The "pilot" prefix embeds a use-case label in an infrastructure header. Rejected in favor of `x-traffic-segment`.

**Separate `x-canary-*` and `x-pilot-*` families**: Would require all consumers to handle two filtering code paths. The distinction belongs in the type field, not the header name. Rejected.

**A single composite header** (e.g., `x-segment: canary:v2.3:vip-customers`): Creates implicit encoding conventions. Consumers would need to parse and split values, schema would be informal, and parsers would diverge over time. Separate headers are simpler to propagate, index, and validate.

**Using the Kafka message key**: Kafka keys are domain identifiers (order ID, customer ID, account number). Embedding routing metadata in the key couples traffic classification to message identity. Headers are the correct location for cross-cutting context, because they are invisible to domain consumers that do not need them.

**A `x-segment-mode` header to tell consumers how to behave**: Some designs proposed injecting the expected filter mode into the message itself, so consumers would be instructed rather than configured. Rejected because the mode is a consumer property, not a message property. The same message should be filterable differently by different consumers. Putting the mode in the message would make the filtering contract dependent on whoever injected the message, which is the gateway's concern, not the service's.

## The filtering contract as a consequence of naming

Once you name the headers correctly, the filtering contract follows naturally.

The name `x-traffic-segment` implies that its presence signals a segment and its absence signals production. No value is needed for the production case — production is defined by the header not being present. This is not a convention you have to teach explicitly; it is encoded in the name.

From this, the three filter modes follow directly:

- **PRODUCTION_ONLY**: discard if `x-traffic-segment` is present. One condition.
- **SEGMENT_ONLY**: discard if `x-traffic-segment` is absent or not in the accepted list. Two conditions, one expression.
- **ALL**: never discard. This is the default.

`PRODUCTION_ONLY` is not a topic-level setting. It applies specifically to the production implementation of the business functionality being piloted — the pair relationship between that implementation and its pilot counterpart. Consumers on the same topic with different business responsibilities (analytics, audit, observability) have no production counterpart in the pilot; they stay in `ALL`.

A header named `x-pilot-id` would not give you this. It implies that production traffic might carry `x-pilot-id: none` or `x-pilot-id: production` — values you would feel compelled to handle defensively. The filtering logic would branch on values rather than on presence, and the contract would be harder to state.

The correct name removes that ambiguity. Absence is the production signal. Presence is the segment signal. The rule is trivially expressible because the name was chosen to make it so.

Good API design — whether for HTTP endpoints, message schemas, or header contracts — does not just name things accurately. It makes the right behavior the path of least resistance.

---

## In this mini-series: pilot-aware architecture in event-driven systems

1. **[Traffic segmentation across REST and Kafka: one contract for canary, pilot, and blue/green](/articles/2026-04-27-kafka-pilot-traffic-segmentation-one-contract)** — the contract, the three modes, and the deployment playbooks
2. **[Designing a header family for traffic segmentation: the decision process](/articles/2026-05-04-designing-header-family-traffic-segmentation)** *(this post)*: why the headers are named the way they are, and what was discarded
3. **[The silent pilot-breaker: transparent context propagation across Kafka with Micrometer baggage](/articles/2026-05-04-micrometer-baggage-kafka-pilot-context-propagation)** — how Micrometer baggage propagates pilot context through agnostic services without application code
