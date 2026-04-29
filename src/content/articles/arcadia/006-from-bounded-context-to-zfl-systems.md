---
title: "Completing the ZFL: From Bounded Contexts to Systems"
summary: "Event Storming has two phases. First you discover the flow. Then you find the centers of gravity. The service field in ZFL is where that second phase becomes explicit — and where you start building the architectural world model."
date: 2026-05-15
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/06-completing-the-zfl/arcadia.png
featuredImageAlt: "ZFL flow with service fields filled in for Arcadia Editions"
readingTime: "6 min read"
draft: true
---

# Completing the ZFL: From Bounded Contexts to Systems

In the [previous post](/blog/from-events-to-bounded-contexts-finding-arcadia-editions-architecture) we found six bounded contexts inside the PlaceOrder flow. Customer and Identity, Catalog and Inventory, Orders, Payments, Fulfillment, Notifications.

We found them by looking for centers of gravity. Business objects that receive commands, enforce rules, own state, and emit events. Each center of gravity became a bounded context.

But we left the ZFL incomplete. If you go back to the [flow we wrote](/blog/from-event-storming-to-zfl-translating-business-flows-into-code), every `when` block has a `service` field that is empty. We skipped it deliberately. At that point we did not know who owned what.

Now we do. And filling in those fields is not just housekeeping.

## Why this matters

A ZFL flow with no `service` fields tells you what happens. It does not tell you who is responsible.

That distinction matters for two reasons.

The first is practical. In the next post we are going to feed this ZFL to an AI agent and ask it to generate the ZDL domain model skeletons — one per bounded context. Without the `service` fields, the agent has no way to know which commands and events belong to which context. The mapping is implicit in our heads. It needs to be explicit in the file.

The second reason is bigger. Every field we fill in here is a link in the architectural world model. A navigable connection between the flow and the domain model, between the command and the service that handles it, between the service and the aggregate that owns the state. The more explicit we are, the richer the graph. Architects can follow those links. Tools can follow those links. AI agents can follow those links.

We are not filling in fields. We are building the index of the architecture.

## Two phases, one ZFL

Event Storming works in two phases.

The first phase is discovering the flow. You put events on the board, connect them with commands, link everything with policies. You are telling the story of the business. No boundaries yet. Just sequence and causality.

The second phase is finding the centers of gravity. You step back and look at the board. Which commands and events cluster around the same business object? You draw circles. Each circle is a candidate bounded context.

The ZFL mirrors this exactly. You write the flow first with no `service` fields. That is phase one. Then once you have found your bounded contexts, you go back to each `when` block and fill in who owns that command. That is phase two.

The `service` field is where the second phase of Event Storming becomes explicit in the ZFL.

## The service field: how explicit can you be?

The `service` field accepts three levels of precision.

Just the system: `CatalogProducts`. Just the system and the service: `CatalogProducts.CatalogProductsService`. All the way to the aggregate: `CatalogProducts.CatalogProductsService.Product`.

The more precise you are, the more the platform can do with it. At the system level you know which bounded context owns the command. At the service level you know which service handles it. At the aggregate level you know which business object owns the state — and that link travels all the way to the ZDL model, the AsyncAPI spec, and the generated code.

For now we stop at the service level. We have not modeled the ZDL yet and do not know the aggregate names. Once the domain models exist, we will come back and complete these fields. That is when the cross-navigation becomes fully wired.

## Filling in the service fields

Walk the flow. For each `when` block, ask: which bounded context owns this command?

The answer comes directly from the previous post. We already did the thinking. Now we are just writing it down.

`CustomerPlacesOrder` triggers `reserveStock`. Stock reservation is owned by Catalog and Inventory. That is `CatalogProducts.CatalogProductsService`.

`StockReserved` triggers `createOrder`. Order creation is owned by Orders. That is `OrdersCheckout.OrdersCheckoutService`.

`OrderCreated` triggers `authorizePayment`. Payment authorization is owned by Payments. That is `PaymentsProcessing.PaymentsProcessingService`.

`PaymentAuthorized` triggers `confirmOrder`. Order confirmation is owned by Orders. Back to `OrdersCheckout.OrdersCheckoutService`.

`OrderConfirmed` triggers `scheduleFulfillment`. Fulfillment is owned by Fulfillment. That is `FulfillmentShipping.FulfillmentShippingService`.

`OrderConfirmed` also triggers `sendOrderConfirmation`. Notifications are owned by Notifications. That is `NotificationsConsumer.NotificationsConsumerService`.

The failure paths follow the same logic. `StockUnavailable` triggers a notification. `PaymentFailed` triggers order cancellation owned by Orders, then stock release owned by Catalog and Inventory. `PaymentTimeout` cancels the order, also owned by Catalog and Inventory.

Each policy block now has a complete picture. Event on the left. Command in the middle. Service named. Event on the right.

## The systems block emerges

Once every `when` block has a `service` field, the `systems` block writes itself. It is the set of unique services you referenced, with a pointer to where their domain model will live.

```zfl
systems {
    @zdl("catalog-products-api/domain-model.zdl")
    CatalogProducts {
        service CatalogProductsService
    }
    @zdl("orders-checkout-api/domain-model.zdl")
    OrdersCheckout {
        service OrdersCheckoutService
    }
    @zdl("payments-processing-api/domain-model.zdl")
    PaymentsProcessing {
        service PaymentsProcessingService
    }
    @zdl("fulfillment-shipping-api/domain-model.zdl")
    FulfillmentShipping {
        service FulfillmentShippingService
    }
    @zdl("notifications-consumer-api/domain-model.zdl")
    NotificationsConsumer {
        service NotificationsConsumerService
    }
}
```

The `@zdl` annotation points to the domain model file for each system. That pointer is a navigation edge. From the flow you can jump to the model. From the model you can jump back to every command and event in the flow that touches it.

You can build this block by hand by collecting the services you referenced. A format and cleanup tool is coming to the ZenWave Platform that will do this automatically. For now, by hand is fine.

## The completed ZFL

With the `systems` block at the top and every `service` field filled in, the ZFL is complete.

```zfl
systems {
    @zdl("catalog-products-api/domain-model.zdl")
    CatalogProducts {
        service CatalogProductsService
    }
    @zdl("orders-checkout-api/domain-model.zdl")
    OrdersCheckout {
        service OrdersCheckoutService
    }
    @zdl("payments-processing-api/domain-model.zdl")
    PaymentsProcessing {
        service PaymentsProcessingService
    }
    @zdl("fulfillment-shipping-api/domain-model.zdl")
    FulfillmentShipping {
        service FulfillmentShippingService
    }
    @zdl("notifications-consumer-api/domain-model.zdl")
    NotificationsConsumer {
        service NotificationsConsumerService
    }
}

flow PlaceOrderFlow {
    @actor(Customer)
    start CustomerPlacesOrder { }

    when CustomerPlacesOrder do reserveStock {
        service CatalogProducts.CatalogProductsService
        event StockReserved
        event StockUnavailable
    }

    when StockReserved do createOrder {
        service OrdersCheckout.OrdersCheckoutService
        event OrderCreated
    }

    when OrderCreated do authorizePayment {
        service PaymentsProcessing.PaymentsProcessingService
        event PaymentAuthorized
        event PaymentFailed
    }

    when PaymentAuthorized do confirmOrder {
        service OrdersCheckout.OrdersCheckoutService
        event OrderConfirmed
    }

    when OrderConfirmed do scheduleFulfillment {
        service FulfillmentShipping.FulfillmentShippingService
        event FulfillmentScheduled
    }

    when OrderConfirmed do sendOrderConfirmation {
        service NotificationsConsumer.NotificationsConsumerService
        event OrderConfirmationSent
    }

    when StockUnavailable do sendStockUnavailableNotification {
        service NotificationsConsumer.NotificationsConsumerService
        event StockUnavailableNotificationSent
    }

    when PaymentFailed do cancelOrder {
        service OrdersCheckout.OrdersCheckoutService
        event OrderCancelled
        event PaymentFailedNotificationSent
    }

    when OrderCancelled do releaseStock {
        service CatalogProducts.CatalogProductsService
        event StockReleased
    }

    @time("10 minutes after OrderCreated and not PaymentAuthorized or PaymentFailed")
    start PaymentTimeout {
        orderId String
    }

    when PaymentTimeout do cancelOrder {
        service CatalogProducts.CatalogProductsService
    }

    end {
        completed: OrderConfirmationSent
        stockGone: StockUnavailableNotificationSent
        paymentDeclined: PaymentFailedNotificationSent
    }
}
```

This is the document that the next post takes as input. Three files go in — the ZDL grammar, a working example, and this ZFL. Five domain model skeletons come out. One per bounded context.

The `systems` block is the glue. Without it the AI has no way to know which commands belong to which context. With it the mapping is explicit, the generation is mechanical, and the architectural world model has its first real shape.