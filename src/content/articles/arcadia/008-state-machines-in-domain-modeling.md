---
title: "Domain Modeling with ZDL: Entities, Aggregates, and State Machines"
summary: "Our entities have a lifecycle. That lifecycle is the business logic. ZDL is the ubiquitous language that makes it readable by humans, developers, and tools alike."
date: 2026-05-29
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/08-domain-modeling-with-zdl/arcadia.png
featuredImageAlt: "ZDL domain model for the Orders bounded context in Arcadia Editions"
draft: true
---

# Domain Modeling with ZDL: Entities, Aggregates, and State Machines

In the previous post we generated the scaffold for all five service repos. One per bounded context. The AI read the ZFL, understood the business context, and produced a grounded starting point for each one.

Now we go inside. We start with Orders. It is the center of gravity of the entire PlaceOrder flow. Every other bounded context reacts to what Orders decides.

## ZDL: all the DDD building blocks without boilerplate

ZDL is a compressed blueprint of the functionality. It contains all the building blocks of DDD. Aggregates, entities, value objects, commands, events, state machines. Everything that expresses the business. Later we can leverage ZenWave SDK to generate all the boring parts that are already expressed in the model.

## Modeling the core of the business

ZDL supports CRUD modeling. For generic domains and supporting domains, CRUD is the right tool and ZDL handles it well.

But we are not modeling a generic domain here. We are modeling the core of the Arcadia business. The part that is new, that has no off-the-shelf answer, that we are still discovering.

In this domain the sequence matters. An order moves through states. Some transitions are valid. Some are not. That is not a technical detail. That is the business rule.

We model state machines because our entities have a lifecycle. And that lifecycle is the business logic.

## The Order aggregate

We start with the aggregate. In ZDL an aggregate is the consistency boundary. The thing that enforces the rules. Everything that must always be consistent lives inside it.

For Orders that is the Order itself. It owns the order lifecycle. It does not own payment or stock. It reacts to those through events.

```zdl
@aggregate
@lifecycle(field: status, initial: CREATED)
entity Order {
    status OrderStatus required
    customerId Long required
    totalAmount BigDecimal required
    reservationId Long
    paymentId Long
}

enum OrderStatus {
    CREATED, CONFIRMED, CANCELLED
}
```

The `@lifecycle` annotation names the field that carries the state and the initial value. From this moment, the Order is not a row in a table. It is a business object with a defined lifecycle.

> **Note:** ZDL supports two styles of aggregate modeling. The data-centric style shown here keeps commands and events at the service level. ZDL also supports a behavior-centric style where the aggregate itself models its own commands and events — closer to what DDD purists would call a rich domain model. That style makes the most sense when a service coordinates between two or more aggregates. We are not covering it in this tutorial but it is there when you need it.

## Commands as transitions

Each meaningful business operation is a named command. Not a generic update. A command that names what is happening and constrains when it is valid.

```zdl
@rest("/orders")
service OrdersCheckoutService for (Order) {

    @post
    @transition(to: CREATED)
    createOrder(OrderInput) Order withEvents OrderCreated

    @asyncapi({channel: "ConfirmOrderCommandsChannel", topic: "orders.commands.confirm-order"})
    @transition(from: CREATED, to: CONFIRMED)
    confirmOrder(id) Order withEvents OrderConfirmed

    @asyncapi({channel: "CancelOrderCommandsChannel", topic: "orders.commands.cancel-order"})
    @transition(from: [CREATED, CONFIRMED], to: CANCELLED)
    cancelOrder(id, CancelOrderInput) Order withEvents OrderCancelled
}
```

The `@transition` annotations are the business rules made explicit. An order can only be confirmed if it is in CREATED state. It can be cancelled from CREATED or CONFIRMED but not once it is already CANCELLED. There is no command that moves an order backward.

The invalid transitions do not exist. They are not forbidden by an `if` statement somewhere. They are simply not in the model.

Notice also that `createOrder` is a REST command — it is initiated by an actor. `confirmOrder` and `cancelOrder` arrive via async messaging — they are triggered by events from other services. Same command concept, different transport. The model expresses both.

## Why this matters in event-driven systems

In a synchronous world, invalid transitions are a bug. In an event-driven system, they are a consistency problem.

Commands arrive asynchronously. A `confirmOrder` might arrive after a `cancelOrder` due to a redelivery. Without state machine validation, you get an order that is in an inconsistent state depending on which message was processed last.

With explicit transitions, the late `confirmOrder` is rejected at the domain level. The entity is in CANCELLED state. The transition `from: CREATED` does not apply. The command is invalid and the inconsistency never happens.

The state machine is not ceremony. It is the thing that keeps the system honest under real distributed conditions.

## The model is the documentation — and the generator

Back to where we started. ZDL sits at the intersection of three worlds.

The `@lifecycle` annotation, the `enum`, and the `@transition` annotations together give any developer the complete picture of what an Order can and cannot do. Without reading any service implementation code. That is the business expert reading the same artifact as the developer.

And because ZDL is machine friendly, that same model generates the validation logic, the AsyncAPI specs, the OpenAPI spec, the Spring Boot backend. The generators read the transitions and produce code that enforces the same rules the model describes.

One model. Three worlds. That is what a ubiquitous language built for software looks like.

In the next post we look at what those generators produce and how the ZDL model travels from business discovery all the way to running code.