---
title: "Async API Governance Built to Last"
summary: "AsyncAPI and Avro are the source of truth, and the platform is provisioned from them, permissions included. If you don't document that you consume a topic, you don't get permission to read it. After some years of using it this way, the platform and the APIs describe the same thing, and the master YAML lets you navigate it when you have hundreds of services."
date: 2026-10-09
tags:
  - arcadia
  - eda
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/014-async-api-governance-built-to-last.png
featuredImageAlt: ""
draft: true
---

Most API governance processes start well, with a good wiki page, some naming rules and a review board. And after two or three years nobody remembers them, the documentation says one thing and the Kafka cluster says another, and nobody knows anymore who is reading from which topic.

In Arcadia we wanted a governance process for asynchronous APIs that is built to last, and for that it needs to work by itself, as a side effect of the normal work of the teams, and not because somebody remembers to update a document.

These are the principles behind it.

## AsyncAPI and Avro are the source of truth

Each service describes its events in AsyncAPI, and the payloads of those events in Avro. Everything else comes from these files, and nothing is written twice by hand.

The platform is provisioned automatically from them, as we explained in [Provisioning Infrastructure with Terraform from AsyncAPI](/articles/arcadia/013-infrastructure-provisioning-asyncapi-terraform). The topics, the schemas in the Schema Registry and the service accounts are generated from the AsyncAPI files, applied to develop when you merge and promoted to pre and prod from a release.

## Permissions come from the contracts too

The pipelines don't stop at topics and schemas, because they also provision the permissions and configure the consumers.

In each API repository we keep two files. `asyncapi.yml` describes what the service provides, the events that it publishes. `asyncapi-client.yml` describes what the service consumes from other services, with a `$ref` to their APIs. From the first one we create the topics and the write permissions, and from the second one only the read permissions and the consumer groups.

This is the important rule: if you don't document that you consume a topic from another service, we don't give you permission to read it, and without permission you don't consume.

It may sound strict, but it is what keeps the process honest. Nobody can start reading a topic in secret, because the only way to get access is to declare it in your client API, and that declaration goes through the same pull request, the same review and the same pipeline as everything else.

## In 3, 5 or 7 years, the platform and the APIs say the same thing

Put all these principles together and something interesting happens with time.

Just because the teams use the pipelines and follow the process, the platform keeps representing the state of the APIs. Every topic in the cluster exists because some AsyncAPI file declares it, and every permission exists because some client file declares that consumption. So in 3, 5 or 7 years the APIs and the platform will represent the same thing, and nobody had to do any special effort to keep them aligned.

This is what we mean by built to last. The governance doesn't depend on discipline or on good memory, it depends on using the process in its automated way.

## But you cannot navigate hundreds of repositories

There is still one problem. The information is all there, split between `asyncapi.yml` and `asyncapi-client.yml`, but it is distributed across many repositories.

When you have only a couple of services it is very easy to open the repositories and see who is consuming what. But when this grows to dozens, or even hundreds of services, navigating that by hand is practically impossible. If you want to know who consumes `OrderConfirmed` before you change it, you would need to open every client file in every repository of the company.

That is why we have the [master YAML](/articles/arcadia/011-master-yaml-architecture-manifest). The architecture manifest is the index of every domain, service and contract, with pointers to the AsyncAPI files of each service, and it is updated automatically every time a team releases an API. From that index the tools can answer the questions that you cannot answer by browsing repositories, and the [Event Catalog](/articles/arcadia/012-arcadia-architecture-manifest-meets-event-catalog) shows the answer as a website, with the producers and the consumers of every event.

## A process that keeps working

So these are the pieces of a governance process built to last:

- AsyncAPI and Avro are the source of truth.
- The platform, topics, schemas and permissions, is provisioned automatically from them.
- If a consumption is not documented, there is no permission and there is no consumption.
- The master YAML connects all the APIs, so you can navigate them when they are hundreds.

None of these needs somebody to remember anything. The teams keep working with their APIs as they already do, and by using the process in this automated way, over the years, the APIs keep representing what the platform really provides and consumes.
