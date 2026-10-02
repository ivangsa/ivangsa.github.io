---
title: "Provisioning Infrastructure with Terraform from AsyncAPI"
summary: "Your AsyncAPI file already says which topics, schemas and permissions a service needs. ZenWave AsyncAPI Ops turns that into Terraform, and two pipelines put it to work: merging to develop provisions the development environment, and a release packs the Terraform so the same files can be promoted later to pre and prod."
date: 2026-10-02
tags:
  - arcadia
  - eda
  - ddd
  - zenwave
featured: false
featuredImage: assets/articles/arcadia-editions/013-infrastructure-provisioning-asyncapi-terraform.png
featuredImageAlt: "From an AsyncAPI file to Terraform, applied to develop on merge and promoted to pre and prod from a release"
draft: true
---

In Arcadia every service that talks Kafka has an AsyncAPI file. This file already says which topics the service owns, how many partitions they have, which Avro schemas go inside each message, and which topics the service reads from other teams.

That is all the information you need to create the infrastructure, so we don't want anybody writing it a second time in Terraform by hand and then keeping both files in sync forever.

With the [ZenWave AsyncAPI Ops plugin](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-ops/) the AsyncAPI file is the source, and Terraform is just one more thing that we generate from it, in the same way we generate code, docs or the [Event Catalog](/articles/arcadia/012-arcadia-architecture-manifest-meets-event-catalog).

## What the generator creates

The plugin reads one or more AsyncAPI files and writes a folder with Terraform files:

- `topics.tf` with the Kafka topics that the service owns, plus their retry and dead letter topics.
- `schemas.tf` with the Avro subjects for the Schema Registry.
- `acls.tf` with the read and write permissions, which come from the `send` and `receive` operations.
- The service account for the service, when you use `serviceAccountMode=managed`.
- The Avro schemas, bundled so Terraform can upload them.

It knows which topics belong to the service because they are declared inline with an `address`. Channels that come with a `$ref` from another team's API are dependencies, so for those it only creates the ACLs to read them, and never the topic. This is why in Arcadia we pass both files together, `asyncapi.yml` with what the service publishes and `asyncapi-client.yml` with what it consumes.

This is how a channel looks in [orders-checkout-api](https://github.com/arcadia-editions/orders-checkout-api), and the topic size comes from a shared trait that every team can reuse:

```yaml
channels:
  order-created-event-v1:
    address: orders-checkout.order-created.event.avro.v1
    messages:
      OrderCreatedEvent:
        $ref: "#/components/messages/OrderCreatedEvent"
    x-traits:
    - $ref: https://raw.githubusercontent.com/arcadia-editions/api-contract-commons/refs/heads/main/asyncapi-channel-traits.yml#/components/channelTraits/kafkaTopicS
```

And this is the command that the pipeline runs, more or less:

```bash
jbang zw -p AsyncAPIOpsGeneratorPlugin \
  apiFiles=asyncapi.yml,asyncapi-client.yml \
  templates=TerraformConfluent \
  serviceAccountMode=managed \
  server=develop \
  targetFolder=target/terraform
```

The `server` option chooses which entry of `x-env-server-overrides` the generator applies on top of the Kafka bindings. This is the `kafkaTopicS` trait from [api-contract-commons](https://github.com/arcadia-editions/api-contract-commons/blob/main/asyncapi-channel-traits.yml):

```yaml
kafkaTopicS:
  bindings:
    kafka:
      partitions: 3
      replicas: 3
      x-env-server-overrides:
        dev:
          partitions: 1
          replicas: 1
        staging:
          partitions: 3
          replicas: 2
```

So the same topic gets one partition with `server=dev`, and three partitions with `server=staging` or with any other server, like production, that has no override. For Arcadia we use Confluent Cloud, but there are also templates for plain Kafka with an open source Schema Registry.

Cluster IDs, endpoints and credentials never go inside the AsyncAPI file. The pipeline injects them from GitHub secrets and variables, and a small shared overlay in [`terraform/common`](https://github.com/arcadia-editions/api-product-workflows/tree/main/terraform/common) adds the provider configuration and some safe defaults.

## Two different rhythms

Once we can generate Terraform, we still need to decide when to apply it and where, and development and production don't move at the same speed. In development you want to see your new topic as soon as you merge, because you are going to test against it this afternoon. But in production you want to apply only what was released, and only when somebody decides it is time.

So in [api-product-workflows](https://github.com/arcadia-editions/api-product-workflows) we have one path for `develop` and another one for releases:

| When | What happens | Workspace |
| --- | --- | --- |
| You push to any branch or open a PR | Generate and `terraform plan`, nothing is applied | `<repo>-develop` |
| You merge to `develop` | Generate, plan and apply | `<repo>-develop` |
| You release `asyncapi-all` | Generate from the release tag, validate, zip and attach to the GitHub release | none |
| You promote a release | Download the zip and apply it | `<repo>-pre`, then `<repo>-prod` |

Every service has one Terraform Cloud workspace per environment, and the name is always the repository name plus the environment.

<!-- SCREENSHOT: HCP Terraform (app.terraform.io) > your organization > Workspaces. Filter by "orders-checkout-api" so the list shows orders-checkout-api-develop, -pre and -prod with their last run status. pre/prod only exist after the first promotion. -->
![Terraform Cloud workspaces for orders-checkout-api, one per environment](/assets/articles/arcadia-editions/013-terraform-cloud-workspaces.png)

## Merge to develop, and develop is provisioned

Service repositories don't need a special workflow for this. Their normal [`artifact-ci.yml`](https://github.com/arcadia-editions/orders-checkout-api/blob/main/.github/workflows/artifact-ci.yml) calls the shared [`artifact-ci.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/artifact-ci.yml), the same one that validates the APIs, and this one has two extra jobs for Kafka.

First it looks at what changed in the commit, and if an `asyncapi` or `asyncapi-client` artifact changed, or any `.avsc` file in the repository, it selects all the Kafka contracts of that service as one unit.

Then the `kafka-plan` job runs [`provision-kafka-plan.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/provision-kafka-plan.yml). It asks the [architecture manifest](/articles/arcadia/011-master-yaml-architecture-manifest) which AsyncAPI files belong to this repository, generates the Terraform and makes a plan against the develop workspace. This happens in every branch and every pull request, so a reviewer can see what is going to change before the merge.

<!-- SCREENSHOT: open a PR to develop in orders-checkout-api that adds or changes a channel in asyncapi.yml. In the PR "Checks" tab open "API-first artifact validation", job "validate / Provision Kafka (plan)", and expand the "Terraform plan" step. Capture the end of the plan with the confluent_kafka_topic / confluent_schema / confluent_kafka_acl resources and the "Plan: N to add, 0 to change, 0 to destroy" line. -->
![Terraform plan for a new event in a pull request](/assets/articles/arcadia-editions/013-pr-terraform-plan.png)

When the push is on the `develop` branch, a second job, `kafka-develop`, runs [`provision-kafka-develop.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/provision-kafka-develop.yml). It does the same generation and plan, and then it applies, with no approval:

```yaml
# No approval gate: a successful plan against develop applies immediately.
- name: Terraform apply
  run: terraform apply -auto-approve tfplan
```

<!-- SCREENSHOT: merge that PR into develop. In GitHub > orders-checkout-api > Actions, open the "API-first artifact validation" run for the push to develop. Capture the run graph with validate -> Provision Kafka (plan) -> Provision Kafka (develop) all green. Optionally a second capture of the "Terraform apply" step expanded showing "Apply complete! Resources: N added". -->
![Merge to develop runs validation, plan and apply](/assets/articles/arcadia-editions/013-develop-apply-run.png)

We do this on purpose, because develop is where we want fast feedback: you merge your new event into `develop`, and some minutes later the topic, the schema and the ACLs exist in the development cluster.

<!-- SCREENSHOT: Confluent Cloud > Environments > default > arcadia_editions_cluster > Topics. Search "orders-checkout." so the list shows the owned event topics (and their retry / DLQ topics if any) with their partition count. -->
![Topics of orders-checkout in Confluent Cloud](/assets/articles/arcadia-editions/013-confluent-topics.png)

<!-- SCREENSHOT: Confluent Cloud > Environments > default > Schema Registry (Data contracts). Search "OrderCreatedEvent" or "orders-checkout" and open the subject, showing the Avro schema and its version. -->
![The OrderCreatedEvent schema in Schema Registry](/assets/articles/arcadia-editions/013-confluent-schema.png)

<!-- SCREENSHOT: Confluent Cloud > Accounts & access > Service accounts > the orders_checkout service account > Access / ACLs (or Cluster > Cluster settings > ACLs filtered by that principal). Show WRITE on the owned orders-checkout.* topics and READ on the topics consumed from other teams, plus the consumer group ACL. -->
![ACLs generated for the orders_checkout service account](/assets/articles/arcadia-editions/013-confluent-acls.png)

The apply also records a Terraform output called `provisioned_from` with the value `develop@<commit sha>`, so you can always ask the workspace which commit it was built from.

<!-- SCREENSHOT: HCP Terraform > orders-checkout-api-develop > Overview (or States > latest state > Outputs). Capture the Outputs panel with provisioned_from = develop@<sha>, next to kafka_cluster_id and schema_registry_id. -->
![provisioned_from output in the develop workspace](/assets/articles/arcadia-editions/013-tfc-develop-outputs.png)

## Release, and the Terraform is packed

For production we don't regenerate anything at deploy time, because then what you deploy could be different from what you tested.

When a team releases its Kafka contracts with [`artifact-release.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/artifact-release.yml) and `artifact=asyncapi-all`, the release job publishes the API as usual and creates the tag `release/asyncapi-all/vX`. After that, a job called `release-kafka` calls [`provision-kafka-release.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/provision-kafka-release.yml), which:

1. Checks out the service at that exact release tag.
2. Generates the Terraform with the `prod` server profile.
3. Runs `terraform init -backend=false` and `terraform validate`, offline, without touching any cluster.
4. Writes a `RELEASE.json` with the version and the AsyncAPI files that are inside.
5. Zips everything as `<repo>-asyncapi-all-vX-terraform.zip` and attaches it to the GitHub release.

Nothing is applied in this step. The Terraform Cloud backend stays as a template, `cloud.tftpl`, with the workspace name still empty, because the bundle doesn't know yet where it will be applied, and that is why the same zip can go to `pre` today and to `prod` next week, once somebody approves it.

<!-- SCREENSHOT: run "Release API-first artifact or AsyncAPI bundle" in orders-checkout-api (Actions > Run workflow, artifact=asyncapi-all, version=X). When "Attach combined Terraform bundle" finishes, open GitHub > orders-checkout-api > Releases > "asyncapi-all vX" and capture the Assets list with the Maven JAR, its checksum and orders-checkout-api-asyncapi-all-vX-terraform.zip. -->
![The Terraform bundle attached to the asyncapi-all release](/assets/articles/arcadia-editions/013-release-terraform-asset.png)

## Promote from environment to environment

To apply a release, the service calls [`provision-kafka-promote.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/provision-kafka-promote.yml) by hand:

```yaml
jobs:
  promote-kafka:
    uses: arcadia-editions/api-product-workflows/.github/workflows/provision-kafka-promote.yml@main
    with:
      service_repo: orders-checkout-api
      target_env: pre        # or: prod
      version: "1.4.0"       # only for pre
    secrets: inherit
```

For `pre` you choose the version, and the workflow downloads the zip from that release, renders `cloud.tf` for the `<repo>-pre` workspace, plans, applies, and saves the version in `provisioned_from`.

For `prod` you cannot choose a version, and this is my favourite part. The workflow reads `provisioned_from` from the `pre` workspace and applies exactly that same release in `prod`, so prod can only receive what was already running in pre and the two environments cannot drift apart by mistake.

<!-- SCREENSHOT: needs a promote caller in orders-checkout-api (the snippet above, triggered by workflow_dispatch). Run it with target_env=pre and version=X, open the run and capture the job Summary: "Promoting orders-checkout-api AsyncAPI bundle to pre", "currently applied: (none yet)", "promoting to: X". -->
![Promoting a release to pre](/assets/articles/arcadia-editions/013-promote-pre-summary.png)

<!-- SCREENSHOT: run the same workflow with target_env=prod and version empty. Capture the job Summary for prod, where "promoting to" shows the same X that is running in pre, read from its provisioned_from output. -->
![Promoting to prod mirrors the version running in pre](/assets/articles/arcadia-editions/013-promote-prod-summary.png)

The pipeline doesn't approve anything by itself, because approving a release is part of your organization's process, with its change requests, release boards or whatever your company uses. The pipeline is only the technical part: once the release is approved offline, somebody runs the promotion manually, first to `pre` and then to `prod`.

There is also a [`provision-kafka-destroy.yml`](https://github.com/arcadia-editions/api-product-workflows/blob/main/.github/workflows/provision-kafka-destroy.yml) to remove an environment, and to run it you need to type the exact workspace name, because there is no way back.

## The AsyncAPI file is the source

Service teams only edit their AsyncAPI file and their Avro schemas, as they already do, and the pipelines take care of develop, of the release package and of the promotion to `pre` and `prod`. The platform team, on their side, owns the shared overlay and the credentials, and decides which defaults every topic gets.

You can read about all the options of the generator in the [AsyncAPI Ops plugin docs](https://www.zenwave360.io/zenwave-sdk/plugins/asyncapi-ops/), and all the workflows of this article are in [arcadia-editions/api-product-workflows](https://github.com/arcadia-editions/api-product-workflows).
