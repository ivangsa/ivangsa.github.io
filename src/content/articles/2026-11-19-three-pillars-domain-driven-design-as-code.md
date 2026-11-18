---
title: "Three pillars: Domain-Driven Design as code"
summary: "Domain-Driven Design gives us the tools and the mental frame to understand the business. The challenge now is to write those findings down as a spec both humans and agents can work on. EventStorming in its two sizes: process-level and design-level, and two languages that turn them into code: ZFL and ZDL."
date: 2026-11-19
tags:
  - zenwave
  - architecture
  - ddd
  - ai
featuredImage: assets/articles/sdd/domain-driven-design-as-code-featured.webp
featuredImageAlt: "Domain Driven Design as code: Event Storming boards, state machines and class diagrams become two text files, place-order.zfl at process level and payments-processing.zdl at design level, linked by the authorizePayment name."
readingTime: "10 min read"
lang: en
draft: true
featured: false
---

This is the first pillar of [the three pillars of agentic engineering](/articles/three-pillars-of-agentic-engineering/): understanding the domain.

Now that generating code becomes cheap, what remains is domain understanding and verification. And the first thing to verify is the spec itself: did we understand the business, and is the spec easy to understand and verify by an human engineer?

## Domain-Driven Design: the tools and the mental frame

Domain-Driven Design is 20+ years old and still more relevant than ever. It gave us the tools and the mental frame to understand the domain first, from the perspective of business experts and in their own language. To divide the problem space (your client's problem) into subdomains, so we can tackle its complexity while designing the solution space (your business is the solution to your client's problem) as bounded contexts.

Both strategic and tactical:

- Strategic: subdomains, bounded contexts, context maps, ubiquitous language...
- Tactical: aggregates, entities, commands, domain events, services, state machines...

And alongside it, collaborative techniques like Event Storming to discover all that with business experts in the room, plus API-First and contracts to publish it outside each bounded context.

None of this changes with agents. If anything, domain knowledge matters more now: with a good grasp of the domain and some agentic help you can go much farther than with deep technical knowledge and no domain knowledge.

## The challenge: a spec both humans and agents can work on

What changes is what we do with those findings.

The usual Spec-Driven Development answer is Markdown. But LLMs write Markdown faster than anyone can read it. I wrote about this in [Markdown is the bottleneck](/articles/sdd-markdown-is-the-bottleneck/): when you don't read everything, decisions slip into the implementation as if you had approved them, and the agent uses them as anchored decisions that can never be broken.

So the challenge is not only understanding the business, but writing those findings down as specs:

- concise enough for a human engineer to design and review them,
- expressive enough for an AI agent to get a complete understanding.

So the idea is to build on DDD artefacts we already know and use: Event Storming boards, state machines, class diagrams. 

The challenge is to convery them in a format both humans and agents can understand, that we can store in git, diff them...

![Paper blueprints of Domain-Driven Design: an Event Storming board, a state machine and a class diagram stacked on a table](/assets/articles/sdd/ddd-blueprint-stack.webp)

That is the idea behind **DDD as Code**: a text format that reads as code for any experienced software engineer, and that agents can also read and write. As I wrote in [DM-SDD](/articles/dm-sdd-domain-model-spec-driven-development/#what-makes-a-model-work-as-a-spec), such a language needs:

- plain text with a grammar and a validator
- readable as code
- built on DDD building blocks
- compact enough that we don't drown in it while approving the spec

For exploring these ideas I'll use [Arcadia Editions](https://github.com/arcadia-editions), a fictional limited-edition board game retailer I built to show this end to end, and its `Place Order` flow.

## Event Storming has three levels

Event Storming, from Alberto Brandolini, works at three levels of detail:

![Event Storming three levels: Big Picture, Process Modelling and Software Design, each one adding new notation on top of domain events](/assets/articles/sdd/event-storming-three-levels.webp)

- **Big Picture**: events, hot spots, systems, people. The whole business on one wall.
- **Process Modelling**: adds commands, policies and read models. Policies (business rules) are connecting glue from events to command. Modeling business flows, end to end, across many systems.
- **Software Design**: command and events group around aggregates. One bounded context at a time.

We will focus in the two levels that matter for a spec: process level and design level. They are the two levels we will be writing as code.

## Discovering the flow: Process Level

How we got to the Place Order board, step by step:

- **Events**: orange sticks about business facts, past tense, chronologically in the language of the business, no technical jargon... `OrderCreated`, `StockReserved`, `PaymentDeclined`... 
- **Commands**: blue stikies with the intent that triggers each event, one next to it.
- **Policies**: the glue that binds together events and what should happen next. The business rules `"when this happens, do that"`. Usefull questions to ask: Does this rule applies always? Does it apply inmediatly?
- **Hot spots**: Markers for open questions, and things to take into account.

<div class="steps">

![Event Storming board showing the sequence of domain events for the Place Order flow](/assets/articles/arcadia-editions/eventstorming-events-sequence.jpg "Events: business facts on a timeline")

![Event Storming board showing events and commands for the Place Order flow](/assets/articles/arcadia-editions/eventstorming-events-commands.jpg "Commands: what triggers each event")

![Event Storming board showing events, commands and policies for the Place Order flow](/assets/articles/arcadia-editions/eventstorming-events-commands-policies.jpg "Policies: when this happens, do that")

![Event Storming board showing events, commands, policies and hotspots for the Place Order flow](/assets/articles/arcadia-editions/eventstorming-events-commands-policies-hotspots.jpg "Hot spots: the questions nobody answered yet")

</div>

**Policies are the building block ZFL is built around.**

## Discovering bounded contexts: Design Level

The process-level board tells a story across the whole business. Now we need to find the boundaries, and zoom into each one.

The heuristic I use is one question: which business objects act as **centers of gravity** for commands and events? Something that receives commands, owns state, enforces rules, changes over time and emits domain events. That is an aggregate, and aggregates are what bounded contexts form around.

Other signals help too: language shifts, pivotal events that work as a way door, team ownership changes, things that change together.

Group commands and events around each center of gravity and you get the map of what to build:

![Commands and domain events grouped by bounded context: Orders Checkout, Catalog Inventory, Payments Processing, Fulfillment Shipping and Notifications Consumer](/assets/articles/sdd/zfl-systems-commands-events.webp)

Once bounded context are discovered, then it's a matter of designing each one at a time:

- Inbound commands: as async listeners or request-response endpoints.
- Aggregates: entities, relationships, invariants, persistence
- Outbound commands

If you use the DDD Crew [Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas), most of it maps here too: inbound and outbound communication, ubiquitous language, business decisions. ZDL was designed with that canvas in mind.

## Event Storming as Code: two languages

We map EventStorming two levels with two different languages:

- **ZFL**, [ZenWave Flow Language](https://www.zenwave360.io/docs/event-driven-design/zenwave-flow-language/): is process-level Event Storming as code. Built around Policies as building block, to model a business flow across many bounded contexts. It was created in 2026 and so far it delivers what it was designed for, but it's not production proven as ZDL is. Its most promising feature is the possibility of compiling it to TLA+ as a friendlier Formal Verification language (still to be proven).
- **ZDL**, [ZenWave Domain Language](https://www.zenwave360.io/docs/event-driven-design/zenwave-domain-language/): design-level Event Storming as code for one bounded context. I created ZDL in 2023, inspired by [JHipster JDL](https://www.jhipster.tech/jdl/getting-started), to help me think about software, talk about software and then generate all the boring parts already covered in the model. I have used ZDL with ZenWave SDK in production projects for four years.

### ZFL: process level

The main building block of ZFL is the **policy**, the business rule: `when <event> do <command>`. The body says what the command produces. Step through it:

<div class="code-steps">

```zfl title="A policy: when <event> do <command>"
when OrderCreated do authorizePayment {

}
```

```zfl {2-4} title="What the command produces: emits"
when OrderCreated do authorizePayment {
    emits PaymentAuthorized
    emits PaymentDeclined
    emits PaymentFailed
}
```

```zfl {2-3,7-8} title="Sync calls: call + response"
when StartOrderCheckout do startOrderCheckout {
    call reserveStock
    on StockReservedResult emits OrderCreated
    on StockUnavailableResult emits StockUnavailable
}

do reserveStock {
    response StockReservedResult
    response StockUnavailableResult
}
```

```zfl {2,4,6} title="Outcomes: name each branch"
when OrderCreated do authorizePayment {
    @outcome(authorized)
    emits PaymentAuthorized
    @outcome(declined)
    emits PaymentDeclined
    @failure @outcome(failed)
    emits PaymentFailed
}
```

```zfl {2} title="Systems: who owns the command"
when OrderCreated do authorizePayment {
    service PaymentsProcessing.PaymentsProcessingService
    @outcome(authorized)
    emits PaymentAuthorized
    @outcome(declined)
    emits PaymentDeclined
    @failure @outcome(failed)
    emits PaymentFailed
}
```

```zfl {1-7} title="The business rule, in prose"
/**
 * We place an authorization hold on the customer's payment method. Funds
 * are reserved at the processor but not yet transferred to us. A decline
 * means the processor rejected the card outright and we will not retry,
 * the customer needs to act. A failure means a technical error on our side
 * or the processor's, which we will retry a bounded number of times.
 */
when OrderCreated do authorizePayment {
    service PaymentsProcessing.PaymentsProcessingService
    @outcome(authorized)
    emits PaymentAuthorized
    @outcome(declined)
    emits PaymentDeclined
    @failure @outcome(failed)
    emits PaymentFailed
}
```
</div>

`@outcome` names each branch, so every alternative path is explicit, not only the happy path. The doc comment is the business rule in prose, the same words you heard in the Event Storming session.

`service` is optional while the flow is being discovered. Once the bounded contexts are known, the `systems` block says which system owns which commands, and where its ZDL lives:

Once we have mapped EventStorming Process Level using this DSL we can render it in the IDE. 
The same file gives you many different projections: flowchart, systems map, sequence diagrams... This is the main reason I believe this DSL format lives up to its promise. We can deterministically review and validate the same flow from different angles. And agents understand it too. So we can ask questions and get agentic assistance in validating the business flow.

This even opens the door to formal verification, but more on that in the next article.

![ZFL EventFlow diagram of the Place Order flow with one lane per bounded context: Catalog Inventory, Orders Checkout, Payments Processing, Fulfillment Shipping and Notifications Consumer](/assets/articles/sdd/zfl-eventflow-lanes.webp)

![ZFL editor next to its EventFlow and Systems diagrams](/assets/articles/sdd/event-storming-zfl-eventflow-and-systems.webp)

![ZFL sequence diagrams, one per alternative path of the flow](/assets/articles/sdd/event-storming-zfl-sequence-diagrams.png)

### ZDL: design level

ZDL maps the design-level board one to one: aggregates, commands, events, policies, and the services that run them.

![Design-level Event Storming mapped to ZDL: aggregates, commands, events and services](/assets/articles/sdd/design-level-eventstorming-to-zdl.png)

The `StockReservation` aggregate with its lifecycle, from `catalog-inventory-api/domain-model.zdl`:

```zdl
@aggregate
@lifecycle(field: status, initial: RESERVED)
entity StockReservation {
    reservationId String required unique
    /** One reservation per order line: an order has as many reservations as items. */
    orderId String required
    sku String required
    quantity Integer required
    status ReservationStatus required
    reservedAt Instant required
    expiresAt Instant required
    releaseReason StockReleaseReason
}
```

And the service that owns its commands. Commands exposed over REST map to OpenAPI endpoints, with the state transition each one performs and the events it emits:

```zdl
@rest("/inventory")
service InventoryService for (StockReservation) {

    @post("/reservations/reserve")
    @transition(to: RESERVED)
    reserveStock(ReserveStockInput) ReserveStockResult

    @post("/reservations/confirm")
    @transition(from: RESERVED, to: CONFIRMED)
    confirmStockReservation(ConfirmStockReservationInput) StockReservation[] withEvents StockReservationConfirmed
}
```

Commands triggered by events say which events they consume (AsyncAPI channels), along with their state transition and the events they emit:

```zdl
service InventoryService for (StockReservation) {

    @asyncapi(api: PaymentsProcessingApi, channel: "payment-declined-event-v1")
    @asyncapi(api: PaymentsProcessingApi, channel: "payment-retry-exhausted-event-v1")
    @asyncapi(api: PaymentsProcessingApi, channel: "payment-voided-event-v1")
    @timer(api: SchedulerApi, channel: "reservation-expired-event-v1")
    @transition(from: [RESERVED, CONFIRMED], to: RELEASED)
    releaseStock(ReleaseStockInput) StockReservation[]
          withEvents StockReleased
}
```

![ZDL aggregate class diagram and state machine](/assets/articles/sdd/event-storming-zdl-aggregate-and-state-machine.png)

While code is becoming cheap, there is something that last more than code and that is what we map an desing here:

- Data and its states
- APIs
- Events 

The OpenAPI and AsyncAPI contracts can be generated from ZDL.


## ZFL + ZDLs: One connected graph

ZFL + ZDLs make one connected graph, deterministically parseable.

You can use [zenwave-architecture](https://github.com/ZenWave360/zenwave-architecture) to deterministically build that graph or ask an LLM to reason about.

In Arcadia Editions we genertated a complete [Arcadia Event Catalog](https://arcadia-editions.github.io/arcadia-event-catalog) from this graph:

![EventCatalog generated from the ZFL and ZDL models of Arcadia Editions](/assets/articles/sdd/zfl-zdl-eventcatalog.webp)

How big is this spec? For the complete Arcadia Editions system, one business flow and 6 bounded contexts (modules in the modular monolith, or microservices), the [place-order-flow.zfl](https://github.com/arcadia-editions/arcadia-editions-architecture) plus the 6 ZDLs in [arcadia-editions-modulith-api](https://github.com/arcadia-editions/arcadia-editions-modulith-api) are:

| | Lines | of which comments |
|---|---:|---:|
| place-order-flow.zfl | 346 | 140 |
| 6 ZDLs, one per bounded context | 1,108 | 136 |
| **Total** | **1,454** | **276** |

- For a human: about 1,000 lines that read as code, without the boilerplate, plus the business rules in doc comments. Around 185 lines per bounded context.
- For an LLM: about 48 KB, roughly 12-14k tokens. Around 6-7% of a 200k context window, so the whole system spec fits in context with plenty of room left for code and conversation.

For comparison, the generated `orders-checkout-openapi.yml` alone is 356 lines, and it only covers the REST part of one bounded context.

## Next Pillar: Proving It

Because each ZDL has a state machine and ZFL links all of them into one flow, with compensations. In the next article we will explore if this will make it a good fit for [Formal verification in the age of agentic engineering](/articles/three-pillars-formal-verification/).

## Try it

- [github.com/arcadia-editions](https://github.com/arcadia-editions):
  - the ZFL in [arcadia-editions-architecture](https://github.com/arcadia-editions/arcadia-editions-architecture)
  - the ZFLs in [arcadia-editions-modulith-api](https://github.com/arcadia-editions/arcadia-editions-modulith-api)
- [Modular monolith with Kotlin + Spring Boot](https://github.com/arcadia-editions/arcadia-editions-modulith-service-kotlin) implementation built from from those models
- [zenwave-sdd](https://github.com/ZenWave360/zenwave-sdd): skills to draft ZFL from your discovery and one draft repo + ZDL per system from the ZFL
- [ZenWave Platform](https://www.zenwave360.io/zenwave-platform/) IDE plugins for editing and previewing ZFL and ZDL
- The [Arcadia Editions series](/articles/arcadia/) for the long version of every step here
