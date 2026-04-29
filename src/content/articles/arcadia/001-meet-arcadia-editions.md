---
title: "Meet Arcadia Editions: The Fictional Company I Built to Explore Event-Driven Architecture"
summary: ""
date: 2026-04-25
tags:
  - arcadia
  - EDA
  - DDD
  - Governance
featured: false
featuredImage: assets/articles/01-meet-arcadia-editions/arcadia.png
featuredImageAlt: ""
readingTime: "8 min read"

draft: true
---

Arcadia Editions is not a real company. I made it up.

But the problems it has are very real. And that is exactly the point.

## Why a fictional company?

I have been working with event-driven architectures for years. AsyncAPI, Kafka, domain-driven design, schema registries, Spring Boot microservices, API governance. The technology is fascinating. But explaining it with generic examples like `OrderPlaced`, `UserRegistered` or `PaymentProcessed` always feels hollow. You understand the concept but you miss the texture. The real decisions. The trade-offs that only appear when you have an actual business to model.

So I built Arcadia Editions. A fictional company with a real domain, real complexity, and real architectural challenges. Something I can use to showcase how I think about event-driven systems, and specifically how tools like the [ZenWave Platform](https://zenwave360.io) help you build them without losing your mind.

## What is Arcadia Editions?

Arcadia Editions is a global specialty retailer for board game enthusiasts and tabletop collectors.

They curate and sell limited edition board games, premium collector sets, and exclusive collaborations with independent game designers and illustrators. Every product they carry is chosen for craft and originality. The kind of game that brings people around a table and keeps them there.

They operate physical stores in cities with strong tabletop communities. Barcelona, Amsterdam, Tokyo, Austin. Each store is part shop, part community play space. Online they serve a global tribe of collectors. People who follow drops, join waitlists, and pre-order months in advance. They know the release calendar better than the staff.

Scarcity is intentional. Arcadia Editions does not restock. When a limited edition sells out, it is gone. That is not a bug. That is the whole point.

## Why this domain is interesting architecturally

That last paragraph is the key.

Scarcity plus global demand plus omnichannel operations is a combination where a good implementation can make or break the client experience. That is the core of the business.

The core idea of DDD is simple: understand the problem space first. Only then design a solution.

The problem space is your client's problem. Your business is the solution.

For Arcadia Editions that means every product drop, every waitlist update, every sold-out notification, every cross-channel inventory sync. Trust is the product. If a client reserves a copy, that copy has to hold. No surprises at checkout.

That is where the domain earns its complexity. Not because it is trendy. Because the business demands it.

## The bounded contexts

Arcadia Editions architecture is organized around six core domains, and we will discover how to find them later:

- **Customer and Identity** — profiles, loyalty tiers, authentication
- **Catalog and Inventory** — products, pricing, stock levels, drop management
- **Orders** — cart, checkout, order lifecycle
- **Payments** — authorization, failure handling, refunds
- **Fulfillment** — picking, packing, shipping, delivery tracking
- **Notifications** — email, SMS, push, reacting to everything else

Simple enough to understand in one sitting. Rich enough to surface real architectural problems.

## What comes next

In the following posts I will start modeling Arcadia Editions domain using Event Storming and ZDL, the domain-specific language at the heart of the ZenWave Platform. From the domain model we will derive AsyncAPI specs, Kafka topics, schema registry entries, and eventually running Spring Boot microservices.

All of it is available on GitHub at [github.com/arcadia-editions](https://github.com/arcadia-editions). The code is real. The company is not. But the architecture decisions you will find there are decisions you can take to your day job.

Because that is the whole point of Arcadia Editions.
