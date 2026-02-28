---
title: "Customer Address JPA Service: Enterprise Application from a Single DSL Model"
date: 2025-06-23
summary: "Model a Customer aggregate once in DSL, then generate the complete Java/Spring Boot service—REST API, JPA persistence, and Kafka events—all from a single source of truth."
tags:
  - ddd
  - jpa
  - spring-boot
  - asyncapi
  - domain-events
  - zenwave-sdk
featured: true
featuredImage: assets/tutorials/CustomerAddressJPA.png
featuredImageAlt: "Customer Address JPA Service: Enterprise Application from a Single DSL Model"
lang: en
---

## Enterprise Application from a Single DSL Model

This example implements a complete enterprise application using API-First principles with OpenAPI and AsyncAPI and DDD modeling. The entire service—domain model, REST endpoints, persistence layer, and event contracts—is generated from a single DSL definition.

Using ZenWave Domain Model and ZenWave SDK, you define the domain model once and let the tooling derive everything else. This keeps your OpenAPI spec, AsyncAPI contracts, and implementation code perfectly aligned.

---

## One Model, Complete Service

The Customer Address service starts with a ZenWave Domain Language (ZDL) model. From that model, the entire Spring Boot service is generated:

- **REST API**: OpenAPI-aligned endpoints for commands and queries  
- **Events**: AsyncAPI-compliant domain events published to Kafka
- **Domain layer**: `Customer` aggregate with addresses and payment methods
- **Persistence**: JPA entities and repositories mapped to the aggregate structure

If you change the model, you can regenerate different artifacts, and all layers stay synchronized. Speeding up development and reducing errors.

---

## Explore the Example

**Documentation**  
https://www.zenwave360.io/docs/examples/ddd-examples/customer-address-jpa/

**Source Code**  
https://github.com/ZenWave360/zenwave-playground/tree/main/examples/customer-address-jpa


