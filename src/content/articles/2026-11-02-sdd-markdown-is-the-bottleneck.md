---
title: "Spec-Driven Development: Reading Markdown is the bottleneck"
summary: "I believe that reading Markdown at the speed and amount that LLMs are able to generate is impossible and will be the main bottleneck in designing systems in the agentic era."
date: 2026-11-02
tags:
  - zenwave
  - architecture
  - ddd
  - ai
featured: false
featuredImage: assets/articles/sdd/markdown-is-the-bottleneck-featured.webp
featuredImageAlt: Mapping Event Storming to ZenWave Domain Language
readingTime: "3 min read"
draft: false
---

A question for those of you that use spec-driven development (SDD) to build software: how do you manage to read all the Markdown files that your LLM generates while it creates the specifications?

I find it exhausting. Most of the time I find it impossible. And when I don't read everything, decisions slip into the implementation as if I had already approved them. And I only find out when testing that the decision was already marked as approved in some Markdown file somewhere, and the agent took it as gospel :-O

And yes, AI interviews like [Matt Pocock's Grill with Docs](https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md) can help **a lot** with disambiguating and creating a shared understanding, but I still find many functional and architectural decisions slip in.

And it's becoming nearly impossible to keep up with LLMs' verbosity.

## You can't read at the speed an LLM writes

I believe that reading Markdown at the speed and amount that LLMs are able to generate is impossible and will be the main bottleneck in designing systems in the agentic era.

## A language for decisions, not for prose

4 years ago I created [a domain-specific language for describing microservices](https://www.zenwave360.io/docs/event-driven-design/zenwave-domain-language/). I created this DSL to let me think about software and talk about software and then generate all the boring parts that were already present in the DSL.

Currently this code generator, if it matches your technical stack, is still more effective and efficient than asking an LLM to implement what this DSL describes. But models improve, and I don't expect it to stay more effective and efficient forever. Even without the SDK, ZenWave Domain Language is still a better way to describe and validate backend services than Markdown prose.

It is concise, it's developer-friendly, it reads as a compact programming language, and it holds all your domain's Ubiquitous Language along with all the structure of the Domain-Driven Design building blocks: aggregates, entities, relationships, services, commands and domain events.

It even connects to your APIs like OpenAPI and AsyncAPI using decorators. I cannot even remember the last time I wrote an API in YAML instead of using ZDL Domain Language as a concise IDL.

The `Order` entity is defined in the same file; this is just the service and events part.

```zdl
/**
 * Order Application Service
 */
@rest("/orders")
service OrderService for (Order) {

    /** Customer places an order */
    @post
    @transition(to: PLACED)
    placeOrder(PlaceOrderInput) Order withEvents OrderPlaced

    /** Set Order as paid */
    @post("/{orderNumber}/pay")
    @transition(from: PLACED, to: PAID)
    payOrder(@natural id, PayOrderInput) Order withEvents OrderPaid

    /** Set Order as shipped */
    @post("/{orderNumber}/ship")
    @transition(from: PAID, to: SHIPPED)
    shipOrder(@natural id, ShipOrderInput) Order withEvents OrderShipped

    /** Set Order as cancelled */
    @post("/{orderNumber}/cancel")
    @transition(from: [PLACED, PAID], to: CANCELLED)
    cancelOrder(@natural id) Order withEvents OrderCancelled

    /** Query order */
    @get("/{orderNumber}")
    getOrder(@natural id) Order?
}

/**
 * Domain Events
 */
@copy(Order)
@asyncapi({ channel: "OrdersPlacedChannel", topic: "orders.placed" })
event OrderPlaced {
    id Long
    version Integer
}

@copy(Order)
@asyncapi({ channel: "OrdersPaidChannel", topic: "orders.paid" })
event OrderPaid {
    id Long
    version Integer
}

// OrderShipped and OrderCancelled omitted
```

From the above DSL you can derive two full APIs:

- [Order Fulfillment OpenAPI](https://github.com/ZenWave360/zenwave-playground/blob/main/examples/order-fulfillment-kotlin/src/main/resources/public/apis/openapi.yml): 291 lines of yaml
- [Order Fulfillment AsyncAPI](https://github.com/ZenWave360/zenwave-playground/blob/main/examples/order-fulfillment-kotlin/src/main/resources/public/apis/asyncapi.yml): with 302 lines of yaml

## And it's not only for humans

And it's not only for human experts. For at least a couple of years now, LLMs have been able to read and understand ZDL without any previous training on my side, just because it is public and moreover because it says what it represents... plainly.

And because it has a very specific grammar and some examples, they can also write it and reason about it. If LLMs are good at something, it is at holding lots of context in memory and cross-understanding what we humans can only get by going back and forth around docs and source code.

When I was almost about to discontinue my efforts on ZenWave SDK and its first DSL, the ZenWave Domain Language, I came to realize that it's the best tool of the whole toolkit.

## One bounded context at a time is not enough

But designing or understanding one bounded context at a time is not enough in this day and age of Agentic Engineering and the big design upfront required to take full advantage of agentic loops and Spec-Driven Development.

We need a new companion language that can join together several bounded contexts in one or many business workflows. So stay tuned for the [next article](/articles/sdd-from-event-storming-to-a-model-your-agents-can-read/), because we are going to bring some structured output to process-level Event Storming workshops.
