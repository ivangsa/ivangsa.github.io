---
title: "Domain Modeling with ZDL: Aggregates, Commands, Events, and State Machines"
summary: "ZDL is a compressed blueprint of the business: aggregates, commands, events, and lifecycles captured in one readable model. The point is not that generation replaces design, but the opposite: because the design is written down as ubiquitous language, generation can preserve it across contracts, code, documentation, and tests."
date: 2026-06-25
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/2026-03-28-ZenWave_DSL_now_supports_State_Machines/state-machines.excalidraw.svg
featuredImageAlt: "ZDL domain model for the Orders bounded context in Arcadia Editions"
draft: false
---

If you have been following the series, by now we have generated the scaffold for all five service repos, one per bounded context. The AI read the ZFL, understood the business context, and produced a grounded starting point for each one.

That was just a starting point, and now it is our job to design each bounded context with its entities, aggregates, commands and events.

We'll start with the Orders Checkout bounded context, because every other service in this flow reacts to the orders it creates, confirms or cancels.

## ZenWave Domain Language: all the DDD building blocks without boilerplate

[ZDL](https://www.zenwave360.io/docs/event-driven-design/zenwave-domain-language/) is a compressed blueprint of the functionality, and it contains all the building blocks of DDD: aggregates, entities, value objects, commands, events and state machines, everything that expresses the business.

Its main job is to help experts think clearly. ZDL gives us a compact and unambiguous way to talk about the model, validate it with business experts, and keep that mental model visible as the software design moves downstream to developers.

And because the language is machine friendly, we can use [ZenWave SDK](https://www.zenwave360.io/docs/zenwave-sdk/) to generate the boring parts that are already expressed in the model: APIs, events, domain models and tests. The same names and rules can flow through OpenAPI, AsyncAPI, backend code, documentation and tests, so the ubiquitous language does not slowly drift in each artifact.

## Modeling the core of the business

What we are modeling here is a business domain, before any tables or endpoints.

This is the core of the Arcadia business, the part that is new, that has no off-the-shelf answer and that we are still discovering. CRUD can be the right tool for generic or supporting domains, and ZDL handles that well, but here what matters is behavior.

Design Level Event Storming gives us the language and the mental model from the people who understand the business, and ZDL is how we write that model down in a form that humans can still read but that is precise enough for tools. That shortens the feedback loop between business experts and developers while keeping the language coherent from discovery to implementation.

In this domain the sequence matters. An order moves through states, some transitions are valid and some are not, and that is a business rule.

State machines are paramount because entities and aggregates always have a lifecycle. Even in the most basic CRUD application records are created, updated, archived, deleted, approved, rejected, enabled or disabled, so there is always some progression even if we do not make it explicit.

When that lifecycle matters to the business we should model it directly. A state machine gives the lifecycle a clear shape: the valid states, the valid transitions, and the operations that move the entity from one state to another.

## The Order aggregate

We start with the aggregate. In ZDL an aggregate is the consistency boundary, the thing that enforces the rules, so everything that must always be consistent lives inside it.

For Orders Checkout that is the Order itself. It owns the order lifecycle, but it does not own payment processing or catalog inventory, so it starts the checkout and then reacts to business facts from the other bounded contexts.

```zdl
@aggregate
@lifecycle(field: status, initial: CREATED)
entity Order {
    orderId String required unique
    status OrderStatus required
    items String[] required
    createdAt Instant
    confirmedAt Instant
    cancelledAt Instant
}

enum OrderStatus {
    CREATED
    CONFIRMED
    CANCELLED
}
```

The `@lifecycle` annotation names the field that carries the state and its initial value. From this moment the Order is a business object with a defined lifecycle, and not just a row in a table.

> **Note:** ZDL supports two styles of aggregate modeling. The data-centric style shown here keeps commands and events at the service level. The behavior-centric style lets the aggregate model its own commands and events, closer to what DDD purists would call a rich domain model, and it makes the most sense when a service coordinates two or more aggregates. We are not covering it in this tutorial, but it is there when you need it.

## Commands as transitions

Each meaningful business operation is a named command, and commands are grouped in services like `service OrdersCheckoutService for (Order)`.

ZDL decorators document how each command enters the system, whether through a REST operation or an incoming event, and they give ZenWave SDK enough information to generate draft contracts when we own those entry points.

```zdl
input StartOrderCheckoutInput {
    items String[] minlength(1)
}

input ConfirmOrderInput {
    orderId String required
}

input CancelOrderInput {
    orderId String required
}

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

The `@transition` annotations are the first explicit documentation of the state machine, and they make the lifecycle visible in a way that domain experts and technical experts can discuss together. An order can only be confirmed if it is in CREATED state. It can be cancelled from CREATED or CONFIRMED, but not once it is already CANCELLED, and no command moves an order backward.

Later, when we generate or implement the service, those same transitions become guards in the code that prevent a command from running when the aggregate is in an invalid state. So the rule is part of the model from the beginning, instead of hiding in an `if` statement that we have to rediscover later.

Notice also that `startOrderCheckout` is a REST command initiated by an actor, while `confirmOrder` arrives after payment has been authorized and `cancelOrder` arrives when stock has been released. It is the same command concept over different transports, and the model expresses both.

## Modeling domain events

Commands express intent and events express facts. `startOrderCheckout`, `confirmOrder`, and `cancelOrder` are things we ask the Orders Checkout service to do, while `OrderCreated`, `StockUnavailable`, `OrderConfirmed`, and `OrderCancelled` are things that already happened in the business. That past tense matters, because an event is a fact published by the bounded context that owns the aggregate, and not a request for another service to do something.

Events carry the information about relevant changes inside a bounded context. They are meant to be published to the outside world, so eventually they need to be documented through an API-first specification like AsyncAPI.

In ZDL, events are a compact IDL for that contract. AsyncAPI becomes the reviewed external contract for outside communication, but writing the event first in ZDL gives us a concise representation that ZenWave SDK can use to generate the draft AsyncAPI definition.

The `withEvents` clause connects a command with the domain events it can emit, and then we model those events explicitly:

```zdl
@asyncapi({ channel: "OrderCreatedChannel", topic: "orders.events.order-created" })
event OrderCreated {
    orderId String
    version Integer
}

@asyncapi({ channel: "StockUnavailableChannel", topic: "orders.events.stock-unavailable" })
event StockUnavailable {
    productId String
    requestedQuantity Integer
}

@asyncapi({ channel: "OrderConfirmedChannel", topic: "orders.events.order-confirmed" })
event OrderConfirmed {
    orderId String
    version Integer
    confirmedAt Instant
}

@asyncapi({ channel: "OrderCancelledChannel", topic: "orders.events.order-cancelled" })
event OrderCancelled {
    orderId String
    version Integer
    cancelledAt Instant
}
```

These events are part of the public language of the bounded context. Other services react to the facts Orders publishes without needing to know how Orders stores its data or implements its workflow.

This is also where the model becomes an event contract. The `@asyncapi` decorators describe how each event leaves the system: the channel, the topic and the payload shape. From a compact event definition, ZenWave SDK can generate the corresponding AsyncAPI schema, message, channel and send operation.

For example, `OrderCreated` becomes an AsyncAPI schema with the `orderId` and `version` fields, and also a message pointing to that schema, a channel named `OrderCreatedChannel`, and a send operation for publishing that message to the configured topic.

There is one important detail: only emitted events are included in the generated AsyncAPI definition. Defining an event is not enough. It also has to be referenced by a service command with `withEvents`, because that is what tells the model this service actually publishes it.

This means the event contract comes from the same model that names the commands, the aggregate and the state machine, instead of being invented later by a developer while wiring Kafka. The transition changes the aggregate state, and the emitted event tells the rest of the system what business fact just became true.

The ZenWave SDK Backend Plugin can generate the code that publishes those events as part of the service commands, while the event data structures themselves are generated from the AsyncAPI side by the ZenWave AsyncAPI plugins. That separation is useful because ZDL gives us the compact domain model, AsyncAPI gives us the external contract, and the generators keep both aligned.

## From the model to backend building blocks

Once the domain model is explicit, ZenWave SDK starts to pay off in a very practical way, because we can use the growing list of [ZenWave SDK plugins](https://www.zenwave360.io/zenwave-sdk/) to generate many of the building blocks of a Spring Boot backend application, in Java or Kotlin. The business decisions still belong to us, but the repetitive structure around those decisions can come from the model.

The [ZDL to OpenAPI plugin](https://www.zenwave360.io/zenwave-sdk/plugins/zdl-to-openapi/) can turn REST-facing services and DTOs into an OpenAPI definition, and the [ZDL to AsyncAPI plugin](https://www.zenwave360.io/zenwave-sdk/plugins/zdl-to-asyncapi/) can do the same for emitted events and async operations. From there, the API-first plugins can generate the adapters around those contracts.

For example, the [OpenAPI Controllers plugin](https://www.zenwave360.io/zenwave-sdk/plugins/openapi-controllers/) can generate Spring MVC controller implementations, mappings and tests from the OpenAPI contract and the ZDL model. The [Backend Application Default plugin](https://www.zenwave360.io/zenwave-sdk/plugins/backend-application-default/) can generate the backend core: entities, repositories, service interfaces, service implementations, mappers, package structure and event publishing hooks, following the selected project layout.

Generation does not replace design here. Because the design is captured in ZDL, generation can preserve it across the application, and the aggregate, commands, transitions, events, APIs, controllers, persistence and tests all start from the same language.

That gives us a much faster feedback loop. We can change the model, regenerate the boring parts, and focus our attention on the parts that actually require judgment, which are the business behavior, the edge cases and the conversations with domain experts.
