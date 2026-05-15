---
title: "From Event Storming to ZFL: Translating Business Flows into Code"
summary: "Event Storming gives you sticky notes. ZFL gives them a structured home. Here is how the concepts map."
date: 2026-05-14
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/zfl-flow.png
featuredImageAlt: "Event Storming board for the PlaceOrder flow of Arcadia Editions"
readingTime: "8 min read"
draft: false
---

In the [previous post](/articles/arcadia/003-event-storming-arcadia-editions) we ran an Event Storming session for the PlaceOrder flow of Arcadia Editions. We have the board. We have the sticky notes. We understand what happens when a collector clicks reserve during a hot drop.

Now we need to give those findings a structured home.

Event Storming sessions often end as Miro boards, photos, and shared memory. Useful in the workshop. Hard to version. Hard to search. Hard to connect to generated APIs, services, tests, documentation, or architecture views.

ZFL, the flow modeling language of the ZenWave Platform, captures the same findings as text: readable by humans, parseable by tools, and stable enough to save, link, review, and navigate.

This post is about that translation. Not discovering the flow again, but taking the board we already have and turning it into a structured language.

## The core idea: Event Storming and ZFL speak the same language

Event Storming has four core concepts that we care about here.

- An **event** is something that happened in the business. Past tense. `OrderCreated`. `StockReserved`. `PaymentFailed`. Orange sticky notes.

- A **command** is something that asks the system to do work. An intention. `ReserveStock`. `AuthorizePayment`. `SendOrderConfirmation`. Blue sticky notes.

- A **policy** is a business rule that connects an event to a command. When this happens, do that. Lilac sticky notes. This is where the business logic lives.

- An **actor** is who or what initiates the first command. A customer. A timer. An external system.

ZFL maps directly to these concepts. Once you see the mapping, reading and writing ZFL from an Event Storming board becomes mechanical.

| Event Storming | ZFL |
|---|---|
| Actor | `@actor` |
| Starting trigger / user intent | `start` |
| Policy: when trigger or event, do command | `when ... do ...` |
| Command outcome | `emits ...` |
| Timer / time-based policy | `@time(...)` + `start` |
| End states | `end { ... }` |

![Event Storming board showing domain events and commands for the PlaceOrder flow](/assets/articles/arcadia-editions/eventstorming-events-commands.jpg)

## Start with the actor

On the board, the flow starts with a customer beginning checkout. That is an actor triggering the first command.

In ZFL:

```zfl
@actor(Customer)
start StartOrderCheckout {
    items SKU[]
}
```

`@actor` names who initiates the flow. `start` names the trigger or user intent that opens it. The body contains the data that enters the flow.

The actual command still appears in the first policy:

```zfl
when StartOrderCheckout do startOrderCheckout {
    ...
}
```

`StartOrderCheckout` is why the flow begins. `startOrderCheckout` is the command that reacts to it.

## Policies are the main building block

![Event Storming board showing events, commands, and policies for the PlaceOrder flow](/assets/articles/arcadia-editions/eventstorming-events-commands-policies.jpg)

This is where Event Storming and ZFL align most clearly. Every policy on the board, "when this event happens, do this command", becomes a `when ... do ...` block.

For example, once an order has been created, payment needs to be authorized:

```zfl
when OrderCreated do authorizePayment {
    service PaymentsProcessing.PaymentsProcessingService
    emits PaymentAuthorized
    emits PaymentDeclined
    emits PaymentFailed
}
```

The `when` side is the event that triggers the policy. The `do` side is the command. The `emits` lines are the possible outcomes of that command.

You will also see `service` lines in some examples. They belong to a later modeling step, when we discover bounded contexts, systems, services, and aggregates. The notation can go up to `System.Service.Aggregate`, but you only write the level you have already discovered. At this stage, it is also fine to omit `service` completely.

This is the default move when translating an Event Storming board into ZFL:

1. Find a policy sticky note.
2. Read the event before it.
3. Read the command after it.
4. Write `when Event do command`.
5. Add the events that command can emit.

From there, the flow chains naturally. Each outcome can trigger the next policy.

```zfl
when PaymentAuthorized do confirmOrder {
    service OrdersCheckout.OrdersCheckoutService
    emits OrderConfirmed
}

when OrderConfirmed do scheduleFulfillment {
    service FulfillmentShipping.FulfillmentShippingService
    emits FulfillmentScheduled
    emits FulfillmentFailed
}

when FulfillmentScheduled do capturePayment {
    service PaymentsProcessing.PaymentsProcessingService
    emits PaymentCaptured
    emits PaymentCaptureFailed
}
```

If the Event Storming board is the visual story, ZFL is the structured version of that same story.

## Branches stay explicit

Event Storming does not let you hide failure paths. When you ask "what can go wrong?", the board fills up. ZFL keeps those branches visible.

Payment authorization can succeed, be declined, or fail for a technical reason. Each outcome is named:

```zfl
when OrderCreated do authorizePayment {
    service PaymentsProcessing.PaymentsProcessingService
    emits PaymentAuthorized
    emits PaymentDeclined
    emits PaymentFailed
}
```

Then each outcome can continue in a different direction:

```zfl
when PaymentFailed do retryPayment {
    service PaymentsProcessing.PaymentsProcessingService
    emits PaymentRetried
    emits PaymentRetryExhausted
}

when PaymentDeclined, PaymentRetryExhausted do releaseStock {
    service CatalogProducts.CatalogProductsService
    emits StockReleased
}
```

This is one of the reasons a text model is useful. The board helps the team discover the branches. ZFL keeps them precise enough for tools to analyze, generate from, and cross-navigate.

## Direct calls

Most policies translate cleanly as event-to-command relationships. But when we turn a workshop board into a structured model, we sometimes discover that a step should be modeled as a direct synchronous call.

Stock reservation is the clearest example in this flow.

When a customer starts checkout during a limited edition drop, we want to know immediately whether the stock can be reserved. We do not want to model that as a long event-driven loop just to find out whether the copy is available. The checkout command needs the response now, because the next step depends on it.

ZFL models that with `call`:

```zfl
when StartOrderCheckout do startOrderCheckout {
    service OrdersCheckout.OrdersCheckoutService
    call reserveStock
    on StockReserved emits OrderCreated
    on StockUnavailable emits StockUnavailable
}
```

The policy is still there: when `StartOrderCheckout`, do `startOrderCheckout`. Inside that command, we make a direct call to `reserveStock`.

The response of that call is handled with `on <Response> emits ...`. If stock is reserved, the flow emits `OrderCreated`. If stock is unavailable, the flow emits `StockUnavailable`.

The called operation is modeled separately:

```zfl
do reserveStock {
    service CatalogProducts.CatalogProductsService
    emits response StockReserved
    response StockUnavailable
}
```

A standalone `do` block defines a command that can be called directly. Its outcomes are `response` values because the caller is waiting for them.

Sometimes the response is also important outside the caller. `emits response StockReserved` means the caller receives `StockReserved` synchronously, and the same outcome is published as an event for the rest of the system. `StockUnavailable` stays only as a response because no order was created and there is nothing else to coordinate.

The important modeling rule stays simple: use `when ... do ...` for policies, and use `call` when the structured model needs an immediate response from another command.

## Time-based policies

Event Storming also surfaces rules that happen after time passes. A customer who starts checkout and never finishes is not an edge case for Arcadia Editions. During a drop, holding stock forever is business damage.

On the board, this is a time-based policy. After ten minutes without a terminal payment outcome, the reservation expires.

ZFL has a `@time` annotation for exactly this:

```zfl
@actor(Scheduler)
@time("10 minutes after OrderCreated and not PaymentAuthorized or PaymentDeclined or PaymentRetryExhausted")
start ReservationExpired {
    orderId String
}
```

`@time` defines the condition. `start` names the event produced by the scheduler. From there it behaves like any other event in the flow:

```zfl
when ReservationExpired do releaseStock {
    service CatalogProducts.CatalogProductsService
    emits StockReleased
}
```

The timing rule from the workshop is no longer just a note on the side of the board. It is part of the model.

## End states

Every Event Storming session needs to answer: how does this flow end? What are the possible final states?

ZFL makes this explicit with an `end` block:

```zfl
end {
    completed: PaymentCaptured
    stockGone: StockUnavailableNotificationSent
    orderCancelled: OrderCancelledNotificationSent
}
```

Each ending gets a name. Each one points to an event in the flow. That gives readers and tools a clear set of terminal outcomes.

## The full flow

Put it all together and the ZFL model has this shape:

```zfl
flow PlaceOrderFlow {
    @actor(Customer)
    start StartOrderCheckout {
        ...
    }

    when StartOrderCheckout do startOrderCheckout {
        call reserveStock
        on StockReserved emits OrderCreated
        on StockUnavailable emits StockUnavailable
    }

    do reserveStock {
        service CatalogProducts.CatalogProductsService
        emits response StockReserved
        response StockUnavailable
    }

    when OrderCreated do authorizePayment {
        ...
    }

    @actor(Scheduler)
    @time("10 minutes after OrderCreated and not PaymentAuthorized or PaymentDeclined or PaymentRetryExhausted")
    start ReservationExpired {
        orderId String
    }

    end {
        completed: PaymentCaptured
        stockGone: StockUnavailableNotificationSent
        orderCancelled: OrderCancelledNotificationSent
    }
}
```

The complete flow is available in [004-place-order-flow.zfl](./004-place-order-flow.zdl). There you can see the same patterns repeated across the whole checkout flow: policies, direct calls, compensations, time-based triggers, and explicit end states.

If you have the Event Storming board in front of you, you can read the full ZFL file top to bottom and point to the sticky note behind most lines.

That is the point. ZFL is not a different design. It is the design you already discovered, represented in a format that can be versioned, reviewed, parsed, linked, explored, and used by the ZenWave Platform to generate the next set of artifacts.

In the next post we look at how ZFL maps to bounded contexts and how those boundaries become the structure of your systems.
