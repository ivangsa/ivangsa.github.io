---
title: "From Events to Bounded Contexts: Finding Arcadia Editions' Architecture"
summary: "Large systems become unmanageable when everyone shares the same model. This post walks through the heuristic we used to find those boundaries in Arcadia Editions, looking for the business objects that act as centers of gravity for commands and events, and using the consistency requirement to draw the line around each one"
date: 2026-05-22
tags:
  - arcadia
  - EDA
  - DDD
  - Governance
featured: false
featuredImage: assets/articles/arcadia-editions/005-finding-bounded-contexts.png
featuredImageAlt: ""
readingTime: "4 min read"

draft: false
---

After the Event Storming session, we had a wall full of events.

`StockReserved`. `OrderCreated`. `PaymentAuthorized`. `FulfillmentScheduled`.

A timeline that told the story of a customer buying a limited edition game during a new release. Non technical, from the business point of view, in the business language, grounded in the business.

Event Storming gives you an story-line, it brings up conversation arround hotspots and also helps discover boundaries. Now is time to identify those boundaries that make the business language self contained.

With boundary identification we are entering in the **Solution Space**. See [Problem Space vs Solution Space](/articles/arcadia/002-ddd-problem-space-vs-solution-space/).

This post is about one heuristic that worked for me. This is not a formal algorithm but one question, applied consistently.

---

## The question

Which business objects that act as **centers of gravity** for commands and events?

That is an aggregate, a center of gravity, a business object that receives commands, owns state, enforces rules, changes over time, and emits domain events as a result. If something behaves like that, it is a candidate model. And very likely a candidate for a system boundary.

The aggregate is the thing that enforces consistency. And aggregates are the centers of gravity around which bounded contexts form.

We still need to decide which aggregates to group arround a bounded context, but their gravity and interactions are the best clue for discovering bounded contexts.

---

## Other signals worth knowing

Centers of gravity is not the only way to find boundaries. There are others.

**Language shifts**. When people in a real workshop start arguing about what an event means, or use different words for the same concept, that friction is a boundary. Two mental models colliding. The `OrderConfirmed` pivot above is a textbook example: same event, completely different meaning to Fulfillment Shipping, Payments Processing, and Notifications Consumer.

**Pivotal events**. Some events change the kind of work the business is doing. Before `OrderConfirmed`, the flow is about intent, stock, and payment authorization. After `OrderConfirmed`, the flow becomes about fulfillment, capture, and communication. When an event changes the language around it, pay attention. It is often sitting on a boundary.

Organizational boundaries. Conway's Law works in both directions. If two teams have been arguing about who owns something for months, that ownership dispute is telling you something real about the domain.

Rate of change. If two **things always change together**, they probably belong together. If they change independently, they probably do not.

All of these are signals, not rules. They are useful when they confirm each other. When they contradict each other, you need to think harder.

---

## Applying it to the Place Order flow

Walk the flow. At each step, ask: what is the business object at the center of this cluster of commands and events?

**Catalog Inventory.** Something receives `reserveStock` and `releaseStock`, enforces scarcity, and emits `StockReserved`, `StockUnavailable`, `StockReleased`. It owns whether a checkout can claim stock, which reservation holds it, and when that stock returns to the pool. The center of gravity is not the product description. It is the reservation of scarce inventory. That becomes Catalog Inventory.

**Orders Checkout.** Something receives `startOrderCheckout`, `confirmOrder`, `cancelOrder`. It owns the commercial commitment and the order lifecycle. It does not own payment or stock. It reacts to them through events.

`OrderConfirmed` is the pivotal event. To the left of it, the language is commercial. To the right of it, the language becomes operational. Picking, packing, shipping. That shift in meaning is the boundary signal. This is a center of gravity. It becomes Orders Checkout.

**Payments Processing.** Something receives `authorizePayment`, `retryPayment`, `capturePayment`, `voidPayment`, owns the payment lifecycle, integrates with external providers, and emits `PaymentAuthorized`, `PaymentDeclined`, `PaymentFailed`, `PaymentCaptured`, `PaymentVoided` as facts the rest of the system reacts to. Completely different rules, completely different lifecycle. This is a center of gravity. It becomes Payments Processing.

**Fulfillment Shipping.** Something receives `scheduleFulfillment`. It decides whether fulfillment can be arranged and emits `FulfillmentScheduled` or `FulfillmentFailed`. Its language is entirely different from the commercial language of Orders. A different world with its own rules. This is a center of gravity. It becomes Fulfillment Shipping.

**Notifications Consumer.** Something reacts to events from every other context and decides what to communicate, how, and through which channel. It does not own any core business state. Three different outcomes, three different messages, one customer on the other end. This is a center of gravity. It becomes Notifications Consumer.

**Customer.** The customer is still important, but in this flow it appears as an actor, not as a bounded context. The customer starts `StartOrderCheckout`. The flow does not show customer profile rules, identity rules, or loyalty rules. So from this flow alone, Customer and Identity is not a context we can claim yet.

**Product Catalog.** Product Catalog clearly exists in Arcadia Editions. Someone has to define the SKU, name, price, edition size, artwork, launch date, and whether an edition is quantity tracked or serialized. But in this flow, Product Catalog does not receive a command. `StartOrderCheckout` already carries the SKUs the customer wants to buy. The flow needs to know whether stock can be reserved, not how the product was created or merchandised.

That is an important distinction. A flow discovers the services needed by that flow. It does not prove that no other services exist.

So Product Catalog remains part of the broader Arcadia architecture, but it is outside the Place Order flow. Catalog Inventory is inside this flow because it receives `reserveStock` and `releaseStock`, owns reservation state, and emits stock events.

---

## Not every concept becomes a bounded context

During Event Storming you will see many concepts that look important but are not centers of gravity on their own.

`OrderLine`, `Address`, `PaymentMethod`. These do not receive independent commands. They do not have their own lifecycle. They do not emit meaningful events on their own. They belong inside a model, not as a model.

`StockReservation` is different in this flow. It is the thing created, held, expired, and released by the inventory rules. That makes it a good aggregate candidate inside Catalog Inventory, even if the customer-facing product information still belongs to a product catalog model.

The test is simple: can it change independently? Does it enforce its own rules? Does it emit its own facts? Mostly no means it belongs inside a center of gravity, not as one.

---


## What this gives us

Five candidate bounded contexts for this flow: Catalog Inventory, Orders Checkout, Payments Processing, Fulfillment Shipping, Notifications Consumer.

Other contexts, such as Product Catalog or Customer and Identity, still exist in the wider business architecture. They are just not participants in this specific flow.

![Event Storming board showing the bounded contexts as systems in Arcadia Editions](/assets/articles/arcadia-editions/eventstorming-systems.jpg)

But **these are working hypotheses**, not final answers. Bounded contexts belong to the **solution space**, the business solution we are discovering. They are fluid and may change as new information arrives.

The next step is to make them explicit in the ZFL. That is where a boundary stops being a note on the side and becomes part of the flow.

In the next post, **Completing the ZFL: From Bounded Contexts to Systems**, we will fill those `service` fields, add the `systems` block, and that will give as a differnt view, derived from this flow: the map of services or bonded contexts we will be implementing and conecting together through APIs.

![Completing the ZFL: From Bounded Contexts to Systems](/assets/articles/arcadia-editions/zfl-systems.png)
