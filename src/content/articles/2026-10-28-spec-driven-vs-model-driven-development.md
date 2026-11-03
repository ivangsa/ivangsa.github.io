---
title: "Prose Specs vs Domain Models: Where Formal Verification Fits in Spec-Driven Development"
summary: "Spec Kit, OpenSpec, BMAD and Doorstop put a lot of effort into keeping track of what the LLM interpreted from prose specs. The model-driven approach I use with ZenWave tries not to need that interpretation for most of the application. This is how both compare, and why only a structured model can be formally verified without going through an LLM."
date: 2026-10-28
tags:
  - ddd
  - zenwave
  - architecture
  - ai
featured: false
featuredImage: assets/articles/2026-10-28-spec-driven-vs-model-driven-development.webp
featuredImageAlt: "Prose specifications interpreted by an LLM compared with structured domain models processed by deterministic generators and verifiers"
readingTime: "8 min read"
draft: true
---

> **Disclaimer:** this article was edited with AI. The ideas, the opinions and the methodology are mine, and I reviewed the final text, but an AI assistant helped me structure the comparison and write it in English.

These weeks I have been reading a lot about spec-driven development tools: [Spec Kit](https://github.com/github/spec-kit), [OpenSpec](https://github.com/Fission-AI/OpenSpec), [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD), [Doorstop](https://github.com/doorstop-dev/doorstop), and even formal verification approaches that use Lean to check code written by agents. And I wanted to compare them with the way I am working with ZenWave, which I described in [How I Build with ZenWave and AI Agents](/articles/iterative-ai-assisted-model-driven-development).

But first I need to correct something I used to say myself.

## What code generation guarantees, and what it doesn't

I usually say that the code ZenWave SDK generates represents the model, so I almost don't need to validate it. That is true, but only in one sense. It is **correctness by construction relative to the generator**, the same kind of trust you give to a compiler. It guarantees that you build what the model says.

It says nothing about three other things:

- That the model is internally consistent. For example, that there is no path in the flow where a payment is captured without a confirmed stock reservation.
- That the 20% of the code that agents write respects what the model promises.
- That the model is what the business actually wants. This is validation, not verification, and no math will help here. For this I have the views generated from the models and a running prototype that business people can look at.

So "I almost don't need to validate it" is true for the structure. For the behavior it is not. But this is exactly where a structured model has an advantage that prose specs cannot have, as we will see.

## The general comparison

| | Spec Kit / OpenSpec / BMAD | Doorstop | ZenWave (iterative model-driven) |
|---|---|---|---|
| Spec format | Markdown prose with templates | Requirements in YAML, free text inside | Structured DSLs (ZFL, ZDL) plus OpenAPI and AsyncAPI |
| Who interprets the spec | The LLM, every time | People | A deterministic generator for ~80%, the LLM for the remaining 20% |
| SDD level | Spec-first or spec-anchored | Spec-anchored | Spec-as-source for the structure, spec-anchored for the behavior |
| How the design is validated | Reading documents | Human review | Running it: generation is cheap and the prototype works |
| Traceability | Has to be built (links, matrices) | Its whole purpose: fingerprints and suspect links | Almost free: each gap points to the model line that defines it |
| Change management | OpenSpec: prose deltas over the current spec | Marks linked items as suspect | Model diff plus regeneration: the change is semantic, not textual |
| When the agent stops | BMAD: with an explicit reason | Not applicable | When something is missing in the model, it hands a "model gap" to a person |
| Token cost | High: everything goes through the LLM | Low | Low for the 80%, normal for the 20% |
| Scope | Any kind of software | Any | Enterprise backend, DDD, event-driven, Java and Kotlin |
| Entry barrier | Low | Medium | High: you need to know how to model a domain |

### Where they win

They work for anything: frontend, scripts, machine learning, a CLI. Prose captures intent, reasons and non-functional requirements very well, things a DSL cannot express. And anybody can start using them tomorrow. I cover part of this with a PRD and ADRs, but my scope is narrower and it requires knowing DDD.

### Where model-driven wins

The spec does not depend on a new interpretation every time. The design is validated by running it, not by discussing documents. And traceability and change impact, which is what most of these tools worry about, come out of the structure instead of being maintained by hand.

### They don't really compete

In the ZenWave workflow, the agent loop is meant to reuse existing AI workflows. ZenWave can be what comes *before* Spec Kit or BMAD: it hands them tasks that point to a model, instead of to a PRD in prose. I don't want to build another task management framework, I want to give the existing ones a better input.

## Where formal verification fits

There are three layers, and each one admits a different level of formality.

### 1. On the model: model checking

This is the most promising layer. Because ZFL and ZDL are structured, they can be translated deterministically to a formal language like TLA+, Alloy or Petri nets, and we can check properties of the flow before generating any code. With [Arcadia Editions](/articles/arcadia/001-meet-arcadia-editions), for example:

- An order is never created without a stock reservation.
- A payment is only captured when the shipment is ready.
- Every stock reservation ends either confirmed or released, in every path, including failure paths.
- A refund happens at most once.
- No flow gets stuck waiting for an event that never arrives.

This is impossible with prose. To translate a Markdown file to TLA+ you need an LLM, and then the proof depends on an interpretation again. With a structured model the translation is mechanical.

### 2. On the generator: translation validation

Proving that the generator itself is correct is a CompCert-level project, and it is not worth it. The practical alternative is to also generate, from the same model, the rules that check the code: ArchUnit rules for the architecture, contract tests from OpenAPI and AsyncAPI, and checks for the transitions of each state machine. They run on every build and detect when an agent or a person has touched the generated code and moved away from the model.

### 3. On the 20% that agents write: contracts derived from the model

This is where the real risk is. And the key idea is this: **the LLM writes the code, but the oracle that judges it is deterministic and comes from the model.**

From the ZDL we can generate preconditions, postconditions and invariants (valid states, allowed transitions, required fields, idempotency) as property-based tests, with something like jqwik, and as runtime guards. For the few critical rules, like a refund that must happen only once, we can go further and extract that logic to Lean and prove it. But that is only worth it for what really must not break.

With prose specs, the acceptance criteria and the tests are also written or interpreted by the LLM. The one that writes the code and the one that judges it drink from the same interpretation. With a structured model, the judge can be derived without an LLM. For me this is the strongest difference between both worlds, and it is easier to defend than "I generate 80% of the code".

## Summary

Prose-based SDD tools put the effort into keeping and tracing what the LLM interpreted. The model-driven approach puts the effort into not having to interpret. Formal verification fits naturally in a structured model, and it barely fits in the others, because it needs a spec with structure.

What I cannot say anymore is that there is no need to validate. What I can say is that a structured domain model is the only thing in this landscape that can be formally verified without going through an LLM.