---
title: "Spec Driven Development: From EventStorming to a model your agents can read"
summary: "Introducing ZFL, a Domain Specific Language that brings structure to your business workflows for process-level Event Storming."
date: 2026-11-03
tags:
  - zenwave
  - ddd
  - eda
  - architecture
  - ai
featured: false
featuredImage: assets/articles/2026-11-03-sdd-from-event-storming-to-a-model-your-agents-can-read/zfl-eventflow-and-systems.png
featuredImageAlt: ZFL with EventFLow and Systems diagrams
readingTime: "4 min read"
draft: false
---

In the first part of this series I talked about a problem that every team doing spec-driven development with agents will hit sooner or later. LLMs write Markdown faster than you can read it. And when you can not read and validate the spects, decisions slip into the implementation without anyone approving them, and what is worse, because the LLM believes it was aproved it took it as gospel, and it may as well spill all over the design and implementation.

My answer to that problem is not new. It is model-driven development. Instead of describing the system in prose, you describe it with a model: the entities, the commands, the events, the APIs. You bring structure and concision.

And this fits spec-driven development very well. The spec captures the design and the decisions. And a model does exactly that, but in a compact form arround the building blocks of Domain Driven Design: aggregates, services, commands, domain events.

This DSL was designed to be very compact and developer friendly, to read as code. A medium sized microservices could easily feed in less than 200 lines, including persistence, modeling and APIs.

If skeptical, just have a look at [Order Fulfillmente Domain Model.zdl](https://github.com/ZenWave360/zenwave-playground/blob/main/examples/order-fulfillment-kotlin/zenwave-model.zdl) in about 130 lines of ZDL it contains all the important bits of this microservice. In fact more than 80% of the code was deterministically generated from it, including the OpenAPI.yml and AsyncAPI.yml definitions.

This is something you can review. It's also something an LLM can review. Prose can not give you this much information in so little space. No, markdown prose cannot give you any of that.

But one DSL for one bounded context is not enough anymore.

## One team, many services

One DSL for a bounded context was all good when we were developing one microservice at a time by one team. But right now we can be implementing one system at a time, but by one team implementing maybe 5, 6, 7 microservices or modules on a modular monolith.

If we are going to Spec an entire system then a DSL for a single bounded context is not enough.

These DSLs for describing one bounded context or microservice are good but are not enough. We need another way to express business workflows that go through the whole system we are implementing.

## Event storming has two levels

And this is why early on this year I've created another DSL the [ZFL Flow Language](https://www.zenwave360.io/docs/event-driven-design/zenwave-flow-language/) to express the findings of process-level event storming sessions.

While the previous DSL, the [ZDL Domain Language](https://www.zenwave360.io/docs/event-driven-design/zenwave-domain-language/), was great for describing software design-level event storming sessions.

This new DSL, the ZFL Flow Language, is about describing process modeling and event storming sessions that spans multiple systems/bounded contexts/microservices.

It's main building block are **Policies** or **Business Rules**, that connect one domain event (a bussines fact) with the next command.

The whole DSL syntax moves arround this concept of **Policy**: `when X do Y {...}`

```zfl
/**
 * Authorization hold: the processor reserves the funds. They are not
 * transferred to us yet.
 *
 * declined: the card was rejected. We will not retry. The customer must act.
 * failed: a technical error, on our side or the processor's. We retry it
 * inside the reservation window.
 */
when OrderCreated do authorizePayment {
    service PaymentsProcessing.PaymentsProcessingService // where the command runs
    @outcome(authorized)
    emits PaymentAuthorized
    @outcome(declined)
    emits PaymentDeclined
    @failure @outcome(failed)
    emits PaymentFailed
}
```

The comment is the business rule. The block under it is the same rule in a form a tool can follow.

`authorizePayment` places the hold. The processor reserves the funds. Nothing has been transferred to us yet.

`@outcome` names each branch. `authorized` means the hold is in place. `declined` means the processor rejected the card outright: we will not retry, and the customer needs to act. `failed`, marked `@failure`, means a technical error on our side or the processor's. We retry that one inside the reservation window.

The **command** `authorizePayment` and the **service** that runs it `PaymentsProcessing.PaymentsProcessingService` are declared separately. The reason is that the business flow definitions comes first as part of an EventStorming session, and `service` is optional while the flow is being discovered.

Once `services` are being discovered the ZFL can give as new view: all the commands an events arround each service, and those services can be defines using a ZDL Domain definition.

![ZFL Systems Diagram](/assets/articles/2026-11-03-sdd-from-event-storming-to-a-model-your-agents-can-read/zfl-systems.png)


## Easier to read, for humans and for LLMs

Reading and understanding these models, by a human architect or by an LLM, is way easier than reading the big amount of markdown files that LLMs can generate.

They were inpired by [JHipster JDL](https://www.jhipster.tech/jdl/getting-started) syntax, to be developer friendly, flexible and very compact.

But another important point is that they derive multiple different artifacts on the whole software development lifecycle: 

- Diagrams: flow and sequence diagrams, class diagrams, state machines...
- Docs: full dossiers explaining what you are about to build before writting any code
- APIs: you can use ZDL as a fullfeatured IDL for OpenAPI and AsyncAPI
- Backend code: for Spring Boot microservices or modular monotliths in both Java and Kotlin
- Frontend code: is theoretically possible but styles and layout customization makes it less practical to build something both of general pourpose and usefull at the same time.

You can explore them using [ZenWave Platform IDE](https://www.zenwave360.io/plugin/) integrations for editing, exploring, validating and running cli plugins...

- Aggregate class diagram and State Machine from ZDL
![ZDL Aggregate and State Machine Diagram](/assets/articles/2026-11-03-sdd-from-event-storming-to-a-model-your-agents-can-read/zdl-aggregate-and-state-machine.png)

- Multiple Sequence Diagrams for all your alternative paths
![ZFL Sequence Diagrams](/assets/articles/2026-11-03-sdd-from-event-storming-to-a-model-your-agents-can-read/zfl-sequence-diagrams.png)


## It connects everything

And the main advantage is that it can connect together all the APIs, modules, and domain models of these different bounded contexts or microservices (expressed in the ZDL language, plus OpenAPI and AsyncAPI).

Your agents can reason about all your architecture, whether you are designing it or just undestanding the radius blast of a particular change. Your agents hace an extraordinary capacity to hold in context this compacted representation of your systems, reason about them and help you find your way arround and detect inconsistencies before you jump into the implementation.

ZenWave also provides a deterministic library [zenwave-architecture](https://github.com/ZenWave360/zenwave-architecture) that can build a graph from all your models and APIs defined in the [architectural manifest master yaml](/articles/arcadia/011-master-yaml-architecture-manifest/) or generate a full [Event Catalog from your APIs](/articles/arcadia/012-arcadia-architecture-manifest-meets-event-catalog/)

![Master Yaml: a Manifes of your Entire Architecture](https://ivangsa.com/assets/articles/arcadia-editions/011-master-yaml-architecture-manifest.webp)

And stay tunned because next step is to provide an MCP server that brings this same deterministic graph to your agents context, on demand.
