---
title: "Treat Your Domain Models and APIs as Products"
summary: "A domain model and the APIs it generates are not implementation details of a service. They are the contracts every consumer depends on. Treating them as products means designing them, validating them, versioning them, publishing them, and evolving them with the same discipline as any software artifact."
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

An API contract is the densest context you have about a system. In a handful of files it says what the system does, what it accepts and returns, what it publishes, and what it promises to keep stable, and it says all of it in a form that is precise and machine readable. Little else you publish concentrates that much meaning in so little space, which is exactly why it deserves to be treated as a product rather than as a file that falls out of the build.

That was always valuable, and in the agentic era it becomes decisive, because the reader is no longer only a human. Today the contract is increasingly consumed by an AI coding agent, and an agent needs exactly what a good contract already provides, explicit schemas, real examples, semantic descriptions and deterministic behavior it can build against without guessing. A poor API forces the agent to infer intent from names and hope it guessed right, while a good one states that intent outright. The better your API is as a product, the better it is for the machines reading it too.

That claim about the contract being the densest context you have is true of what you publish, but there is something denser still behind it. In Arcadia Editions the API is not written by hand, it is derived from a ZDL domain model, and that model carries even more meaning than the contract does, because the OpenAPI and the AsyncAPI are both generated from it. Every organization already stands on public APIs and their specifications, which is the common ground this article assumes, and some will want to go one step further, to the model those specifications come from. Either way the order is the same. The model comes first, the contract is its published projection, and that hierarchy is the spine of everything below.

When people say treat your API as a product they usually picture a public REST API like Stripe or Twilio, but the idea is much broader than that. It does not matter whether you expose REST with OpenAPI, publish events with AsyncAPI, or define a gRPC service, because the technology is not the point. The point is that another piece of software depends on the contract you publish, and that contract becomes the boundary between teams, between systems, and sometimes between companies. The moment something starts depending on it, you have a product, whatever the transport underneath.

And it stays a product even as everything behind it changes. You can rewrite the service, move to a different database, split a monolith into several services, or migrate from Kafka to another broker, and none of it should reach the consumer, because what they bought is the contract and not the code that happens to satisfy it today. That is the whole reframe. The service is not the product. The domain model and the contracts it generates are the product.

## Why treat the contract as a product?

Every product has customers, and an API is no different. Sometimes those customers are external developers integrating with your platform, more often they are other teams inside your own company, and increasingly they are AI coding agents generating clients, tests and whole applications from a machine readable spec. In Arcadia Editions the customers of the Orders Checkout contract are the other bounded contexts that react to its events and the services that call its REST surface, together with every future integrator who has not shown up yet. They all expect the same things, something easy to discover, easy to understand, reliable to integrate with, stable across releases, and documented when a question comes up. None of those are technical concerns. They are product concerns.

Thinking this way changes the questions you ask. Instead of asking whether an endpoint works you start asking whether you would enjoy integrating with it, and instead of treating a breaking change as an ordinary code edit you treat it as a product decision, because that is what it is. Versioning, deprecation policies, migration guides and compatibility guarantees stop being optional documentation you might get around to and become part of the product itself. The reframe holds regardless of transport, because an OpenAPI document, an AsyncAPI document and a gRPC definition all describe a capability that somebody else wants to consume. The shape differs, the product does not.

## What operating a contract as a product looks like

Once you accept that the contract is the product, the next question is how you operate it like one. The answer is not buying an API Gateway or an API Management platform, because those manage traffic to an API that already exists. Operating the contract as a product means building a lifecycle around it, the same lifecycle any released software component has, running from design through quality, versioning, publishing and discovery to the artifacts you derive from it. In Arcadia Editions that lifecycle lives in the API repository itself, right next to the model the contract comes from.

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

Everything starts with the model, because the API contract is the first artifact you publish but it is not the first artifact you own. For Orders Checkout the contract is not even written by hand, it is generated from the ZDL domain model that was the whole story of the previous article, [DSL Modeling for APIs](/articles/arcadia/009-dsl-modeling-for-apis-generate-openapi-and-asyncapi-from-zdl). That makes the domain model the first product in the chain, the single source that the contract, the generated code and even the platform all derive from, and it makes the API contract the product you publish from it. The OpenAPI for the REST surface and the AsyncAPI for the events both come out of that one model, so there is a single source of truth from the very first commit, and everything in this article is about what you do with it once the contract exists. The specification language is not the interesting part. Making the model the thing everything else derives from is.

### Give it executable quality standards

Products have quality standards, and API contracts should have them too. Naming conventions, standard error responses, security requirements, event naming rules, CloudEvents conventions, Kafka bindings and versioning policies are what give every API in the organization the same look and feel, and in Arcadia Editions the reusable parts of that already live in one place, [api-contract-commons](https://github.com/arcadia-editions/api-contract-commons), so no single API has to reinvent them. The mistake is to leave those rules in a wiki where nothing enforces them. They should be executable instead, and [Spectral](https://stoplight.io/open-source/spectral) is where that happens for contracts, because it lets you express the standard as lint rules that run on every pull request the same way unit tests do. If the contract does not comply the build fails, and the standard stops being a suggestion.

### Version the contract, not the URL

Every product has releases, and an API should too, but versioning is much more than putting `/v1` in a path. It means deciding what counts as a breaking change, writing down the compatibility rules, communicating deprecations, and giving consumers enough time to move. Take the `OrderConfirmed` event that Orders Checkout publishes. Adding a new optional field to it is a compatible change, so consumers can pick it up whenever they like and nothing breaks in the meantime, whereas renaming a field, removing one, or tightening a type is a different thing entirely, a new major version that has to be announced with the old one kept alive long enough for everyone to migrate. That promise is what the [CHANGELOG.md](https://github.com/arcadia-editions/orders-checkout-api/blob/main/CHANGELOG.md) in the API repository records, one entry per version, so a consuming team can read it and know whether a bump is safe to take. The version belongs to the contract, and the implementation simply satisfies it.

### Publish it like any other artifact

Imagine writing a Java library and never publishing it anywhere, expecting every consumer to copy the source out of your repository by hand. That is surprisingly close to how many organizations still handle APIs, with the spec sitting in a Git repository while everyone fetches a raw URL. The contract should be published where consumers already expect to find the things they depend on, and for a Java shop that place is a Maven artifact. Packaged that way the OpenAPI or AsyncAPI specification becomes a versioned component with metadata and dependency management, published automatically to Artifactory or Maven Central like any other library, and a consuming project pulls in a specific version and lets Dependabot or Renovate propose the upgrades as they land. At that point the API has stopped being a YAML file in a repository and become a released product.

### Automate the release

Products deserve release pipelines. A [GitHub Actions workflow](https://github.com/arcadia-editions/orders-checkout-api/blob/main/.github/workflows/artifacts.yml.disabled) in the API repository validates each contract against a pinned Spectral rule set, packages the specification as a Maven artifact, publishes it and registers its schemas with Apicurio, all without a single manual step. What it does not do is generate anything. The contract was already generated from the model in an earlier step, by the ZenWave SDK inside the service's own build, so by the time this pipeline runs the OpenAPI and the AsyncAPI already exist and it simply validates, packages and publishes them. The detail worth pausing on is what that pipeline is actually doing, because it is not deploying software, it is releasing the API product. The service deployment and the contract publication are related but they are not the same event, they answer to different triggers and different consumers, and keeping them separate is what lets the contract move at the pace of a product instead of the pace of a deployment.

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

Publishing is only useful if people know where to look, and a registry gives consumers one place to discover the APIs that exist, browse versions, inspect schemas and see how the systems talk to each other. Arcadia Editions publishes its contracts to Apicurio Registry, which gets its own article later in this series, [Publishing to Apicurio and Generating an Event Catalog](/articles/arcadia/012-publishing-to-apicurio-and-event-catalog), so here it is enough to say what it buys you. It gives contracts a permanent home instead of scattering YAML across dozens of repositories, and it changes the first question a team asks from what they should call their new API to whether that API already exists. That question alone prevents a surprising amount of duplication.

### Keep it compatible

Quality is one thing and stability is another, because a contract can be perfectly well formed and still break the consumers that already depend on it. Before a new version is published, a compatibility check should confirm that existing consumers will keep working, and this matters most in event driven architectures, where schemas evolve on their own timeline and producers and consumers are deployed independently and rarely at the same moment. A schema registry can enforce those rules automatically, refusing a version that would break compatibility, so that publishing an update becomes a safe and boring event instead of a risky one. Consumers learn that upgrading is routine, and that trust is most of what makes an API pleasant to depend on.

### Derive, do not duplicate

Once the contract is the authoritative source, every artifact you maintain by hand next to it becomes a place where things can drift apart. The alternative is to derive them, generating the documentation, the SDKs, the client libraries, the server stubs, the mocks and the tests directly from the specification, so there is only ever one source of truth and everything else is a projection of it. This is the point where treating the API as a product pays back the effort, because it is exactly the mechanism that keeps an implementation from drifting away from its spec. In Arcadia Editions those derived services are built with ZenWave SDK, which is the subject of a later article on [building the Spring Boot and Kotlin backend](/articles/arcadia/013-spring-boot-kotlin-backend-from-zdl), and the same idea reaches past the code all the way to the platform, where the Kafka topics and their configuration can be provisioned from the very same contract. The implementation evolves, the generated artifacts evolve with it, and nothing drifts because nothing is maintained twice.

## The tooling only supports the lifecycle

The interesting part of all this is that no single tool is the story. OpenAPI and AsyncAPI define the product, Spectral validates its quality, GitHub Actions automates its release, Maven packages it, Artifactory distributes it, and Apicurio Registry makes it discoverable. Each one supports a single stage of the lifecycle, and it is only together that they create the experience of operating an API as a real product rather than treating it as one more file in a repository. Swap any of them for an equivalent and nothing about the idea changes, which is the surest sign that the idea, and not the toolchain, is what matters.

## The pipelines we build for Arcadia Editions

This is where the idea stops being an essay. Everything above is built in the open in the [Arcadia Editions](https://github.com/arcadia-editions) GitHub organization, and rather than copy the same YAML into every API repository, the pipelines live once as reusable workflows in [api-product-workflows](https://github.com/arcadia-editions/api-product-workflows), and each API repository calls them. The pipelines are a product too, versioned and reused the same way the contracts are. Each one owns a single stage of the lifecycle, and the rest of this series walks through them one at a time. Some are still being built, so a few of the links below point at work in progress, which is the honest state of anything built in public.

- **Contract CI** ([`artifact-ci.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/artifact-ci.yml)) runs on every pull request and push. It detects which artifact families changed, the ZDL model, the OpenAPI, the AsyncAPI or the api-product bundle, validates each one against a pinned Spectral rule set, and packages them into Maven layout JARs with checksums and metadata as a dry run. Nothing is published here. It is the gate that fails the build before a non-conformant contract ever reaches anyone downstream. In [orders-checkout-api](https://github.com/arcadia-editions/orders-checkout-api/blob/main/.github/workflows/artifacts.yml.disabled) it is just a few lines that call the shared workflow.
- **Snapshot publishing** ([`artifact-snapshot.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/artifact-snapshot.yml)) runs on merge to main and publishes SNAPSHOT versions of the changed families to the Maven repository, registering their schemas with Apicurio.
- **Contract release** ([`artifact-release.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/artifact-release.yml)) is the full release flow for one artifact family. It validates the version inputs, creates a release then next development commit sequence, opens and auto merges a PR through branch protection, tags the release commit, publishes immutable artifacts to Maven and Apicurio, builds scoped release notes, opens a PR to sync the central architecture manifest, and cuts a GitHub Release with the JARs attached. That is what turns the contract into a dependency consumers pull in like any other library.
- **Registry publishing** is not a separate pipeline, it is what the snapshot and release workflows do when they register each schema with Apicurio, so the whole organization has one place to discover what exists. It is the subject of [Publishing to Apicurio and Generating an Event Catalog](/articles/arcadia/012-publishing-to-apicurio-and-event-catalog).
- **Rule bundle release** ([`spectral-ci.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/spectral-ci.yml) / [`spectral-release.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/spectral-release.yml)) versions and releases the Spectral rule set itself as its own artifact, separate from any service's API, so the quality standard is versioned the same way the contracts are.
- **Manifest sync** ([`architecture-manifest-pr.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/architecture-manifest-pr.yml)) opens a PR against the central architecture manifest, the one repository that records which contracts and versions exist across the organization, so it stays current either as part of a release or on its own.
- **Platform provisioning** ([`provision-kafka.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/provision-kafka.yml)) generates Terraform from the service's AsyncAPI file and provisions the Confluent Cloud Kafka clusters, topics and schema registry resources from it. This is the one place in the whole pipeline where anything is generated, and what it generates is infrastructure, not a contract and not code. It is the subject of [provisioning infrastructure from AsyncAPI](/articles/arcadia/014-infrastructure-provisioning-asyncapi-terraform).

Put together, these pipelines take a contract that already exists and turn it into a validated, versioned, published and discoverable product, and the provisioning one closes the gap between that contract and the platform it runs on. The generation that produces the contract in the first place, and the code derived from it, sit outside this pipeline by design, earlier in each service's own build with the ZenWave SDK. What api-product-workflows owns is everything between the contract existing and the contract being a product everyone else can depend on.

## The model and its contracts are the product

Thinking about APIs as products is useful, but it is worth being even more precise about it. The model is where the meaning lives and the contract is how that meaning reaches everyone else, and everything else exists to implement the promise they make. Once both are first class artifacts something quietly changes, because versioning them, validating them, publishing them, discovering them, generating code from them and evolving them without breaking consumers stop feeling like separate activities and start to look like different parts of one product lifecycle. That is the real shift in mindset. It is not about treating your services as products. It is about treating the models you design and the contracts between your systems as the products they already are, because those are what everyone else, and every agent, actually builds on.
