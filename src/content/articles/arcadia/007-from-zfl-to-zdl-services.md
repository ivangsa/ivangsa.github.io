---
title: "From ZFL to ZDL: Generating the Scaffold with AI"
summary: "The ZFL is a blueprint. Enough for an AI agent to scaffold every service repo. Business discovery continues inside each one."
date: 2026-05-22
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/07-from-zfl-to-zdl-using-ai/arcadia.png
featuredImageAlt: "AI generated ZDL scaffolding for Arcadia Editions"
draft: true
---

# From ZFL to ZDL: Generating the Scaffold with AI

We have the ZFL. It describes the PlaceOrder flow for Arcadia Editions. The bounded contexts. The services. The commands and events and the policies that connect them.

That is the business discovery so far. But business discovery is never done. It continues inside each service.

For now we have enough to start building. We let the AI do it.

## From one Business Flow to different Service Domains / Bounded Contexts

The ZFL is the blueprint of a flow. A flow that spans multiple domains, subdomains, and services. It tells the story of the whole.

Now we need the blueprint of each part. Each system in the ZFL becomes a service repo with the blueprint of a bounded context.

One center of gravity. One or more aggregates at the core. The commands it handles, the domain events it produces, and the APIs that connect it to the outside world.

The domain model is the inside. Aggregates, entities, value objects, state machines. The business logic that makes the bounded context real.

Commands are the entry points from the outside. The same command can have multiple implementations, REST, async messaging, or both

Domain events are the language this service speaks to the rest of the system. What it publishes when something happens. What it listens to from other services.

The APIs are the surface. REST for synchronous commands initiated by actors. AsyncAPI for the event contracts.

We treat each service API as a product. Its own repo, its own pipeline, its own lifecycle.

We have five systems in the ZFL. We are going to create all five with AI. In this post we are generating the scaffold, the structural skeleton the AI can infer from the ZFL and the business context. The domain model detail comes next.

## The AI skill

An AI skill is a reusable context package you give to an agent before asking it to do work. It contains the rules, the grammar, and a working example. The agent reads the skill and knows how to produce valid output without further explanation.

For this task the skill contains the ZDL grammar and a complete working example. The ZFL is the third input. Grammar and example tell the agent how to write ZDL. The ZFL tells it what to write.

[screenshot: skill setup and ZFL as input]

## The instruction

The instruction was short. For each system in the ZFL, generate a `domain-model.zdl` with one aggregate, a state machine derived from the flow, and the service commands and events already mapped in.

That was it.

[screenshot: instruction and agent output]

## What came out

Five `domain-model.zdl` files. One per bounded context. Each one grounded in the ZFL — the aggregate the flow implies, the commands the service handles, the events it produces, a state machine skeleton derived from the sequence.

Not finished models. Grounded starting points.

[screenshot: generated files in repo structure]

## Why AI and not a deterministic generator

ZenWave SDK has many deterministic generators. From a ZDL model it can generate AsyncAPI specs, OpenAPI specs, Spring Boot backends, and documentation. Given the same input they produce the same output every time.

ZFL to ZDL is different. The mapping is not mechanical. An AI agent can read the ZFL, understand the business context from the skill, and make reasonable inferences. It produces a scaffold that is structurally sound. Not complete. Sound enough to build on.

The ZFL is the blueprint. The AI frames the house. We come in and finish the rooms.

## Where our work continues

The scaffold is the beginning, not the end.

Inside each service repo the real domain modeling work begins. What entities does this bounded context own? What are the value objects? Where are the aggregate boundaries? What shape do the commands take? Which fields carry the business meaning?

How does this service connect to the outside world? Which events does it publish? Which does it consume? What does the REST interface look like for actor-initiated commands? How do the AsyncAPI and OpenAPI specs reflect the domain model underneath?

This is DDD at its core. The ZFL gave us the flow. The scaffold gave us the structure. Now we go inside each service and discover the model.

We start with Orders. The center of gravity of the entire PlaceOrder flow.