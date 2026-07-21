---
title: "The Master YAML: A Manifest of Your Entire Architecture"
summary: "Once every service is its own API product, the big picture scatters across dozens of repositories. The architecture manifest pulls it back into one hand-authored file that names every domain, service and contract and how they connect, without copying any of it, so the whole business becomes explicit, connected and navigable for humans, tools and agents."
date: 2026-07-22
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/011-master-yaml-architecture-manifest.png
featuredImageAlt: "The Arcadia Editions architecture manifest pointing at the models and contracts each service owns"
draft: true
---

The previous article left Arcadia Editions in a good place and a slightly awkward one at the same time. Every service is now its own API product, with its own repository, its own ZDL model, and its own published contracts, versioned and discoverable the way any released component should be. That is exactly what you want for each service on its own, but it also means the architecture no longer lives anywhere as a whole. It is scattered across a dozen repositories, each one honest about itself and silent about everything else, and nothing in that picture tells you what exists, who owns it, or how any of it connects. You have solved the single contract. You have not solved knowing the shape of the system those contracts add up to.

The Master YAML is the piece that closes that gap. It is one hand-authored file, `zenwave-architecture.yml`, that names every domain, every service and every contract in the business and records how they depend on one another, and it does all of that without copying a single line of the artifacts it describes. It is not a diagram of the architecture that somebody redraws when they remember to. It is the architecture itself, written down once as a single addressable thing.

## What the manifest actually is

The manifest is an index, not a copy. It describes the architecture as a tree of domains, subdomains and services, and for each service it points at the artifacts that service already owns, the ZDL model, the OpenAPI contract, the provider and client AsyncAPI contracts, together with the documents that travel alongside them like the SUMMARY and the CHANGELOG. Every one of those entries is a pointer to a file that lives in the service's own repository, the very same file the code is generated from, so the manifest never restates a schema or a channel or a topic. It only says where each of them lives and how they fit into the larger whole.

Here is the Orders Checkout corner of the Arcadia Editions manifest.

```yaml
# yaml-language-server: $schema=https://schemas.zenwave360.io/zenwave-architecture/latest/schema.json

domains:
  orders:
    name: "Orders"
    description: "Commercial order creation, confirmation, and cancellation"
    subdomains:
      checkout:
        name: "Checkout"
        services:
          orders-checkout:
            id: "orders.checkout.orders-checkout"
            version: "1.0.0"
            name: "Orders Checkout"
            repository: orders-checkout-api
            docs:
              summary: SUMMARY.md
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
              - $ref: "#/domains/payments/subdomains/payment-processing/services/payments-processing"
              - $ref: "#/domains/fulfillment/subdomains/shipping/services/fulfillment-shipping"
```

Read from the top down it is the whole company in miniature. The Orders domain contains a Checkout subdomain, the Checkout subdomain owns the Orders Checkout service, and that service points at the four contracts from the previous articles and the two documents that describe it. Repeat that for Catalog, Inventory, Payments, Fulfillment and Notifications and the entire Arcadia Editions architecture sits in one file you can read start to finish in a couple of minutes.

## It points, it does not duplicate

The reason an architecture diagram or a wiki catalog always rots is that it is a copy. Somebody drew the boxes and arrows once, reality moved on, and the copy stayed behind, so within a few months the most confident-looking picture in the company is also the least trustworthy. The manifest avoids that failure by never holding a copy in the first place. Each artifact entry is a pointer to the file that is already the source of truth, and because that file is the one the service is generated from, there is nothing to keep in sync and nothing that can quietly disagree with the running system. The world model cannot drift away from the architecture because it is made of references to the architecture, not restatements of it.

That is the same idea that runs through this whole series, only lifted up a level. A contract does not drift from its model because the contract is generated from the model. Code does not drift from its contract because the code is generated from the contract. And the manifest does not drift from any of them because it points at all of them instead of describing them again. Drift is what happens when the same fact is written down twice, and the manifest is careful never to write anything down twice.

## Connected, and connected in the file

An index that only listed services would still be a flat inventory. What makes the manifest a map rather than a list is that the relationships between services live in the file as well. Look again at the `consumers` block on Orders Checkout. It declares, by reference, that Payments Processing and Fulfillment Shipping consume what Orders Checkout produces, and those references are real pointers into the same tree, resolvable and checkable, not prose that hopes to stay accurate.

Written out across every service, those pointers are the event-driven topology of Arcadia Editions. You can start at any service and walk outward to see who reacts to it and what it reacts to in turn, which is the question you actually ask when you are about to change an event or trace an incident back to its origin. The connections were always there in the individual AsyncAPI contracts, but they were spread across a dozen repositories where no one could see them at once. The manifest gathers them into a single graph you can follow.

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

Because the manifest is a real file with a published schema, the `yaml-language-server` line at the top gives you validation and completion while you write it, so the tree stays well formed instead of drifting into whatever shape each author guessed at. Underneath, the manifest is read by `manifest-core`, a small Kotlin Multiplatform library that resolves the tree and its artifacts on both the JVM and JavaScript, which is what lets the ZenWave IDE and the tooling around it navigate the whole architecture from this one entry point rather than crawling repositories one at a time.

That last reader is the one that matters most now. The previous article made the case that a good contract is the densest context an agent can have about a single system, everything it needs stated outright instead of guessed at. The manifest is the map that leads an agent to every one of those contracts at once. From this single file it can see every domain, resolve every model and every contract, and follow the consumer graph between them, which is precisely what an agent needs before it can reason about a change that crosses more than one service. This is what the ZenWave Platform means by a world model, an architecture made explicit, connected and navigable in one place, for the people who build it and the tools and agents that increasingly build alongside them.

## The layer above the products

The shift the series has been building toward is now complete. The model comes first, because it is where the meaning lives. The contract is its published projection, the product other teams depend on. The service is one implementation of that contract, replaceable underneath it. And the Master YAML is the layer above all of them, the single file where the whole business is explicit, connected and navigable at once, not a picture of the architecture that has to be maintained beside it but the architecture itself as one addressable thing.

From here the manifest stops being a description and starts being a starting point. Because it already knows every contract and every document each service owns, it can drive the next steps of the series directly, beginning with [Publishing to Apicurio and Generating an Event Catalog](/articles/arcadia/012-publishing-to-apicurio-and-event-catalog), where the same registry the manifest resolves against becomes the place the whole organization goes to discover what exists.
</content>
</invoke>
