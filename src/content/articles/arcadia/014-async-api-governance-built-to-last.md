---
title: "Async API Governance Built to Last"
summary: "Using automation can keep the API and the Platform in sync without much policy or enforcement. When the AsyncAPI and Avro files are the source of truth, the Kafka topics, schemas and permissions are provisioned from them with an open source toolkit, and the application code is generated from the same files: The more the teams use it, the more the API, the platform and the source code describe the same thing, and that is a governance process built to last."
date: 2026-10-28
tags:
  - arcadia
  - eda
  - asyncapi
  - gorvernance
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/014-async-api-governance-built-to-last.png
featuredImageAlt: "AsyncAPI and Avro as the source of truth, with the Kafka platform and the application code kept aligned over the years."
draft: false
---

Most API governance processes start well, with a good wiki page, some naming rules and a review board. And after two or three years nobody remembers them, the documentation says one thing and the Kafka cluster says another, and nobody knows anymore who is reading from which topic.

The usual answer is more policies and more enforcement, and that works while somebody is checking. In Arcadia we use automation instead, because with automation you can keep the API and the platform in sync without policies or enforcement:

- The teams write their AsyncAPI and Avro files.
- Spectral or Open-Lint validates all the enforceable naming conventions in the pipeline.
- When the pipeline succeeds, the Kafka topics, schemas and permissions are provisioned from those files, and the producers and consumers are generated from the same files.

So keeping everything aligned is a side effect of the normal work of the teams.

And that is what we mean by a governance process built to last. Nobody has to remember a rule or update a document, and the more the teams use the process, the more the API, the platform and even the source code of the applications describe the same thing.

> The open source toolkit behind this article is [ZenWave AsyncAPI Ops](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-ops/), which generates the Terraform for Kafka topics, schemas and ACLs from AsyncAPI. For the application code, [ZenWave AsyncAPI Generator](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-generator/) generates the complete Java SDK from the same files.

These are the principles behind it.

## The platform is part of the API

<div class="youtube-embed">
<iframe src="https://www.youtube.com/embed/S8Sknrdl1jM" title="Stop API Drift: Provision Kafka from AsyncAPI" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

In an event driven architecture the broker is part of the API. It is not transparent or neutral. Partitions, retention, transactionality, schema evolution... affects how producers and consumers are designed. 

Partitions decide how many consumers you can run in parallel. Retention decides how far back a consumer can replay, it is not the same design a consumer for one year that one week retention time. And schema compatibility decides on which order you can rollout consumers and producers: a message with FORWARD compatibility producer can be deployed first, but with BACKWARD compatibility consumers must be deployed before than consumers.

Producers and consumers are designed around these settings, so they belong in the contract too, next to the schemas and the operations. Today they usually live in Terraform files, scripts and consoles that nobody reviews against the API, and that is why governance loses track of them.

## AsyncAPI and Avro are the source of truth

AsyncAPI + specific bindings along with the avro schemas act as the source of truth.

The platform is provisioned automatically from them, as we explained in [Provisioning Infrastructure with Terraform from AsyncAPI](/articles/arcadia/013-infrastructure-provisioning-asyncapi-terraform). The topics, the schemas in the Schema Registry and the service accounts are generated from the AsyncAPI files, applied to develop when you merge and promoted to pre and prod from a release.

## Permissions come from the contracts too

The pipelines don't stop at topics and schemas, because they also provision the permissions and configure the consumers.

In each API repository we keep two files. `asyncapi.yml` describes what the service provides, the events that it publishes. `asyncapi-client.yml` describes what the service consumes from other services, with a `$ref` to their APIs. From the first one we create the topics and the write permissions, and from the second one only the read permissions and the consumer groups.

This is the important rule: if you don't document that you consume a topic from another service, we don't give you permission to read it, and without permission you don't consume.

It may sound strict, but it is what keeps the process honest. Nobody can start reading a topic in secret, because the only way to get access is to declare it in your client API, and that declaration goes through the same pull request, the same review and the same pipeline as everything else.

## In 3, 5 or 7 years, the platform and the APIs say the same thing

Put all these principles together and, just because the teams use the pipelines and follow the process, the platform keeps representing the state of the APIs as time goes by. Every topic in the cluster exists because some AsyncAPI file declares it, every schema was checked against its compatibility before it was registered, and every permission exists because some client file declares that consumption. So in 3, 5 or 7 years the APIs and the platform will represent the same thing, and nobody had to do any special effort to keep them aligned, because the governance depends on using the process in its automated way and not on discipline or on good memory.

## But you cannot navigate hundreds of repositories

There is still one problem. The information is all there, split between `asyncapi.yml` and `asyncapi-client.yml`, but it is distributed across many repositories.

When you have only a couple of services it is very easy to open the repositories and see who is consuming what. But when this grows to dozens, or even hundreds of services, navigating that by hand is practically impossible. If you want to know who consumes `OrderConfirmed` before you change it, you would need to open every client file in every repository of the company.

That is why we have the [master YAML](/articles/arcadia/011-master-yaml-architecture-manifest). The architecture manifest is the index of every domain, service and contract, with pointers to the AsyncAPI files of each service, and it is updated automatically every time a team releases an API. From that index the tools can answer the questions that you cannot answer by browsing repositories, and the [Event Catalog](/articles/arcadia/012-arcadia-architecture-manifest-meets-event-catalog) shows the answer as a website, with the producers and the consumers of every event.

## A process that keeps working

So these are the pieces of a governance process built to last:

- AsyncAPI and Avro are the source of truth, including the platform settings that shape how producers and consumers behave.
- The platform, topics, schemas and permissions, is provisioned automatically from them with an open source toolkit.
- `terraform plan` shows every difference between the contract and the platform, and schema compatibility blocks breaking changes before they are applied.
- If a consumption is not documented, there is no permission and there is no consumption.
- The master YAML connects all the APIs, so you can navigate them when they are hundreds.

None of these needs somebody to remember anything. The teams keep working with their APIs as they already do, and by using the process in this automated way, over the years, the APIs keep representing what the platform really provides and consumes.
