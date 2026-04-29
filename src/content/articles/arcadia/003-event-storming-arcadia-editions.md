---
title: "Event Storming Arcadia Editions: Discovering the Order Flow"
summary: ""
date: 2026-05-01
tags:
  - arcadia
  - EDA
  - DDD
  - Governance
featured: false
featuredImage: assets/articles/02-event-storming-arcadia-editions/arcadia.png
featuredImageAlt: ""
readingTime: "8 min read"

draft: true
---

Before writing a single line of code, we need to understand what actually happens in the business.

Not what the database looks like. Not what the API endpoints are. What happens. In the real world. When a customer does something, what does the business do next?

In the [previous post](/blog/ddd-problem-space-vs-solution-space) we argued that the solution space **your business** needs to be discovered. If it is already known, you are building a commodity. Event Storming is how you discover it.

This is what that looks like in practice.

## What is Event Storming?

Event Storming is a workshop technique invented by Alberto Brandolini. You get domain experts and developers in the same room, you cover a wall with paper, and you start writing down domain events on orange sticky notes. Things that happened. Past tense. `OrderPlaced`. `PaymentFailed`. `StockReserved`.

No database schemas. No class diagrams. No API specs. Just events, in the order they happen, telling the story of the business.

From those events we discover commands, the things that trigger them. Aggregates, the things that own them. Policies, the business rules that connect them. And boundaries, the natural lines where one team's responsibility ends and another begins.

It sounds simple but it is not. This is not about sticky notes, it's about building a shared understanding of the problem space your business is trying to solve.

## Why Event Storming for Arcadia Editions?

Arcadia Editions is a limited edition board game retailer. Scarcity is not a side effect of their business model. It is the core of it. When a new drop goes live, hundreds of collectors hit the site at the same time, chasing the same twenty copies of a hand-illustrated collector edition.

Trust is the product. A client who clicks reserve needs to know that copy is theirs until they finish. If it is not, they are gone. Not just from this drop. For good.

Event Storming puts business experts and technical experts in the same room to talk about exactly that. How do you build trust in the checkout process? What has to be true for a client to feel safe? What happens when it breaks?

What happens if two customers try to buy the last copy at the same time? What happens if payment fails after we already reserved the stock? What happens if a customer starts checkout and never finishes?

These are not edge cases. For Arcadia Editions, during a drop, these are the normal cases.

## The flow we discovered

Starting from the customer placing an order, we discovered a flow that touches five different bounded contexts. Catalog, Orders, Payments, Fulfillment, and Notifications.

The happy path is straightforward. Stock is reserved, order is created, payment is authorized, fulfillment is scheduled, customer gets a confirmation. Done.

But the interesting parts are the failure paths. Stock gone during a hot drop. Payment declined after reservation. A customer who starts checkout and disappears. Each one of these needs a compensation. Stock released, order cancelled, customer notified.

And there is a timeout. If payment is not completed within ten minutes, the reservation is automatically released. Because holding stock for a customer who walked away is business damage during a drop where others are waiting.

## From Event Storming to ZFL

This is where the ZenWave Platform enters the picture.

The findings of an Event Storming session live on sticky notes and photos. Useful in the moment, hard to share, impossible to version control. ZFL, the flow modeling language of the ZenWave Platform, gives those findings a home. A text format that captures commands, events, services, and policies in a way that is readable by humans and processable by tools.

In the next post we will walk through the full ZFL for the Arcadia Editions order flow. How we go from sticky notes to a versioned, shareable, machine-readable flow definition. And from there to AsyncAPI specs that describe every event in the system.

The full flow is already on GitHub at [github.com/arcadia-editions](https://github.com/arcadia-editions).

Event Storming does not give you code. It gives you clarity. And clarity is what makes the code worth writing.