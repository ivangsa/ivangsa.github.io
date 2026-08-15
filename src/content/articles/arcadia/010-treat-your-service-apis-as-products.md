---
title: "Treat Your Domain Models and APIs as Products"
summary: "A domain model and the APIs it generates are not implementation details of a service. They are the contracts every consumer depends on, so they need the same lifecycle as any other product: quality, versions, publishing, and a place where people can find them."
date: 2026-07-24
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/010-treat-your-service-apis-as-products.webp
featuredImageAlt: "The Orders Checkout API packaged and versioned as a product that consumers derive clients from"
draft: false
---

> ⚠️ This article is part of Arcadia Editions, a project being built in public. Some of the links point to workflows and articles that are still in progress. They will become available as the series evolves. 🏗️

An API contract is dense context. In a few files it tells you what the system does, what it accepts and returns, what it publishes, and what it will keep stable, and it does this in a form that people and machines can both read. That is why it should be treated as a product, and not as a file that just falls out of the build.

You can even go one step further and not write the OpenAPI and AsyncAPI files by hand but it's a different story covered here: [Generate OpenAPI and AsyncAPI from ZDL](/articles/arcadia/009-dsl-modeling-for-apis-generate-openapi-and-asyncapi-from-zdl).


## Why treat the contract as a product?

An API is a product when it has its own customers. Sometimes those customers are external developers, but more often they are other teams inside the same company, and more and more they are coding agents that generate clients, tests, and whole applications from a machine-readable contract.

In Arcadia Editions the customers of the Orders Checkout contract are the other bounded contexts that react to its events, the services that call its REST API, and every integrator that will arrive later. They all need the same things: they need to find the contract, understand it, depend on it across releases, and have an answer when a question comes up. Those are product concerns, even if they look technical.

When you look at it this way, the questions change. You stop asking only if an endpoint works, and you start asking if you would like to integrate with it. A breaking change is no longer a normal code edit. It is a product decision, because someone else is already building on that contract. Versioning, deprecation, and compatibility stop being optional documentation and become part of the product itself.

This is true for OpenAPI and for AsyncAPI: the shape is different, but the product is the same.

## What operating a contract as a product looks like

Operating the contract as a product is not the same as buying an API Gateway. A gateway manages traffic to an API that already exists. What we need is a lifecycle around the contract, the same kind of lifecycle any released software component has: design, quality, versioning, publishing, discovery, and the things we derive from it. In Arcadia Editions that lifecycle lives in the API repository, next to the model the contract comes from.

```
            ZDL Model
                │
                ▼
      OpenAPI / AsyncAPI
                │
        ┌───────┴────────┐
        │                │
     Spectral         Version
        │                │
        └───────┬────────┘
                ▼
      Package as Maven
                ▼
         Publish Artifactory
                ▼
       Register Apicurio
                ▼
     Consumers download API
                ▼
 Generate SDKs / Docs / Tests
```

### It starts with the model

The contract is the first thing you publish, but it is not the first thing you own. For Orders Checkout we generate it from the ZDL model in the previous article, [DSL Modeling for APIs](/articles/arcadia/009-dsl-modeling-for-apis-generate-openapi-and-asyncapi-from-zdl). That model is the first product in the chain. The OpenAPI for the REST API and the AsyncAPI for the events both come out of it, so there is one source of truth from the first commit. The rest of this article is about what you do once that contract exists.

### Give it executable quality standards

A product needs quality standards, and a contract should have them too. Naming, error responses, security, event names, CloudEvents, Kafka bindings, and versioning rules are what give every API in the organization the same shape. In Arcadia Editions the shared parts already live in [api-contract-commons](https://github.com/arcadia-editions/api-contract-commons), so each API does not have to invent them again.

The mistake is to leave those rules in a wiki. They should run like tests. [Spectral](https://stoplight.io/open-source/spectral) turns the standard into lint rules on every pull request. If the contract does not comply, the build fails, and the standard stops being a suggestion.

### Version the contract, not the URL

Every product has releases, and an API should have them too. Versioning is more than putting `/v1` in a path. It means deciding what a breaking change is, writing the compatibility rules, and giving consumers time to move.

Take the `OrderConfirmed` event that Orders Checkout publishes. Adding an optional field is a compatible change, so consumers can take it when they are ready. Renaming a field, removing one, or making a type stricter is a new major version, and the old one has to stay alive long enough for everyone to migrate. That promise is what the [CHANGELOG.md](https://github.com/arcadia-editions/orders-checkout-api/blob/main/CHANGELOG.md) records, one entry per version, so a consuming team can see if a bump is safe. The version belongs to the contract, and the implementation only has to satisfy it.

### Publish it like any other artifact

Imagine you write a Java library and never publish it, and you expect every consumer to copy the source from your repository. That is still how many organizations treat APIs: the contract sits in Git, and everyone fetches a raw URL.

The contract should be published where consumers already take their dependencies. For a Java team that place is Maven. The OpenAPI or AsyncAPI file becomes a versioned component, published to Artifactory or Maven Central like any other library. A consuming project depends on a specific version, and Dependabot or Renovate can propose the upgrades. At that point the API is no longer a YAML file in a repository. It is a released product.

### Automate the release

Validation and release are two different pipelines, on purpose. Every pull request and every push runs [`artifact-ci.yml`](https://github.com/arcadia-editions/orders-checkout-api/blob/main/.github/workflows/artifact-ci.yml) and checks each changed contract against a pinned Spectral rule set, with no person in the middle. Publishing is a separate act that someone starts by hand: [`artifact-release.yml`](https://github.com/arcadia-editions/orders-checkout-api/blob/main/.github/workflows/artifact-release.yml) releases one artifact family at a time, packages it as a Maven artifact, publishes it, and registers the schema with Apicurio.

Neither workflow generates the contract. ZenWave SDK already did that in the service build, so when this pipeline runs the OpenAPI and AsyncAPI files already exist. The pipeline is not deploying the service, it is releasing the API product. Those two events are related, but they have different triggers and different consumers, and keeping them apart is what lets the contract move at the pace of a product.

```
                 ZDL
                  │
   ZenWave SDK generates
     OpenAPI / AsyncAPI
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼

 API PRODUCT            SERVICE

 Spectral             Compile
 Version              Unit Tests
 Package              Docker
 Publish              Deploy
 Registry             Kubernetes

 Consumers            Runtime
```

### Make it discoverable

Publishing only helps if people know where to look. A registry gives consumers one place to find the APIs, browse versions, inspect schemas, and see how the systems talk to each other. Arcadia Editions publishes its contracts to Apicurio Registry, which has its own article later, [Publishing to Apicurio and Generating an Event Catalog](/articles/arcadia/012-publishing-to-apicurio-and-event-catalog). Here it is enough to say what it gives you: a permanent home for the contracts, instead of YAML spread across many repositories, and a first question that changes from "how should we name this new API" to "does this API already exist". That question alone avoids a lot of duplication.

### Keep it compatible

A contract can be well formed and still break the consumers that already depend on it. Before a new version is published, a compatibility check should confirm that those consumers will keep working. This matters most with events, because schemas evolve on their own timeline, and producers and consumers are rarely deployed at the same moment.

A schema registry can refuse a version that would break compatibility, so publishing an update becomes a boring event instead of a risky one. Consumers learn that upgrading is normal, and that trust is a large part of what makes an API good to depend on.

### Derive, do not duplicate

Once the contract is the source of truth, every artifact you keep by hand next to it is a place where things can drift. The alternative is to generate the documentation, the clients, the server stubs, the mocks, and the tests from the contract, so everything else is only a projection of it.

This is also how you stop the implementation from drifting away from its contract. In Arcadia Editions we build those derived services with ZenWave SDK, which is the subject of [building the Spring Boot and Kotlin backend](/articles/arcadia/013-spring-boot-kotlin-backend-from-zdl), and the same idea goes all the way to the platform, where Kafka topics can be provisioned from the same contract. The implementation changes, the generated artifacts change with it, and nothing is maintained twice.

## The tooling only supports the lifecycle

No single tool is the story. You can swap Spectral, Maven, Artifactory, or Apicurio for something equivalent, and the idea stays the same. What matters is the lifecycle, not the toolchain.

## The pipelines we build for Arcadia Editions

This is where the idea becomes concrete. The pipelines live once, as reusable workflows in [api-product-workflows](https://github.com/arcadia-editions/api-product-workflows), and each API repository calls them with a thin file of its own. The pipelines are a product too. Each one owns one stage of the lifecycle, and the rest of this series walks through them.

- **Contract CI** ([`artifact-ci.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/artifact-ci.yml)) runs on every pull request and push, and you can also start it by hand for a full check. It sees which manifest artifacts changed (`zdl`, `zfl`, `openapi`, `asyncapi`, `asyncapi-client`), validates each one, and does a dry-run package. Nothing is published here. In [orders-checkout-api](https://github.com/arcadia-editions/orders-checkout-api/blob/main/.github/workflows/artifact-ci.yml) the caller is only a few lines.
- **Kafka plan and develop apply** are not separate pipelines. They run as extra jobs inside `artifact-ci.yml` when the repository owns an `asyncapi` or `asyncapi-client` artifact. `kafka-plan` generates Terraform and runs `plan` on every push and pull request. `kafka-develop` applies a passing plan to that artifact's `{repo}-{artifactId}-develop` workspace on every push to `develop`.
- **Contract release** ([`artifact-release.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/artifact-release.yml)) is manual and releases one artifact family per run. It publishes that family to Maven, Apicurio, and Artifactory, tags the release, and puts the source back on the next development version. That is what turns the contract into a dependency that consumers can pull like any other library.
- **Registry publishing** is not a separate pipeline. It is what `artifact-release.yml` does when it registers the released schema with Apicurio. That story continues in [Publishing to Apicurio and Generating an Event Catalog](/articles/arcadia/012-publishing-to-apicurio-and-event-catalog).
- **Rule bundle release** ([`spectral-ci.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/spectral-ci.yml) / [`spectral-release.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/spectral-release.yml)) versions the Spectral rule set as its own artifact, so the quality standard is versioned the same way the contracts are.
- **Manifest sync** is not owned by api-product-workflows. After a release, `artifact-release.yml` sends an `artifact-released` event to [arcadia-editions-architecture](https://github.com/arcadia-editions/arcadia-editions-architecture). That repository updates `zenwave-architecture.yml` and then notifies [arcadia-event-catalog](https://github.com/arcadia-editions/arcadia-event-catalog) so the [published catalog](https://arcadia-editions.github.io/arcadia-event-catalog/) rebuilds.
- **Platform provisioning beyond `develop`** is three more workflows, each for one already-released artifact. [`provision-kafka-release.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/provision-kafka-release.yml) builds a versioned Terraform bundle and publishes it without applying it. [`provision-kafka-promote.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/provision-kafka-promote.yml) applies a named bundle to `pre`, or copies whatever `pre` has into `prod`. [`provision-kafka-destroy.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/provision-kafka-destroy.yml) tears down one environment, but only if you type the exact workspace name. The full path is in [provisioning infrastructure from AsyncAPI](/articles/arcadia/014-infrastructure-provisioning-asyncapi-terraform).

Together these pipelines take a contract that already exists and make it a validated, versioned, published, and discoverable product. The Kafka jobs close the gap to the platform: plan on every push, apply on `develop`, and promote to `pre` and `prod` only when a person chooses a version. Generating the contract, and generating the code from it, stay outside this pipeline, in each service build with ZenWave SDK. What api-product-workflows owns is everything between "the contract exists" and "everyone else can depend on it".

## The model and its contracts are the product

The model is where the meaning lives, and the contract is how that meaning reaches everyone else. Once both are first-class artifacts, the work around them stops looking like separate tasks and starts looking like one product lifecycle. The shift is not about treating your services as products. It is about treating the models you design, and the contracts between your systems, as the products they already are, because that is what everyone else, and every agent, actually builds on.
