---
title: "Stop API Drift: Generate Java from AsyncAPI"
date: 2026-10-26
summary: "Generate a complete, non-editable Java SDK from AsyncAPI, read the contract from its canonical location, and let the compiler show where the application still assumes the old contract."
tags:
  - asyncapi
  - java
  - spring
  - code-generation
  - api-first
  - zenwave
featured: false
duration: "25 min"
video: https://youtu.be/AwZoXxyQj9o
---

This is the first of a pair of talks about API drift. This one is about the code: you generate Java from AsyncAPI, and the compiler tells you when the application still assumes the old contract. [The second one](/talks/2026-10-26-stop-api-drift-provision-kafka-from-asyncapi) is about the platform, the part of the API that lives in Kafka and that the compiler will never see.

I wrote about the why some months ago, in [API First 360](/articles/2026-05-10-api-first-360-asyncapi-code-and-infrastructure/). In this talk I stay on the application side, and then I show the workflow running on a shopping cart.

<div class="youtube-embed">
<iframe src="https://www.youtube.com/embed/AwZoXxyQj9o" title="Stop API Drift: Generate Java from AsyncAPI" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

## What the talk covers

API drift is the progressive divergence between the declared contract and the system that implements and operates it. In an event-driven architecture it has two faces. This talk is the application face: schemas, headers, operations, and the behavior implemented on top of the contract. The platform face, topics, partitions, retention, and schema evolution, is the companion talk.

Code generation is the usual answer, and it only keeps working while the generated result stays derived from the contract. Once developers can edit that code, the project has two sources of truth, and keeping them aligned is a human process. That is where drift starts.

The workflow has three rules. Generated code is non-editable, which means editing it is not a supported step, so a fix goes into AsyncAPI and the generator replaces its output. The generator produces the complete SDK: message models, validation, headers, typed producers, typed listener interfaces, and the implementation that connects those interfaces to the broker. And the build reads the AsyncAPI document from its canonical location, a git tag, an artifact repository, a Maven artifact, or Apicurio, so a local copy cannot fall behind the contract.

There are two ways to ship that SDK. Publish one versioned artifact for each API version, or generate the SDK during the application build. A large matrix of runtime versions, or application-specific options such as date types, numeric types, or a transactional outbox, can make a prebuilt artifact awkward. The mechanics differ. The rule is the same: generate the full SDK, and never edit the generated code.

## What the demo shows

The demo is a shopping cart, split into three projects that in real life would be three repositories, each with its own lifecycle. The code is in the [Arcadia Editions](https://github.com/arcadia-editions) GitHub organization.

1. The AsyncAPI project describes one channel, operations for shopping cart created and shopping cart item added, and the Avro schemas. It is packaged as a Maven artifact.
2. The shopping cart service uses a generated producer. A small client implements a generated listener and prints each payload. The generated classes live in `target`, so a build deletes them and writes them again. The producer implementation uses `KafkaTemplate`.
3. The ZenWave Maven plugin sits next to an OpenAPI Generator plugin. It pins the shopping cart APIs at version 1.0 and reads the contract from that Maven dependency on the classpath. Remote HTTP URLs, with authentication, are the other way to reach a canonical location. The shopping cart project generates the provider role.
4. With the service running, we create a cart for customer 1 and add items. The Kafka topic then has two Avro messages, and the client prints shopping cart created and shopping cart item added.
5. A mistaken contract change renames an operation and an Avro field. The next build fails in the handwritten code, once for the old operation and once for the old field. The compiler is the drift detector.

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

### Stop API Drift: Generate Java from AsyncAPI

Today I want to talk about preventing API drift in event-driven architectures. In particular, I want to talk about the drift between an AsyncAPI contract and the application that implements it.

Code generation is often presented as part of the solution for keeping the API contract and the application code in sync. But as we are going to see in this talk, code generation alone is not enough to prevent this API drift. What really matters is what kind of code we generate, whether we allow developers to edit that generated code by hand, and where we source the AsyncAPI definition from. That is, where the canonical location of that AsyncAPI definition is.

### About me

My name is Ivan Garcia. I'm a member of the technical steering committee of AsyncAPI. I'm also an ambassador. I'm the maintainer of the Visual Studio Code extension and, more recently, of the Kafka bindings. And I'm the creator and the maintainer of ZenWave 360.

### ZenWave

ZenWave 360 is a set of tools for designing and building event-driven systems, microservices, and modular monoliths, with first-class support for AsyncAPI in Java. In this talk, and in this demo, we are going to use some of these tools. But all the techniques that I'm going to share with you today are not tied to the ZenWave platform. You can implement them with any other technology, and on any other stack.

### What is API drift?

Before we start talking about code generation, let's first define what we mean by API drift.

By API drift I mean the difference between what the API contract says and what the application and the platform provide. It is the progressive divergence between the declared API contract and what the actual system implements and operates. Put simply, it is the difference between the contract, the application, and the platform.

### API drift has two faces

In event-driven architectures, API drift has two faces, two different sides. On one side there are the applications that implement the business logic. On the other side there is the message broker, and the platform that sits in between.

On the application side we have schemas, headers, operations, and the behavior that these applications implement on top of the declared API. On the platform side we have the topics, the partitions, the retention, the schema evolution that we allow, and other broker concerns. Both of these can drift.

In this talk we are going to focus on application drift. There is a companion talk in this conference where we talk about platform drift.

### Code generation alone is not enough

Regarding application drift, as I said before, code generation alone does not prevent API drift.

This is a common pattern for code generation. We have an AsyncAPI file. Maybe we fetch that file and keep it locally, so we can run a code generation tool. Very often that tool is a one-time generator. It generates some Java code, some Java DTOs, some models, and those files become part of the source code of the project. Developers can open them, edit them, modify them, fix them, and adapt them to what the application needs today and to what it will need tomorrow.

The moment we generate code from AsyncAPI and that code becomes part of the editable source code of the project, we have created a second source of truth. Now we have two sources of truth. On one side, the AsyncAPI defines what the contract should be. On the other side, source code that people edit by hand represents what the application actually does and what the application actually provides.

Keeping these two sources of truth in sync needs a proper workflow. Otherwise this is the moment where drift starts.

I'm going to share a very simple and very common workflow, in Java and in Maven, for keeping these two realities in sync.

### Generated code must be non-editable

The first rule is very simple. Generated code must be non-editable.

By non-editable I don't mean a permission on the file system. I mean that editing generated code is not supported by the workflow. In this demo I'm going to show a workflow for Java and Maven applications that prevents editing generated code.

If something needs fixing, you change the AsyncAPI, run the workflow, generate the code, and replace all of the generated code at once. The generated code should be disposable. The developer team owns the business logic on top of the API boundary.

### Generate the complete SDK

Generating the DTOs and the models is not enough. If we generate the DTOs, the data classes, and the models, but we write the producers by hand, those business interfaces are tied to the AsyncAPI operations. When the definition of an operation changes, the producers are not kept in sync. They drift. If we write the listener signature by hand, that signature drifts. The same goes for the header names and for the validation.

Every API-facing piece should be generated. A complete SDK should contain every piece that can be derived directly from the API: the message models, the header names, the validations, a strongly typed interface for the producer, and a strongly typed interface for the listeners, for the consumers. And, when we can, an implementation that connects these interfaces to the message broker.

That leads to a second and stronger principle. Generated code should be complete. We should generate the complete, non-editable SDK, so every piece that can be derived from the AsyncAPI is generated together, and we don't edit it by hand.

### Source AsyncAPI from its canonical location

There is a third principle. We should source the AsyncAPI definition from its canonical location. We should not keep local copies. If we download a copy of the AsyncAPI to generate code, and we keep that copy, the copy drifts, and it falls out of sync with the original AsyncAPI very quickly.

So these are the three principles for preventing API drift in applications. First, generated code must be non-editable. Second, we must generate the complete SDK. Third, we need to source the AsyncAPI from its canonical location.

### Preventing API drift in a nutshell

This is how preventing API drift looks in a nutshell.

First we fetch the AsyncAPI definition from its canonical location. That location may be a version tag in git. It may be a version in Artifactory. It may be a Maven artifact. It may be an Apicurio artifact. We source the definition from that place, and we don't keep local copies. Then we run the generator, and we generate the complete SDK: typed business interfaces, the DTOs and models, and the headers.

In this example we are using Java and Spring Boot, so we can build on Spring Cloud Stream. It has connectors, called binders, for virtually every broker out there.

These techniques are not tied to any technology or any implementation. You can apply these ideas with any stack. Source the AsyncAPI file from its canonical location, generate the complete SDK, and don't let developers edit the generated code by hand. The developer team only owns the business logic that sits on top of the API boundary.

### Two SDK lifecycles

With this workflow in place, we have two lifecycle options.

On one side, we can generate one versioned artifact for each AsyncAPI version, store it in an artifact repository such as Artifactory, and let applications depend on that SDK and download it from there. On the other side, we can generate the code at build time, in each application.

There is no single right solution. Each option has pros and cons. Sometimes the matrix of options and runtime versions is so large that generating all of them, and storing them in Artifactory, becomes difficult. Sometimes an application needs its own options, for date types or numeric types, or it wants a transactional outbox generated into the application. One solution does not fit every case. There are two options, with different mechanics, and the same rule: generate the full SDK, and never edit the generated code.

### Demo: the shopping cart

Now it's demo time. We are going to see this with a real application.

In this demo I'm going to show how to set up code generation so that it prevents API drift in Java projects. I have a shopping cart example. All the code is on GitHub.

Here I have three projects. In real life these would be three repositories, with their own lifecycle and their own pipelines.

One of them holds the APIs. The AsyncAPI contains one channel that can receive multiple messages, and operations that send messages when reacting to events: on shopping cart created, and on shopping cart item added. The messages are defined with Avro schemas. This project is packaged as a Maven artifact.

Then we have the shopping cart project. It is a very simple Java project that manages shopping carts. We have operations for managing the carts, and in the code we have a controller, a repository, and a shopping cart service implementation.

Inside the service implementation we have the shopping cart events producer, which we use to send events. If we open that Java class, we can see that it is generated. It is not part of the source code of the project. If you know Maven, you know that the `target` folder is regenerated on every build. In the same way that OpenAPI code is generated into that folder, for this AsyncAPI we have a Java interface with a method for every operation, with the payload and with typed headers. We also have an implementation of that interface. In this case it uses `KafkaTemplate` internally. It is a Spring component we can use. And we have the Java classes for the Avro schemas.

We also have a client project. It is very simple. It is a listener that implements a listener interface, also generated, and it prints the payload of each message it receives.

All of this code is generated at build time. The setup lives in the pom, the Maven build script. In the same way that we have an OpenAPI Generator Maven plugin here, we have a ZenWave Maven plugin that uses the AsyncAPI generator. It references the shopping cart APIs at version 1.0, so we know exactly which version we are generating code for. We can set up Dependabot to tell the project when a new version is available.

As part of a normal build, this generates the source code. The configuration is here. For the shopping cart we generate the provider role, because the shopping cart is the provider of this API. The package names are defined at the top, in the properties section, together with the rest of the generator configuration. In this project we source the AsyncAPI file from the classpath, from a Maven dependency.

The ZenWave generator also supports remote HTTP URLs, including authenticated ones. With those two schemes, HTTP and classpath, you can source the AsyncAPI definition from virtually every canonical location your organization uses.

When we build the project, the build cleans and deletes the `target` folder, and then it regenerates the AsyncAPI classes. Those Java classes stay synchronized with the version of the API we are consuming.

Let's see it running. I'm going to start the shopping cart application. Once it is up, we send messages through the shopping cart endpoints, and those calls produce messages on Kafka. Here are the endpoints. We create one shopping cart for one customer, customer id 1. Then we add some items to that cart.

If we connect to the Kafka broker, we see one topic with two messages. The payload is Avro. If we start a consumer from the beginning, we see the two messages: one for the shopping cart we just created, and one for the items we added.

Producing and consuming events is straightforward, because we only have to focus on the business logic. Everything required to produce the messages is generated for us.

If we start the consumer in the other application, the messages are printed on the console. Shopping cart created, with customer id 1. Shopping cart item added.

Now let's see how this workflow helps prevent API drift. Suppose someone evolves the API by mistake. They change an operation name, because of a typo, and they also open an Avro file and rename a field.

When we build the project again, the compiler stops the API and the source code from drifting apart. There are two compilation errors. We can no longer produce on the operation "on shopping cart created", because that operation was renamed. And we can no longer use the item's name, because that field was renamed too.

The compiler has become our drift detector. Because Java is strongly typed, the compiler has become our drift detector.

If we change the AsyncAPI in an incompatible way, introducing a breaking change, and we regenerate the complete SDK, the compiler gives early feedback that the application is incompatible with the declared contract, whether it is producing or consuming. Drift is very hard to ignore when the application does not compile.

### The takeaway

A quick recap of the principles that help prevent API drift in applications. First, generated code must be non-editable. The workflow should keep developers from editing generated code by hand. Second, we should generate the complete SDK. And last, we should always source the AsyncAPI from its canonical source of truth. Don't keep local copies. They fall out of sync very quickly.

The takeaway is this. If you need to change the implementation contract, change the AsyncAPI first. Run the workflow, regenerate the complete SDK, and let the compiler provide early feedback about the drift.

All of the source code is in the GitHub organization. Follow the QR and you will get there. There is also a companion talk in this conference about preventing API drift on the platform side.

Thank you very much. See you there.

</details>
