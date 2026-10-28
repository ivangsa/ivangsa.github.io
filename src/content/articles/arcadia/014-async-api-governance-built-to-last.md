---
title: "Async API Governance Built to Last"
summary: "Using automation can keep the API and the platform in sync without policies or enforcement. In Arcadia the AsyncAPI and Avro files are the source of truth, the Kafka topics, schemas and permissions are provisioned from them with an open source toolkit, and the application code is generated from the same files. The more the teams use it, the more the API, the platform and the source code describe the same thing, and that is a governance process built to last."
date: 2026-10-28
tags:
  - arcadia
  - eda
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/014-async-api-governance-built-to-last.png
featuredImageAlt: "AsyncAPI and Avro as the source of truth, with the Kafka platform and the application code kept aligned over the years. terraform plan is the drift detector."
draft: false
---

Most API governance processes start well, with a good wiki page, some naming rules and a review board. And after two or three years nobody remembers them, the documentation says one thing and the Kafka cluster says another, and nobody knows anymore who is reading from which topic.

The usual answer is more policies and more enforcement, and that works while somebody is checking. In Arcadia we use automation instead, because with automation you can keep the API and the platform in sync without policies or enforcement:

- The teams write their AsyncAPI and Avro files, the Kafka topics
- Spectral or Open-Lint validates all enforcable naming conventions on the pipeline
- When the pipelines succeds:
  - schemas and permissions are provisioned from them, and 
  - the producers and consumers are generated from the same files.

So keeping everything aligned is a side effect of the normal work of the teams.

And that is what we mean by a governance process built to last. Nobody has to remember a rule or update a document, and the more the teams use the process, the more the API, the platform and even the source code of the applications describe the same thing.

> The open source toolkit behind this article is [ZenWave AsyncAPI Ops](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-ops/), which generates the Terraform for Kafka topics, schemas and ACLs from AsyncAPI. For the application code, [ZenWave AsyncAPI Generator](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-generator/) generates the complete Java SDK from the same files.

These are the principles behind it.

## The platform is part of the API

<div class="youtube-embed">
<iframe src="https://www.youtube.com/embed/S8Sknrdl1jM" title="Stop API Drift: Provision Kafka from AsyncAPI" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

API drift is the progressive divergence between the declared API contract and the system that implements and operates it. We usually think about the implementation side, the code of producers and consumers, and for that we already have good answers, like [generating the complete Java SDK from AsyncAPI](/talks/2026-10-26-stop-api-drift-generate-java-from-asyncapi) and letting the compiler tell you when the code and the contract stop agreeing.

But in an event driven architecture the broker is not transparent, and part of the API lives in it. Partitions decide how many consumers can run in parallel and what ordering you get, and retention decides how far back a consumer can replay, while schema compatibility decides whether you deploy the producer or the consumers first, and the ACLs decide who can read and who can write.

Producers and consumers are designed around these settings, so they belong in the contract too, next to the schemas and the operations. Today they usually live in Terraform files, scripts and consoles that nobody reviews against the API, and that is why governance loses track of them.

## AsyncAPI and Avro are the source of truth

Each service describes its events in AsyncAPI, and the payloads of those events in Avro. Everything else comes from these files, and nothing is written twice by hand.

The mapping between AsyncAPI and the platform is simple: the channel becomes the topic, the Kafka bindings give the topic configuration, with overrides per environment, the messages are registered as schemas in the Schema Registry with their compatibility, and the operations become the permissions to send or to receive. Some of these fields, like the environment overrides, the principal, the error topics and the schema compatibility, are extensions that we have proposed to the official Kafka bindings, and the toolkit accepts both forms.

The platform is provisioned automatically from these files, as we explained in [Provisioning Infrastructure with Terraform from AsyncAPI](/articles/arcadia/013-infrastructure-provisioning-asyncapi-terraform). The topics, the schemas and the service accounts are generated from the AsyncAPI files, applied to develop when you merge and promoted to pre and prod from a release.

Provisioning Kafka was already solved, with Terraform, JulieOps, Strimzi or plain scripts, and we still use Terraform. What changes is that nobody describes the same topic twice, once in AsyncAPI and again in the provisioning tool, because the Terraform is derived from the contract.

## Permissions come from the contracts too

The pipelines don't stop at topics and schemas, because they also provision the permissions and configure the consumers.

In each API repository we keep two files. `asyncapi.yml` describes what the service provides, the events that it publishes. `asyncapi-client.yml` describes what the service consumes from other services, with a `$ref` to their APIs. From the first one we create the topics, register the schemas and grant the write permissions. From the second one we only grant the read permissions for the consumer groups, together with the retry topics and the dead letter queue for that consumer, because channels referenced from another API belong to their owners and are never created from the client file.

This is the important rule: if you don't document that you consume a topic from another service, we don't give you permission to read it, and without permission you don't consume.

It may sound strict, but it is what keeps the process honest. Nobody can start reading a topic in secret, because the only way to get access is to declare it in your client API, and that declaration goes through the same pull request, the same review and the same pipeline as everything else.

## terraform plan is the drift detector

Because the Terraform is regenerated from the contract every time, `terraform plan` shows the difference between what the AsyncAPI says and what the platform has.

If a team increases the retention of a topic in AsyncAPI, the next plan shows exactly that one change, and the review of the pull request includes its impact on the platform. If somebody changes the retention by hand in the cluster, the next plan shows that too, and puts it back to what the contract says.

And the plan also protects the evolution of the contract. If a team removes a field with no default value from an Avro schema on a topic with forward compatibility, the schema validation fails and Terraform refuses to apply the plan, so the breaking change never reaches the platform.

You can see all of this running against a real Confluent Cloud cluster in this demo:

<div class="youtube-embed">
<iframe src="https://www.youtube.com/embed/0wjmvnl4wPI" title="Provision Kafka from AsyncAPI with Terraform: Demo" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

If you want to run it yourself, every step is written down in [Run Kafka provisioning on your laptop](https://github.com/arcadia-editions/api-product-workflows/blob/main/docs/run-kafka-provisioning-locally.md), and the full talk is [Stop API Drift: Provision Kafka from AsyncAPI](/talks/2026-10-26-stop-api-drift-provision-kafka-from-asyncapi).

## In 3, 5 or 7 years, the platform and the APIs say the same thing

Put all these principles together and something interesting happens with time.

Just because the teams use the pipelines and follow the process, the platform keeps representing the state of the APIs. Every topic in the cluster exists because some AsyncAPI file declares it, every schema was checked against its compatibility before it was registered, and every permission exists because some client file declares that consumption. So in 3, 5 or 7 years the APIs and the platform will represent the same thing, and nobody had to do any special effort to keep them aligned, because the governance depends on using the process in its automated way and not on discipline or on good memory.

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
