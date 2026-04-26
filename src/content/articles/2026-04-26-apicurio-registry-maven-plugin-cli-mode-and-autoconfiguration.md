---
title: "Apicurio Registry Maven Plugin: CLI Mode and Autoconfiguration"
summary: "Three upstream fixes that make the Apicurio Registry Maven Plugin work from the CLI with minimal configuration"
date: 2026-04-26
tags:
  - Apicurio
  - CI/CD
  - AsyncAPI
  - OpenAPI
featured: false
featuredImage: assets/articles/2026-04-26-apicurio-registry-maven-plugin-cli-mode-and-autoconfiguration/apicurio.png
featuredImageAlt: ""
readingTime: "12 min read"

draft: false
---

[Apicurio Registry](https://github.com/Apicurio/apicurio-registry) gives your API schemas a canonical, versioned URL. That is paramount for API governance.

Tooling, including linters, editors, and code and docs generators, needs to be able to fetch schemas by a stable URL. Git is the source of truth for those schemas, but the raw URLs exposed by Git hosting platforms are not always tooling-friendly and their authentication model is sometimes designed for humans, not machines.

Apicurio Registry avoids having to deal with Git raw URLs and their auth quirks. Every artifact gets a stable, versioned URL with consistent authentication support that works well with automated tooling.

With AsyncAPI this is even more important. APIs mediated by a message broker have a kind of mirror symmetry: the same channel or message can be seen both as a publication and as a subscription. That brings two ways to model it with AsyncAPI: duplicating the contract, one spec per side, or using `$ref` references to shared schema definitions. Duplication is the naive solution we want to avoid, and references only work if those shared schemas have canonical URLs that tooling can actually resolve. That is exactly what Apicurio Registry provides.

The workflow: keep schemas in Git as the source of truth, publish them to Apicurio Registry as part of your CI pipeline, and let tooling consume them from there.

The tool for publishing is the [Apicurio Registry Maven Plugin](https://github.com/Apicurio/apicurio-registry). It is not just a thin wrapper around the REST API: the plugin handles some orchestration concerns that matter in practice. You can use the REST API directly, but you end up rebuilding half the plugin logic. But it had a few rough edges that made CI integration harder than it should be, especially in repos that contain only API contracts with no Java code. So I decided to fix them.

Three small contributions, each removing one specific source of friction. Together they make the publish step clean enough that it gets out of the way.

## The friction points

The plugin had three pain points:

1. **You needed a POM** even if your repo has no Java code at all
2. **References had to be managed manually**: if your AsyncAPI referenced schemas already registered in the same registry, you need to configure them manually 
3. **You had to pass the version explicitly** in your CI command, which means you need a way to keeping it in sync with `info.version` in the spec itself

Let me walk through each fix.


## Feature 1: Run the plugin from the CLI, no POM required

Before this change, running the Maven plugin required a `pom.xml` in your repository. For API-only repos this was a real inconvenience: you either had to add a throwaway POM or write custom scripts around the plugin.

Now you can invoke the `register` goal directly from the CLI:

```bash
mvn io.apicurio:apicurio-registry-maven-plugin:3.2.2:register \
  -Dapicurio.url=https://registry.example.com/apis/registry/v3 \
  -Dartifacts.groupId="merchandising.inventory.inventory-adjustment" \
  -Dartifacts.artifactId=asyncapi.yml \
  -Dartifacts.artifactType=ASYNCAPI \
  -Dartifacts.file=./asyncapi.yml \
  -Dartifacts.versionStrategy=API_INFO_VERSION \
  -Dartifacts.ifExists=FIND_OR_CREATE_VERSION \
  -Dartifacts.autoRefs=true
```

No POM, no project structure required. Just the plugin and your spec file.

If you do have a POM and prefer to configure it there, that still works exactly as before:

```xml
<plugin>
  <groupId>io.apicurio</groupId>
  <artifactId>apicurio-registry-maven-plugin</artifactId>
  <version>3.2.2</version>
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
            <groupId>merchandising.inventory.inventory-adjustment</groupId>
            <artifactId>asyncapi.yml</artifactId>
            <artifactType>ASYNCAPI</artifactType>
            <file>${project.basedir}/asyncapi.yml</file>
            <versionStrategy>API_INFO_VERSION</versionStrategy>
            <ifExists>FIND_OR_CREATE_VERSION</ifExists>
            <autoRefs>true</autoRefs>
          </artifact>
        </artifacts>
      </configuration>
    </execution>
  </executions>
</plugin>
```

Both modes work. The CLI mode just removes the barrier for repos that don't need the full Maven setup.

## Feature 2: Automatic reference attachment for already-registered artifacts

This one is subtle but important. When you register an AsyncAPI or OpenAPI that contains `$ref`s pointing to schemas, particularly in another group, Apicurio Registry tracks those as references, so it knows the artifact depends on specific versions of those schemas.

The problem was: if those references were absolute URLs pointing to artifacts already registered in the same registry, you will need to configure them manually as plugin parameters. 

Now the plugin recognizes absolute references that point to the registry itself and attaches them as proper artifact references automatically.

So if your AsyncAPI contains something like:

```yaml
components:
  schemas:
    OrderPlaced:
      $ref: 'https://registry.example.com/apis/registry/v3/groups/my-group/artifacts/order-events/versions/1.0.0'
```

The plugin now understands this is already a registered artifact and registers it as a reference, with no extra configuration and no manual reference list.

This is particularly useful when you model producer/consumer relationships with external `$ref`s to APIs in different groups. The plugin does it right automatically. This feature also fixes a bug where the plugin would try to resolve those absolute registry URLs as local file paths and fail.


## Feature 3: Extract the version from `info.version`

When you register an artifact in Apicurio Registry, you specify a version. The natural source of truth for that version is the `info.version` field in your AsyncAPI or OpenAPI spec. But until now, you had to pass it explicitly in your CI command or POM config, which means two places to keep in sync.

Setting `versionStrategy` to `API_INFO_VERSION` tells the plugin to read the version directly from the `info.version` field in the API document. This only applies to OpenAPI and AsyncAPI artifacts; for other artifact types the setting is ignored.

There is also a useful convention for pre-release versions. If `info.version` ends with `-SNAPSHOT`, the plugin strips that suffix before registration and registers the version as a `DRAFT`. When you later publish the same version without the `-SNAPSHOT` suffix, the plugin updates the existing draft content and promotes it to `ENABLED`. This maps cleanly onto a typical development workflow: iterate on a draft until it is ready, then cut the release by removing the suffix.

Your CI command goes from:

```bash
mvn io.apicurio:apicurio-registry-maven-plugin:3.2.2:register \
  -Dapicurio.url=https://registry.example.com/apis/registry/v3 \
  -Dartifacts.groupId=my-group \
  -Dartifacts.artifactId=asyncapi.yml \
  -Dartifacts.artifactType=ASYNCAPI \
  -Dartifacts.file=./asyncapi.yml \
  -Dartifacts.version=2.1.0           # you have to keep this in sync manually
```

To:

```bash
mvn io.apicurio:apicurio-registry-maven-plugin:3.2.2:register \
  -Dapicurio.url=https://registry.example.com/apis/registry/v3 \
  -Dartifacts.groupId=my-group \
  -Dartifacts.artifactId=asyncapi.yml \
  -Dartifacts.artifactType=ASYNCAPI \
  -Dartifacts.file=./asyncapi.yml \
  -Dartifacts.versionStrategy=API_INFO_VERSION   # automatic version from the spec
```

One less thing to maintain. The spec is the source of truth and you get a nice lifecycle feature out of the box.


## Putting it all together

Here is what a minimal CI step looks like with all three features active: registering an AsyncAPI with schema references, no POM, version from the spec:

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
          mvn io.apicurio:apicurio-registry-maven-plugin:3.2.2:register
            -Dapicurio.url=${{ secrets.REGISTRY_URL }}
            -Dartifacts.groupId="merchandising.inventory.inventory-adjustment"
            -Dartifacts.artifactId=asyncapi.yml
            -Dartifacts.artifactType=ASYNCAPI
            -Dartifacts.file=./asyncapi.yml
            -Dartifacts.versionStrategy=API_INFO_VERSION
            -Dartifacts.ifExists=FIND_OR_CREATE_VERSION
            -Dartifacts.autoRefs=true
```

No POM. No hardcoded version. References to already-registered schemas are attached automatically and your CI/CD command is agnostic to the content of your APIs.

## What's next

These three improvements make the publish step clean, but there is still one gap worth knowing about: relative `$ref`s between artifacts in the same group do not resolve cleanly through the registry's content URLs. That is a harder problem and I am writing about it separately.

The features are available in the latest snapshot builds and will land in the next release. The project is at [github.com/Apicurio/apicurio-registry](https://github.com/Apicurio/apicurio-registry).