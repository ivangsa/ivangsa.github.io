---
title: "From ZFL to ZDL: AI-Assisted Domain Model Scaffolding"
summary: "ZFL describes a business flow with commands, events, services, and sometimes aggregate names. An AI agent can turn that into scaffolding for your service repositories."
date: 2026-06-10
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/07-from-zfl-to-zdl-using-ai/scaffolding-zenwave-services-with-ai.png
featuredImageAlt: "AI generated ZDL scaffolding for Arcadia Editions"
draft: false
---

We have already translated EventStorming, a process-modeling technique, into a structured language: [ZFL Flow Language](https://www.zenwave360.io/docs/event-driven-design/zenwave-flow-language/). It describes how commands and events move across services as part of a business flow.

We want to treat each service API and its models as products in their own right, with their own repositories, linting, validation, and publishing pipelines.

An AI agent can read the ZFL and turn it into an initial scaffold for each of those services. To do that reliably, we created a reusable agent skill.

Because we are starting Arcadia Editions from scratch, we can scaffold all those services in one shot. If we were working inside an established company, we could still ask the agent to update our domain models with newly discovered commands and events.

AI scaffolding helps us get started. It can take the ZFL and produce the first folders, files, and `domain-model.zdl` documents so we are no longer staring at a blank page.

But ZenWave Platform is the tool that helps us do the real architectural work around that scaffold. It helps us design, analyze, navigate, and investigate the system as a whole. Instead of looking at isolated repositories or disconnected contracts, we can understand the big picture of the entire company architecture: bounded contexts, business flows, APIs, events, schemas, and generated services, all connected as one navigable model.

That is the difference. AI gives us a starting structure. ZenWave Platform helps us understand what we are building, how the parts relate to each other, and where to go next.

## From one ZFL to multiple Service Repos

From the user point of view, the result is simple: from one ZFL flow, the agent generates one service scaffold per system.

For each service, you get an initial `domain-model.zdl` with the main pieces already in place:

- **A bounded context model** for that service.
- **An aggregate candidate** when the flow gives enough signal.
- **A service definition** in ZDL.
- **One command per command the service handles** in the flow.
- **The events that service emits**.
- **The first lifecycle states and transitions** when they can be inferred from the flow.

That means the flow is turned into service-level structure.

- If a command starts from an actor, you get an actor-facing command in the service model.
- If a command is triggered by another event, you get an event-driven command in the service model.
- If one service calls another synchronously, you get a command in the called service and the orchestration stays in the caller.

So the output is not one big model. It is several smaller starting points, one per service, each grounded in its part of the business flow.

**What you get is scaffolding, not a finished design.**  
The generated ZDL gives you the first structure: service, commands, events, and an initial aggregate shape. It saves you from starting from a blank page, but it does not replace domain modeling.

You still decide:

- whether the aggregate is really the right one
- which fields matter
- where the boundaries are
- which transitions are valid
- which events are worth publishing

That is the practical value of the generation step: it turns one business flow into multiple service repos with usable starting models, so you can move directly into refinement instead of setup.

## The AI skill

An AI skill is a reusable instruction pack for an agent. It gives the agent the rules, references, and examples it needs before doing a task.

For this task, the [zfl to zdl skill](https://github.com/arcadia-editions/arcadia-editions-docs/blob/main/skills/zfl-to-zdl.md) gives the agent three things:

- **The grammar** of valid ZDL.
- **A working example** to follow for structure and naming.
- **The mapping rules** from ZFL flow elements into service-level scaffolds.

The ZFL provides the business context: systems, services, commands, events, and sometimes aggregate hints. The skill provides the constraints. Together, they let the agent generate a valid starting point without inventing its own format.

![screenshot: skill setup and ZFL as input](/assets/articles/arcadia-editions/arcadia-claude-code-skill.png)

## The instruction

The instruction itself was short:

- Create one service scaffold per system in the ZFL.
- Generate an initial `domain-model.zdl` for each one.
- Include the commands, events, and aggregate candidate when the flow gives enough signal.
- Keep the result as scaffolding, not a finished model.

That last part matters. The goal is not to fake a complete design. The goal is to create a usable starting point.

Here is the service block from the Orders scaffold. The three commands show exactly how the ZFL mapping works.

```zdl
@aggregate
@lifecycle(field: status, initial: CREATED)
entity Order {
    status OrderStatus required
    // ... items OrderItems[] required
}

enum OrderStatus { CREATED, CONFIRMED, CANCELLED }

@rest("/orders")
service OrdersCheckoutService for (Order) {

    @post
    @transition(to: CREATED)
    startOrderCheckout(StartOrderCheckoutInput) Order withEvents [OrderCreated | StockUnavailable]

    @asyncapi(api: PaymentsProcessingApi, channel: PaymentAuthorizedChannel)
    @transition(from: CREATED, to: CONFIRMED)
    confirmOrder(ConfirmOrderInput) Order withEvents OrderConfirmed

    @asyncapi(api: CatalogInventoryApi, channel: StockReleasedChannel)
    @transition(from: [CREATED, CONFIRMED], to: CANCELLED)
    cancelOrder(CancelOrderInput) Order withEvents OrderCancelled
}
```

![ZDL domain model generated draft](/assets/articles/arcadia-editions/zdl-model-generated-draft.png)

The full file with the entity, lifecycle enum, events, and plugin config is in the [orders-checkout-api repo](https://github.com/arcadia-editions/orders-checkout-api/blob/main/domain-model.zdl).

The same scaffolding was generated for the other services that participate in the PlaceOrder flow: [catalog-inventory-api](https://github.com/arcadia-editions/catalog-inventory-api), [payments-processing-api](https://github.com/arcadia-editions/payments-processing-api), [fulfillment-shipping-api](https://github.com/arcadia-editions/fulfillment-shipping-api), and [notifications-consumer-api](https://github.com/arcadia-editions/notifications-consumer-api). Product Catalog has its own repo too, [catalog-products-api](https://github.com/arcadia-editions/catalog-products-api), but it is not part of this specific flow scaffold.


You can learn more about [ZFL Flow Language](https://www.zenwave360.io/docs/event-driven-design/zenwave-flow-language/) and how to map lightweight and rich domain aggregates in the official docs.

## Why AI and not a deterministic generator

ZenWave SDK already has deterministic generators. From a ZDL model it can generate AsyncAPI specs, OpenAPI specs, Spring Boot backends, and documentation. Given the same input, those generators produce the same output every time.

ZFL to ZDL is different.

The mapping is not purely mechanical. A business flow does not fully specify a domain model. It suggests service boundaries, commands, events, responsibilities, and sometimes aggregate hints, but it still leaves room for interpretation. That is where an AI agent helps: it can read the flow, follow the skill, and produce a conservative scaffold that is coherent enough to refine.

The ZFL is the map of the process. The AI prepares the workbench. We still build the model.

## Where our work continues

The scaffold is the beginning, not the end.

Inside each service repo, the real domain modeling work starts:

- What does this bounded context actually own?
- Where are the aggregate boundaries?
- Which fields carry business meaning?
- Which events are worth publishing?
- What should be exposed through REST, and what belongs in AsyncAPI?

The ZFL gave us the flow. The scaffold gave us the first structure. Now we go inside each service and discover the model.

We start with Orders, the center of gravity of the PlaceOrder flow.
