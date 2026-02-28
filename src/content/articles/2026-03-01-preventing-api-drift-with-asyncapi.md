---
title: Preventing API Drift with AsyncAPI - A Java/Spring Perspective
date: 2026-03-01
summary: How strongly-typed code generation, build-time regeneration, and versioned specifications eliminate API drift in Java/Spring projects using OpenAPI and AsyncAPI.
tags:
  - asyncapi
  - api-first
  - java
  - spring
  - zenwave
featured: false
readingTime: "8 min read"
---

I'm a big fan of Fran Mendez's work and always silently reading what he writes, not because he is an informed and clever guy, which he is, but because he is a very community-minded person, focused on giving and creating something bigger than himself, and fostering new friendships and connections... which is something way more valuable and important to cherish even if it is just online.

So when I subscribed to his newsletter it struck me that a technical problem which I thought was already solved in the Java/Spring world for OpenAPI since 'forever' and since a little while for AsyncAPI, is still a problem in his personal view so much as to be the subject of his first newsletter, and then in the latest one.

First, let me introduce myself, I'm a member of the AsyncAPI community for a number of years. Also I've been working in an API Strategy team building tools for APIs since 2019 and specifically for AsyncAPI since 2020 both closed sourced and open sourced, namely the ZenWave SDK toolkit.

Now, let me explain what Fran stated as an open problem, and then my personal view on why and how I think this is already solved for both OpenAPI and AsyncAPI since years ago.

## The problem of API-Drift in development

First, he shares a link to a report from Nordic APIs that states that:

> 75% of APIs don’t conform to their specifications, according to a recent report on API drift [2](https://nordicapis.com/understanding-the-root-causes-of-api-drift/#:~:text=75%25%20of%20APIs%20don%E2%80%99t%20conform%20to%20their%20specifications)

And that with API-First definitions and code generation tools, API-Drift starts the very moment you generate the code, because you will then evolve the generated code independently from the specification:

> This leads to a situation where you don’t need to maintain the AsyncAPI document to continue working on your code [1](https://mailchi.mp/fmvilas.me/schema-first-asyncapi-is-just-a-config-file#:~:text=This%20leads%20to%20a%20situation%20where%20you%20don%E2%80%99t%20need%20to%20maintain%20the%20AsyncAPI%20document%20to%20continue%20working%20on%20your%20code)

Since I work with Java/Spring projects I believed this was already a solved problem for OpenAPI back in 2019 when I started working in this field and with a very standard setup and open source tools.

## Why I think API-Drift in development is a solved problem (in the Java/Spring world)

### Core Principles to Prevent API-Drift

The solution to API-Drift in development relies on three fundamental principles that create a forcing function: the only way to change the implementation is to change the specification first, making drift structurally impossible.

1. **Non-editable generated code**: Generated code should never be manually edited or committed to source control. Any changes must originate from the specification itself.
2. **Build-time regeneration**: The build process must regenerate code on every build, ensuring the implementation always reflects the current specification.
3. **Versioned canonical source**: API specifications should be sourced from a canonical, versioned location (Git repository, Apicurio registry, Maven artifact, or HTTP URL). Local copies are not good enough as they easily get out of sync.

### How We Applied These Principles in 2019

The very standard setup we had back in 2019 for OpenAPI and SpringMVC with OpenAPI-Generator Maven plugin was already designed around these principles to prevent API-Drift:

1. **APIs as a product**: We treated APIs as a product, with their own repository and lifecycle, enabling proper versioning and governance.
2. **Versioned dependencies**: Projects that needed to use OpenAPI definitions would access the current version using a Maven dependency to a specific version (or alternatively an HTTP URL), ensuring a canonical source.
3. **Non-editable code generation**: The default behavior of the OpenAPI Generator Maven Plugin is generating code that is not editable. If you want to edit the generated code you must first edit the specification following governance and only then rebuild the project.
4. **Strongly-typed interfaces**: OpenAPI Generator Spring Library pointing to this current OpenAPI version would generate:
   - For servers: a fully annotated Spring MVC interface with all the DTOs. If you implement the interface you are implementing the API.
   - For clients: an interface with different implementation flavors and all the DTOs. You can instantiate the interface and call the methods to call the API.

### Why This Works in Java/Spring

Because Java is a strongly typed language, this very standard setup already prevents +90% of API-Drift through compile-time guarantees. 

While Java types are nullable by default (meaning you can still send null values and break the contract), this is something you can prevent using JSR-303 validation annotations (`@NotNull`, `@Size`, `@Max`, `@Min`, etc.) which are also generated by OpenAPI-Generator.

This is why it struck me that 75% of APIs don't conform to their specifications. I have only seen this problem in one NodeJS project, but because we were a full Java/Spring shop, we never had this problem.

### Applying the Same Principles to AsyncAPI

So back in 2020 when we wanted to adopt AsyncAPI, we already had a very clear picture of how we wanted to use it. I created an implementation for Spring Cloud Streams using the same principles as the OpenAPI Generator Spring Library, which later evolved into ZenWave SDK.

## How I solved API-Drift in AsyncAPI for Java/Spring using the same principles as OpenAPI-Generator Spring Library

I've solved the problem of API-Drift not once, but two times, first as a closed sourced solution for a big company, and then when I moved to a different team, as an open source project ZenWave SDK which was released as v1.0.0 in March 2023 including an AsyncAPI generator for Spring Cloud Streams.

So let me explain how it already solves what Fran proposes as the best approach for AsyncAPI schema-first toolkits:

> AsyncAPI works best when it is part of your application code, when it’s a config file integrated into the runtime.
> - You should use it to validate messages before they are sent and before they are processed.
> - You should use it to automatically subscribe to channels.
> - You should use it to enforce auth mechanisms.

So let's go through each of these points:

> AsyncAPI works best when it is part of your application code, when it’s a config file integrated into the runtime.

With OpenAPI Generator and ZenWave Maven plugins, the AsyncAPI is not part of the runtime, but it's part of your build process generating code that cannot be edited manually, you can only edit the AsyncAPI specification and regenerate the code.  
This is mostly equivalent to what Fran proposes, but it shifts left the overhead of a runtime implementation.  
Also, Java is a strongly typed language and works better when types are already present in the codebase, you cannot skip code generation for this to be true.

> - You should use it to validate messages before they are sent and before they are processed.

Because Java is a strongly typed language and code is already present you cannot send a message with the wrong property or type, and you cannot process a message with the wrong property or type.

Because both OpenAPI Generator and ZenWaveSDK generate DTOs with validation annotations you can also validate the content of the messages before they are sent.

> - You should use it to automatically subscribe to channels.

ZenWaveSDK generates also lightweight wrappers around Spring Cloud Stream that listen to channels and produce messages to the specified topics. You only need to worry about your business logic, the rest is taken care of by the generated code.

## Why Glee Solved a Different Problem

[Glee](https://www.github.com/asyncapi/glee) is an innovative prototype that explored runtime-based approaches:

> It scans your AsyncAPI document and searches for all the channels (a.k.a. topics) it has to subscribe to [...] and validates messages (before they are sent or when they are received)

**Glee's approach is valuable for JavaScript/Node.js ecosystems** where dynamic typing and runtime flexibility are strengths. However, in enterprise Java/Spring environments, the problem manifests differently and requires different solutions.

As a Java developer in the enterprise:
- **Broker connection** was a non-problem: starter projects came with base configurations, and environment parameters (broker URL, credentials, etc.) were provided automatically in deployment pipelines.
- **Creating listeners** was a one-time task with Spring annotations.

What I really needed as a Java developer was **compile-time safety**:
- Code completion of property names, types, and compile time validations.
- Typed interfaces with operation names, like `PersonEventProducer.onPersonCreated(PersonCreatedEvent event)`, for code completion and compile time validations.
- Compile-time error detection when renaming operations or properties.

In Java/Spring, we rely on compile-time checks and strongly-typed interfaces to ensure API correctness. This approach aligns better with the principles of API-First development, where the specification is the source of truth.

## Why ZenWave SDK doesn't source client configuration from AsyncAPI definition

Short answer: because AsyncAPI does not provide a complete set of information to configure a Spring Kafka or Spring Cloud Stream client. Not even with specific AsyncAPI bindings.

A few examples, focusing here on Spring and Kafka:

- AsyncAPI does not provide standard ways to configure: `acks`, `transaction.id`, `idempotence`
- It would be hard to guess many SerDes settings for Avro just from the AsyncAPI definition.
- AsyncAPI Kafka binding seems to be incomplete, poorly designed and lacking direction/evolution:
  - `clientId`: this should be an application-wide configuration, but in Kafka bindings this is defined per operation, and in a very verbose way.
  - `consumerGroupId`: this is also most likely to be an application-wide configuration, but again defined per operation.
  - You can configure a SchemaRegistry URL and `schemaLookupStrategy` but you cannot configure compatibility mode (BACKWARD, FORWARD, FULL, etc.)

I don't have a personal preference for trying to configure Spring Kafka clients from AsyncAPI directly but these issues prevent even trying to do it.

## So if this is already solved, why is this still part of the latest newsletter?

This is what struck me, not once but twice... this is why I took the time to write this open letter / reply.

## Bringing This to the Java/Spring Community

I shared this with Fran because I believe there's a gap between what exists and what the community knows exists. ZenWave SDK has been solving API-Drift for AsyncAPI in Java/Spring since March 2023, but clearly, that message hasn't reached everyone who needs it.

**If you're a Java or Kotlin developer working with AsyncAPI**, here's what you should know:

- **You don't have to build this from scratch.** A production-ready, build-time codegen solution exists that eliminates API drift through compile-time guarantees.
- **It follows the same proven principles** that solved this problem for OpenAPI years ago: non-editable generated code, build-time regeneration, and versioned canonical sources.
- **It's open source and actively maintained**, with support for Spring Cloud Stream, typed DTOs, validation annotations, and advanced patterns like Transactional Outbox.

**Resources:**
- 📚 [ZenWave SDK AsyncAPI Generator Documentation](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-generator/)
- 🎮 [Full Playground Project](https://github.com/ZenWave360/zenwave-playground/blob/main/examples/asyncapi-shopping-cart/README.md)
- 💬 [GitHub Discussions](https://github.com/ZenWave360/zenwave-sdk/discussions) - Questions, feedback, and contributions welcome

**My commitment:** If you're evaluating this approach or have questions about how it compares to runtime validation, I'm happy to help. Open an issue, start a discussion, or reach out directly.

The AsyncAPI community thrives when we share what works. If this approach resonates with you, try it out, share your experience, and help us make it better.

---

*Iván García Sainz-Aja is a member of the AsyncAPI Technical Steering Committee and creator of ZenWave 360º.*


