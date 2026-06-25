---
title: "AsyncAPI: Which Reference Strategy to Use and Why"
summary: "AsyncAPI's $ref lets a client spec point to a provider spec without duplicating it. When that spec drives both application contracts and infrastructure provisioning, the URL behind the $ref is an important decision to answer. A pinned version, a environment alias, or the tip of main: each offer different trade-offs."
date: 2026-06-29
tags:
  - asyncapi
  - eda
  - ddd
  - governance
featured: false
featuredImage: assets/articles/asyncapi-reference-strategy.svg
featuredImageAlt: "A client AsyncAPI spec points through a $ref URL to three possible provider contract targets: a pinned version, production, or main. The main branch is highlighted as the recommended integration reference."
draft: false
---

The [previous post](/articles/asyncapi-provider-vs-client-two-perspectives) introduced the two-spec pattern: each application models two different API definitions:

- a provider spec with what the application owns
- a client spec that references uses via `$ref`. 

The reference is a URL. At some point that URL must resolve to an actual document. The question is: which document?

## AsyncAPI as a contract and infrastructure spec

An API first such as AsyncAPI serves many purposes at once.

As an **application contract**, it describes what an application does: the events it produces, the commands it accepts, the messages it sends. The client spec references the provider spec to validate compatibility at authoring time and in CI. If the provider changes a schema in a breaking way, the client's build should fail before anything reaches production.

As an **infrastructure spec**, it describes what the messaging platform should look like: topic addresses, partitions, schemas, ACLs. A Kafka provisioning pipeline reads the provider spec and ensures the topic exists with the right configuration. The spec is the desired state of the broker.

Both uses depend on this reference URL source. And applications evolve over time and in parallel. Which means that a particular client maybe developing a feature that references a topic that is still in development, not released or provisioned to prod.

This introduces different strategies about which reference target to use.

## Which question do you want to answer?

Every reference strategy answers a specific question.

| Strategy | Example | Question |
| -------- | ------- | -------- |
| Pinned version | `v1.1.0` | What version was this designed against? |
| Environment alias | `env/prod` | What is currently deployed? |
| Integration alias | `main` | What is the current accepted contract? |

There is no correct answer. Each strategy is a tradeoff. The following sections work through what each one gives you, what it costs, and what conditions it requires to work in your favor.

## Pinned references

A pinned reference points to an immutable artifact. Even when the applications constantly evolve. A pinned `v1.1.0` today is the same `v1.1.0` tomorrow.

Advantages:

- **Reproducibility.** The same reference always resolves to the same document.
- **Auditability.** You can see exactly what a client was designed against.
- **Traceability.** A breaking change is visible by diffing versions.

The drawback is structural. The platform does not stand still. Topics get added. Schemas evolve. Bindings change. The moment a pinned reference is created, the platform begins to diverge from it. A provisioning pipeline reading that reference is acting on a snapshot that is already out of date. The gap widens with every deployment.

Pinned references answer the design question precisely. But as a source of truth for the current state of the platform, they drift from the first day.

## Environment alias

An environment alias points to whatever is currently deployed. The URL is stable; the content behind it changes when the provider ships a new version.

The appeal is direct: the alias represents exactly what is running in production right now. If the goal is for the spec to represent the platform, this seems like the obvious choice.

The problem emerges with cross-service features.

Consider a feature that spans two services: the Orders service adds a new channel and the Payments service subscribes to it. It cannot be promoted to production simultaneously. The Payments service cannot complete its API-First definition until Orders is deployed to production. One service deploys first because the target `$ref` does not exist yet: authoring tools don't work, linting fails, CI/CD pipelines can not resolve it.

This is not an edge case. Every non-trivial feature in an event-driven system spans multiple services. The environment alias makes each of those deployments a coordination problem.

Bootstrap is the degenerate version of the same issue. A brand-new provider has nothing deployed yet. The alias cannot resolve. But the client needs to reference the spec before either service can ship. Circular dependency from day one.

Environment aliases answer the operational question. They introduce coordination complexity that grows with every cross-service feature.

## Moving integration alias

An integration alias points to the latest accepted state: the tip of the provider's `main` branch.

In a typical Git flow, a provider team opens a feature branch to add a new channel. They merge it to `develop` and provision the development environment: the new Kafka topic is created, the schema is registered, the application is deployed. They test. When the testing passes, they open a pull request to `main`. The PR is the governance event. On merge, a release tag is created. From there, the tag travels environment by environment, staging is provisioned and deployed, then production. Each environment reflects the spec at the moment the tag was created.

`main` is the point where a change has been accepted and is ready to be promoted. Not yet in production, but past the gate.

The name is stable. The content moves as the provider evolves. The movement is audited through Git: every change is a commit with an author, a timestamp, and a diff.

This is the critical distinction from the environment alias. `main` does not represent what is in production right now. It represents what has been accepted as the current contract: the changes that have passed review, been merged, and are ready to be promoted. A channel can exist in `main` before it is deployed. A deprecated channel can remain in production but already unavailable in `main` until an deployment removes it from production.

> `main` is not the current state of the platform. It is the desired state: the contract that will be promoted environment by environment until it reaches production.

This model works well for infrastructure-as-code. You describe what you want. The pipeline converges toward it.

`main` does not answer every question, though. ⚠️It does not tell you what is currently provisioned in the broker. ⚠️It does not tell you whether a topic is live or whether you are safe to deploy. Those are runtime questions that belong to a different layer of validation, not to the contract.

`main` is also ⚠️a moving target. If a channel identifier is renamed, every client referencing the old name immediately points to something that no longer exists. The breakage is silent and instant.

What `main` does give you is ✔️parallel delivery. The moment a new channel is merged to `develop`, any service that needs it can start developing against it: authoring, linting, CI, all of it resolves. The moment the provider promotes to `main`, other services can promote their own changes to `main` as well and begin their own environment-by-environment journey independently. No coordination toll.

Services do not wait for each other and the contract is decoupled from the deployment.

But to make this advantage work, **some discipline is required**. The following invariants are not optional.

### Required invariants

The integration alias only works if the `main` branch is kept coherent. That requires accepting a set of invariants that are not optional.

**Channel identifiers must be stable.** A rename looks like a deletion followed by a creation. Any client referencing the old identifier silently points to a channel that no longer exists. New channels get new identifiers. Existing identifiers do not change. You can enforce this naming convention with standard linting tools.

**Backwards compatibility is maintained until consumers migrate.** A channel cannot be removed from `main` until every client that references it has been updated. Removing it first breaks every client's CI and provisioning pipeline immediately.

**Breaking changes are explicit and governed.** A schema change that breaks existing consumers must be recognized as such before merging. Even better do not allow breaking changes on a live topic. User compatibility rules and version the topic if required changes are not compatible with existing clients.

**Liveness is validated separately.** The spec says a channel should exist. Whether it does exist in the broker is a separate check. Do not mix them. If you are deploying or provisioning a client that depends on a channel that does not exist in an environment, just fail the CI/CD pipeline.

These invariants are the price of the strategy. They are not optional mitigations. Without them, `main` is not a stable reference. But with them it offers a stable reference clients can use and develop in paralell.


## Conclusion

There is no universal reference strategy. Each one answers a different question, and each one is blind to something.

| Strategy | Answers | Does not answer | Parallel development |
| -------- | ------- | --------------- | -------------------- |
| Pinned version (`v1.1.0`) | What this was designed against | Current platform or application state | No |
| Environment alias (`env/prod`) | What is deployed in that environment | Features not yet promoted | No |
| Integration alias (`main`) | What has been accepted as the contract | Design intent or deployment state | Yes, with discipline |

**Pinned references** answer the design question precisely. The problem is drift, and it comes from two directions at once: the platform evolves past the pin, and the application that referenced it has moved on as well. The spec and the system diverge from day one.

**Environment aliases** answer the deployment question precisely. The problem is that they make parallel feature development impossible. In an event-driven or distributed architecture of any size, features routinely span multiple services. Blocking cross-service development until one service is deployed to production is not a minor inconvenience. It is a structural constraint that limits how your teams can work.

**Integration aliases** answer neither of the above questions. They do not tell you what was designed or what is deployed. What they give you instead is a stable reference name that lets teams develop and deploy in parallel. The moment a contract change is accepted into `main`, every dependent team can move forward independently, without waiting for production to catch up.

That apparent weakness is the actual advantage. `main` represents a future that has been committed to, not a present that can be observed. With discipline on the required invariants, that is enough.

The [next post](/articles/asyncapi-canonical-reference-stores/) compares three technologies that can host the provider spec — Git, Apicurio Registry, and Artifactory — and examines how well each one supports these strategies in practice.
