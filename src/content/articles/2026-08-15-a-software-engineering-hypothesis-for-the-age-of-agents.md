---
title: "A Software Engineering Hypothesis for the Age of Agents"
summary: "Agentic development makes software cheaper to produce. That does not reduce the need for software engineering. This is a public hypothesis: keep the understanding of the system explicit, generate what is already decided, then use the result from the customer's perspective and feed what you learn back into the model."
date: 2026-08-15
tags:
  - ddd
  - zenwave
  - architecture
featured: false
featuredImage: assets/articles/2026-08-15-software-engineering-hypothesis-loop.svg
featuredImageAlt: "Five steps in a loop: Understand with experts, engineers, and agents; Model with ZFL; Generate with ZenWave SDK; Use with Arcadia Editions; Learn by feeding new understanding back."
readingTime: "15 min read"
draft: false
---

> This article was dictated on my phone, using an agent as an adversary. I then asked for a full summary, edited in Simplified Technical English. The ideas are mine. The text is AI-edited.

This is a public statement of a hypothesis about software engineering.

I am writing it so I have a stable place to point to. In six months I want to link here from a talk, another article, GitHub, or a discussion without explaining the whole idea again.

The tools I am building come later in this article. They are how I am trying to test the hypothesis. They are not the hypothesis.

## The hypothesis

Agentic development changes how much software we can produce and how fast we can produce it. It does not remove the need for software engineering.

When code becomes easier to produce, the important engineering work moves even more towards understanding the problem, making decisions, defining boundaries, and keeping a clear model of the system.

The hypothesis is this:

When software production becomes very fast, explicit engineering context becomes more valuable, not less.

The more code we can produce, the more important it becomes to keep a coherent understanding of what that code is supposed to represent.

The more agents we use, the more useful it becomes to give them an explicit architectural context, instead of asking each one to reconstruct that context on its own.

The more implementation work becomes automated, the more engineering attention can move towards understanding the domain, making decisions, testing those decisions against reality, and putting what we learn back into the system.

I am not claiming that all software can be generated from a perfect model. I am testing a different idea: engineer the understanding, make it explicit, share it with humans and agents, generate what is already determined, build the rest, use the result as a customer would, and learn.

## Engineering work does not go away

Business experts and software engineers still need a common understanding of the business. They still need a ubiquitous language. They still need to identify domains and subdomains, define bounded contexts, create domain models, understand business flows, define APIs and events, and decide how the parts of the system relate to each other.

Agents can help with this work. They can explore alternatives, help refine models, detect missing cases, generate examples, and speed up many repetitive tasks.

The important result of this phase is not the conversation with the agent. The important result is the engineering knowledge that humans and agents create together.

That knowledge should not remain only in conversations, prompts, diagrams, documents, or source code. It should become explicit and structured context.

## Reconstructing the system every time

A common agentic workflow starts with an existing codebase. The agent reads source files, documentation, configuration, tests, and repository conventions. From that information it reconstructs an approximate understanding of the system before it can make a useful change.

```
Code + documentation + conventions
              |
              v
            Agent
              |
        reconstructs
              |
              v
     System understanding
```

This reconstruction is useful when no better representation exists. It should not become the normal way to communicate architecture.

If engineers have already decided where the boundaries are, what an aggregate means, which events exist, which APIs are exposed, and how a business process works, those decisions can be represented directly.

The source code is still important. It does not have to be the only place from which architectural knowledge can be recovered.

The architecture has already been engineered. We should not require every developer and every agent to infer it again from source code, Markdown files, naming conventions, diagrams, tickets, and previous conversations.

## Why this is not classic MDA

This can look like classic Model-Driven Architecture. It is not the same idea.

The model is text, not a diagram. It lives in the same git repository as the code. It is reviewed in the same pull requests. The same tools that read and write code can read and write it, including agents. Classic MDA models lived in separate graphical tools. A different discipline maintained them. Round-tripping between the diagram and the code was the part that consistently broke, because a diagram and a codebase are not peers in the same workflow.

The model also does not try to be complete. It does not try to capture the whole system the way a UML model implicitly promised to. It captures what is already decided, the 80 to 90 percent, and it stops there by design.

These two properties need each other. A model that stops short only works if something can finish the remaining part without leaving the model behind. Because the model is text, an agent can read it as context and reason about the undetermined part in the same medium, the same repository, and the same review process. A diagram could not do that. Someone would have to translate it first. That translation is where MDA models drifted from reality. Nothing forced them back into sync.

## Shared context instead

```
         Engineering work
                |
                v
         Structured context
                |
        +-------+-------+
        |       |       |
        v       v       v
     Humans   Agents  Generators
```

The structured context becomes a common reference point.

This does not mean the model is always correct. It means the current understanding is explicit, visible, versioned, and open to revision.

The same knowledge can have different representations without creating independent and disconnected descriptions of the system. A developer can inspect a domain model. An architect can inspect the relationships between systems. A business expert can follow a business flow. An API team can inspect APIs and events. An agent can use the same structured information as context.

This is the first part of the model.

## 1. Human engineering creates structured context

The first phase is analysis and design.

This is primarily engineering work. Business experts bring their knowledge of the business. Software engineers bring their knowledge of software design, architecture, integration, and implementation. Agents can participate as collaborators.

Together they create and refine:

- the ubiquitous language
- domains and subdomains
- bounded contexts
- aggregates and domain models
- commands and events
- APIs
- business flows
- relationships between producers and consumers
- relationships between systems
- architectural decisions and relevant metadata

The objective is not to create documentation after the system has been designed. The objective is to make the understanding of the system an explicit engineering artifact.

```
              Human engineering
                      |
        +-------------+-------------+
        |             |             |
        v             v             v
    Business       Software       Agents
     experts       engineers   as collaborators
        |             |             |
        +-------------+-------------+
                      |
                      v
              Structured context
                      |
        +-------------+-------------+
        |             |             |
        v             v             v
     Domains       APIs /        Business
     models        events         flows
```

Humans and agents can then work from the same context instead of rebuilding it each time.

## 2. Deterministic generation implements decisions already made

After the engineering context is clear enough, the second phase starts.

Many implementation decisions are no longer open questions at this point.

If we have already decided that a bounded context contains a specific aggregate, that the aggregate accepts specific commands, that it produces specific events, that an API follows a specific contract, and that the application follows an agreed architecture, we do not need to ask an LLM to invent another possible implementation of those decisions every time.

This is where deterministic generation is useful.

A generator can transform structured models and specifications into software artifacts according to known architectural patterns and conventions. Depending on the model, those artifacts can include application structure, API interfaces, event producers and consumers, mappings, tests, schemas, configuration, and other repetitive pieces.

The purpose is not to generate the complete application.

The purpose is to avoid spending human or agent reasoning on implementation work that is already determined by previous engineering decisions.

```
         Engineering decisions
                   |
                   v
           Structured context
                   |
                   v
         Deterministic generation
                   |
                   v
            Software artifacts
```

This creates a separation between two types of work.

Some work requires reasoning because there is uncertainty. Other work requires execution because the decision has already been made.

Agents are useful for the first type. Deterministic generators are often better for the second type.

This is not an argument against agent-generated code. Agents remain part of the development process. The objective is to use them where their reasoning and flexibility provide value, instead of using probabilistic generation for every software artifact.

## 3. Use the result from the customer's perspective

A model cannot describe everything.

A generator must also not try to generate everything.

After the main architecture and a large part of the repetitive implementation exist, the team must use the software, integrate it, test it, and complete it.

The first two phases can bring the implementation to a high level of completion. A useful target is 80 to 90 percent for the parts that can be derived from the model. The exact percentage is not important. The important point is that the remaining work contains information we cannot discover only through modelling.

This is the phase I mean by dogfooding.

It is not only quality assurance. It is not only using your own tools because they are yours.

It means building a working implementation that is far enough along to be real, then using it from the customer's perspective. From that use you discover friction and missing details. Then you polish the product from that experience.

Developers need to see where an API is difficult to use, where two components do not integrate correctly, where an abstraction creates unnecessary work, where a business case was missing, or where a model that looked correct does not work well in practice.

This is where the team starts to feel part of the same pain as the users of the product.

Humans and agents can work together again during this phase. They can:

- integrate the generated components
- complete use cases
- create additional tests
- find edge cases
- improve APIs
- fix incorrect assumptions
- simplify difficult abstractions
- improve developer experience
- test real business flows
- operate the system
- compare the implementation with the original architecture

This work produces new knowledge.

That new knowledge must return to the engineering context.

A team can create a good domain model and still discover that the resulting application is difficult to use. An API can follow the original business model and still be inconvenient for a consumer. A bounded context can look correct and still create difficult integration patterns.

These problems become visible when the system is used.

The team can then update the implementation. It must also decide whether the structured context needs to change.

If the understanding changes, the model changes.

If the model changes, the views of that model change.

The new context becomes visible to other developers, architects, business stakeholders, and agents.

When it makes sense, deterministic artifacts can be generated again.

## The loop

The process is not a generation pipeline. It is an engineering feedback loop.

```
        Understand
            |
            v
          Model
            |
            v
         Generate
            |
            v
           Use
            |
            v
          Learn
            |
            +----------> Understand
```

This loop is one of the main protections against treating the model as more important than reality.

Reality always has the last word.

In slightly more detail:

```
1. Human engineering
        |
        |  business experts
        |  software engineers
        |  agents as collaborators
        v
+---------------------------+
|    Structured context     |
|                           |
|  Ubiquitous language      |
|  Domains / subdomains     |
|  Bounded contexts         |
|  Domain models            |
|  APIs and events          |
|  Business flows           |
|  System relationships     |
+-------------+-------------+
              |
              v
2. Deterministic generation
              |
              v
+---------------------------+
|    Software artifacts     |
|                           |
|  Application structure    |
|  APIs / events            |
|  Tests                    |
|  Infrastructure           |
|  Other repeatable pieces  |
+-------------+-------------+
              |
              v
3. Use it and iterate
              |
       Use the real system
       from the customer's
       perspective
       Integrate the pieces
       Complete use cases
       Find friction
       Find missing details
       Polish the product
              |
              v
       New understanding
              |
              +-------> Structured context
```

## What I am testing this with

I am testing this hypothesis with three related pieces of work: [ZenWave Platform](https://zenwave360.io), [ZenWave SDK](https://github.com/zenwave360/zenwave-sdk), and [Arcadia Editions](/articles/arcadia/001-meet-arcadia-editions).

They can look like separate initiatives. ZDL, ZFL, the Architecture Manifest, OpenAPI, AsyncAPI, EventCatalog, Terraform, generated Spring Boot applications, Arcadia, and agents. I want them to be read as parts of one thesis.

ZenWave Platform is where the engineering context becomes explicit and visible.

It helps create, connect, visualize, navigate, and communicate that context. The Architecture Manifest connects the different elements and makes it possible to create different views for different users. A business flow does not need the same representation as a domain model. An architect does not need the same view as an API consumer. An agent can also need a different representation from a human stakeholder. They can still work from the same underlying context.

ZenWave SDK is where decisions that can be automated become deterministic software.

The SDK is the older and more mature part of this approach. It has been built for several years around model-driven and API-first development. It can turn structured models and specifications into Kotlin or Java code, Spring Boot applications, API interfaces, event producers and consumers, tests, Kafka infrastructure, schemas, and other repetitive architectural structures.

```
           ZenWave Platform
                  |
        understand / model
         connect / visualize
          communicate context
                  |
                  v
           Structured context
                  |
                  v
             ZenWave SDK
                  |
           deterministic
             generation
                  |
                  v
              Software
```

Arcadia Editions is where the model is being tested.

Arcadia Editions is a fictional company. The implementation is real. It is not only a sample application created to demonstrate individual features. It is the main proving ground for the complete loop.

Arcadia is being designed as an organization with real architectural structure: domains and bounded contexts, domain models, APIs and events, producers and consumers, business flows, pipelines, infrastructure, and relationships between systems.

The Architecture Manifest was developed using Arcadia as its main use case. The EventCatalog representation is generated from that architecture. Kafka topics and other infrastructure are provisioned against a real Confluent environment. The next step is to package the domain models for the different bounded contexts and use them to generate Kotlin and Spring Boot applications.

Arcadia has two roles.

First, it demonstrates the architecture in public. It is a system that can be inspected without depending on confidential information from a real company.

Second, it forces me to consume my own ideas. If a workflow is difficult, if a model does not contain enough information, or if a generated application is difficult to complete, that becomes a real problem that must be solved.

That is dogfooding in the sense I described above. Build enough of the system to use it. Use it as the customer of these tools would. Discover the friction and the missing details. Polish both Arcadia and ZenWave from that experience.

## The role of agents

Agents are not placed at the end of this process as code generators.

They can participate in all phases.

During analysis and design, they can help explore the business, compare alternatives, find inconsistencies, refine models, and turn informal information into structures that experts can review.

During implementation, deterministic generation can produce the parts that follow known rules. Agents can then work on the parts that require adaptation, integration, reasoning, or additional implementation.

During dogfooding, agents can help test the application, diagnose problems, complete missing cases, refactor code, and evaluate the effects of changes.

Most importantly, agents can consume the structured context that already exists.

They do not always need to reconstruct the complete architecture from the implementation before they can work.

The model is not only an input to a code generator. It becomes part of the shared context of the engineering team.

## Humans, agents, and deterministic tools

The objective is not to decide whether humans, agents, or generators should write the software.

Each one is useful for different work.

```
              Software engineering
                      |
        +-------------+-------------+
        |             |             |
        v             v             v
     Humans         Agents     Deterministic
                                      tools
        |             |             |
   judgement       reasoning     repeatable
   experience      exploration   transformation
   responsibility  adaptation    consistency
   business        acceleration  known rules
   understanding
```

Human responsibility does not disappear because agents become more capable.

Agent reasoning does not become less useful because deterministic generators exist.

Deterministic generation does not become obsolete because agents can write code.

The engineering problem is to decide where each mechanism provides the most value.

## What I want this article to be

I want this to be a canonical URL for the idea.

Someone can be uninterested in ZenWave and still be interested in the split between human engineering, deterministic generation, and using the result from the customer's perspective.

If the idea is useful, the later articles, talks, repositories, and experiments can point here instead of restating the whole model.

The short version is:

```
     Engineer the understanding
                |
                v
     Make the context explicit
                |
                v
   Share it with humans and agents
                |
                v
   Generate what is already determined
                |
                v
     Build the remaining part
     with humans and agents
                |
                v
   Use it as the customer would
                |
                v
              Learn
                |
                +---------> Engineer the understanding
```

The objective is not to remove software engineers from software development.

The objective is to spend more engineering effort on the parts that require understanding, judgement, domain knowledge, architecture, and feedback from reality, while tools and agents take more responsibility for the mechanical work around those decisions.

I will keep testing this with ZenWave Platform, ZenWave SDK, and Arcadia Editions.

The last part of the loop stays open on purpose. Humans and agents must use the result, feel its problems, complete it, and learn from it.

Then the cycle starts again.
