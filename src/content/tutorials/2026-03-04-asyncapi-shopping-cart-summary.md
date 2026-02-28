---
title: "AsyncAPI Shopping Cart: From Event Contract to Running EDA"
date: 2026-03-04
summary: "How to define an AsyncAPI + Avro contract and derive Kafka producers/consumers for a multi-module event-driven application."
tags:
  - asyncapi-generator
  - kafka
  - avro
  - zenwave-sdk
  - spring-boot
featured: true
featuredImage: assets/tutorials/ShoppingCartAsyncAPI.png
featuredImageAlt: "AsyncAPI Shopping Cart: From Event Contract to Running EDA"
lang: en
---

## Where API Drift Actually Starts

Specifications and code are two different things. Without propper enforcement mechanisms in place, in the very moment you create code from a specification API-Drift starts. It doesn't matter if you create the code manually or generate it from the specification, if generated code is editable by developers, eventually it will drift.

Over time the AsyncAPI document turns into documentation rather than the actual source of truth, and the system slowly drifts away from the contract that originally defined it.

ZenWave is designed to avoid that situation. Instead of a one-time code generation, ZenWave generates code that is not editable and must be regenerated from the specification every time it is built. If you source the AsyncAPI contract from it's canonical source, the AsyncAPI contract remains the **center of the development workflow**. Producers and consumers continuously derive their messaging layer from latest contract, keeping event payloads, channels, and operations aligned with the specification as the system evolves.

In this tutorial we will see how to prevent API-Drift during develpment using ZenWave SDK for AsyncAPI and Avro.

---

## Define the AsyncAPI Contract, Then Derive the Implementation

The Shopping Cart example models events in AsyncAPI (with Avro schemas) and uses that model to generate production-ready messaging code.

The architecture is organized in modules with clear responsibilities:

- `apis`: AsyncAPI + Avro definitions versioned and shared as artifacts
- `shopping-cart`: provider service exposing REST operations and publishing cart events
- `client`: consumer service subscribing to shopping-cart events

From the contract, ZenWave generates typed Kafka producers and consumers, including operation-oriented methods (for example cart created, item added/updated/removed, checkout), so services implement business logic without hand-writing low-level messaging plumbing.

---

## Why This Matters

By deriving code from versioned AsyncAPI contracts, teams reduce API drift and keep event payloads and channel operations aligned across producer and consumer modules. The example also demonstrates testability through in-memory implementations for event publishing/consumption flows.

---

## Explore the Example

**Documentation**  
https://www.zenwave360.io/docs/examples/eda-examples/asyncapi-shopping-cart/

**Source Code**  
https://github.com/ZenWave360/zenwave-playground/tree/main/examples/asyncapi-shopping-cart
