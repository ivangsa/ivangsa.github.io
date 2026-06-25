---
title: "AsyncAPI: Git, Apicurio, and Artifactory as Canonical Reference Stores"
summary: "The $ref URL in a client AsyncAPI spec must resolve to an actual document. Where you host that document determines which reference strategies are available, how much discipline is required, and what you get for free. This post compares three common options."
date: 2026-07-23
tags:
  - asyncapi
  - eda
  - ddd
  - governance
featured: false
featuredImage: assets/articles/2026-07-23-asyncapi-canonical-reference-stores.png
featuredImageAlt: "A client AsyncAPI document uses a $ref URL that resolves over plain HTTP GET through one of three logo-style canonical reference stores: Git, Apicurio Registry, or Artifactory. Git is associated with branches, tags, and commit history; Apicurio with registry versions, validation, and dependency graph features; Artifactory with generic artifact URLs and CI-managed aliases."
draft: true
---

The [previous post](/articles/asyncapi-canonical-references/) established three reference strategies — pinned version, environment alias, and integration alias — and argued that the integration alias (tracking `main`) offers the best tradeoff for parallel delivery, provided a set of invariants is maintained.

That argument is independent of any particular tool. But the `$ref` URL must resolve to something concrete. Where you host the provider spec determines what strategies are available, how much automation is required, and what you get for free. This post compares three realistic options.

## What a canonical reference store needs

Before comparing tools, it helps to be explicit about what the job requires.

A canonical reference store must:

- **Serve a stable URL that resolves via plain HTTP GET.** AsyncAPI tooling — parsers, linters, code generators — resolves `$ref` by performing a plain HTTP GET request. If the URL requires special client tooling, a non-standard resolution protocol, or auth headers that the tool cannot inject, it does not work in practice.
- **Support a moving target.** The integration alias strategy requires a URL whose content changes as the provider evolves, without the URL itself changing. This is the hard requirement. Pinned references only need immutable storage; moving aliases need something closer to a pointer that can be updated.
- **Record who changed what and when.** Governance depends on auditability. A `main` branch that anyone can push to without a trace is not a contract; it is a shared mutable file.
- **Not require duplication.** The client spec references the provider spec to avoid duplicating channel definitions. The store must not force the provider to upload a copy that diverges from the source.
- **Allow unauthenticated reads, or provide a workaround.** Writes must be protected; reads must be accessible to tooling that cannot carry credentials.

With those requirements in mind, three options cover most organizations: Git with a hosted provider, Apicurio Registry, and Artifactory.

## The authentication problem

One constraint cuts across all three options: standard AsyncAPI tooling does not send authentication headers when resolving `$ref` URLs. The `@asyncapi/parser`, Spectral, and most code generators perform a plain HTTP GET. There is no standard configuration point for injecting a bearer token or API key into `$ref` resolution.

This means that a `$ref` pointing to a private resource will fail in local development and in any CI environment that does not have network-level access. The simplest fix is to make the public contract publicly readable. That is usually acceptable: a provider spec is an API contract, not a secret.

When public access is not an option, the solution is **bundling**. The AsyncAPI CLI includes a `bundle` command that resolves all `$ref`s in a source spec and outputs a single self-contained document.

```sh
asyncapi bundle asyncapi.yml --output asyncapi.bundle.yml
```

The provider maintains its source spec with internal `$ref`s in the normal way. CI bundles it and publishes the bundle to the canonical store. Clients reference the bundle. When a client's tooling fetches the bundle URL, there are no further `$ref`s to resolve — the document is complete.

This pattern has a secondary benefit: the published bundle is exactly what the client consumes, with no dependency on the provider's internal spec layout. If the provider reorganizes its internal files, the bundle does not change and no client is affected.

The source spec lives in the repository. The bundle is the published artifact. The bundle URL is what goes into client `$ref`s.

## Git

Git is the natural starting point. The provider spec already lives in a Git repository. The question is whether the same repository can serve as the canonical reference store.

Hosted Git platforms — GitHub, GitLab, Bitbucket — expose raw file URLs that serve file contents directly over HTTP. No special client. No additional infrastructure.

```
# GitHub raw URL
https://raw.githubusercontent.com/org/orders-service/main/asyncapi.yml

# GitLab raw URL
https://gitlab.example.com/org/orders-service/-/raw/main/asyncapi.yml
```

These URLs have two components: a ref (branch name, tag, or commit SHA) and a path. That maps directly to all three reference strategies.

### Pinned version

A tag is immutable once created. The URL below always resolves to the same document.

```
https://raw.githubusercontent.com/org/orders-service/v1.1.0/asyncapi.yml
```

Git tags are created automatically by CI when a release is cut. The history is in the repository. If you need to know what changed between `v1.1.0` and `v1.2.0`, `git diff` gives you the exact answer.

### Environment alias

A branch can represent what is deployed to a given environment. The pipeline that deploys to production merges or fast-forwards an `env/production` branch to the release tag that was just promoted.

```
https://raw.githubusercontent.com/org/orders-service/env/production/asyncapi.yml
```

This branch moves when a deployment happens — automatically, in the pipeline, with full commit history. The branch log is the deployment history. `git log env/production` shows every version that has ever been deployed, in order. No manual process. No separate audit trail to maintain.

### Integration alias

The `main` branch is the integration alias. It requires no additional convention: it is already where accepted changes land.

```
https://raw.githubusercontent.com/org/orders-service/main/asyncapi.yml
```

The Git repository enforces the governance that the integration alias requires. Branch protection rules restrict who can merge to `main`. Pull request reviews are the approval process. The commit log is the audit trail. CI runs on every PR to validate the spec before it is accepted.

### Authentication

Public repositories expose raw URLs with no auth requirement. That is the cleanest option: every tool resolves the `$ref` without configuration.

Private repositories require a token. GitHub and GitLab support bearer tokens and personal access tokens, but most `$ref` resolvers are plain HTTP clients that do not send auth headers. The token-in-URL approach (`?token=xxx`) works technically but is a security risk: the token is visible in every spec file that references the provider.

The practical solution for private repositories is bundling. The provider publishes a bundled, self-contained spec to a readable location; clients reference the bundle, not the source file.

### Tooling

Raw file URLs work with every standard AsyncAPI tool: `@asyncapi/parser`, `asyncapi-cli`, Spectral, Microcks, and any code generator that accepts a URL. The URL format is simple and well understood. No additional configuration is needed.

Publishing is handled by CI with a `git push` or a branch update — no special upload step, no API call, no additional tool to install. The pipeline that merges to `main` is the publishing step.

### What Git does not give you

Git has no concept of an API artifact. It stores files. It does not parse them, validate them as AsyncAPI documents, or track relationships between them. If a client references a channel that no longer exists, Git does not know that. The failure surfaces in the client's CI, not at the point of the provider's change.

There is also no visual tooling. You can not ask "which services reference this channel?" without building that query yourself.

For teams that already have strong CI practices and do not need registry-level features, Git is often enough. The infrastructure already exists. The governance model is already familiar.

## Apicurio Registry

Apicurio Registry is purpose-built for storing API and schema artifacts. It was designed for exactly this problem.

It organizes artifacts into groups and assigns them versions. More importantly for this use case, it has a branch concept that maps directly to the reference strategies described in the previous post.

```
# Integration alias
https://registry.example.com/apis/registry/v2/groups/orders/artifacts/asyncapi/branches/main/versions/latest/content

# Pinned version
https://registry.example.com/apis/registry/v2/groups/orders/artifacts/asyncapi/versions/1.1.0/content

# Environment alias
https://registry.example.com/apis/registry/v2/groups/orders/artifacts/asyncapi/branches/env-production/versions/latest/content
```

### Branches as aliases

An Apicurio branch is a named sequence of versions. When a new version is published to a branch, the branch pointer advances. A client referencing the branch URL always gets the latest version on that branch — but the history of every version that has ever been on the branch is preserved.

This means you can run two kinds of aliases in parallel:

- A `main` branch that advances when a contract change is accepted. This is the integration alias.
- An `env/production` branch that advances when a deployment to production completes. A pipeline step publishes the version to this branch as part of the deployment. This is the environment alias.

Both branches exist simultaneously. A client references `main`. An operator checks `env/production` to know what is actually running. Neither conflicts with the other.

### Built-in validation

Apicurio parses and validates uploaded artifacts. It knows it is storing an AsyncAPI document, not an arbitrary file. It can apply compatibility rules: BACKWARD, FORWARD, FULL. If a provider tries to publish a breaking schema change, Apicurio can reject it before the artifact is stored — before any client is affected, before any CI pipeline fails.

This moves contract governance upstream. Instead of discovering a breaking change when a client's build fails, you discover it when the provider tries to merge.

### Cross-reference tracking and the dependency graph

When a client spec references a provider spec using `$ref`, Apicurio can parse those references and build a dependency graph. A UI shows which artifacts reference which other artifacts. If you want to know which services will be affected by a change to the Orders provider spec, the registry answers that question.

This capability becomes important as the number of services grows. In a system with dozens of services and hundreds of channel references, the dependency graph is the only practical way to assess the blast radius of a contract change without grepping across every repository.

### Authentication

Apicurio separates read and write auth cleanly. Write access — publishing new artifact versions — is protected by Keycloak or an OIDC provider, configured with service account credentials in CI. Read access — fetching content for `$ref` resolution — can be made public or scoped to an internal network without requiring tokens.

This is the right model for a canonical reference store: protected writes with auditable identity, open reads that work in any tool.

### Tooling

The content URL — the one used in `$ref` — is a plain HTTP GET endpoint that returns the YAML body directly. Standard `@asyncapi/parser` and Spectral resolve it without special configuration, as long as the registry is network-accessible from the build environment.

Publishing requires an API call or a dedicated client. The Apicurio Maven plugin handles publishing from Maven or Gradle pipelines. The REST API is available for scripted uploads from any CI environment with `curl` or the JFrog CLI. The tooling is more involved than a `git push`, but it is well-documented and has official client support in multiple languages.

The registry UI shows artifact versions, branch history, compatibility state, and the cross-reference graph. For teams doing regular API-first reviews, the UI replaces a significant amount of manual tracking.

### What Apicurio requires

Apicurio is additional infrastructure to deploy and operate. It needs to be available and reachable by all teams. The pipeline integration requires a dedicated publishing step: whenever the provider spec changes in the source repository, CI uploads the new version to the registry.

That upload step also means the registry is not automatically in sync with the source repository. If someone edits the spec and skips CI, the registry lags. The pipeline must be the only path to publishing.

For organizations already operating Kafka with Confluent Schema Registry or another registry, adopting Apicurio is a natural extension. For organizations without any existing registry infrastructure, it is a new operational dependency to justify.

## Artifactory

Artifactory is a universal artifact repository. Many organizations already have it. That is its main argument: not that it is the best tool for this job, but that it may already be present and approved.

### Generic repository

Artifactory generic repositories store arbitrary files. A provider spec can be uploaded as a YAML file at a predictable path.

```
https://artifactory.example.com/artifactory/asyncapi-specs/orders-service/main/asyncapi.yml
```

This URL is a moving target: the pipeline uploads the new version to this path on every accepted change. The URL stays constant; the content changes. That satisfies the integration alias requirement.

The problem is auditability. Artifactory generic repositories are not append-only by default. When a new version is uploaded to the same path, the previous version is overwritten. The history is gone unless Artifactory's audit log is treated as the record of truth, which is a different kind of audit trail than a Git commit log or a registry version history.

You can work around this by uploading to both a versioned path and the moving alias path:

```
# Versioned (immutable, for pinned references)
asyncapi-specs/orders-service/v1.1.0/asyncapi.yml

# Moving alias (for integration alias)
asyncapi-specs/orders-service/main/asyncapi.yml
```

The pipeline manages both uploads. Versioned paths are never overwritten. The alias path is updated on each release. This approximates what Git and Apicurio provide natively, but it requires a discipline that the tooling does not enforce.

For immutable repositories — where Artifactory is configured to reject overwrites — the moving alias must live in a separate repository from the versioned artifacts. Two repositories, one append-only for versions and one writable for aliases. More operational overhead, but it works.

### Maven repository

If your organization uses Artifactory primarily for Maven artifacts, there is a tempting shortcut: package the AsyncAPI spec as a JAR and publish it through the Maven pipeline.

Maven has release and SNAPSHOT concepts that map loosely to the reference strategies:

- A release (`1.1.0`) maps to a pinned version.
- A SNAPSHOT (`1.2.0-SNAPSHOT`) maps loosely to an integration alias: it is the latest accepted development state.

The fundamental problem is resolution. Maven artifacts are not served as plain HTTP URLs. Resolving a file from a Maven artifact requires a Maven client: `mvn dependency:get`, Gradle, or similar. A `$ref` in an AsyncAPI document cannot point to a Maven artifact path and be resolved by standard AsyncAPI tooling without additional pipeline steps to unpack and stage the file.

You can make it work: a pipeline step resolves the Maven artifact, extracts the YAML file, and places it at a known HTTP path. But at that point you have added a resolution layer that must be maintained. The complexity increases without a corresponding benefit over the generic repository approach.

### Authentication

Artifactory supports anonymous read at the repository level. Enabling it for the repository that holds the canonical specs is straightforward and makes `$ref` resolution work in any tool with no token configuration.

Write access is protected by API keys or access tokens, which CI pipelines pass as request headers to the JFrog REST API or JFrog CLI. The separation is easy to configure and well understood by teams that already use Artifactory for other artifacts.

### Tooling

The generic repository URL is a plain HTTP GET endpoint. It works with all standard AsyncAPI tooling the same way a Git raw URL does.

Publishing is done through the JFrog CLI or the Artifactory REST API — a `curl -T asyncapi.yml <url>` is enough. The JFrog CLI integrates into most CI platforms without friction.

There is no schema-aware tooling. No validator, no compatibility check, no dependency graph. Any of these must be implemented as separate CI steps.

### What Artifactory gives you

Artifactory stores files and serves them over HTTP. That is enough for the basic requirement. The tooling supports access control, checksum verification, and retention policies. For an organization where Artifactory is the approved artifact store and adding new infrastructure is difficult, it is a viable path.

What it does not give you is anything specific to APIs or schemas: no validation, no compatibility checking, no cross-reference tracking. The governance that Apicurio enforces automatically must be implemented in CI scripts and team discipline.

## Comparison

| | Git | Apicurio Registry | Artifactory (generic) |
|---|---|---|---|
| Pinned version | Native (tags) | Native (versions) | Manual (versioned path) |
| Environment alias | Native (branch, pipeline-managed) | Native (branch, pipeline-managed) | Manual (separate path or repo) |
| Integration alias | Native (`main` branch) | Native (branch) | Manual (overwrite alias path) |
| Auditability | Full (commit log) | Full (version history) | Partial (audit log only) |
| Moving alias history | Full (branch log) | Full (branch version list) | None (overwrite) |
| Schema validation | None | Built-in | None |
| Compatibility enforcement | None | Built-in (BACKWARD / FORWARD / FULL) | None |
| Cross-reference tracking | None | Built-in, with UI | None |
| Read auth required | Optional (private repos only) | Optional (configurable) | Optional (configurable) |
| Write auth | Branch protection + PR | OIDC / service account | API key / token |
| $ref resolution (public) | Any tool, no config | Any tool, no config | Any tool, no config |
| $ref resolution (private) | Bundle workaround | Bundle workaround | Bundle workaround |
| CI publishing step | `git push` (zero extra steps) | REST API / Maven plugin | JFrog CLI / REST API |
| Additional infrastructure | None | Yes | Already present (assumption) |

## Conclusion

If you are starting from scratch, the choice is between Git and Apicurio.

**Git** covers all three strategies with no additional infrastructure. The governance model — branch protection, pull requests, commit history — is already understood by most teams. The raw file URL is simple and works with any AsyncAPI tooling. What you give up is validation and cross-reference tracking: the registry-level features that become valuable at scale.

**Apicurio Registry** is purpose-built for this problem. It handles all three strategies, provides built-in API validation, enforces compatibility rules, and tracks dependencies between services. The dependency graph alone is worth the operational cost once the number of cross-service references grows past what can be tracked manually. The tradeoff is new infrastructure and a publish step in every provider pipeline.

**Artifactory** is justified when it is already present and the organization cannot add new infrastructure. The generic repository approach works, but it requires CI discipline to maintain the moving alias and versioned paths consistently, and it provides no schema-specific features. The Maven approach adds tooling complexity without meaningful benefit for this use case.

For most teams, the practical starting point is Git. The raw file URL requires nothing new. When the system grows to the point where knowing which services reference which channels becomes a daily operational question, Apicurio is the natural upgrade.
