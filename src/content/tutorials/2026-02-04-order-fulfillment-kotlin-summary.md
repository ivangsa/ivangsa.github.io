---
title: "Order Fulfillment (Kotlin): From Ubiquitous Language to Running Service"
date: 2026-02-04
summary: "How to use a DSL to catpure the Ubiquitous Language and derive a full backend service from it."
tags:
  - ddd
  - zenwave-sdk
  - kotlin
  - spring-boot
featured: true
featuredImage: assets/tutorials/OrderFulfillmentKotlin.png
featuredImageAlt: "Order Fulfillment (Kotlin): From Ubiquitous Language to Running Service"
lang: en
---

## From Ubiquitous Language to Running Service

The real foundation of Domain-Driven Design (DDD) is the **Ubiquitous Language**: the shared vocabulary used by domain experts and developers to describe the business.

The challenge is that this language rarely survives intact once implementation begins. Concepts get diluted in the multiple layers of communication between the domain experts and the developers. Over time the codebase drifts away from the language that originally described the domain.

This example explores a different approach: **capturing the Ubiquitous Language explicitly using a lightweight Domain-Specific Language (DSL)** and deriving the rest of the system from that model.

---

## Capturing the Domain with a DSL

The service starts with a domain model written in **ZenWave Domain Language (ZDL)**.  
Instead of beginning with frameworks or infrastructure, the model defines the core concepts of the domain, such as the `Order` aggregate and its lifecycle.

DRAFT → PLACED → PAID → SHIPPED → CANCELLED

This DSL becomes the **source of truth** for the service: a precise representation of the domain concepts and the rules governing them.

---

## Deriving the System from the Model

Once the domain model is defined, the rest of the system is generated and aligned with it.

From the DSL, ZenWave derives:

- **OpenAPI contracts** for REST APIs that expose domain commands and queries
- **AsyncAPI definitions** for domain events published through Kafka
- **Kotlin + Spring Boot artifacts** including entities, APIs, and messaging scaffolding

This keeps the domain model, APIs, events, and implementation **automatically derived and aligned**, preventing the typical drift between design and code.

---

## What the Example Shows

This playground example demonstrates how a DSL-driven approach can turn a conceptual domain model into a running service while keeping the Ubiquitous Language at the center.

You will see how to:

- capture domain concepts and lifecycle rules in a DSL
- derive REST APIs and event contracts from the model
- generate a Kotlin/Spring Boot service aligned with the domain
- build an event-driven service without losing the original language of the domain

---

## Explore the Example

**Documentation**  
https://www.zenwave360.io/docs/examples/ddd-examples/order-fullillment-kotlin/

**Source Code**  
https://github.com/ZenWave360/zenwave-playground/tree/v20260120/examples/order-fulfillment-kotlin
