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

If you have been following the series, now we have generated the scaffold for all five service repos. One per bounded context. The AI read the ZFL, understood the business context, and produced a grounded starting point for each one.

This was just a starting point. Now it is our job to design each bounded context with its entities, aggregates, commands and events.

We'll be starting with the Orders Checkout bounded context because every other service in this flow reacts to the orders it creates, confirms, or cancels.

## ZenWave Domain Language: all the DDD building blocks without boilerplate

[ZDL](https://www.zenwave360.io/docs/event-driven-design/zenwave-domain-language/) is a compressed blueprint of the functionality. It contains all the building blocks of DDD. Aggregates, entities, value objects, commands, events, state machines. Everything that expresses the business.

Its main job is to help experts think clearly. ZDL gives us a compact and unambiguous way to talk about the model, validate it with business experts, and keep that mental model visible as the software design moves downstream to developers.

Then, because the language is machine friendly, we can leverage [ZenWave SDK](https://www.zenwave360.io/docs/zenwave-sdk/) to generate the boring parts that are already expressed in the model. APIs, events, domain models, tests. The same names and rules can flow through OpenAPI, AsyncAPI, backend code, documentation, and tests without the ubiquitous language slowly drifting in each artifact.

## Modeling the core of the business

We are not modeling tables or endpoints first. We are modeling a business domain.

This is the core of the Arcadia business. The part that is new, that has no off-the-shelf answer, that we are still discovering. CRUD can be the right tool for generic or supporting domains, and ZDL handles that well, but here the important thing is behavior.

**Design Level Event Storming** gives us the language and the mental model from the people who understand the business. ZDL is how we write that model down in a form that is still readable by humans, but precise enough for tools. That shortens the feedback loop between business experts and developers while keeping the language coherent from discovery to implementation.

In this domain the sequence matters. An order moves through states. Some transitions are valid. Some are not. That is not a technical detail. That is the business rule.

**State machines are paramount** because entities and aggregates always have a lifecycle. Even in the most basic CRUD application, records are created, updated, archived, deleted, approved, rejected, enabled or disabled. There is always some progression, even if we do not make it explicit.

When that lifecycle matters to the business, we should model it directly. A state machine gives that lifecycle a clear shape: the valid states, the valid transitions, and the operations that move the entity from one state to another.

## The Order aggregate

We start with the aggregate. In ZDL an aggregate is the consistency boundary. The thing that enforces the rules. Everything that must always be consistent lives inside it.

For Orders Checkout that is the Order itself. It owns the order lifecycle. It does not own payment processing or catalog inventory. It starts the checkout and then reacts to business facts from the other bounded contexts.

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

The `@lifecycle` annotation names the field that carries the state and the initial value. From this moment, the Order is not a row in a table. It is a business object with a defined lifecycle.

> **Note:** ZDL supports two styles of aggregate modeling: The data-centric style shown here keeps commands and events at the service level. ZDL also supports a behavior-centric style where the aggregate itself models its own commands and events, closer to what DDD purists would call a rich domain model. That style makes the most sense when a service coordinates between two or more aggregates. We are not covering it in this tutorial but it is there when you need it.

## Commands as transitions

Each meaningful business operation is a named command. Commands are grouped in `Services` like this `service OrdersCheckoutService for (Order)`.

ZDL decorators document how each command enters the system, whether through a REST operation or an incoming event, and give ZenWave SDK enough information to generate draft contracts when we own those entry points.

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

The `@transition` annotations are the first explicit documentation of the state machine. They make the lifecycle visible in a way that domain experts and technical experts can discuss together. An order can only be confirmed if it is in CREATED state. It can be cancelled from CREATED or CONFIRMED, but not once it is already CANCELLED. There is no command that moves an order backward.

Later, when we generate or implement the service, those same transitions become guards in the code. They prevent a command from being executed when the aggregate is in an invalid state. The rule is not hidden in an `if` statement that we have to rediscover later. It is part of the model from the beginning.

Notice also that `startOrderCheckout` is a REST command initiated by an actor. `confirmOrder` arrives after payment has been authorized, and `cancelOrder` arrives when stock has been released. Same command concept, different transport. The model expresses both.

## Modeling Domain Events

Commands express intent. Events express facts.

`startOrderCheckout`, `confirmOrder`, and `cancelOrder` are things we ask the Orders Checkout service to do. `OrderCreated`, `StockUnavailable`, `OrderConfirmed`, and `OrderCancelled` are things that already happened in the business. That past-tense language matters. An event is not a request for another service to do something. It is a fact published by the bounded context that owns the aggregate.

Events carry the information about relevant changes inside a bounded context. They are meant to be published to the outside world, so they eventually need to be documented through an API-first specification like AsyncAPI.

In ZDL, events are a compact IDL for that contract. AsyncAPI becomes the reviewed external contract for outside communication, but writing the event first in ZDL gives us a concise representation that ZenWave SDK can use to generate the draft AsyncAPI definition.

The `withEvents` clause connects a command with the domain events it can emit. Then we model those events explicitly:

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

These events are part of the public language of the bounded context. Other services do not need to know how Orders stores its data or implements its workflow. They react to the facts Orders publishes.

This is also where the model becomes an event contract. The `@asyncapi` decorators describe how each event leaves the system: the channel, the topic, and the payload shape. From a compact event definition, ZenWave SDK can generate the corresponding AsyncAPI schema, message, channel, and send operation.

For example, `OrderCreated` becomes an AsyncAPI schema with the `orderId` and `version` fields. It also becomes a message pointing to that schema, a channel named `OrderCreatedChannel`, and a send operation for publishing that message to the configured topic.

There is one important detail: only emitted events are included in the generated AsyncAPI definition. Defining an event is not enough. The event must be referenced by a service command with `withEvents`, because that is what tells the model this service actually publishes it.

The important part is that the event contract is not invented later by a developer while wiring Kafka. It comes from the same model that names the commands, the aggregate, and the state machine. The transition changes the aggregate state, and the emitted event tells the rest of the system what business fact just became true.

ZenWave SDK Backend Plugin can generate the code that publishes those events as part of the service commands. The event data structures themselves are generated from the AsyncAPI side by the ZenWave AsyncAPI plugins. That separation is useful: ZDL gives us the compact domain model, AsyncAPI gives us the external contract, and the generators keep both aligned.

## From the model to backend building blocks

This is where ZenWave SDK starts to pay off in a very practical way.

Once the domain model is explicit, we can use the growing list of [ZenWave SDK plugins](https://www.zenwave360.io/zenwave-sdk/) to generate many of the building blocks of a Spring Boot backend application, in Java or Kotlin. Not the business decisions. Those still belong to us. But the repetitive structure around those decisions can come from the model.

The [ZDL to OpenAPI plugin](https://www.zenwave360.io/zenwave-sdk/plugins/zdl-to-openapi/) can turn REST-facing services and DTOs into an OpenAPI definition. The [ZDL to AsyncAPI plugin](https://www.zenwave360.io/zenwave-sdk/plugins/zdl-to-asyncapi/) can do the same for emitted events and async operations. From there, the API-first plugins can generate the adapters around those contracts.

For example, the [OpenAPI Controllers plugin](https://www.zenwave360.io/zenwave-sdk/plugins/openapi-controllers/) can generate Spring MVC controller implementations, mappings and tests from the OpenAPI contract and the ZDL model. The [Backend Application Default plugin](https://www.zenwave360.io/zenwave-sdk/plugins/backend-application-default/) can generate the backend core: entities, repositories, service interfaces, service implementations, mappers, package structure and event publishing hooks, following the selected project layout.

The important point is not that generation replaces design. It is the opposite. Because the design is captured in ZDL, generation can preserve it across the application. The aggregate, commands, transitions, events, APIs, controllers, persistence and tests all start from the same language.

That gives us a much faster feedback loop. We can change the model, regenerate the boring parts, and focus our attention on the parts that actually require judgment: the business behavior, the edge cases, and the conversations with domain experts.
