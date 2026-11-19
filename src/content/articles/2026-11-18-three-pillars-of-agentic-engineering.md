---
title: "When code is cheap: the three pillars of agentic engineering"
summary: "When generating code becomes cheap, design and verification are the hard part: understanding the domain, proving the design is correct, and validating the result. An intro to a three-post series."
date: 2026-11-18
tags:
  - zenwave
  - architecture
  - ddd
  - ai
  - formal-verification
featuredImage: assets/articles/sdd/three-pillars-of-agentic-engineering-featured.webp
featuredImageAlt: "The three pillars of agentic engineering: Domain-Driven Design, Formal Verification and Behaviour Validation."
readingTime: "3 min read"
lang: en
draft: false
featured: false
---

## Code is becoming cheap, design and verification still not

When generating code becomes cheap, what remains are the three pillars of software engineering: domain understanding, design correctness and behaviour validation.

## 1. Understanding the domain: Domain-Driven Design as code

Domain-Driven Design is 20+ years old and still more relevant than ever. It gave us the tools and the mental frame to understand the domain first, from the perspective of business experts and in their own language. To divide the problem space (your client's problem) into subdomains, so we can tackle its complexity while designing the solution space (your business is the solution to your client's problem) as bounded contexts.

Both strategic and tactical: bounded contexts, context maps, aggregate boundaries, services... along with API-First and contracts.

Now the challenge is not only understanding the business, but to create specs with those findings, concise enough for a human engineer to design and review it, and expressive enough for an AI agent to get a complete understanding. That is the idea behind DDD as Code: specs as model blueprints both humans and agents can understand.

![The three pillars of agentic engineering: an architect, a scientist and a site inspector carry crates labelled Domain-Driven Design, Formal verification and Behaviour Validation into a robot machine, whose fast stream of code passes through a validation gate that sends the failing pieces to the bin.](/assets/articles/sdd/three-pillars-of-agentic-engineering-comic.webp)

## 2. Proving the design is correct: Formal Verification

When designing complex systems with many moving pieces, such as event-driven architectures, where multiple business processes run concurrently and services react to each other's events, understanding all the possible workflows and interactions between those pieces is both important and hard. And so is ensuring that none of them can lead the system to an invalid state or incorrect behaviour. 

The difficulty in these systems is often not the individual pieces but the emergent behaviour resulting from their interactions.

That is something that requires discipline and technique, and that is what Formal Verification is about:

- Defining what constitutes correct behaviour is an exercise in formal specification.
- Demonstrating that the design cannot violate that specification.

This is a design-time task, before we hand the specification to the agent.

## 3. Validating the result: Specification by Example

Specification by Example (SbE) is a collaborative approach to specifying the expected behaviour of a system using concrete examples of business scenarios, with specific inputs, initial conditions and expected outcomes.

It is not just a validation technique. It is also a specification and discovery technique. The examples are agreed upon before implementation and executed against the system afterwards.

What matters in the context of agentic engineering is that we define and approve these examples before handing the specification to the agent. They become an independent means of assessing the correctness of the code the agent produces.


This is the first post of a series, one post per pillar:

- Three pillars: Domain-Driven Design as code (coming next)
- Three pillars: Formal verification in the age of agentic engineering (coming next)
- Three pillars: Behaviour Validation (coming next)