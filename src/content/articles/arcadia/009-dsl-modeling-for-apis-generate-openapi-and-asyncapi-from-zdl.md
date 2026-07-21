---
title: "DSL Modeling for APIs: Generate OpenAPI and AsyncAPI from ZDL"
summary: "Writing YAML by hand is no fun, but you can generate your OpenAPI and AsyncAPI definition files from a Domain Specific Language instead. With ZenWave SDK you convert a compact ZDL model into those contracts, saving time and effort while keeping your APIs aligned with best practices and standards."
date: 2026-07-21
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/009-dsl-modeling-for-apis-generate-openapi-and-asyncapi-from-zdl.png
featuredImageAlt: "OpenAPI and AsyncAPI generated from the Arcadia Orders Checkout ZDL model"
draft: false
---

Turning ZDL into APIs was one of the first things ZenWave SDK ever did, back when we still wrote all of it by hand. The idea was that you spend your time modeling the domain and then let the APIs come out of that model, because an API contract is structured information too, and going from one structure to another is the kind of work a generator should be doing instead of you. And since a DSL is built to be compact, it says far more with far less than YAML ever will. Friends don't let friends write YAML by hand.

The capability grew release after release, funded by the time it kept saving us. Somewhere along the way it became simpler to teach the toolkit a new feature than to keep writing it out by hand, whether that was file upload and download or any of the other niche corners of these specs. Because if you write it by hand you write it by hand every time, but once it lives in the DSL and the tooling you have solved it for every iteration that comes after.

Today it covers almost everything you need in a normal enterprise application, and when you want to shape the output beyond that, OpenAPI overlays are right there to do it, which keeps everything easy to sync. You edit the model and you generate, and if there is something you need to change, you don't reach in and change it by hand, you write an overlay and it lands on top of whatever was generated for you.

None of this is really surprising once you see what is going on underneath. We are only generating structured things out of other structured things, and it works so well because they are mostly mirrors of each other. The DSL ends up being a mirror of what the application already is, an internal model on one side and the external APIs on the other, the two almost reflections.

## Everything the API needs is already in the model

At this point the model already carries most of what an API needs. We know the shape of the aggregate, its entities and the trees they form, and the value objects that live inside them. We know the commands that expose actions to the outside world, and we know the domain events, the ones we publish and the ones we react to. All of that is already written down.

Adding a few annotations to the model, marking the `rest` and `async` patterns, does two things at once. They document how these internal concepts connect to the external world of the APIs, and from the same annotations we generate a complete draft of those APIs.

## Configuring the generators

Everything we show from here on is part of one file, the [domain-model.zdl](https://github.com/arcadia-editions/orders-checkout-api/blob/main/domain-model.zdl) for Orders Checkout. The `config` section is where the model says what should be generated.

For Orders Checkout we want three API artifacts:

```zdl
config {
    id "urn:com.arcadiaeditions:orders:checkout"
    title "Arcadia Editions - Orders Checkout"
    basePackage "com.arcadiaeditions.orders.checkout"

    plugins {
        /** Generates an AsyncAPI v3 specification from this ZDL model. */
        ZDLToAsyncAPIPlugin {
            id "urn:com.arcadiaeditions:orders:checkout:asyncapi"
            applicationExtensions """
            x-application-bindings:
              x-principal: orders_checkout
              x-clientId: orders_checkout
              x-groupId: orders_checkout
            """
            schemaFormat avro
            idType integer
            idTypeFormat int64
            avroPackage com.arcadiaeditions.orders.checkout.events.avro
            includeCloudEventsHeaders true
            includeKafkaCommonHeaders true
            asyncapiOverlayFiles "https://raw.githubusercontent.com/arcadia-editions/api-contract-commons/refs/heads/main/asyncapi-overlay.yml"
            targetFile "./asyncapi.yml"
        }
        ZDLToAsyncAPIClientPlugin {
            id "urn:com.arcadiaeditions:orders:checkout:asyncapi:client"
            applicationExtensions """
            x-application-bindings:
              x-principal: orders_checkout
              x-clientId: orders_checkout
              x-groupId: orders_checkout
            """
            title "Arcadia Editions - Orders Checkout - AsyncAPI Client"
            asyncapiOverlayFiles "https://raw.githubusercontent.com/arcadia-editions/api-contract-commons/refs/heads/main/asyncapi-client-overlay.yml"
            targetFile "./asyncapi-client.yml"
        }
        /** Generates an OpenAPI 3.0 specification from this ZDL model. */
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

You will also notice the `applicationExtensions` block. Those are extra pieces of information we attach to the application itself, like the principal, the client id and the group id, and they get carried into the generated contract as extensions. On their own they are just metadata sitting in the file, but they become useful once an overlay reads them to fill in other parts of the spec, for example the Kafka bindings.

That is what `asyncapiOverlayFiles` is for. An overlay is where you customize the generated contract without editing the generator, following the OpenAPI Overlay specification, and ZDL applies the same idea to AsyncAPI. For Orders Checkout the overlays live with the rest of the shared contract tooling, [asyncapi-overlay.yml](https://github.com/arcadia-editions/api-contract-commons/blob/main/asyncapi-overlay.yml) for the provider contract and [asyncapi-client-overlay.yml](https://github.com/arcadia-editions/api-contract-commons/blob/main/asyncapi-client-overlay.yml) for the client one.

## Declaring external APIs

Orders Checkout does not work in isolation, it reacts to what happens in other bounded contexts.

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
@asyncapi(api: PaymentsProcessingApi, channel: "payment-authorized-event-v1")
@transition(from: CREATED, to: CONFIRMED)
confirmOrder(ConfirmOrderInput) Order withEvents OrderConfirmed
```

we are saying something precise:

Orders Checkout handles `confirmOrder` when it receives a message from the `payment-authorized-event-v1` channel defined by the Payments Processing API. The command belongs to Orders Checkout, but the triggering fact comes from another bounded context.

All of that is captured in one small annotation.

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

```zdl
@get({path: "/somepath", status: 200, params: {search: String}, operationId: "someOperationId"})
```

For this first Orders Checkout API, we only need one REST entry point: start the checkout. The rest of the workflow is event-driven.

## Generating AsyncAPI from events

Events are modeled separately from commands because they mean something different.

A command asks the system to do something. An event says something already happened.

The Orders Checkout model publishes its own facts:

```zdl
@asyncapi({ channel: "order-created-event-v1", topic: "orders-checkout.order-created.event.avro.v1" })
event OrderCreated {
    orderId String
    version Integer
}

@asyncapi({ channel: "order-confirmed-event-v1", topic: "orders-checkout.order-confirmed.event.avro.v1" })
event OrderConfirmed {
    orderId String
    version Integer
    confirmedAt Instant
}
```

The `@asyncapi` decorator gives each event a channel and a topic, and both follow the naming convention we use across Arcadia Editions. The channel is the event name in kebab case with a version suffix, like `order-created-event-v1`, and the topic spells the same thing out in full, `orders-checkout.order-created.event.avro.v1`, which reads as the owning bounded context, the event itself, the kind of message, the payload format, and the schema version. From that, the generator can create the AsyncAPI schema, message, channel, and send operation.

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
@asyncapi(api: PaymentsProcessingApi, channel: "payment-authorized-event-v1")
@transition(from: CREATED, to: CONFIRMED)
confirmOrder(ConfirmOrderInput) Order withEvents OrderConfirmed

@asyncapi(api: CatalogInventoryApi, channel: "stock-released-event-v1")
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

That last pair is what ties everything together. The API here is not just a transport description, it is attached to the behavior of the model, so a REST operation or an async listener is never floating on its own, it is connected to a command, a state transition, and the events that can follow.

## The first draft is complete, not final

After generation, Orders Checkout has three useful contract artifacts:

- [`openapi.yml`](https://github.com/arcadia-editions/orders-checkout-api/blob/main/openapi.yml) for the REST operation that starts checkout
- [`asyncapi.yml`](https://github.com/arcadia-editions/orders-checkout-api/blob/main/asyncapi.yml) for the domain events Orders Checkout publishes
- [`asyncapi-client.yml`](https://github.com/arcadia-editions/orders-checkout-api/blob/main/asyncapi-client.yml) for the external messages Orders Checkout consumes

That is already a complete draft. It has operations, schemas, messages, channels, topics, and the vocabulary of the domain.

But it is still a draft, and this is the moment to review names, payloads, channels, status codes, error shapes, headers, and compatibility rules. ZDL gets us to a coherent first version quickly, and API review turns that first version into a stable contract.

What matters is the direction we worked in. We did not start by hand-writing YAML and then try to remember which business rule it came from. We started with the model, its aggregate, commands, transitions and events, and the generated API contracts preserve that model as it moves into OpenAPI, AsyncAPI, Avro schemas, adapters, documentation, and tests.

Generation does not do the design for you. It just keeps the design you already made from getting lost on the way down.
