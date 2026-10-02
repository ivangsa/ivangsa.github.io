---
title: "The Master YAML: A Manifest of Your Entire Architecture"
summary: "As Arcadia Editions grows, nobody sees the whole system in one place. A single YAML file, zenwave-architecture.yml, points at every domain, service and contract and how they connect, without copying any of them. The pipeline keeps it current. Humans, tools and agents can all navigate from there."
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

As Arcadia Editions grows, no single person knows the whole system anymore. Services multiply, and each team knows its own piece well, but nobody can see how the pieces fit together.

Documenting a single REST endpoint or asynchronous message is easy, and we already have OpenAPI and AsyncAPI for that. What we lack is a self-contained architectural world model: one file that connects those contracts with every domain and every service, and shows how they talk to each other.

Arcadia, like any real organization, needs its architecture written in a form that both people and tools can read. That file is `zenwave-architecture.yml`.

It does not copy the models or the contracts. It only points at them, in a tree that follows the business: domain, subdomain, service, artifacts. From that one file you can generate an Event Catalog, navigate across services, provision infrastructure, and see who consumes what.

You could call a single YAML file a poor man's database, and in a sense it is. It can still hold the source of truth if two things are true: a schema and the tools that read the file enforce its integrity, and the tooling maintains the file once you are past a handful of services.

You can write the first version by hand, but after that the tooling keeps it current: when you add artifacts it writes the service in, and when you release it bumps the version. With those two conditions in place, the Master YAML is the one place where the whole architecture is written down, and everything else is derived from it.

## What the manifest contains

The manifest is an index of all your service artifacts. It describes the architecture as a tree of domains, subdomains and services. For each service it points at the artifacts that service already owns: the ZDL model, the OpenAPI contract, the provider and client AsyncAPI contracts, and the documents that travel with them, like the SUMMARY and the CHANGELOG. Every entry points to a file in the service's own repository, the same file the code is generated from, so the manifest never restates a schema, a channel or a topic. It only says where each one lives and how it fits into the larger whole.

[zenwave-architecture](https://github.com/ZenWave360/zenwave-architecture), an open-source Kotlin Multiplatform library, contains the `json-schema` that validates the manifest, the rules to resolve each artifact type from different sources (`workspace`, `git`, `http`, `maven`, `artifactory`, `apicurio-registry`...), and utility functions to fetch the actual content of each file.

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

Read from the top down, the Orders domain contains a Checkout subdomain, the Checkout subdomain owns the Orders Checkout service, and that service points at the four contracts from the previous articles and the documents that describe it. Repeat that for Catalog, Inventory, Payments, Fulfillment and Notifications, and the entire Arcadia Editions architecture sits in one file you can read start to finish in a couple of minutes.

Services also know their consumers, which turns the list of pointers into a connected graph. When a service consumes messages from another service as a client, the API pipelines add it to the `consumers` list of the target service.

So you can start at any service and walk outward to see who reacts to it, which is the question you ask when you are about to change an event or trace an incident. Those connections were always there in the individual AsyncAPI contracts, but they were spread across a dozen repositories. The manifest gathers them into a single graph.

## One file, resolved from wherever the artifacts live

A pointer is only useful if something can follow it, and the same manifest can be resolved from more than one place, depending on where you are standing. When you are working locally, it resolves each artifact against the repositories checked out in your workspace, so the model you are editing is the one it reads. In a pipeline, or from a consumer who has never cloned anything, it resolves the same entries against the published artifacts instead, reaching for them in Git, in Apicurio Registry, or in your Maven repository, in a defined order, until it finds them.

```yaml
config:
  contentResolution:
    - workspace
    - git
    - apicurio
```

This is what makes the manifest operational. It describes the architecture once, and it resolves to your local checkouts while you are building, and to the published products from the previous article once they are released, without the description itself having to change.

## Who reads the manifest

Because the manifest is a real file with a published schema, the `yaml-language-server` line at the top gives you validation and completion while you write it. And because it is plain YAML, any tool can read it, including AI agents.

That is what the [ZenWave Platform](https://www.zenwave360.io/) is built to do. It feeds on this manifest and turns it into something every kind of consumer can reach. The same library that reads the file and loads the artifacts sits under an open-source LSP, so an editor can navigate the whole architecture the way it navigates a single codebase. On top of the LSP sits an MCP server, so an agent reaches the same resolved graph that a human does.

Today people navigate it to understand the system, and the Event Catalog website can make it visible to the whole organization. Coding agents can use it as context to read and fetch contents, so they work with the contracts that exist instead of inventing new ones.

And because the manifest already knows every contract and every document each service owns, it can drive the next steps of the series, beginning with [Arcadia Architecture Manifest meets Event Catalog](/articles/arcadia/012-arcadia-architecture-manifest-meets-event-catalog), where that same file becomes the site the whole organization can browse.
