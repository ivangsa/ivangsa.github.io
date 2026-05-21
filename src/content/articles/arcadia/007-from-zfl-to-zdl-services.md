---
title: "From ZFL to ZDL: Scaffolding Service Models with AI"
summary: "The ZFL gives us boundaries, services, commands, events, and sometimes aggregate names. An AI agent can turn that into scaffolding, while the real domain modeling remains ours."
date: 2026-06-01
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

# From ZFL to ZDL: Scaffolding Service Models with AI

We have the ZFL. It describes the PlaceOrder flow for Arcadia Editions. The bounded contexts. The services. The commands and events. The policies that connect them.

If we choose to go one level deeper, it can also name the aggregate that owns a command. `CatalogInventory.InventoryService.StockReservation` tells a very different story from a generic inventory endpoint. It points to the consistency boundary.

That is enough context to start creating service model scaffolds.

But scaffolding is not modeling.

We still model the domain by hand. We still decide what each aggregate really owns, which fields carry business meaning, which transitions are valid, and which events are worth publishing.

The useful role for AI here is more modest and more practical. Give it the ZFL, the ZDL grammar, and a working example. Ask it to create the folders, files, and first `domain-model.zdl` documents so we have something concrete to refine.

## From one Business Flow to Service Domains

The ZFL is the blueprint of a flow. A flow that spans multiple domains, subdomains, and services. It tells the story of the whole.

Now we need a starting point for each part. Each system in the ZFL becomes a service repo with an initial model file for that bounded context.

One center of gravity. One or more aggregates at the core. The commands it handles. The domain events it produces. The APIs that connect it to the outside world.

The domain model is the inside. Aggregates, entities, value objects, state machines. The business logic that makes the bounded context real.

Commands are the entry points from the outside. The same command can have multiple implementations: REST, async messaging, or both.

Domain events are the language this service speaks to the rest of the system. What it publishes when something happens. What it listens to from other services.

The APIs are the surface. REST for synchronous commands initiated by actors. AsyncAPI for the event contracts.

We treat each service API as a product. Its own repo, its own pipeline, its own lifecycle.

We have five systems in the ZFL. We are going to create the first structure for all five with AI. Not final domain models. Scaffolds. Enough files and declarations to stop staring at a blank page and start doing the real modeling work.

## The AI skill

An AI skill is a reusable context package you give to an agent before asking it to do work. It contains the rules, the grammar, and a working example. The agent reads the skill and knows how to produce valid output without further explanation.

For this task the skill contains the ZDL grammar and a complete working example. The ZFL is the third input. Grammar and example tell the agent how to write ZDL. The ZFL tells it which systems, services, commands, events, and aggregate hints are already known.

[screenshot: skill setup and ZFL as input]

## The instruction

The instruction was short. For each system in the ZFL, create the service folder structure and an initial `domain-model.zdl`. Include the service commands, the events already visible in the flow, and an aggregate candidate when the ZFL gives enough information.

Do not pretend the model is finished. Leave a clear scaffold that a human can refine.

[screenshot: instruction and agent output]

## What came out

Five `domain-model.zdl` files. One per bounded context. Each one grounded in the ZFL: the commands the service handles, the events it produces, and the aggregate candidate the flow suggests when there is enough signal.

Not finished models. Grounded starting points.

[screenshot: generated files in repo structure]

## Why AI and not a deterministic generator

ZenWave SDK has many deterministic generators. From a ZDL model it can generate AsyncAPI specs, OpenAPI specs, Spring Boot backends, and documentation. Given the same input they produce the same output every time.

ZFL to ZDL is different. The mapping is not mechanical. An AI agent can read the ZFL, understand the business context from the skill, and make reasonable inferences about scaffolding. It can prepare a structure that is sound enough to build on.

The ZFL is the map of the process. The AI prepares the workbench. We still build the model.

## Where our work continues

The scaffold is the beginning, not the end.

Inside each service repo the real domain modeling work begins. What entities does this bounded context own? What are the value objects? Where are the aggregate boundaries? What shape do the commands take? Which fields carry the business meaning?

How does this service connect to the outside world? Which events does it publish? Which does it consume? What does the REST interface look like for commands initiated by actors? How do the AsyncAPI and OpenAPI specs reflect the domain model underneath?

This is DDD at its core. The ZFL gave us the flow. The scaffold gave us the structure. Now we go inside each service and discover the model.

We start with Orders. The center of gravity of the entire PlaceOrder flow.
