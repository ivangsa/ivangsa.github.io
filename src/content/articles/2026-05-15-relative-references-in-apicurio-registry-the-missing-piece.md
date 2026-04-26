---
title: "Relative References in Apicurio Registry: The Missing Piece"
summary: ""
date: 2026-05-15
tags:
  - Apicurio
  - AsyncAPI
  - OpenAPI
  - API Governance
featured: false
featuredImage: assets/articles/2026-05-15-relative-references-in-apicurio-registry-the-missing-piece/apicurio.png
featuredImageAlt: ""
readingTime: "8 min read"

draft: true
---

# Relative References in Apicurio Registry: The Missing Piece

In [a previous article](/articles/2026-04-26-how-i-fixed-three-friction-points-in-the-apicurio-registry-maven-plugin) I wrote about using Apicurio Registry as the canonical URL provider for API schemas in a governance setup. The core idea is that tooling needs stable, versioned URLs it can fetch, and Git raw URLs are not a reliable foundation for that.

That setup works well once you get your artifacts registered. But it has one gap that becomes visible as soon as your APIs grow beyond a single file: relative `$ref`s between artifacts in the same group do not resolve correctly through the registry.

---

## The problem

Consider an AsyncAPI spec that references a shared Avro schema using a relative path:

```yaml
# asyncapi.yml
components:
  schemas:
    CustomerEvent:
      $ref: 'avro/CustomerEvent.avsc'
```

In Git, this works fine. The file is at `avro/CustomerEvent.avsc` relative to `asyncapi.yml`, and any tool that clones the repository can resolve it.

Now you register both files in Apicurio Registry. The AsyncAPI gets a canonical URL like:

```
/apis/registry/v3/groups/my-group/artifacts/asyncapi.yml/versions/1.0.0/content
```

And the Avro schema gets its own:

```
/apis/registry/v3/groups/my-group/artifacts/avro%2FCustomerEvent.avsc/versions/1.0.0/content
```

When a tool fetches the AsyncAPI from the registry and encounters `$ref: 'avro/CustomerEvent.avsc'`, it tries to resolve that path relative to the parent URL. The result is something like:

```
/apis/registry/v3/groups/my-group/artifacts/avro/CustomerEvent.avsc
```

That URL does not exist. The registry has no concept of a directory structure within a group, so the resolution fails.

---

## The current workaround: `?references=REWRITE`

Apicurio Registry has a query parameter that addresses this:

```
/apis/registry/v3/groups/my-group/artifacts/asyncapi.yml/versions/1.0.0/content?references=REWRITE
```

With `?references=REWRITE`, the registry rewrites all `$ref` values in the served content, replacing relative paths with absolute registry URLs before returning the document.

It works. But it has a fundamental problem: the content the registry serves is no longer identical to what is in Git. A tool that fetches the document with `?references=REWRITE` receives a modified version with rewritten references. That breaks the guarantee that Git is the source of truth, complicates content-addressable workflows, and makes it harder to audit or diff what is actually registered.

It is a workaround, not a solution.

---

## What is actually needed

There are two orthogonal problems here, and each needs its own solution.

**1. The registry should track the relative path of each artifact within its group.**

When you register `asyncapi.yml` and `avro/CustomerEvent.avsc` together, the registry should know that the Avro schema lives at `avro/` relative to the root of the group. This metadata, a `relativePath` field on the artifact, would allow the registry to understand the logical folder structure without changing any artifact IDs or content.

With this in place, when the registry serves `asyncapi.yml` and resolves `$ref: 'avro/CustomerEvent.avsc'`, it can look up the artifact whose `relativePath` is `avro/CustomerEvent.avsc` and attach it as a proper reference, without rewriting anything.

**2. Content URLs should be structurally compatible with how files are stored on disk.**

The registry could expose a new endpoint pattern that mirrors the repository layout within a group:

```
/apis/registry/v3/artifact-content/{artifactVersion}/{groupId}/{relativePath}
```

For example:

```
/apis/registry/v3/artifact-content/1.0.0/my-group/asyncapi.yml
/apis/registry/v3/artifact-content/1.0.0/my-group/avro/CustomerEvent.avsc
```

When a tool fetches `asyncapi.yml` from this endpoint and encounters `$ref: 'avro/CustomerEvent.avsc'`, the relative path resolves naturally to:

```
/apis/registry/v3/artifact-content/1.0.0/my-group/avro/CustomerEvent.avsc
```

Which is exactly where the schema lives. No rewriting. No configuration. The URL structure does the work.

Cross-group references would still use fully qualified registry URLs, as they do today.

---

## Status

This is tracked in [Apicurio Registry issue #6712](https://github.com/Apicurio/apicurio-registry/issues/6712), opened in October 2025. Related work is in progress in PRs [#6934](https://github.com/Apicurio/apicurio-registry/pull/6934) and [#7083](https://github.com/Apicurio/apicurio-registry/pull/7083).

I will write a follow-up once the feature lands and I have had a chance to test it against a real multi-file AsyncAPI governance setup.
