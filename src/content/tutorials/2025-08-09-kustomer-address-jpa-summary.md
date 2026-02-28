---
title: "Kustomer Address JPA (Kotlin): DSL-Driven Backend Service Generation"
date: 2025-08-09
summary: "How to derive a Kotlin/JPA customer-address service from a ZenWave DSL model with REST endpoints and domain events."
tags:
  - ddd
  - kotlin
  - jpa
  - spring-boot
  - domain-events
  - zenwave-sdk
featured: true
featuredImage: assets/tutorials/KustomerAddressJPAKotlin.png
featuredImageAlt: "Kustomer Address JPA (Kotlin): DSL-Driven Backend Service Generation"
lang: en
---

## Enterprise Application from a Single DSL Model

This example implements a complete enterprise application using API-First principles with OpenAPI and AsyncAPI and DDD modeling. The entire service—domain model, REST endpoints, persistence layer, and event contracts—is generated from a single DSL definition, targeting Kotlin as the implementation language.

Using ZenWave Domain Model and ZenWave SDK, you define the domain model once and let the tooling derive everything else. This keeps your OpenAPI spec, AsyncAPI contracts, and Kotlin implementation code perfectly aligned.

---

## One Model, Complete Kotlin Service

The Customer Address service starts with a ZenWave Domain Language (ZDL) model. From that model, the entire Spring Boot Kotlin service is generated:

- **REST API**: OpenAPI-aligned endpoints for commands and queries  
- **Events**: AsyncAPI-compliant domain events published to Kafka
- **Domain layer**: `Customer` aggregate with addresses and payment methods
- **Persistence**: JPA entities and repositories mapped to the aggregate structure

If you change the model, you can regenerate different artifacts, and all layers stay synchronized. Speeding up development and reducing errors while leveraging Kotlin's concise syntax and null-safety features.

---

## Explore the Example

**Documentation**  
https://www.zenwave360.io/docs/examples/ddd-examples/kustomer-address-jpa/

**Source Code**  
https://github.com/ZenWave360/zenwave-playground/tree/main/examples/kustomer-address-jpa

