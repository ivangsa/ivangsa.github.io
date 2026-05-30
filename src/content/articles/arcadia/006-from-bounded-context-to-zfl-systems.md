---
title: "Completing the ZFL: From Bounded Contexts to Systems"
summary: "Event Storming has two phases. First you discover the flow. Then you find the centers of gravity. The service field in ZFL is where that second phase becomes explicit, and where you start building the architectural world model."
date: 2026-06-01
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/zfl-systems.png
featuredImageAlt: "ZFL flow with service fields filled in for Arcadia Editions"
readingTime: "6 min read"
draft: false
---

In the [previous post](/articles/arcadia/005-finding-bounded-contexts/) we found the main centers of gravity inside the PlaceOrder flow. Catalog Inventory, Orders Checkout, Payments Processing, Fulfillment Shipping, and Notifications Consumer.

We found them by looking for centers of gravity. Business objects that receive commands, enforce rules, own state, and emit events. Each center of gravity became a bounded context.

But we left the ZFL incomplete. If you go back to the [flow we wrote](/articles/arcadia/004-from-event-storming-to-zfl/), every command block has a `service` field that is empty. We skipped it deliberately. At that point we did not know who owned what.

Now we do. And filling in those fields is not just housekeeping.

## Why this matters

A ZFL flow with no `service` fields tells you what happens. It does not tell you who is responsible.

That distinction matters for two reasons.

The first is practical. In the next post we are going to feed this ZFL to an AI agent and ask it to generate the ZDL domain model skeletons, one per bounded context. Without the `service` fields, the agent has no way to know which commands and events belong to which context. The mapping is implicit in our heads. It needs to be explicit in the file.

The second reason is bigger. Every field we fill in here is a link in the architectural world model. A navigable connection between the flow and the domain model, between the command and the service that handles it, between the service and the aggregate that owns the state. The more explicit we are, the richer the graph. Architects can follow those links. Tools can follow those links. AI agents can follow those links.

We are not filling in fields. We are building the index of the architecture.

## Two phases, one ZFL

Event Storming works in two phases.

The first phase is discovering the flow. You put events on the board, connect them with commands, link everything with policies. You are telling the story of the business. No boundaries yet. Just sequence and causality.

The second phase is finding the centers of gravity. You step back and look at the board. Which commands and events cluster around the same business object? You draw circles. Each circle is a candidate bounded context.

The ZFL mirrors this exactly. You write the flow first with no `service` fields. That is phase one. Then once you have found your bounded contexts, you go back to each command block and fill in who owns that command. That is phase two.

The `service` field is where the second phase of Event Storming becomes explicit in the ZFL.

## The service field: how explicit can you be?

The `service` reference accepts different levels of precision:

**System**: `CatalogInventory`. 

**System.Service**: `CatalogInventory.InventoryService`. 

**System.Service.Aggregate**: `CatalogInventory.InventoryService.StockReservation`

The more precise you are, the more the platform can do with it. At the system level you know which bounded context owns the command. At the service level you know which service handles it. At the aggregate level you know which business object owns the state, and that link travels all the way to the ZDL model, the AsyncAPI spec, and the generated code.

You can use either `.` or `/` as separator, so `CatalogInventory.InventoryService.StockReservation` is equivalent to `CatalogInventory/InventoryService/StockReservation`

For this flow example we mostly use service level references. For inventory, we also name the aggregate just as an example, so you know how to explicit that level of precision.

NOTE: when you are using ZenWave Platform IntelliJ plugin, the `systems` block can be generated for you by reading the `service` fields.

## Filling in the service fields

Walk the flow. For each command block, ask: which system/service owns this command?

The answer comes directly from the previous post. We already did the thinking. Now we are just writing it down.

`StartOrderCheckout` triggers `startOrderCheckout`. The checkout request is owned by Orders Checkout. That is `OrdersCheckout.OrdersCheckoutService`.

Inside that step, Orders Checkout calls `reserveStock`. Stock reservation is owned by Catalog Inventory. That is `CatalogInventory.InventoryService`.

When stock is reserved, Orders Checkout emits `OrderCreated`. That event triggers `authorizePayment`. Payment authorization is owned by Payments Processing. That is `PaymentsProcessing.PaymentsProcessingService`.

If authorization fails for a technical reason, `PaymentFailed` triggers `retryPayment`. The retry is still owned by Payments Processing. A successful retry loops back into `authorizePayment`. A hard decline or exhausted retry path moves toward cancellation.

`PaymentAuthorized` triggers `confirmOrder`. Order confirmation is owned by Orders Checkout. Back to `OrdersCheckout.OrdersCheckoutService`.

`OrderConfirmed` triggers `scheduleFulfillment`. Fulfillment is owned by Fulfillment Shipping. That is `FulfillmentShipping.FulfillmentShippingService`.

`FulfillmentScheduled` triggers `capturePayment`. Money moves only when the order is physically ready to leave the warehouse. Payment capture is owned by Payments Processing.

`PaymentCaptured` triggers `sendOrderConfirmation`. Notifications are owned by Notifications Consumer. That is `NotificationsConsumer.NotificationsConsumerService`.

The failure paths follow the same logic. `StockUnavailable` triggers a stock unavailable notification. `FulfillmentFailed` and `PaymentCaptureFailed` trigger `voidPayment`. `PaymentDeclined`, `PaymentRetryExhausted`, `PaymentVoided`, and `ReservationExpired` trigger `releaseStock`. `StockReleased` triggers `cancelOrder`, and `OrderCancelled` triggers a cancellation notification.

Each block now has a complete picture. Trigger on the left. Command in the middle. Service named. Outcome on the right.

## The systems block emerges

Once every command block has a `service` field, the `systems` block writes itself. It is the set of unique services you referenced, with a pointer to where their domain model will live.

There is a subtle but important limit here. The `systems` block is derived from the services referenced by this flow. It is not a complete enterprise map.

Product Catalog, for example, is a real Arcadia service. It owns product descriptions, prices, edition metadata, launch dates, and tracking mode. But `PlaceOrderFlow` does not call it. Checkout starts with SKUs, and the flow only needs Catalog Inventory to reserve or release scarce stock.

So Product Catalog belongs in the broader architecture manifest, but not necessarily in this flow specific `systems` block. ZFL should show the participants in the business process being modeled, not every service the company owns.

```zfl
systems {
    @zdl("catalog-inventory-api/domain-model.zdl")
    CatalogInventory {
        service InventoryService for (StockReservation) {
            commands: reserveStock, releaseStock
        }
    }
    @zdl("orders-checkout-api/domain-model.zdl")
    OrdersCheckout {
        service OrdersCheckoutService {
            commands: startOrderCheckout, confirmOrder, cancelOrder
        }
    }
    @zdl("payments-processing-api/domain-model.zdl")
    PaymentsProcessing {
        service PaymentsProcessingService {
            commands: authorizePayment, retryPayment, capturePayment, voidPayment
        }
    }
    @zdl("fulfillment-shipping-api/domain-model.zdl")
    FulfillmentShipping {
        service FulfillmentShippingService {
            commands: scheduleFulfillment
        }
    }
    @zdl("notifications-consumer-api/domain-model.zdl")
    NotificationsConsumer {
        service NotificationsConsumerService {
            commands: sendOrderConfirmation, sendStockUnavailableNotification, sendOrderCancelledNotification
        }
    }
}
```

The `@zdl` annotation points to the domain model file for each system. That pointer is a navigation edge. From the flow you can jump to the model. From the model you can jump back to every command and event in the flow that touches it.

You can build this block by hand by collecting the services you referenced. But you do not have to keep it in sync manually forever.

The ZenWave Platform Plugin for IntelliJ IDEA already includes an action for this: **Code > Organize ZFL Services**. It reads the `service` fields used in the flow, organizes the `systems` block, and creates any missing pieces it can infer. That keeps the map of services aligned with the command ownership written in the `when` and `do` blocks.

One small caveat. The platform is evolving as we build this in public, so the exact menu names may change over time. The idea is the important part: the `systems` block should be derived from the service references in the flow, not maintained as a disconnected list.

## The relevant parts

We do not need to paste the whole flow here. The complete file is available in [place-order-flow.zfl](https://github.com/arcadia-editions/arcadia-editions-docs/blob/main/business-flows/place-order-flow.zfl).

The important change is visible in the command blocks. Each command now says who owns it.

```zfl
when StartOrderCheckout do startOrderCheckout {
    service OrdersCheckout.OrdersCheckoutService
    call reserveStock
    on StockReserved emits OrderCreated
    on StockUnavailable emits StockUnavailable
}

do reserveStock {
    service CatalogInventory.InventoryService
    response StockReserved
    response StockUnavailable
}
```

The same pattern appears in the event driven part of the flow.

```zfl
when OrderCreated do authorizePayment {
    service PaymentsProcessing.PaymentsProcessingService
    emits PaymentAuthorized
    emits PaymentDeclined
    emits PaymentFailed
}

when OrderConfirmed do scheduleFulfillment {
    service FulfillmentShipping.FulfillmentShippingService
    emits FulfillmentScheduled
    emits FulfillmentFailed
}
```

And the timer now has an owner too.

```zfl
@actor(Scheduler)
@time("10 mins after OrderCreated and not PaymentAuthorized or PaymentDeclined or PaymentRetryExhausted")
start ReservationExpired {
    orderId String
}
```

## What Comes Next

That is the document that the next post takes as input. The ZFL already has boundaries, services, commands, events, and even aggregate names when we choose to model at that level.

The `systems` block is the glue. Without it, an AI agent has no way to know which commands belong to which context. With it, the mapping is explicit enough to create the scaffolding around the model.

That does not mean the agent designs the domain for us. We still model by hand. We still decide what the aggregate really owns, what fields carry meaning, what transitions are valid, and which events deserve to exist.

What the agent can do is give us a head start. It can create the folders, files, service skeletons, initial ZDL documents, and the boring structure we need before the real modeling begins.

That is where we go next. From a completed flow to the first service scaffolds.
