---
title: "Three pillars: Formal Verification in the age of agentic engineering"
summary: "What can formal verification tell us about our designs that tests can't? An introduction to formal verification for event-driven architectures and an exploration of how far the domain models we already write can take us towards TLA+. A first independent experiment with ZFL and ZDL suggests about a third of the way today, and two thirds or more with a few additional conventions, with caveats."
date: 2026-11-20
tags:
  - zenwave
  - architecture
  - ddd
  - ai
  - formal-verification
  - tla-plus
featuredImage: assets/articles/sdd/three-pillars-formal-verification-featured.webp
featuredImageAlt: "When correct pieces behave incorrectly: five event-driven services, each with a green check mark, unfold into a blueprint of possible states, where an engineer with a magnifying glass finds the one red path that ends in a bad state."
readingTime: "7 min read"
lang: en
draft: true
featured: false
---

This is the second pillar of [the three pillars of agentic engineering](/articles/three-pillars-of-agentic-engineering/): proving the design.

A disclaimer first: I am not a formal verification expert. Over the years I have designed two Domain-Specific Languages (DSLs) for taking process-level and design-level EventStorming workshops to code: ZFL and ZDL. It was only later that I became interested in formal verification as a way of checking the design of complex systems with many interacting parts, such as event-driven architectures.

So I'm approaching this subject as a software architect who designs event-driven systems for a living and wants a better way to know whether a design is correct before handing it to an agent.

In [the first pillar](/articles/three-pillars-domain-driven-design-as-code/) I wrote that the most promising feature of ZFL would be the ability to compile it to TLA+, something "still to be proven".

What I wanted to find out was how much of the information needed for formal verification is already captured in the domain models we write. And how much is missing.

This post is about that hypothesis and a first experiment to explore it.

## When correct pieces behave incorrectly

When designing event-driven architectures it is easy to understand an individual endpoint or a single topic with its message schema. API-First specifications like OpenAPI and AsyncAPI can help us design REST and event-driven APIs. What is more difficult is to reason about how the system behaves as a whole.

How do we know the business flows we are designing are correct?

Multiple business processes run concurrently, events can be processed in different orders, timers expire, operations fail and compensating actions are triggered. Understanding the happy path is easy, understanding all the possible interactions between those pieces is hard.

And each service can behave correctly in isolation while the system as a whole behaves incorrectly.

We draw sequence diagrams, state diagrams and business flows. We walk through different scenarios with other engineers and try to anticipate what could go wrong. Eventually, we write tests for those scenarios.

But what about the scenarios we haven't thought of? How do we know we haven't missed a particular sequence of events that violates one of our business rules?

This is the kind of problem formal verification can help us with.


## What is Formal Verification?

Formal verification is the use of mathematical methods to establish that a system satisfies a set of formally specified properties, under a set of explicit assumptions. There are two fundamental kinds of properties: safety (something bad never happens) and liveness (something desired eventually happens).

For the type of systems we are talking about, a formal specification describes:

- The state of the system and its possible initial states.
- The actions that can change that state.
- The properties we want the system to satisfy.
- The assumptions under which the system operates.

With a technique called model checking, we can systematically explore all the reachable states of a finite model and check its possible behaviours against those properties.

One of the best-known languages for specifying concurrent and distributed systems is [TLA+](https://lamport.org/tla/high-level-view.html), developed by Leslie Lamport and used for distributed algorithms, consistency models, replication and coordination.

The interesting part is that we don't have to come up with every possible scenario ourselves. We describe how the individual pieces behave, how they interact and what constitutes correct behaviour for the system as a whole.

When the model checker finds a violation, it can give us a counterexample: the sequence of actions that led to it.

And we can do this at design time, before writing any implementation code.


## Don't we already have much of that information in our domain models?

This was my first thought when I started learning about TLA+.

If we are doing Domain-Driven Design as Code, we are already describing aggregate lifecycles, commands, events, state transitions and the interactions between bounded contexts in a machine-readable language.

Looking at ZFL and ZDL from the perspective of formal verification:

| ZFL | ZDL | What it tells us |
|---|---|---|
| | `@lifecycle`, `@transition` | Aggregate states and transitions |
| `emits` | `withEvents` | Possible outcomes of a command |
| `when Event do command` | `@listener` | Asynchronous interactions between contexts |
| `call` | `@calls` | Synchronous interactions |
| `@time` | `@timer` | Time-triggered actions |
| `@compensates` | | Compensation relationships |
| `@outcome`, `end` | | Declared outcomes of a business flow |

Take one policy from the Arcadia Place Order flow: when stock is released, the order is cancelled. Step through it:

<div class="code-steps">

```zfl title="ZFL: the policy, when StockReleased do cancelOrder"
@compensates(startOrderCheckout)
when StockReleased do cancelOrder {
    service OrdersCheckout.OrdersCheckoutService
    emits OrderCancelled
}
```

```zdl {1-2} title="ZDL: who listens, and from which states"
@listener(zdl: CatalogInventoryZdl, event: StockReleased)
@transition(from: [CREATED, CONFIRMED], to: CANCELLED)
cancelOrder(CancelOrderInput) Order withEvents OrderCancelled
```

```text title="TLA+: the same step as an action"
CancelOrder ==
  /\ "StockReleased" \in pending
  /\ IF order \in {"CREATED", "CONFIRMED"}
     THEN /\ order' = "CANCELLED"
          /\ Emit("StockReleased", {"OrderCancelled"})
     ELSE /\ UNCHANGED order
          /\ Emit("StockReleased", {})
  /\ UNCHANGED <<reservation, payment>>
```

```text {1-2} title="TLA+: what the models don't say"
\* the ELSE branch: what happens in an unexpected state?
\* `pending`: how events are delivered, in which order
NoHoldOnCancelledOrder ==
  Quiescent => ~(order = "CANCELLED" /\ payment = "AUTHORIZED")
```

</div>

The trigger, the guard and the target state come straight from the models. The ELSE branch, the event delivery and the property itself do not: they come from prose or from assumptions.

We already have much of the structure of a state machine, distributed across multiple aggregates and bounded contexts, and a description of how those state machines interact.

What I didn't know was how much of that information could be translated into a formal specification without making assumptions about the design that the modeller had never made.

## An experiment: model-checking Arcadia Editions

To get a first answer I set up an independent agent run. It read only the two grammars, their documentation and the [Arcadia Editions](https://github.com/arcadia-editions) models:

- the ZFL flow `place-order-flow.zfl` in [arcadia-editions-architecture](https://github.com/arcadia-editions/arcadia-editions-architecture)
- the six ZDLs in [arcadia-editions-modulith-api](https://github.com/arcadia-editions/arcadia-editions-modulith-api)

![ZFL EventFlow diagram of the Place Order flow with one lane per bounded context: Catalog Inventory, Orders Checkout, Payments Processing, Fulfillment Shipping and Notifications Consumer](/assets/articles/sdd/zfl-eventflow-lanes.webp)

I didn't tell it what to look for, and I asked it to keep apart what the models state, what the docs state and what it had to assume.

The Arcadia models were written mostly to test and validate the tooling (parser, visualizer, diagrams) and as a public case study, not as complete and correct e-commerce workflows. And they were not written with formal verification in mind.

With about 1,200 lines of Python and no TLA+ tooling:

| Check | Result |
|---|---|
| Parsing | 7 of 7 files conform to their grammars |
| Static checks across ZFL and ZDL | 19 errors |
| Exhaustive state-space exploration, one order | 220 states, 8 distinct final states, 3 incorrect |
| Exploration of a proposed repaired design | 312 states, no incorrect final states found |

The 19 errors came from static analysis alone, just by comparing the ZFL flow with the ZDL models, without exploring any execution and without going anywhere near TLA+.

The exploration then found three incorrect final states: a customer charged for a cancelled order, an orphaned payment hold and a fulfillment left scheduled on a cancelled order.

The first one is a race between two paths of the same order, the happy path and the reservation timer. The timer fires while payment is still pending, but its event is handled only after the order has been confirmed and paid. Stock is released, the order is cancelled, and the customer gets an email saying "no payment was taken" for an order that was charged. Each path looks fine on its own, and every step is allowed by the models. That sequence is the counterexample, and I'll walk through it in a follow-up post.

The catch: to explore the state space it had to assume things neither the models nor the docs define, like event delivery, timers or what a command does in an unexpected state. And every property it checked came from the prose of the flow or from the agent itself.

## How far are we from TLA+?

I also asked the agent to estimate how much of a reference TLA+ specification could be derived from the models without anyone adding their own design decisions. From 0, only the vocabulary of the domain, to 100, a mechanical translation:

| | Estimated score |
|---|---:|
| Current Arcadia domain models | 30–45 |
| With stricter modelling discipline | 45–58 |
| With five additional language conventions | 65–80 |
| Reference TLA+ specification | 100 |

For comparison, an earlier run, done while writing [You can't design event-driven systems in Markdown specs](/articles/whats-wrong-with-spec-driven-development-and-how-to-fix-it/), put a Markdown SDD spec read by an agent at 5–10. That run was not blind, and it used a slightly different scale: the share of design defect classes that would be caught. So read it as an order of magnitude, not as a row of the same table.

These are one agent's judgments, on one slice of one flow, against a reference spec that no expert has reviewed and that has not been run through TLC, the TLA+ model checker, yet. They are not verification coverage. What they give me is a hypothesis about what is missing: execution semantics, the link between each command outcome and its state, and an explicit definition of correct end states. Data and quantities, like "never sell more units than we have", stay out of reach at any level.

I'll share the details of the experiment, the proposed conventions and what stays out in follow-up posts.

## Making formal verification more accessible

![The same business rule twice: on the left a dense TLA+ action, on the right the ZFL policy and ZDL transition an architect already writes.](/assets/articles/sdd/tla-vs-zfl-zdl.webp)

How many of us who design event-driven architectures for a living write a TLA+ specification for every business flow we design?

I don't.

But I do write domain models. They are the specifications I use to design the system, discuss it with other engineers and generate code.

If those same models can give us a useful subset of formal verification, with a small additional modelling effort, some of these techniques could become part of everyday software engineering. A warning in the IDE while designing a business flow, not for a syntax error, but because a sequence of events leads to a customer being charged for a cancelled order. The same checks in CI, next to the validations we already run on API contracts and domain models.

That wouldn't replace TLA+, or the expertise of someone who knows how to verify a complex system. But it could bring some of it to business flows that would otherwise never be formally modelled.

That is the hypothesis, and this post is the starting point. I've since changed the Arcadia design to fix the three defects, but haven't rerun the exploration yet. Next come the follow-up posts on the experiment, and the third pillar: Specification by Example.

Back to [the three pillars of agentic engineering](/articles/three-pillars-of-agentic-engineering/).
