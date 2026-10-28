---
title: "Stop API Drift: Provision Kafka from AsyncAPI"
date: 2026-10-27
summary: "In an event driven system, part of the API lives in the broker. This talk shows how to keep topics, schemas and ACLs aligned with the AsyncAPI contract, and how terraform plan becomes the drift detector for the platform."
tags:
  - asyncapi
  - kafka
  - terraform
  - api-first
  - zenwave
featured: false
duration: "21 min"
video: https://youtu.be/S8Sknrdl1jM
---

This is the second half of a pair of talks about API drift. [The first one](/talks/2026-10-26-stop-api-drift-generate-java-from-asyncapi) is about the code: you generate Java from AsyncAPI, and the compiler tells you when the implementation and the contract stop agreeing. This one is about the platform, the part of the API that lives in Kafka and that the compiler will never see.

I wrote about the why some months ago, in [API First 360](/articles/2026-05-10-api-first-360-asyncapi-code-and-infrastructure/). In the talk I tell the same idea out loud, and then I show it running.

<div class="youtube-embed">
<iframe src="https://www.youtube.com/embed/S8Sknrdl1jM" title="Stop API Drift: Provision Kafka from AsyncAPI" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

## What the talk covers

The first half is the argument, and it fits in a few lines.

API drift is the slow divergence between the declared contract and the system that implements and **operates** it. In event driven systems it has two faces. One is the implementation, which we already know how to protect. The other is the platform, where partitions, retention, schema compatibility and ACLs decide how producers and consumers can behave. Those are API design constraints, not only settings for the Kafka administrators.

Provisioning Kafka is already solved, with Terraform, JulieOps, Jikkou, Strimzi or plain scripts. The problem is duplicated intent: the same topic described once in AsyncAPI and once more in a provisioning tool, and the two copies slowly going their own way. So the contract becomes the source, and the provisioning model is derived from it.

## What the demo shows

The second half is a live run on [Arcadia Editions](https://github.com/arcadia-editions), against a real Confluent Cloud cluster.

1. We read `asyncapi.yml`, the contract of what `orders-checkout-api` owns: four channels, Kafka bindings with develop overrides, Avro schemas with forward compatibility, and write access for each operation.
2. We read `asyncapi-client.yml`, the contract of what it consumes from other teams. Referenced channels are never created, so we only get read ACLs, plus a dead letter queue and three retry topics from an extension.
3. One script generates Terraform from both files and runs `terraform plan`: 64 resources. We apply, and check the topics and schemas in Confluent Cloud.
4. We change the retention of one topic in AsyncAPI, never in Terraform, and the next plan shows exactly that change.
5. We remove a field with no default from an Avro schema. Forward compatibility makes the plan fail, so the breaking change never reaches the platform.
6. We push the retention change to `develop`, and the GitHub Actions pipeline plans and applies it: one resource changed.

If you want to run it yourself, every step is written down in [Run Kafka provisioning on your laptop](https://github.com/arcadia-editions/api-product-workflows/blob/main/docs/run-kafka-provisioning-locally.md). The pipeline version, from pull request to production, is in [Provisioning Infrastructure with Terraform from AsyncAPI](/articles/arcadia/013-infrastructure-provisioning-asyncapi-terraform).

## Two talks, one contract

The two talks follow the same shape on purpose.

| | Stop API Drift: Java | Stop API Drift: Kafka |
| --- | --- | --- |
| Drift type | Implementation drift | Platform drift |
| Derived from AsyncAPI | Java SDK for producers and consumers | Terraform for topics, schemas and ACLs |
| Feedback | The compiler | `terraform plan` |
| Tool | [AsyncAPI Generator](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-generator/) | [AsyncAPI Ops](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-ops/) |

In both cases the contract changes first, and everything downstream has to acknowledge that change before it reaches a running system. API First should not stop when the code compiles.

## Transcript

<details>
<summary>Read the full transcript</summary>

### Stop API Drift: Provision Kafka from AsyncAPI

Today I want to talk about API drift, but not the kind of drift we usually think about. When we talk about API First, we normally focus on keeping the application code aligned with the API contract. But in event-driven architectures there is another part of the system that can drift: the message broker, the messaging platform itself.

This talk is about using the AsyncAPI definition as the source of truth for provisioning the platform and keeping it aligned with the API contract.

### About me

My name is Ivan Garcia. I'm a member of the technical steering committee of AsyncAPI. I'm also an ambassador, the maintainer of the Visual Studio Code extension and, more recently, of the Kafka bindings. And I'm the creator and maintainer of the ZenWave platform.

ZenWave is a set of tools for designing and building event-driven architectures, microservices and modular monoliths, with first-class support for AsyncAPI in Java. In this session we are going to use some of these tools, but the ideas and techniques I want to share with you today are not tied to ZenWave in any way. You can apply them with any tool and any technology.

### What is API drift?

Let's start with a definition. By API drift I mean the divergence between the declared API contract and the system that implements and operates that contract.

The important word here is not only "implements", but also "operates".

### API drift has two faces

In event-driven architectures, API drift has two faces, two sides.

On one side there is the application. This is the familiar one. Here we define the schemas, the headers and the operations, and we have producers and consumers that implement this behavior. Most API First approaches live here. We generate models, we generate clients, we validate messages, and we test that our applications conform to these contracts.

But there is a second face that gets much less attention: the platform side. For Kafka, that means topics, partitions, retention and schema evolution. Both of these sides can drift.

### The broker is not transparent

This is where event-driven architectures are different from REST APIs. In REST, the proxy or the API gateway may add some security, throttling or routing, but it is transparent for the consumer. It doesn't matter whether there is a gateway or not. The consumer connects to the same API, with the same contract.

In event-driven architectures the broker is not transparent, and the broker is not neutral. Part of the broker configuration changes what producers and consumers can expect from the platform. So if the broker is part of the API behavior, its configuration, or at least some of it, should also be part of the API contract.

Today that configuration usually lives somewhere else: in scripts, in Terraform, in Kubernetes resources, or just in the running platform. As we are going to see, this information is important not only for provisioning the platform but for designing good producers and consumers.

There is a companion talk about application drift. This talk is about the second face, platform drift.

### The broker shapes behavior

In an event-driven architecture the broker also shapes behavior. Partitions, retention, schema compatibility, access control lists. All of this shapes the behavior of producers and consumers. It is not only information for configuring the platform.

Designing an application for a topic with three partitions is not the same as designing it for one partition. With three partitions you can run three consumers in parallel. Designing for one week of retention is not the same as designing for one year. With one year of retention you can design an application that replays all the messages. And a compacted topic is not the same as a normal topic.

Schema compatibility influences how we can deploy our producers and consumers. If a topic has forward schema compatibility, the producer should be deployed first. If compatibility is backward, the consumers can, and should, be deployed first.

So everybody needs this information. It is needed for provisioning the platform, but also for designing and configuring the producers and the consumers. And commonly AsyncAPI has none of it. The information is scattered in scripts, in Terraform, in Kubernetes. Because it is common to everybody, the natural place to keep it is the AsyncAPI contract.

The core idea I want to share today is using AsyncAPI to describe not only the application, but also to configure and provision the platform itself.

### API First Ops

This leads to what I call API First Ops. The idea is very simple. It brings together two things that we normally keep separate.

On one side we have API First, where we define the application behavior: schemas, operations, producers and consumers. On the other side we have operations, where we provision, configure and run the platform the applications run on.

API First Ops joins them. The API specification becomes the source of truth for application development, and also for provisioning and configuring the relevant parts of the platform. With one contract we define both sides, the application and the platform.

### Provisioning Kafka is already solved

Let me be clear about one thing. Provisioning Kafka is already solved, and this talk is not about how to provision Kafka. Teams use many tools: custom scripts, Ansible playbooks, the Confluent CLI, JulieOps, Terraform, Strimzi on Kubernetes.

The problem is not creating a topic. The problem is duplicated intent.

So the approach is simple. AsyncAPI becomes the source of truth, and we convert it into Terraform, Ansible, Confluent CLI or JulieOps configuration. Then we provision the platform with the tools your teams are probably already using. AsyncAPI is the configuration format, and the provisioning stays with the tools you already have.

### Mapping AsyncAPI to the platform

The mapping between AsyncAPI and the platform is very simple. The channel becomes the topic. The channel bindings give the topic configuration. The channel messages are registered as schemas in the schema registry. The message bindings give the schema configuration. And the operations grant permissions, depending on whether we need to send or to receive.

Today AsyncAPI and the Kafka bindings don't hold all the information we need to provision the platform completely, so we rely on some extensions. We have already proposed these fields to the official Kafka bindings: environment overrides, the principal, error topics, and schema compatibility. They are in incubation, so maybe by the time you watch this talk some of them are already official. Today we can use them as extensions to provision the platform, as we are going to see in the demo.

### Demo: Arcadia Editions

Before we open the code, this is the demo I'm going to show. We start with an AsyncAPI file and some GitHub Actions. First I'm going to run everything locally, so we can see step by step what's going on. With `terraform plan` and `terraform apply` we provision the Kafka platform.

For this demo I'm using Arcadia Editions. It's a fictional company that I created, but a real GitHub organization, public on GitHub, with real repositories, real contracts and real pipelines. At the end of this page you have all the information you need to run this demo on your laptop.

To convert AsyncAPI into Terraform we use the ZenWave SDK, which is fresh out of the oven and feature complete. And I have an empty Confluent Cloud account, with no topics and no schemas.

### The owned contract: topics, schemas and ACLs

Here are the Arcadia Editions repositories. In the orders checkout API we have an AsyncAPI file with four channels, and for each channel we are going to provision one topic. This is the topic name.

In the Kafka bindings we have the topic configuration, with three partitions and replicas. We also have some server overrides, because we are going to provision the develop environment, which has fewer partitions than production.

Inside each message we have the Avro schema that we are going to register in the schema registry. With this configuration we set the topic name strategy and forward schema compatibility.

We also have four operations. For each operation we provision write access to the topic, for this consumer group and this service account.

### The consumed contract: read ACLs and error topics

That is the public surface of the orders checkout API. But the service also consumes topics from other services. I like to split the public surface and the topics a service consumes into two different files, but you can keep them in one file if that fits you better.

The rule to keep in mind is that channels that are not described inline, but referenced from an external file, are not created by the tooling. They are supposed to be already provisioned by the third-party service that owns them.

So here, for each operation, we provision read access to the channel for this consumer group and this service account. With an extension we also provision some error topics from a template: one dead letter queue and three retry topics.

In the repository we have GitHub workflows for provisioning Kafka. They reuse scripts from another repository: one for provisioning Kafka from the pipeline, and another one for provisioning from your laptop.

### terraform plan and apply

In the terminal we run the local provisioning command for the develop environment, with the AsyncAPI file and the AsyncAPI client file. It generates the Terraform resources and prepares a Terraform plan.

Terraform plans to add 64 resources. In the `target` folder we have the Terraform files: the topics with their names and configuration, the schemas with the Avro definition and forward compatibility, and the access control lists for writing and reading these topics.

Now we run the same command with apply mode set to true, and Terraform creates all these resources in Confluent Cloud. If we check Confluent Cloud, we see all the topics, and the schemas registered with forward compatibility.

### Changing retention in AsyncAPI

Now let's say we are evolving the API and we need to increase the retention in the development environment. We add some zeros to the retention in the AsyncAPI file, and we run the local provisioning again in plan mode.

Terraform detects the drift and plans the reconciliation. Here it is: Terraform will perform the following actions, and the retention goes from this value to this other value.

### A breaking schema change is blocked

Now, instead of that change, let's try an incompatible one. We delete a field with no default value from the Avro schema. Because the topic is configured with forward compatibility, when we run the plan again it detects the change and fails validation.

Here is the error: schema validation, the customer email field has no default value and is missing in the new schema. Terraform is not going to let us apply this plan.

### Running it from the pipeline

Instead of running the plan locally, I'm going to commit the change to the AsyncAPI file and push it to develop, so we can see the Terraform plan being applied from the pipeline.

On the GitHub Actions page, after the pipeline finishes, we can see that the Terraform plan matches what we changed in the API: the retention of this topic. This is the plan, and this is the apply. One resource changed.

All of this is in Arcadia Editions, a fictional company but a real GitHub organization with a lot of APIs and pipelines, where you can check out the ideas I shared with you today.

### terraform plan is the drift detector

As we saw in this demo, `terraform plan` becomes our drift detector. It helps us see what is different between the AsyncAPI file and the platform, and it helps us apply those changes across the different environments.

### The takeaway

The key takeaway from this talk is this: your Kafka platform is part of your contract. Define the intent in one place, in AsyncAPI. Derive the infrastructure from that source of truth. And don't let the platform become a second source of truth.

You can find all the code on GitHub, and there is also a companion talk about application drift.

Thank you very much.

</details>
