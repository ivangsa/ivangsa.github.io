---
title: "Registering APIs in Apicurio Registry from CI/CD — No POM Required"
summary: ""
date: 2026-04-20
tags:
  - Apicurio
  - CI/CD
  - AsyncAPI
  - OpenAPI
featured: false
featuredImage: assets/articles/2026-04-20-registering-apis-in-apicurio-registry-from-cicd-no-pom-required/pilot-aware-architecture.png
featuredImageAlt: ""
readingTime: "12 min read"

draft: true
---

# Registering APIs in Apicurio Registry from CI/CD — No POM Required

I have been using Apicurio Registry as part of an AsyncAPI governance setup at work. At some point I realized the Maven plugin — the main tool for registering artifacts — had a few rough edges that made it harder than it should be to use in CI/CD pipelines, especially in repos that contain only API contracts with no Java code.

So I decided to fix them. Three small contributions, each removing one specific source of friction. Together they make a meaningful difference in how you integrate Apicurio Registry into your pipelines.

---

## The problem

Imagine you have a repository with just API contracts — AsyncAPI or OpenAPI files, maybe some Avro schemas. No Java, no build system. You want to register those artifacts in Apicurio Registry as part of your CI pipeline.

The official way to do this is the [Apicurio Registry Maven Plugin](https://github.com/Apicurio/apicurio-registry). It works well, but until recently it had three friction points:

1. **You needed a POM** even if your repo has no Java code at all
2. **References had to be managed manually** — if your AsyncAPI referenced schemas already registered in the same registry, the plugin would try to resolve them as local files and fail
3. **You had to pass the version explicitly** in your CI command, which means keeping it in sync with `info.version` in the spec itself

Let me walk through each fix.

---

## Feature 1: Run the plugin from the CLI, no POM required

Before this change, running the Maven plugin required a `pom.xml` in your repository. For API-only repos this was a real inconvenience — you either had to add a throwaway POM or write custom scripts around the plugin.

Now you can invoke the `register` goal directly from the CLI:

```bash
mvn apicurio-registry:register \
  -Dapicurio.registry.url=https://registry.example.com/apis/registry/v3 \
  -Dapicurio.artifact.file=./asyncapi.yaml \
  -Dapicurio.artifact.groupId=my-group \
  -Dapicurio.artifact.artifactId=my-api
```

No POM, no project structure required. Just the plugin and your spec file.

If you do have a POM and prefer to configure it there, that still works exactly as before:

```xml
<plugin>
  <groupId>io.apicurio</groupId>
  <artifactId>apicurio-registry-maven-plugin</artifactId>
  <version>${apicurio.version}</version>
  <executions>
    <execution>
      <phase>generate-sources</phase>
      <goals>
        <goal>register</goal>
      </goals>
      <configuration>
        <registryUrl>https://registry.example.com/apis/registry/v3</registryUrl>
        <artifacts>
          <artifact>
            <groupId>my-group</groupId>
            <artifactId>my-api</artifactId>
            <file>${project.basedir}/asyncapi.yaml</file>
          </artifact>
        </artifacts>
      </configuration>
    </execution>
  </executions>
</plugin>
```

Both modes work. The CLI mode just removes the barrier for repos that don't need the full Maven setup.

---

## Feature 2: Automatic reference attachment for already-registered artifacts

This one is subtle but important. When you register an AsyncAPI or OpenAPI that contains `$ref`s pointing to schemas, Apicurio Registry tracks those as references — so it knows the artifact depends on specific versions of those schemas.

The problem was: if those references were absolute URLs pointing to artifacts already registered in the same registry, the plugin would still try to resolve them as local file paths and fail.

Now the plugin recognizes absolute references that point to the registry itself and attaches them as proper artifact references automatically, instead of trying to resolve them locally.

So if your AsyncAPI contains something like:

```yaml
components:
  schemas:
    OrderPlaced:
      $ref: 'https://registry.example.com/apis/registry/v3/groups/my-group/artifacts/order-events/versions/1.0.0'
```

The plugin now understands this is already a registered artifact and registers it as a reference — no extra configuration, no manual reference list.

This is particularly useful when you have a set of shared schemas registered once and referenced by many APIs. The plugin does the right thing automatically.

---

## Feature 3: Extract the version from `info.version`

When you register an artifact in Apicurio Registry, you specify a version. The natural source of truth for that version is the `info.version` field in your AsyncAPI or OpenAPI spec. But until now, you had to pass it explicitly in your CI command or POM config — which means two places to keep in sync.

With this feature, if you don't specify a version explicitly, the plugin reads it directly from `info.version` in your spec file.

Your CI command goes from:

```bash
mvn apicurio-registry:register \
  -Dapicurio.registry.url=https://registry.example.com/apis/registry/v3 \
  -Dapicurio.artifact.file=./asyncapi.yaml \
  -Dapicurio.artifact.groupId=my-group \
  -Dapicurio.artifact.artifactId=my-api \
  -Dapicurio.artifact.version=2.1.0   # <-- you have to know this
```

To:

```bash
mvn apicurio-registry:register \
  -Dapicurio.registry.url=https://registry.example.com/apis/registry/v3 \
  -Dapicurio.artifact.file=./asyncapi.yaml \
  -Dapicurio.artifact.groupId=my-group \
  -Dapicurio.artifact.artifactId=my-api
  # version comes from info.version in the spec
```

One less thing to maintain. The spec is the source of truth.

---

## Putting it all together

Here is what a minimal CI step looks like with all three features active — registering an AsyncAPI with schema references, no POM, version from the spec:

```yaml
# .github/workflows/register-api.yml
name: Register API

on:
  push:
    paths:
      - 'asyncapi.yaml'

jobs:
  register:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Register AsyncAPI in Apicurio Registry
        run: |
          mvn apicurio-registry:register \
            -Dapicurio.registry.url=${{ secrets.REGISTRY_URL }} \
            -Dapicurio.artifact.file=./asyncapi.yaml \
            -Dapicurio.artifact.groupId=my-group \
            -Dapicurio.artifact.artifactId=order-service-api
```

No POM. No hardcoded version. References to already-registered schemas are attached automatically. The spec drives everything.

---

## What's next

These three are small, focused improvements. There is a larger feature coming that touches how Apicurio handles `$ref` resolution across group artifacts and content-addressable endpoints — something that matters a lot for distributed AsyncAPI governance at scale. I will write about that separately once it is ready to propose.

In the meantime, if you are using Apicurio Registry with AsyncAPI or OpenAPI in CI/CD pipelines, these changes should make your setup noticeably cleaner. The features are available in the latest snapshot builds and will land in the next release.

If you want to try them or contribute to Apicurio Registry yourself, the project is at [github.com/Apicurio/apicurio-registry](https://github.com/Apicurio/apicurio-registry).