---
title: "Arcadia Architecture Manifest meets Event Catalog"
summary: "The architecture manifest is an index of every domain, service and contract, but most people will never open that YAML file. EventCatalog is the website that shows the same index. A generator collects the pages from the APIs that the teams already publish, and a release pipeline keeps the website current."
date: 2026-08-18
tags:
  - arcadia
  - eda
  - EventCatalog
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/012-arcadia-architecture-manifest-meets-event-catalog.jpg
featuredImageAlt: "The Arcadia architecture manifest shown as an Event Catalog of domains, services, and events"
draft: false
---

The [master YAML](/articles/arcadia/011-master-yaml-architecture-manifest) is the file that records the Arcadia architecture. Its name is `zenwave-architecture.yml`, and it is a good file for tools, but most people in the company will never open it.

The file is an index: it lists the domains, the services, and the pointers to the contracts. A tool can read that without any problem. A product manager cannot use it to see who publishes `OrderConfirmed`. A new engineer cannot use it to compare Checkout and Payments. For that, the company needs a website that shows the same data.

There is no need to write a second architecture in a wiki, or to maintain catalog pages by hand. The [Event Catalog generator](https://www.zenwave360.io/zenwave-sdk/plugins/event-catalog-generator/) reads `zenwave-architecture.yml`, follows the contracts that the file points to, and writes an [EventCatalog](https://www.eventcatalog.dev/) website from them.

The live website is [arcadia-editions.github.io/arcadia-event-catalog](https://arcadia-editions.github.io/arcadia-event-catalog/).

## The catalog shows the manifest

The generator does not create a new model of the company. It shows the model that you already have.

It takes the sources in this way:

- Domains, subdomains and services come from the YAML tree.
- Events, commands, queries, channels and entities come from the AsyncAPI, OpenAPI and ZDL files of each service.
- The service documents (`SUMMARY`, catalog notes, `CHANGELOG`) become the text on the service page.
- The `consumers` list shows which service receives an event.

The full mapping is in [From Architecture Manifest to EventCatalog](https://www.zenwave360.io/posts/From-Architecture-Manifest-to-EventCatalog/). This article does not repeat that mapping. The catalog is not a second set of documents. It is the manifest, in a form that people can browse.

![Orders Checkout in the generated Event Catalog](/assets/articles/arcadia-editions/012-orders-checkout-service.png)

Orders Checkout is the same service that appears in [the manifest](https://github.com/arcadia-editions/arcadia-editions-architecture/blob/main/zenwave-architecture.yml). The page uses the service documents, the OpenAPI file, the AsyncAPI file, and the events that the service sends and receives. Nobody wrote that page in EventCatalog by hand.

## Collect the APIs that you already have

Arcadia treats API contracts as products. Each API repository already contains a ZDL model, an OpenAPI file, a provider AsyncAPI file, a client AsyncAPI file, and the documents that belong to those files.

[Treat Your Domain Models and APIs as Products](/articles/arcadia/010-treat-your-service-apis-as-products) describes the quality, the versions and the publication.

The Event Catalog generator collects those files into one website. There is no need to copy channels into MDX, or to keep a second list of consumers for `OrderConfirmed`. The generator reads the files that the teams already release.

Orders Checkout publishes `OrderConfirmed`. Fulfillment Shipping is a consumer of that contract, and the event page shows the two services.

![OrderConfirmed event with producer and consumer in the generated catalog](/assets/articles/arcadia-editions/012-order-confirmed-event.png)

Checkout owns the event. Fulfillment does not get a second copy of the channel. The catalog only points to the owner.

## A release updates the catalog

The catalog should not be updated by hand. It should change when a team releases an API.

The process uses three repositories, and each one has one task.

1. An API repository such as [orders-checkout-api](https://github.com/arcadia-editions/orders-checkout-api) starts [`artifact-release.yml`](https://github.com/arcadia-editions/orders-checkout-api/blob/main/.github/workflows/artifact-release.yml). That file calls the shared [`api-product-workflows` artifact-release](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/artifact-release.yml). The shared workflow publishes the artifact, and then it sends an `artifact-released` event to the architecture repository, with the repository name, the artifact identifier, and the version.
2. [arcadia-editions-architecture](https://github.com/arcadia-editions/arcadia-editions-architecture) receives the event in [`update-architecture-manifest.yml`](https://github.com/arcadia-editions/arcadia-editions-architecture/blob/main/.github/workflows/update-architecture-manifest.yml). The workflow writes the new versions into `zenwave-architecture.yml`, and then it sends an `api-updated` event to the catalog repository. That event also includes `artifactId`, `artifactIds`, and `version`.
3. [arcadia-event-catalog](https://github.com/arcadia-editions/arcadia-event-catalog) runs [`update-catalog.yml`](https://github.com/arcadia-editions/arcadia-event-catalog/blob/main/.github/workflows/update-catalog.yml). The workflow generates the EventCatalog files from the GitHub URL of the manifest, verifies the result, opens a pull request, and publishes the website.

![From an API release to a rebuilt Event Catalog](/assets/articles/arcadia-editions/012-release-to-catalog-pipeline.svg)

The catalog repository keeps the generated MDX in `event-catalog-content/`, and the EventCatalog application in `site/`. The generator can replace the content folder, but it does not delete the application or the workflows.

The catalog changes because a team released an API, not because somebody remembered to rebuild it.

## The generator rebuilds all pages today

In this first version, the last step rebuilds the full catalog. `update-catalog.yml` loads the whole manifest, follows each pointer, and writes each page again.

The `api-updated` event already names the artifact and the version that changed, and the architecture workflow already updates only that service in the manifest. The generator does not use that limit yet.

A later version will generate only the domain, subdomain, service and APIs that changed, and it will not rewrite the other files in `event-catalog-content/`.

The three repositories will stay the same. Only the catalog step will become more specific.

## Related pages

The generator [creates catalog pages from the APIs that you already have](https://www.zenwave360.io/zenwave-sdk/plugins/event-catalog-generator/). The release pipeline keeps the website aligned with the last published version.

For the internals of the generator, read [From Architecture Manifest to EventCatalog](https://www.zenwave360.io/posts/From-Architecture-Manifest-to-EventCatalog/). For the live website, open the [Arcadia Event Catalog](https://arcadia-editions.github.io/arcadia-event-catalog/).
