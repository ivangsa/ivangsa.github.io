---
title: "DDD Problem Space vs Solution Space"
summary: "The solution space is your business. But only if it needs to be discovered. If it is already known, you are not building a business, you are building a commodity."
date: 2026-05-01
tags:
  - arcadia
  - EDA
  - DDD
  - Governance
featured: false
featuredImage: assets/articles/arcadia-editions/problem-space-vs-solution-space.png
featuredImageAlt: "Event Storming board for the PlaceOrder flow of Arcadia Editions"
readingTime: "3 min read"
draft: false
---

The core idea of DDD is simple: understand the problem space first.

The problem space is your client's problem. Not your architecture. Not your stack. Your client's problem.

The solution space is your business.

But your business needs to be discovered. If the solution space is already known, you are not building a business. You are building a commodity.

This is not a technical distinction. It is a business one.

## Arcadia Editions

Arcadia Editions is a specialty retailer of limited-edition board games. I use it as a showcase domain for ZenWave Platform and event-driven architecture.

The problem space: a rare launch goes live. The window is short. Trust is fragile. Clients have been waiting months for this copy. If the checkout fails, they are gone.

The solution space: how do you reserve stock globally, in real time, across channels, before payment is confirmed? What happens if payment fails? What if two clients hit the same item at the same millisecond?

No off-the-shelf answer. That is the point. That is the business.

## Event Storming is how you discover it

Event Storming asks people to tell the story of the business in events. Not in tables. Not in APIs. In things that happen.

When a client places an order, what happens? What can go wrong? Who reacts?

Each event reveals a decision. Each decision reveals a rule. Each rule reveals something that was not obvious at the start.

The PlaceOrder flow for Arcadia Editions is above. Stock reservation, payment authorization, confirmation, failure paths. The diagram is not the output. The understanding is.

The business is in the discovery. Not in the delivery.

In the next post we walk through the full PlaceOrder flow for Arcadia Editions. Sticky notes to bounded contexts.