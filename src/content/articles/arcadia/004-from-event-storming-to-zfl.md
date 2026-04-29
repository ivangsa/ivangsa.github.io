---
title: "From Event Storming to ZFL: Translating Business Flows into Code"
summary: "Event Storming gives you sticky notes. ZFL gives them a structured home. Here is how the concepts map."
date: 2026-05-08
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/004-from-event-storming-to-zfl/arcadia.png
featuredImageAlt: "Event Storming board for the PlaceOrder flow of Arcadia Editions"
readingTime: "8 min read"
draft: true
---

# From Event Storming to ZFL: Translating Business Flows into Code

In the [previous post](/blog/event-storming-arcadia-editions-discovering-the-order-flow) we ran an Event Storming session for the PlaceOrder flow of Arcadia Editions. We have the board. We have the sticky notes. We understand what happens when a collector clicks reserve during a hot drop.

Now we need to give those findings a home.

Event Storming sessions live on Miro boards and photos. Useful in the moment. Hard to share. Impossible to version control. ZFL, the flow modeling language of the ZenWave Platform, is a text format that captures the same concepts in a way that is readable by humans and processable by tools.

This post is a tutorial. We are going to walk through the PlaceOrder flow and translate it from Event Storming concepts to ZFL, piece by piece.

## The core idea: Event Storming and ZFL speak the same language
 
Event Storming has four core concepts that we care about here.
 
An **event** is something that happened in the business. Past tense. `OrderPlaced`. `StockReserved`. `PaymentFailed`. Orange sticky notes.
 
A **command** is something that triggers an event. An intention. `ReserveStock`. `AuthorizePayment`. Blue sticky notes.
 
A **policy** is a business rule that connects an event to a command. When this happens, do that. Lilac sticky notes. This is where the business logic lives.
 
An **actor** is who or what initiates the first command. A customer. A timer. An external system.
 
ZFL maps directly to these concepts. Once you see the mapping, reading and writing ZFL from an Event Storming board becomes mechanical.
 
| Event Storming | ZFL |
|---|---|
| Actor | `@actor` |
| Starting command | `start` |
| Policy: when event, do command | `when ... do ...` |
| Event | `event` |
| Timer / time-based policy | `@time(...)` + `start` |
| End states | `end { ... }` |
 
## Starting point: the actor and the first command
 
On the Miro board, the flow starts with a customer clicking reserve. That is an actor triggering a command.
 
In ZFL:
 
```zfl
@actor(Customer)
start CustomerPlacesOrder { }
```
 
`@actor` names who initiates the flow. `start` names the command that kicks it off. Simple.
 
## The happy path: policies all the way down
 
This is where Event Storming and ZFL align most clearly. Every policy on the board — when this event happens, do this command — becomes a `when ... do ...` block in ZFL.
 
Stock reservation comes first. Scarcity is the core business constraint for Arcadia Editions. Before an order exists, the stock has to be held.
 
On the board: when `CustomerPlacesOrder`, do `ReserveStock`. That command produces either `StockReserved` or `StockUnavailable`.
 
In ZFL:
 
```zfl
when CustomerPlacesOrder do reserveStock {
    event StockReserved
    event StockUnavailable
}
```
 
The `when` is the event. The `do` is the command. The `event` lines are the possible outcomes. One block, one policy.
 
From there the happy path chains naturally. Each event triggers the next command.
 
```zfl
when StockReserved do createOrder {
    event OrderCreated
}
 
when OrderCreated do authorizePayment {
    event PaymentAuthorized
    event PaymentFailed
}
 
when PaymentAuthorized do confirmOrder {
    event OrderConfirmed
}
 
when OrderConfirmed do scheduleFulfillment {
    event FulfillmentScheduled
}
 
when OrderConfirmed do sendOrderConfirmation {
    event OrderConfirmationSent
}
```
 
Notice that `OrderConfirmed` triggers two commands in parallel. Fulfillment and notification happen at the same time. On the Miro board those are two separate policies branching from the same event. In ZFL you just write two `when OrderConfirmed` blocks.
 
## The failure paths
 
Event Storming does not let you hide the failure paths. When you ask "what can go wrong", the board fills up. ZFL handles them exactly the same way as the happy path. A failure event is still an event. It still triggers a policy.
 
Remember that `reserveStock` produces two possible outcomes. `StockReserved` takes us down the happy path. `StockUnavailable` is the first branch:
 
```zfl
when StockUnavailable do sendStockUnavailableNotification {
    event StockUnavailableNotificationSent
}
```
 
The second branch comes from `authorizePayment`, which also produces two outcomes. `PaymentAuthorized` continues the happy path. `PaymentFailed` triggers a compensation chain. The stock that was reserved has to be released:
 
```zfl
when PaymentFailed do cancelOrder {
    event OrderCancelled
    event PaymentFailedNotificationSent
}
 
when OrderCancelled do releaseStock {
    event StockReleased
}
```
 
Each failure path traces back to a branching point on the board. One command, two possible events, two separate paths forward.
 
## The timeout path
 
This is where Event Storming surfaces something that is easy to miss in a normal design session. A customer who starts checkout and never finishes is not an edge case for Arcadia Editions. During a drop, it is a real problem. Holding stock for someone who walked away is business damage.
 
Event Storming models this as a time-based policy. After ten minutes with no payment, something has to happen.
 
ZFL has a `@time` annotation for exactly this:
 
```zfl
@time("10 minutes after OrderCreated and not PaymentAuthorized or PaymentFailed")
start PaymentTimeout {
    orderId String
}
 
when PaymentTimeout do cancelOrder {
    service CatalogProducts.CatalogProductsService
}
```
 
`@time` defines the condition. `start` names the synthetic event it produces. From there it is just another policy. When `PaymentTimeout`, do `cancelOrder`.
 
## The end states
 
Every Event Storming session needs to answer: how does this flow end? What are the possible final states?
 
ZFL makes this explicit with an `end` block:
 
```zfl
end {
    completed: OrderConfirmationSent
    stockGone: StockUnavailableNotificationSent
    paymentDeclined: PaymentFailedNotificationSent
}
```
 
Three outcomes. Order confirmed, stock unavailable, payment declined. Each one named. Each one traceable back to an event on the board.
 
## The full flow
 
Put it all together and the full ZFL for the PlaceOrder flow looks like this:
 
```zfl
flow PlaceOrderFlow {
    @actor(Customer)
    start CustomerPlacesOrder { }
 
    when CustomerPlacesOrder do reserveStock {
        event StockReserved
        event StockUnavailable
    }
 
    when StockReserved do createOrder {
        event OrderCreated
    }
 
    when OrderCreated do authorizePayment {
        event PaymentAuthorized
        event PaymentFailed
    }
 
    when PaymentAuthorized do confirmOrder {
        event OrderConfirmed
    }
 
    when OrderConfirmed do scheduleFulfillment {
        event FulfillmentScheduled
    }
 
    when OrderConfirmed do sendOrderConfirmation {
        event OrderConfirmationSent
    }
 
    when StockUnavailable do sendStockUnavailableNotification {
        event StockUnavailableNotificationSent
    }
 
    when PaymentFailed do cancelOrder {
        event OrderCancelled
        event PaymentFailedNotificationSent
    }
 
    when OrderCancelled do releaseStock {
        event StockReleased
    }
 
    @time("10 minutes after OrderCreated and not PaymentAuthorized or PaymentFailed")
    start PaymentTimeout {
        orderId String
    }
 
    when PaymentTimeout do cancelOrder { }
 
    end {
        completed: OrderConfirmationSent
        stockGone: StockUnavailableNotificationSent
        paymentDeclined: PaymentFailedNotificationSent
    }
}
```
 
If you have the Event Storming board in front of you, you can read this top to bottom and point to the sticky note behind every line.
 
That is the point. ZFL is not a new design. It is the design you already did, in a format you can version, share, and feed to tools.
 
In the next post we look at how ZFL maps to bounded contexts and how those boundaries become the seams of your AsyncAPI specs.
