---
title: "Spec Driven Development: From EventStorming to a model your agents can read"
summary: "Introducing ZFL, a flow language for process-level event storming."
date: 2026-11-09
tags:
  - zenwave
  - ddd
  - eda
  - architecture
  - ai
featured: false
featuredImage: assets/articles/2026-11-09-sdd-from-event-storming-to-a-model-your-agents-can-read/zfl-eventflow-and-systems.png
featuredImageAlt: ZFL with EventFLow and Systems diagrams
readingTime: "4 min read"
draft: true
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

These DSLs are good but are not enough. We need another way to express business workflows that go through the whole system we are implementing.

## Event storming has two levels

And this is why early on this year I've created another DSL to express the findings of process-level event storming sessions.

While the previous DSL, the ZDL domain language, was great for describing software design-level event storming sessions.

This new DSL, the ZFL Flow Language, is about describing process modeling and event storming sessions.

It's main building block are **Policies** or business rules, that connect one domain event (a bussines fact) with the next command.

The whole DSL syntax moves arround this concept of **Policy**: `when X do Y {...}`

```zfl
/**
  * We place an authorization hold on the customer's payment method. Funds
  * are reserved at the processor but not yet transferred to us. A decline
  * means the processor rejected the card outright and we will not retry —
  * the customer needs to act. A failure means a technical error on our side
  * or the processor's, which we will retry within the reservation window.
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

The command (authorizePayment) and the service that runs it (PaymentsProcessing.PaymentsProcessingService) are declared separately. The reason is that the business flow definitions comes first as part of an EventStorming session, and `service` is optional while the flow is being discovered.

Once `services` are being discovered the ZFL can give as new view: all the commands an events arround each service, and those services can be defines using a ZDL Domain definition.

![ZFL Systems Diagram](/assets/articles/2026-11-09-sdd-from-event-storming-to-a-model-your-agents-can-read/zfl-systems.png)


## It connects everything

And the main advantage is that it can connect together all the APIs, modules, and domain models of these different bounded contexts or microservices (expressed in the ZDL language, plus OpenAPI and AsyncAPI).

## Easier to read, for humans and for LLMs

Reading and understanding these models, by a human architect or by an LLM, is way easier than reading the big amount of markdown files that LLMs can generate.
