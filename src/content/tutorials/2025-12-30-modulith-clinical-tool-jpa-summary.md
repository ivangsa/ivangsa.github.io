---
title: "Clinical Tool Modulith (JPA): From Multiple Bounded Contexts to One Modular Monolith"
date: 2025-12-30
summary: "How to derive a modular monolith from multiple bounded contexts, each modeled in DSL, and generate aligned APIs and implementation."
tags:
  - ddd
  - bounded-context
  - modular-monolith
  - spring-boot
  - jpa
  - zenwave-sdk
featured: true
featuredImage: assets/tutorials/ClinicalToolModulith.png
featuredImageAlt: "Clinical Tool Modulith (JPA): From Multiple Bounded Contexts to One Modular Monolith"
lang: en
---

## Modular First, Distribution Later

Event-driven architectures are often associated with microservices, but distributing a system too early can easily become the source of accidental complexity.

Many teams start with good intentions: independent services, asynchronous communication, clear ownership boundaries. But when those boundaries are still evolving, the result is often a fragmented model and an architecture that is harder to understand than the domain it represents.

You start seeing patterns like:

- remote calls that could have been a method invocation or a simple database join
- coordination logic complexity
- duplicated concepts across services

Instead of gaining flexibility, the system becomes slower to evolve.

---

## A Modular Monolith as the Starting Point

A more pragmatic approach is to design the system as a **modular monolith** first.

ZenWave supports developing event-driven modular monoliths as first class citizens.

In this example, the domain is divided into bounded contexts such as:

`clinical`, `users`, `documents`, `masterdata`, and `surveys`.

Each context is modeled independently using **ZenWave Domain Language (ZDL)** and treated as a first-class module inside a single Spring Boot application.

The important part is that the **domain boundaries are defined in the model**, not inferred later from the code.

From these DSL models, ZenWave derives the modular structure of the application:

- module-oriented packages aligned with bounded contexts  
- persistence scoped per module  
- REST APIs exposed per module  
- event-based interactions between modules where needed  

This keeps the architecture aligned with the domain while still running as a single deployable service.

---

## Why Start With a Modulith

Designing the system as a modular monolith has several advantages.

First, it keeps the **domain model cohesive**. Boundaries can evolve without the operational cost of distributed systems.

Second, it allows teams to adopt **event-driven design inside the application** without introducing network boundaries too early.

And finally, if the system eventually needs to scale out, the modular structure already provides the natural seams where services can be extracted.

In other words: the architecture grows with the understanding of the domain, instead of forcing distribution before the model is ready.

---

## Explore the Example

**Documentation**  
https://www.zenwave360.io/docs/examples/ddd-examples/modulith-clinical-tool-jpa/

**Source Code**  
https://github.com/ZenWave360/zenwave-playground/tree/main/examples/modulith-clinical-tool-jpa

**Kotlin Variant**  
https://github.com/ZenWave360/zenwave-playground/tree/main/examples/modulith-klinical-tool-jpa