---
title: "API First 360: AsyncAPI as the Source of Truth for Code and Infrastructure"
date: 2026-05-10
summary: "API First should not stop at generated code. In event-driven systems, the same AsyncAPI contract should help producers, consumers, and platform teams understand and provision the infrastructure that makes the API real."
tags:
  - api-first
  - asyncapi
  - terraform
  - kafka
  - devops
  - zenwave
featured: false
featuredImage: assets/articles/api-first-ops-kafka-terraform-banner.png
featuredImageAlt: "API First Ops: Provisioning Kafka from AsyncAPI with Terraform"
readingTime: "7 min read"
draft: false
---

In a previous post, [Preventing API Drift with AsyncAPI](/articles/2026-03-01-preventing-api-drift-with-asyncapi/), I wrote about API drift from the development side.

The main idea was simple: if you are using Java and Spring, the AsyncAPI specification should be part of the build. You generate non-editable code from it. You regenerate on every build. You let the compiler tell you when the implementation and the contract no longer agree.

That solves an important part of the problem.

But in event-driven systems there is another kind of drift hiding in plain sight.

The code can be perfectly aligned with the AsyncAPI document while the Kafka infrastructure has already moved somewhere else.

## The Missing Half of API First

API First usually means designing the API contract before writing the implementation.

For HTTP APIs, that mental model is quite natural. You design the OpenAPI contract, generate server interfaces or clients, and then implement the behavior behind that boundary.

For event-driven APIs, the boundary is wider.

An event API is not only a message payload. It is not only a channel name. A Kafka topic has operational characteristics that affect the way systems are designed and operated:

- partitions
- replicas
- retention
- cleanup policy
- schema subjects
- ACLs
- retry topics
- dead-letter queues

These are not decorative details. They change what producers can assume, how consumers scale, and how operations teams provision and govern the platform.

So if AsyncAPI is the source of truth for the event API, why does the operational shape of that API usually live somewhere else?

That question is the beginning of what I call **API First Ops**.

## API First Ops

API First Ops extends the API First idea from code to infrastructure.

The contract should not only describe what messages are exchanged. It should also describe the infrastructure intent required for those messages to exist safely in production.

In Kafka terms, that means the AsyncAPI specification should be able to answer questions like:

- Who owns this topic?
- Who can publish to it?
- Who can consume from it?
- How many partitions does it have?
- How long are messages retained?
- Is it compacted, deleted, or both?
- What schema is registered for the topic?
- What retry and DLQ topology does a consumer require?
- Which of these settings change between dev, staging, and production?

The point is about **service-level intent**: the API as the contract, because that intent is part of the API relationship between **producers**, **consumers**, and **the platform**.

## API First Dev + API First Ops = API First 360

This is my 360 view:

- **API First Dev**
  - Source of truth: AsyncAPI
  - Derived artifact: Java/Spring producers, consumers, and DTOs
  - Drift signal: compile-time errors
  - Tool: [AsyncAPI Generator for Java / Spring-Boot](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-generator/)

- **API First Ops**
  - Source of truth: AsyncAPI
  - Derived artifact: Terraform for Kafka topics, schemas, ACLs, retry topics, and DLQs
  - Drift signal: Terraform plan diff
  - Tool: [AsyncAPI to Terraform Generator](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-ops/)

API First Dev keeps application code aligned with the contract.

API First Ops keeps infrastructure aligned with the contract.

Together, they close the loop between specification, code, and infrastructure.

```text
AsyncAPI
  -> generated application code
  -> generated infrastructure definition
  -> reviewed and applied platform changes
```

The important part is not the generator itself. The important part is the direction of authority.

The spec is not documentation produced after the system is built. The spec is the design artifact from which the rest of the system is derived.

## Why This Matters to Producers, Consumers, and Platform Teams

When we talk about topic configuration, it is easy to think only about operations.

But the topic is shared by three parties.

The producer needs to understand what it is publishing to. A compacted topic, a short-retention topic, and a long-retention topic imply different expectations. ACLs and schemas also define what the producer is allowed and expected to do.

The consumer needs to understand how it can scale and recover. A topic with 3 partitions is not the same design space as a topic with 12 partitions. A topic with 7 days of retention is not the same operational contract as a topic with 1 year of retention. In one case, you may need strict state tracking because messages disappear quickly. In the other, you may be able to rebuild state by replaying the log.

The platform team needs to provision and govern the infrastructure. It needs topics, schemas, ACLs, retry topics, DLQs, retention policies, and environment-specific differences to be explicit and reviewable.

All three parties need the same information.

When that information is split across AsyncAPI, Terraform, CI scripts, runbooks, wiki pages, and conversations, drift is not an accident. It is the natural outcome of the system.

## Operational Drift Is API Drift

I used to think of API drift mostly as a development problem.

The specification says a field is required, but the producer stops sending it. The schema says a field is a number, but the implementation sends a string. The consumer expects a message that the producer no longer emits.

That is API drift, of course.

But in event-driven systems, this is also API drift:

- The spec says the topic has 12 partitions, but production has 3.
- The consumer design assumes 1 year of replay, but the topic retains messages for 7 days.
- The AsyncAPI document shows a consumer operation, but the READ ACL was never provisioned.
- The application has retry logic, but the retry topics are created manually.
- DLQ retention is decided outside the contract, in a pipeline variable nobody reads.

The payload contract and the infrastructure contract are different layers, but they are part of the same API reality.

If the infrastructure changes the way producers and consumers must behave, then infrastructure drift is also API drift.


## Why AsyncAPI Is the Right Place

AsyncAPI already has the core concepts:

- channels
- messages
- schemas
- operations
- bindings
- servers

For Kafka, the channel is already close to the topic. The operation already tells us whether a service sends or receives. The message already points to the schema. The Kafka binding already carries topic-level configuration.

So the model is almost there.

What was missing, in my view, were a few operational pieces:

- environment-specific overrides for topic bindings
- consumer-owned retry and DLQ topology
- a clear way to keep those concerns close to the API without polluting the public channel model

I proposed these ideas to the AsyncAPI bindings repository:

- [env-server-overrides for Kafka channel bindings](https://github.com/asyncapi/bindings/issues/292)
- [error-topics for Kafka operation bindings](https://github.com/asyncapi/bindings/issues/299)

The first one lets a topic declare that production has one shape while dev and staging override specific values.

The second one puts retry and DLQ provisioning where it belongs: on the consumer operation, because retry topics and DLQs are owned by a consumer group, not by the public channel itself.

Whether these exact proposals are accepted or evolve into something better, I think the direction matters: AsyncAPI should be able to describe not only the event contract, but also the operational intent required to run that contract.

## Closing the Loop

API First helped us move the contract before the code.

API First Dev made the contract enforceable during development.

API First Ops makes the contract operational.

API First 360 is the combination: specification, code, and infrastructure aligned in one auditable chain.

For me, this is the next step in preventing API drift in event-driven architectures. Not only making sure the producer and consumer agree on the message, but making sure the platform they communicate through is also part of the same truth.

That is the why.

---

*Reference documentation: [AsyncAPI to Terraform](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-ops/)*  
*Technical walkthrough: [API First Ops: Provisioning Kafka Infrastructure from AsyncAPI](https://www.zenwave360.io/posts/API-First-Ops-Provisioning-Kafka-from-AsyncAPI/)*  
*Related: [Preventing API Drift with AsyncAPI - A Java/Spring Perspective](/articles/2026-03-01-preventing-api-drift-with-asyncapi/)*
