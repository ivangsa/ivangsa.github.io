---
title: "From Events to Bounded Contexts: Finding Arcadia Editions' Architecture"
summary: "Large systems become unmanageable when everyone shares the same model. This post walks through the heuristic we used to find those boundaries in Arcadia Editions, looking for the business objects that act as centers of gravity for commands and events, and using the consistency requirement to draw the line around each one"
date: 2026-05-25
tags:
  - arcadia
  - EDA
  - DDD
  - Governance
featured: false
featuredImage: assets/articles/arcadia/arcadia.png
featuredImageAlt: ""
readingTime: "4 min read"

draft: true
---

After the Event Storming session, we had a wall full of events.

`StockReserved`. `OrderCreated`. `PaymentAuthorized`. `FulfillmentScheduled`.

A timeline that told the story of a customer buying a limited edition game during a drop. Clear, honest, grounded in the business.

But Event Storming does not give you bounded contexts. It gives you signals. Turning those signals into boundaries requires a different kind of thinking.

This post is about one heuristic that worked for us. Not a formal algorithm. One question, applied consistently.

---

## The question

Look for the business objects that act as centers of gravity for commands and events.

A center of gravity is a business object that receives commands, owns state, enforces rules, changes over time, and emits domain events as a result. If something behaves like that, it is not just a concept. It is a candidate model. And very likely a candidate bounded context.

The boundary of that model is drawn by its aggregate. The aggregate is the thing that enforces consistency. What must always be consistent belongs inside it. What can tolerate eventual consistency lives outside it.

That consistency requirement is concrete. During a hot drop at Arcadia, stock reservation and order creation cannot be eventually consistent. If you confirm an order and the stock was already gone, you have a real business problem. But order confirmation and the notification email can absolutely arrive a second apart. That is fine.

Where strong consistency is required, you have the boundary of an aggregate. Aggregates are the centers of gravity around which bounded contexts form.

---

## Applying it to the Place Order flow

Walk the flow. At each step, ask: what is the business object at the center of this cluster of commands and events?

**Stock and Inventory.** Something receives `ReserveStock` and `ReleaseStock`, enforces scarcity, and emits `StockReserved`, `StockReleased`, `StockDepleted`. It owns what can be sold and how much of it exists. It is the thing that makes the Arcadia business model real. This is a center of gravity. It becomes **Catalog and Inventory**.

**Order.** Something receives `PlaceOrder`, `ConfirmOrder`, `CancelOrder`. It owns the commercial commitment and the order lifecycle. It does not own payment or stock. It reacts to them through events.

`OrderConfirmed` is the pivotal event. To the left of it, the language is commercial. To the right of it, the language becomes operational. Picking, packing, shipping. That shift in meaning is the boundary signal. This is a center of gravity. It becomes **Orders**.

**Payment.** Something receives `AuthorizePayment` and `RefundPayment`, owns the payment lifecycle, integrates with external providers, and emits `PaymentAuthorized` and `PaymentFailed` as facts the rest of the system reacts to. Completely different rules, completely different lifecycle. This is a center of gravity. It becomes **Payments**.

**Fulfillment.** Something receives `ScheduleFulfillment`, `ShipOrder`, `MarkAsDelivered`. Its language is entirely different from the commercial language of Orders. A different world with its own rules. This is a center of gravity. It becomes **Fulfillment**.

**Notifications.** Something reacts to events from every other context and decides what to communicate, how, and through which channel. It does not own any core business state. Three different events, three different messages, one customer on the other end. This is a center of gravity. It becomes **Notifications**.

**Customer.** Something receives `RegisterCustomer`, owns the customer profile, enforces loyalty rules, and changes independently of everything else. This is a center of gravity. It becomes **Customer and Identity**.

---

## Not every concept becomes a bounded context

During Event Storming you will see many concepts that look important but are not centers of gravity on their own.

`OrderLine`, `Address`, `PaymentMethod`, `StockReservation`. These do not receive independent commands. They do not have their own lifecycle. They do not emit meaningful events on their own. They belong inside a model, not as a model.

The test is simple: can it change independently? Does it enforce its own rules? Does it emit its own facts? Mostly no means it belongs inside a center of gravity, not as one.

---

## Other signals worth knowing

Centers of gravity is not the only way to find boundaries. There are others.

Language shifts. When people in a real workshop start arguing about what an event means, or use different words for the same concept, that friction is a boundary. Two mental models colliding. The `OrderConfirmed` pivot above is a textbook example: same event, completely different meaning to Fulfillment, Payments, and Notifications.

![Hotspots on the Event Storming board highlighting friction and boundary signals in the PlaceOrder flow](/assets/articles/arcadia-editions/eventstorming-events-commands-policies-hotspots.jpg)

Organizational boundaries. Conway's Law works in both directions. If two teams have been arguing about who owns something for months, that ownership dispute is telling you something real about the domain.

Rate of change. If two things always change together, they probably belong together. If they change independently, they probably do not.

All of these are signals, not rules. They are useful when they confirm each other. When they contradict each other, you need to think harder.

---

## What this gives us

Six candidate bounded contexts: Customer and Identity, Catalog and Inventory, Orders, Payments, Fulfillment, Notifications.

![Event Storming board showing the six bounded contexts as systems in Arcadia Editions](/assets/articles/arcadia-editions/eventstorming-systems.jpg)

They were not invented. They emerged from one question applied consistently across the flow.

But these are working hypotheses, not final answers. The real validation happens in the next step, when we model each context explicitly in ZDL. That is where an aggregate that seemed coherent turns out to be two things pretending to be one. Where a boundary that seemed obvious needs rethinking.

We start with Orders. It is the center of gravity of the entire flow and the one that will force the most concrete decisions: what fields does an order carry, what does its state machine look like, what goes into `OrderCreated` that Payments needs to do its job.

Those decisions travel all the way to the Kafka schema and the consumer code. That is what the next post is about.
