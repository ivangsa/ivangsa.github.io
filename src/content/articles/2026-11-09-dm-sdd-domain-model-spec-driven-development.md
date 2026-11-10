---
title: "Domain-Model Spec-driven development: use domain models instead of Markdown"
summary: "A specification is a domain-model blueprint, not a Markdown document. Give AI agents models, not Markdown: a spec that humans can read and approve, and agents can validate and follow."
date: 2026-11-09
tags:
  - zenwave
  - architecture
  - ddd
  - ai
featured: true
featuredImage: assets/articles/sdd/dm-sdd-featured-text.webp
featuredImageAlt: "Give agents models, not Markdown: a towering stack of Markdown pages next to a compact domain model that a person and a coding agent read as a blueprint"
readingTime: "9 min read"
lang: en
draft: false
---

As AI agents have become better and faster than humans at writing code, the real challenge is no longer how we write the code, but how we reach a shared understanding with agents, and how we communicate and review our intent.

Spec-Driven Development is a response to the limitations of prompt-first development. The proposal is to write down the full intent before the agent takes over and writes the code in an autonomous loop. The problem is that specifications written in Markdown prose, to be useful, need to be complete and concrete, and that makes them long and verbose. You have two options:

Write all that prose yourself, and you may end up writing more text than the code required to implement it.

Or you ask an LLM to help you write all that Markdown, and then you end up in a situation where you cannot possibly read and validate it at the speed of an agent. Colin Eberhardt [put Spec Kit through its paces](https://blog.scottlogic.com/2025/11/26/putting-spec-kit-through-its-paces-radical-idea-or-reinvented-waterfall.html) and one CRUD feature produced about 2,577 lines of Markdown for 689 lines of code. Reviewing it took around three and a half hours. At Marmelab, François Zaninotto [cites a Spec Kit example](https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back.html) that produced 8 files and 1,300 lines of text just to show the current date in an app. And when you don't read and approve the written spec, decisions slip unnoticed, and the agents take them as gospel into the implementation.

Now compare Markdown prose to a structured domain model, where you can describe an entire microservice in [about 130 lines](https://github.com/ZenWave360/zenwave-playground/blob/main/examples/order-fulfillment-kotlin/zenwave-model.zdl), in a language and a format that any software engineer, and any coding agent for that matter, can read in one sitting, and then challenge or validate.

This is the idea behind **Domain-Model Spec-Driven Development (DM-SDD)**:

> In DM-SDD, the spec is a domain model written in concise, structured text languages, each with its own grammar, to describe business flows, bounded contexts and API contracts. It is both compact enough for a human to read and approve, and structured enough for a parser to validate and an agent to cross-reference. And because it is rooted in the building blocks of Domain-Driven Design (aggregates, entities, relationships, commands, domain events...), a coding agent can follow it as a blueprint.

## What DM-SDD is

DM-SDD is a variant of Spec-Driven Development. The specification is still the unit of work, but what changes is what the specification is made of, replacing Markdown files with structured domain models.

DM-SDD covers the first part of the work: discovering the business and designing the system, with humans in the loop and agents assisting. It ends with an approved baseline of models.

How you implement that baseline is up to you. It can be any of the existing SDD tools for agentic loops that you and your team feel comfortable with. The main idea is that your implementation loop treats the domain model as the input spec.

If you have been following this blog, DM-SDD is the name for what I have been writing about in the last weeks:

- [Markdown is the bottleneck](/articles/sdd-markdown-is-the-bottleneck/)
- [From Event Storming to a model your agents can read](/articles/sdd-from-event-storming-to-a-model-your-agents-can-read/)
- [Two loops: Model-Driven Human in the Loop](/articles/sdd-two-loops-model-driven-human-in-the-loop/)

This article puts it all in one place.

## The model spec

A model spec in DM-SDD has three levels. Each of them maps to an established practice in software design, from Event Storming sessions to API design, so there is nothing new to learn conceptually, only a new way to write it down:

- **The flow model** is what the business does across services. It is the result of a process-level Event Storming with business policies as the central building block connecting commands and domain events with their alternative and failure outcomes, not only the happy path.
- **The domain model** is how one bounded context is built, with the tactical building blocks of Domain-Driven Design: aggregates, entities, value objects, services, commands, domain events and state transitions.
- **The API contracts** are what each context exposes and publishes outside of its bounded context: OpenAPI, AsyncAPI, gRPC, GraphQL...

The three levels share the language of the business we discover in Event Storming.

Together they work as a structured Ubiquitous Language: the same domain event or command is named the same in the flow, in the bounded context and in the API contract. So the language you discover during Event Storming carries over into the three levels of the spec, and later into the code itself.

And a tool can assist in validating those connections, and an agent can reason about them. That helps you find not only naming inconsistencies but also correlation inconsistencies.

In the reference implementation the flow model is written in [ZFL](https://www.zenwave360.io/docs/event-driven-design/zenwave-flow-language/). This is one business rule of an order flow:

```zfl
/**
 * Authorization hold: the processor reserves the funds.
 * declined: the card was rejected. We will not retry.
 * failed: a technical error. We retry inside the reservation window.
 */
when OrderPlaced do authorizePayment {
    service PaymentsProcessing.PaymentsProcessingService
    @outcome(authorized)
    emits PaymentAuthorized
    @outcome(declined)
    emits PaymentDeclined
    @failure @outcome(failed)
    emits PaymentFailed
}
```

And this is part of the orders service, written in [ZDL](https://www.zenwave360.io/docs/event-driven-design/zenwave-domain-language/), the domain model:

```zdl
@rest("/orders")
service OrderService for (Order) {

    @post
    @transition(to: PLACED)
    placeOrder(PlaceOrderInput) Order withEvents OrderPlaced

    @post("/{orderNumber}/pay")
    @transition(from: PLACED, to: PAID)
    payOrder(@natural id, PayOrderInput) Order withEvents OrderPaid

    @post("/{orderNumber}/cancel")
    @transition(from: [PLACED, PAID], to: CANCELLED)
    cancelOrder(@natural id) Order withEvents OrderCancelled
}
```

From these lines we derive the OpenAPI and AsyncAPI contracts, [291 and 303 lines of YAML](https://github.com/ZenWave360/zenwave-playground/tree/main/examples/order-fulfillment-kotlin/src/main/resources/public/apis) that nobody had to write by hand.

### What makes a model work as a spec

DM-SDD is not tied to my DSLs. These are the properties I look for in a model language, because each one solves a problem that Markdown prose has:

- **Plain text with a grammar and a validator**, so they can be versioned, diffed, edited and validated with no special CASE tools.
- **Readable as code** by any engineer, so the people who approve it don't need training.
- **Built on DDD building blocks**: aggregates, commands, events, policies... the vocabulary the team and the literature already share.
- **Compact**, so a human can read all of it and an agent can hold it in context.

[Context Mapper](https://contextmapper.org/) and Miragon's [`.storm` Event Storming format](https://github.com/Miragon/modeler-suite) already cover parts of this list, the first one at the domain level and the second one at the flow level.

The DSL languages in my toolkit, [ZenWave](https://www.zenwave360.io/) (open source, MIT), have two more properties, and the Design loop below takes advantage of them:

- **Cross-referenced across levels**, with references the platform can cross-navigate and the agent can link together.
- **Projectable into different views:** flow diagrams, sequence diagrams per branch, class diagrams, state machines, API contracts... that a human can review from different angles.

A DSL has a learning curve, but with LLMs that cost is much smaller.

Two years ago I gave a ZDL file to GitHub Copilot and to ChatGPT and asked for an estimation and a task breakdown. Without any grammar, instructions or examples they understood them and estimated about the same as when I gave them the equivalent openapi.yml of the same project.

With a grammar and some examples, your agent can draft the models from your grilling session. You can use [zenwave-sdd skills](https://github.com/ZenWave360/zenwave-sdd) for this.


## Discover and Design

DM-SDD has two stages: Discover and Design.

Domain knowledge is more important than ever. With a good grasp of the domain and some agentic help I believe you can go much farther than with deep technical knowledge and no domain knowledge.

And that is what the **Discover** stage is for. Your business is the solution to your clients' problems. If your business needs no discovering then you are not building a business but a commodity.

You can discover your domain using all well known techniques and tools: PRD, EventStorming, agentic interviews... All these are inputs for the modeling and design stage.

**Designing** is a human-in-the-loop iterative activity, assisted by an agent with constant feedback from domain experts.

It repeats until the model is ready:

- **Model.** Agents can draft your models from the decisions taken in Discover. You still need to review and rework the design applying your own taste and instincts from software engineering practices.
- **Validate Projections.** Because models can be projected into different forms and from different angles, it is easier to review and validate projections: flow charts, sequence diagrams, state machines...
- **Challenge.** Ask your agents to read the whole model looking for contradictions, missing outcomes and correlations.
- **Probe.** If you have a generator for your stack, generate the code from your models ([ZenWave SDK](https://www.zenwave360.io/docs/zenwave-sdk/) does this for Spring Boot). Run a test or start a debug session, and see if what the model produces matches the requirements. This code becomes another projection and because it's cheap to generate you can throw it away while you are iterating the models.
- **Prepare test data.** Prepare fixtures and test data for each use case and alternative branch. This becomes part of the specification. Agents can draft it from the models.

![One model, many projections: EventFlow, sequence diagrams per branch, class diagrams and state machines, OpenAPI, AsyncAPI, and generated code with tests](/assets/articles/sdd/two-loops-model-projections.webp)

Once the model is approved, delete the PRD. The model is the spec now, and an old requirements document only misleads the next agent that finds it.

## The baseline and the rules for whoever implements it

Design ends with a **baseline**. You can consider the Design is ready when it is:

1. **Valid.** Models parse and references resolve. Deterministic, no LLM involved.
2. **Reviewed.** The human has reviewed the projections, and the agents have no open questions left.
3. **Covered by test data.** Every branch, validated by a human.
4. **Approved and tagged.** Committed and tagged as the baseline that agents cannot modify.

A task backlog can go with it, ideally sliced vertically and with the happy path first acting as tracer bullet.

![DM-SDD Consumer Design Loop](/assets/articles/sdd/dm-sdd-consumer-design-loop.webp)

DM-SDD is not about who implements the baseline, or how. My own choice is an [away-from-keyboard agentic loop](/articles/sdd-two-loops-agentic-away-from-keyboard-loop/), with an orchestrator that hands tasks to implementer and reviewer agents. But you can also feed those tasks to [Spec Kit](https://github.com/github/spec-kit), [BMAD](https://github.com/bmad-code-org/BMAD-METHOD) or [Sandcastle](https://www.aihero.dev/sandcastle/branch-strategies), or hand them to a team.

There are just three rules the implementation loop must adhere to:

1. **The model is the spec.**
2. **Agents never edit the model, the contracts or the test data.**
3. **Gaps come back as proposals.** When the implementation shows that the model is wrong, the agent stops, writes down the problem, the model lines, the evidence and the options, and a human decides in Design.

There is a lot of value in the third rule. A proposal that points at line 121 of a domain model can be reviewed in a minute. Then you need to tag a new baseline before you hand it back to your AFK loop.

## Code generation is optional

A model that can be parsed can be turned into code deterministically, but DM-SDD does not depend on it. You can turn models into an implementation deterministically or with agents.

But a deterministic generator also gives you something else:

It gives your agents, or your teams, a baseline of consistent patterns they can then replicate without much thinking. Agents are machines that repeat patterns. They copy, and lean heavily on, the patterns already in the repo, and if the codebase is bad they keep it that way or make it worse. If the codebase was generated deterministically from your own patterns, your best ones, you can keep the quality consistent over time.

This reminds me of a [quote from Julien Dubois](https://x.com/juliendubois/status/1400506922827235329), the creator of JHipster: "I was copy-pasting my code so much I decided to automate it and create JHipster. And now thousands of people copy-paste my code."

My domain models are heavily influenced by [JHipster's JDL](https://www.jhipster.tech/jdl/), and ZDL started as a GraalVM JVM wrapper around JDL until I needed to extend it.

I have been using ZDL, the Domain Language, for four years: writing domain models by hand and generating around 80% of the backend code from them with [ZenWave SDK](https://www.zenwave360.io/docs/zenwave-sdk/), for Spring Boot in Java and Kotlin. Then the team wrote the remaining 20% and finished up the tests.

With agents, the generated code has two roles: it speeds up your agentic implementation, and it gives agents a deterministic structure with your established practices already applied: modules, aggregates, repositories, API adapters, event wiring, test skeletons... And generating it takes seconds and consumes no tokens.

Without a generator for your stack, DM-SDD works the same: the agents write all the code instead of just the last part, and they still receive a structured blueprint based on the building blocks of DDD.

To be precise about the four years: ZDL has proven to be a production-ready language. The ZFL Flow Language is something I created just this year, and I started testing it end to end on [Arcadia Editions](/articles/arcadia/).

## Where DM-SDD sits

**Compared with SDD.** SDD made the specification the unit of work. DM-SDD changes what the specification is.

In Birgitta Böckeler's [three levels of SDD](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html), DM-SDD is spec-anchored. The model stays after the feature is built, and every change of intent goes through it first and ends in a new baseline.

Some parts are closer to spec-as-source if you use ZenWave SDK as a code generator for AsyncAPI. But the rest of the generated source code can be edited by the team, even though the recommended workflow is to regenerate some parts, like service interfaces and aggregates, from the model every time it changes.

So it is a variant of SDD and it can sit in front of the existing SDD tools.

**Compared with MDA.** At first this may look like MDA again. The difference is who reads the model.

In MDA the reader is a transformer, so the model has to be complete enough to generate code from it, and every gap breaks the pipeline. In DM-SDD the readers are a human who approves the model and an agent who implements it. Both can work with a model that is incomplete: the agent fills in what the model leaves open, and when it can't, it stops and sends a proposal back (rule 3 above).

In practice this means:

- The model does not have to be complete. It provides the structure and the information that prose cannot convey on its own, and the business rules inside each command are left to agents and people, checked against the test data.
- Generation is optional, so the model does not need a perfect transformation to pay off.
- The languages read as code, not UML diagrams in a CASE tool, so they live in git with the rest of the system.

## Limits

The models can be inconsistent and do not find their own gaps. A missing correlation, an event without listeners or a command that needs an identifier that is not passed can be found by an agent reviewing the model, with a prompt written for that. ZenWave Platform provides a language server that lints cross-references, and cross-file linting is coming. Without proper review, the gaps show up during implementation, same as before.

You still need to know how to model a domain.

The model describes the structure and the outcomes of each command. The business rules inside them are written by agents or by people, checked against the test data and reviewed. A generator does not help there.

I have only used this on enterprise backends: DDD, event-driven systems and Spring Boot. For other stacks there is no ZenWave generator, so the agents write more of the code.

## Related work

- **Spec-Driven Development.** [Spec Kit](https://github.com/github/spec-kit) and [Kiro](https://kiro.dev/docs/specs/feature-specs/) structure Markdown, and Kiro writes requirements in EARS notation. EARS adds structure to the prose, while a domain model replaces it. [Böckeler](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) describes the review burden plainly: "I'd rather review code than all these markdown files".
- **MDA and model-driven software development.** The same idea of the model at the center, with a different completeness condition, as explained above.
- **[Context Mapper](https://contextmapper.org/)**, by Stefan Kapferer and Olaf Zimmermann. A DSL for strategic and tactical DDD that generates contracts, diagrams and Spring Boot applications. The closest antecedent at the domain level.
- **[JHipster JDL](https://www.jhipster.tech/jdl/)**, by Julien Dubois and the JHipster team. A domain language for entities and relationships that generates full applications. ZDL is heavily influenced by it.
- **[Miragon's Event Storming Modeler](https://github.com/Miragon/modeler-suite).** A plain-text `.storm` format for Event Storming boards. A good discovery format at the flow level, without a derivation chain into the domain.
- **[MAGE, Model-Based Agentic Software Engineering](https://arxiv.org/abs/2608.25174)** (Davis et al., 2026). The same diagnosis, focused on giving settled obligations authority through constraints, validators and gates.
- **[AHASE, AI-hyper-agile software engineering](https://doi.org/10.1007/s10270-026-01362-0)** (Chechik, Combemale, Gray and Rumpe, SoSyM 2026). Names the emerging class of model-centric, AI-enabled development approaches. DM-SDD is one concrete instance of it.
- **[Spec-Driven Development for Agentic Software Engineering](https://arxiv.org/abs/2609.00252)** (Diaz et al., 2026). Specs as contracts between humans and agents.

## The reference implementation

DM-SDD is a method around Domain Models being the center of the specification. ZenWave is just one implementation.

Everything in this article is open source (MIT) under [ZenWave](https://www.zenwave360.io/):

- [ZFL](https://www.zenwave360.io/docs/event-driven-design/zenwave-flow-language/) and [ZDL](https://www.zenwave360.io/docs/event-driven-design/zenwave-domain-language/), the flow and domain languages.
- [ZenWave Platform](https://www.zenwave360.io/zenwave-platform/), the IntelliJ and VS Code plugins for the projections.
- [ZenWave SDK](https://www.zenwave360.io/docs/zenwave-sdk/), the optional code generator.
- [zenwave-sdd](https://github.com/ZenWave360/zenwave-sdd), the skills for Discover and Design and the orchestrator I use for the implementation loop. These are still early, extracted from [Arcadia Editions](/articles/arcadia/).

If you are doing Spec-Driven Development and drowning in Markdown, try writing one business flow as a model before writing it as prose, and see which of the two you can actually review.
