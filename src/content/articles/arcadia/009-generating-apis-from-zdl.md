---
title: "Generating OpenAPI and AsyncAPI from ZDL"
summary: "Once the Orders Checkout model is explicit, ZDL can generate the first complete draft of its API contracts. The same aggregate, commands, events, and decorators become OpenAPI for REST, AsyncAPI for published events, and a client-facing AsyncAPI view for the external messages this bounded context consumes."
date: 2026-07-02
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/009-generating-apis-from-zdl.png
featuredImageAlt: "OpenAPI and AsyncAPI generated from the Arcadia Orders Checkout ZDL model"
draft: true
---

In the previous article we turned the Orders Checkout scaffold into a real domain model. We named the aggregate, its lifecycle, the commands that move it through that lifecycle, and the events the bounded context publishes.

Now we let the model travel one step downstream.

Not into implementation yet. Into contracts.

This is where ZDL becomes especially practical. The same compact model that helped us reason about the domain can also generate the first complete draft of the APIs around that domain. OpenAPI for REST operations. AsyncAPI for published events. A client AsyncAPI view for the external messages this service consumes.

That draft is not a replacement for API design. It is the first version of the design, generated from the language we already agreed on.

## The model already knows the API shape

The Orders Checkout model contains four different kinds of API information:

- which plugins should generate which contract files
- which external APIs this bounded context depends on
- which service commands are exposed through REST
- which service commands and events participate in AsyncAPI

That is enough for ZenWave SDK to produce a complete first pass.

The important thing is that API shape is not invented later in disconnected YAML files. It starts in the same place as the domain language.

## Configuring the generators

The `config` section is where the model says what should be generated.

For Orders Checkout we want three API artifacts:

```zdl
config {
    id "urn:com.arcadiaeditions.orders.checkout"
    title "Arcadia Editions - Orders Checkout"
    basePackage "com.arcadiaeditions.orders.checkout"

    plugins {
        ZDLToAsyncAPIPlugin {
            schemaFormat avro
            idType integer
            idTypeFormat int64
            avroPackage com.arcadiaeditions.orders.checkout.events.avro
            includeCloudEventsHeaders true
            includeKafkaCommonHeaders true
            targetFile "./asyncapi.yml"
        }

        ZDLToAsyncAPIClientPlugin {
            id "urn:com.arcadiaeditions.orders.checkout:client"
            title "Arcadia Editions - Orders Checkout - AsyncAPI Client"
            targetFile "./asyncapi-client.yml"
        }

        ZDLToOpenAPIPlugin {
            idType integer
            idTypeFormat int64
            targetFile "./openapi.yml"
        }
    }
}
```

`ZDLToOpenAPIPlugin` generates the REST contract. In this service that means `openapi.yml`.

`ZDLToAsyncAPIPlugin` generates the provider-side AsyncAPI contract for the messages Orders Checkout owns. In this model that means the domain events it publishes: `OrderCreated`, `StockUnavailable`, `OrderConfirmed`, and `OrderCancelled`.

`ZDLToAsyncAPIClientPlugin` generates a client-oriented AsyncAPI contract for the messages this service consumes from other bounded contexts. That gives the implementation side a clear view of the incoming event-driven surface without mixing it into the provider contract.

The Avro and header options are also part of the API design. They say that event payload schemas should be generated in Avro form, and that the AsyncAPI contract should include CloudEvents and common Kafka headers. Those are not domain rules, but they are still architectural decisions worth making explicit.

## Declaring external APIs

Orders Checkout does not live alone. It reacts to other bounded contexts.

That is what the `apis` section is for:

```zdl
apis {
    asyncapi client PaymentsProcessingApi "https://raw.githubusercontent.com/arcadia-editions/payments-processing-api/main/asyncapi.yml"
    asyncapi client CatalogInventoryApi "https://raw.githubusercontent.com/arcadia-editions/catalog-inventory-api/main/asyncapi.yml"
}
```

This tells the model that Orders Checkout is a client of those AsyncAPI contracts.

That matters because consuming a third-party event is not the same thing as exposing a command we own. A bounded context is the provider of its own behavior and the client of behavior owned elsewhere.

So when we later write this:

```zdl
@asyncapi(api: PaymentsProcessingApi, channel: PaymentAuthorizedChannel)
@transition(from: CREATED, to: CONFIRMED)
confirmOrder(ConfirmOrderInput) Order withEvents OrderConfirmed
```

we are saying something precise:

Orders Checkout handles `confirmOrder` when it receives a message from the `PaymentAuthorizedChannel` defined by the Payments Processing API. The command belongs to Orders Checkout, but the triggering fact comes from another bounded context.

That is a small annotation, but it carries a lot of architecture.

## Generating OpenAPI from REST decorators

REST starts at the service level.

```zdl
@rest("/orders")
service OrdersCheckoutService for (Order) {

    @post
    @transition(to: CREATED)
    startOrderCheckout(StartOrderCheckoutInput) Order withEvents [OrderCreated | StockUnavailable]
}
```

`@rest("/orders")` gives the service a base path.

`@post` exposes `startOrderCheckout` as a REST operation. Since this is a create-style command, `POST /orders` is a natural first draft. The input type becomes the request body. The returned `Order` becomes the response schema.

The input itself is still modeled in ZDL:

```zdl
input StartOrderCheckoutInput {
    items String[] minlength(1)
}
```

From that, the OpenAPI generator has enough information to create a request schema with an `items` array and validation metadata.

ZDL gives us more REST decorators when the API needs them:

- `@get` for read operations
- `@post` for create commands or search-style operations
- `@put` for replacement updates
- `@patch` for partial updates
- `@delete` for delete operations
- `@paginated` for paginated list responses
- `@fileupload` and `@filedownload` for binary payloads

They can be used in shorthand form, like `@get("/{orderId}")`, or with options such as `path`, `status`, `params`, and `operationId`.

For this first Orders Checkout API, we only need one REST entry point: start the checkout. The rest of the workflow is event-driven.

## Generating AsyncAPI from events

Events are modeled separately from commands because they mean something different.

A command asks the system to do something. An event says something already happened.

The Orders Checkout model publishes its own facts:

```zdl
@asyncapi({ channel: "OrderCreatedChannel", topic: "orders.events.order-created" })
event OrderCreated {
    orderId String
    version Integer
}

@asyncapi({ channel: "OrderConfirmedChannel", topic: "orders.events.order-confirmed" })
event OrderConfirmed {
    orderId String
    version Integer
    confirmedAt Instant
}
```

The `@asyncapi` decorator gives each event a channel and a topic. From that, the generator can create the AsyncAPI schema, message, channel, and send operation.

But there is an important rule: only emitted events belong in the generated provider AsyncAPI contract.

Defining an event type is not enough. The event must be connected to a command with `withEvents`:

```zdl
startOrderCheckout(StartOrderCheckoutInput) Order withEvents [OrderCreated | StockUnavailable]
confirmOrder(ConfirmOrderInput) Order withEvents OrderConfirmed
cancelOrder(CancelOrderInput) Order withEvents OrderCancelled
```

This keeps the contract honest. The service only publishes events that its own commands can actually emit.

## Decorating async inputs

The same `@asyncapi` decorator is used for incoming messages, but the meaning changes depending on whether we reference an external API.

Here Orders Checkout listens to facts from other bounded contexts:

```zdl
@asyncapi(api: PaymentsProcessingApi, channel: PaymentAuthorizedChannel)
@transition(from: CREATED, to: CONFIRMED)
confirmOrder(ConfirmOrderInput) Order withEvents OrderConfirmed

@asyncapi(api: CatalogInventoryApi, channel: StockReleasedChannel)
@transition(from: [CREATED, CONFIRMED], to: CANCELLED)
cancelOrder(CancelOrderInput) Order withEvents OrderCancelled
```

Because both annotations specify `api`, Orders Checkout is acting as a client of those APIs. It consumes messages from Payments Processing and Catalog Inventory.

If there were no external `api`, then the command would be part of the API Orders Checkout provides. That is the distinction between provider and client:

- a provider consumes commands addressed to it and publishes its own domain events
- a client consumes events or sends commands defined by another bounded context

That distinction keeps the generated AsyncAPI files clean. Provider contracts describe what this service owns. Client contracts describe what this service depends on.

## The decorator vocabulary

At this point the model has a small but expressive API vocabulary:

- `@rest("/orders")` says a service has a REST surface.
- `@get`, `@post`, `@put`, `@patch`, and `@delete` say how a service command appears in OpenAPI.
- `@asyncapi({ channel, topic })` on an event says how this bounded context publishes a fact.
- `@asyncapi(api: SomeExternalApi, channel: SomeChannel)` on a command says the command is triggered by a message from another API.
- `@transition` keeps the API operation tied to the aggregate lifecycle.
- `withEvents` connects commands to the facts they may publish.

That last pair matters. The API is not only a transport description. It is attached to the behavior of the model. A REST operation or async listener is not floating outside the domain; it is connected to a command, a state transition, and the events that can follow.

## The first draft is complete, not final

After generation, Orders Checkout has three useful contract artifacts:

- `openapi.yml` for the REST operation that starts checkout
- `asyncapi.yml` for the domain events Orders Checkout publishes
- `asyncapi-client.yml` for the external messages Orders Checkout consumes

That is already a complete draft. It has operations, schemas, messages, channels, topics, and the vocabulary of the domain.

But it is still a draft.

This is the moment to review names, payloads, channels, status codes, error shapes, headers, and compatibility rules. ZDL gets us to a coherent first version quickly. API review turns that first version into a stable contract.

The important point is the direction of travel.

We did not start by hand-writing YAML and then try to remember which business rule it came from. We started with the model: aggregate, commands, transitions, events. The generated API contracts preserve that model as it moves into OpenAPI, AsyncAPI, Avro schemas, adapters, documentation, and tests.

Generation does not replace design. It preserves design once we have made it explicit.
