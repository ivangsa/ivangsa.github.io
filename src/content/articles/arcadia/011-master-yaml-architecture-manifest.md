---
title: "The Master YAML: A Manifest of Your Entire Architecture"
summary: "As Arcadia Editions grows, no single person knows the whole system anymore. The big picture scatters across dozens of repositories. ZenWave architecture manifest pulls it back into one place with every domain, service and contract and how they connect, without copying any of it. And as you work with your API contracts, the pipeline keeps it current: adding services, artifacts, versions... So this manifest and ZenWave Platform keeps your whole architecture connected and navigable for humans, tools and agents."
date: 2026-07-26
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/011-master-yaml-architecture-manifest.webp
featuredImageAlt: "The Arcadia Editions architecture manifest pointing at the models and contracts each service owns"
draft: false
---

As Arcadia Editions grows, no single person knows the whole system anymore. Services multiply, each team comes to know its own piece well but nobody knows how the whole system works.

What's missing isn't more documentation. What is missing is a complete landscape, a self-contained architectural world model of the whole system. Documenting a REST API endpoint or an asynchronous message is easy. For that we have OpenAPI and AsyncAPI, along with other standard API specifications. What is missing is a manifest that connects all the pieces together.

What Arcadia, and any other real org, needs is the architecture itself in a form both people and tools can read, a structured, machine-readable representation of what the system derived from the lifecycle of the API contracts themselves.

That is what a world model is. Every service, every contract, every event and schema, described once in one consistent structure, and connected, so you can navigate from bounded context to bounded context to an API to a schema in a single step. It is the model itself.

The Master YAML is that map written down. One file, `zenwave-architecture.yml`, that knows where everything is, the index of the whole architecture, holding not the artifacts but the pointers to them. It is hierarchical, from domain to subdomain to service to contracts, so the tree reads like the business itself. It is git-native, so it versions, diffs and reviews right alongside the code. And it is tool-agnostic, because anything that reads YAML can consume it.

From that one file, a whole architecture map can be derived. You generate an EventCatalog website from it, feed an LSP that navigates across services, provision infrastructure, know your consumers, validate contracts. The Master YAML is to your architecture, the manifest that makes the whole thing navigable.

You could call a single YAML file a poor man's database, and in a sense it is. But it is the right call for the source of truth, on two conditions this series already meets.

- The integrity has to live in a schema and in the tooling that reads it, not in the format.
- And the file has to be machine-maintained rather than hand-curated once you are past a handful of services.

You can start it by hand, but you do not keep it alive by hand: the tooling maintains it for you, writing a service in when you add its artifacts and bumping the version when you release. Meet those two, and the Master YAML stops being a poor man's anything and becomes what it should be, the one place your whole architecture is written down and everything else is derived from.

## What the manifest actually is

The manifest is an index of all your service artifacts, properly cataloged. 

It describes the architecture as a tree of domains, subdomains and services, and for each service it points at the artifacts that service already owns, the ZDL model, the OpenAPI contract, the provider and client AsyncAPI contracts, together with the documents that travel alongside them like the SUMMARY and the CHANGELOG. Every one of those entries is a pointer to a file that lives in the service's own repository, the very same file the code is generated from, so the manifest never restates a schema or a channel or a topic. It only says where each of them lives and how they fit into the larger whole.

[zenwave-manifest](https://github.com/ZenWave360/zenwave-manifest), an open-source Kotlin Multiplatform library, contains not only the `json-schema` to validate your architectural manifest, but the rules to resolve each artifact type from different sources: `workspace`, `git`, `http`, `maven`, `artifactory`, `apicurio-registry`... and utility functions to fetch the actual content of each file.

Here is the Orders Checkout corner of the Arcadia Editions manifest.

```yaml
# yaml-language-server: $schema=https://schemas.zenwave360.io/zenwave-architecture/latest/schema.json

config:
  title: "Arcadia Editions - Event-Driven Retail Architecture"
  version: 0.0.1
  groupIdExpression: "com.arcadiaeditions.${service.id}"
  artifactIdExpression: "${artifact.fileNameWithoutExtension}"
  contentResolution:
    - workspace
    - git
  sources:
    workspace:
      basePathExpression: "../${service.repository}"
    git:
      provider: github
      server: "https://github.com"
      contentUrlExpression: "${server}/arcadia-editions/${service.repository}/raw/main/${content.path}"

# [...]
domains:
  "orders":
    id: "orders"
    name: "Orders"
    description: "Commercial order creation, confirmation, and cancellation"
    subdomains:
      "checkout":
        id: "orders.checkout"
        name: "Checkout"
        description: "Customer checkout, order commitment, and commercial orchestration"
        services:
          "orders-checkout":
            id: "orders.checkout.orders-checkout"
            repository: "orders-checkout-api"
            version: "0.0.1"
            name: "Orders Checkout"
            description: > 
              Owns checkout flow, order lifecycle, and the handoff from purchase intent to confirmed order
            docs:
              summary: SUMMARY.md
              content: EVENT_CATALOG.md
              changelog: CHANGELOG.md
            artifacts:
              - type: zdl
                path: "domain-model.zdl"
              - type: asyncapi
                path: "asyncapi.yml"
              - type: asyncapi-client
                path: "asyncapi-client.yml"
              - type: openapi
                path: "openapi.yml"
            consumers:
              - "payments/payment-processing/payments-processing"
              - "fulfillment/shipping/fulfillment-shipping"
              - "notifications/customer-communications/notifications-consumer"

```

Read from the top down it is the whole company in miniature. The Orders domain contains a Checkout subdomain, the Checkout subdomain owns the Orders Checkout service, and that service points at the four contracts from the previous articles and the two documents that describe it. Repeat that for Catalog, Inventory, Payments, Fulfillment and Notifications and the entire Arcadia Editions architecture sits in one file you can read start to finish in a couple of minutes.

It's not only a map of pointers, but a connected graph where services know their consumers. When a service wants to consume, as a client, messages from another service, the API pipelines will automatically add to the list of `consumers` of the target service.

Written out across every service, those pointers are the architectural topology of Arcadia Editions. You can start at any service and walk outward to see who reacts to it and what it reacts to in turn, which is the question you actually ask when you are about to change an event or trace an incident back to its origin. The connections were always there in the individual AsyncAPI contracts, but they were spread across a dozen repositories where no one could see them at once. The manifest gathers them into a single graph you can follow.

## One file, resolved from wherever the artifacts live

A pointer is only useful if something can follow it, and the same manifest can be resolved from more than one place depending on where you are standing. When you are working locally it resolves each artifact against the repositories checked out in your workspace, so the model you are editing is the one it reads. In a pipeline, or from a consumer who has never cloned anything, it resolves the same entries against the published artifacts instead, reaching for them in Git, in Apicurio Registry, or in your Maven repository in a defined order until it finds them.

```yaml
config:
  contentResolution:
    - workspace
    - git
    - apicurio
```

That is why the manifest is operational rather than documentation. It describes the architecture once, and it resolves to your local checkouts while you are building and to the published products from the previous article once they are released, without the description itself having to change. The same file is the developer's map and the consumer's map, and neither of them is looking at a copy.

## Navigable by humans, tools and agents

Because the manifest is a real file with a published schema, the `yaml-language-server` line at the top gives you validation and completion while you write it, and because is plain yml, any tools can read from it, including your AI agents. 

Underneath ZenWave Platform lives [zenwave-manifest](https://github.com/ZenWave360/zenwave-manifest) a small Kotlin Multiplatform library that resolves the tree and its artifacts on both the JVM and JavaScript, which is what lets the ZenWave IDE and the tooling around it navigate the whole architecture from this one entry point rather than crawling repositories one at a time.

## The Model compounds in value as it grows

The manifest is worth building because its value compounds as more things learn to read it:

- Today: humans navigate it to understand the system
- Tomorrow: the EventCatalog website makes it visible to the whole organization
- Later: coding agents use it as context to read and fetch contents, without hallucinating contracts
- The model does not change in nature — only the consumers of it change
- Build the model once. Use it everywhere.

That is exactly what the [ZenWave Platform](https://www.zenwave360.io/) is built to do, feed on this architectural manifest and turn it into something every kind of consumer can reach:

- It starts with [zenwave-manifest](https://github.com/ZenWave360/zenwave-manifest), an open-source library that reads the manifest and loads the individual artifacts it points at.
- On top of that library sits an open-source LSP, so an editor can navigate the whole architecture the way it navigates a single codebase.
- And on top of the LSP sits an MCP server, so an agent reaches the same model, through the same resolved graph, that a human does. One manifest at the bottom, and a library, a language server and an agent interface stacked on it, each drawing from the same source of truth.

From here the manifest stops being a description and starts being a starting point. Because it already knows every contract and every document each service owns, it can drive the next steps of the series directly, beginning with [Publishing to Apicurio and Generating an Event Catalog](/articles/arcadia/012-publishing-to-apicurio-and-event-catalog), where the same registry the manifest resolves against becomes the place the whole organization goes to discover what exists.
