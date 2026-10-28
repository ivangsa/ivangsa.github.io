---
title: "How I Build with ZenWave and AI Agents"
summary: "Generating code with ZenWave SDK is cheap enough to experiment with, and AI agents make that loop even faster. This is the workflow I am using: discover the domain, model and prototype until the design fits, find what is missing with a gap report, plan the work, and let agents implement and verify it."
date: 2026-10-18
tags:
  - ddd
  - zenwave
  - architecture
featured: false
featuredImage: assets/articles/2026-10-18-iterative-ai-assisted-model-driven-development.webp
featuredImageAlt: "Iterative, AI-assisted model-driven development with ZenWave: Research and Discovery, Iterative Model-Driven Prototyping, Gaps Report, Tasks and Kanban, and Agent Implementation and QA, with outputs for each stage and a continuous learning loop."
readingTime: "5 min read"
draft: true
---

In [A Software Engineering Hypothesis for the Age of Agents](/articles/a-software-engineering-hypothesis-for-the-age-of-agents) I wrote about the loop I am testing: understand the domain, model it, generate what is already decided, build the rest, use it, and learn. This article is the practical side of that idea, the workflow I am using today with ZenWave and AI agents.

I wrote the full version as a page in the ZenWave docs: [Iterative, AI-Assisted Model-Driven Development with ZenWave SDK](https://www.zenwave360.io/docs/iterative-ai-assisted-development/). Here is the short version and why I think it works.

![Seven steps of iterative, AI-assisted model-driven development with ZenWave: Research and Discovery, Model, Review and clarify, Generate with ZenWave SDK, Gaps Report, Tasks and Kanban, Agent implementation and QA, with loops to iterate until the design fits, run the gap report again, and keep learning](/assets/articles/2026-10-18-iterative-ai-assisted-workflow-vertical.webp)

## Generating code should be cheap enough to experiment with it

This has always been one of the main ideas behind ZenWave SDK. If I can describe a bounded context, generate a Spring Boot application, run it and write some tests in a short time, then code generation stops being only a way to implement a design and becomes a way to discover it. When something is wrong I change the model and generate again.

AI agents make this loop faster, because they can help explore requirements, find gaps in the models, implement the missing behavior, and reconcile freshly generated code with the code I already have.

## The workflow

**1. Research and Discovery.** Understand the problem with stakeholders, Event Storming and some help from agents. The output is a PRD and the Event Storming findings, not a complete specification.

**2. Model with DSLs and API specifications.** I capture the business flow in ZFL and derive one ZDL per bounded context, and the [zfl-to-zdl](/articles/arcadia/007-from-zfl-to-zdl-ai-assisted-domain-model-scaffolding) skill drafts those ZDL models for me. From the ZDL I can also draft the OpenAPI and AsyncAPI contracts.

**3. Review and clarify.** Agents review the models looking for contradictions, missing details and decisions nobody has made yet. Some answers change the models and others become ADRs, but the models stay owned by people: agents point out problems, and I decide what changes.

**4. Generate with ZenWave SDK.** This step is deterministic, no agents involved: ZenWave SDK generates Spring Boot services, APIs, event handlers and tests from the models. Then I run the application and experiment with it, and every time I find a missing field, a wrong command result or a missing step in a flow, I go back to step 2 and regenerate. Early on I just throw the generated code away. Later, when there is business logic worth keeping, I generate a fresh copy in another directory and ask an agent to reconcile both.

**5. Gaps Report.** ZenWave generates the structure of a service and leaves the behavior to the developer, so once the design is stable I need to know what is still missing. The [zenwave-gap-report](https://github.com/ZenWave360/zenwave-sdd/tree/main/skills/zenwave-gap-report) skill compares the ZFL and ZDL models with the code and lists missing service method bodies, event wiring, mappers, tests and so on, each one pointing to the model line that defines it.

**6. Tasks and Kanban.** The tasks come from those gaps, not directly from the PRD. That difference matters to me because ZenWave has already generated a big part of the application, so there is no point asking an agent to plan classes, interfaces or API contracts that already exist.

**7. Agent implementation and QA.** Agents implement one task at a time with [zenwave-fill-gaps](https://github.com/ZenWave360/zenwave-sdd/tree/main/skills/zenwave-fill-gaps), run the tests, and stop when they hit a model gap instead of working around it in code. Then I run the gap report again.

And none of this is strictly linear. Implementation finds problems in the model, tests find incomplete flows, and new requirements change decisions, so I go back to whatever step needs it.

## What ZenWave adds to AI workflows

ZenWave does not try to replace AI development workflows, and I don't want to build another task management framework. What it provides is the part those workflows usually lack: an explicit domain model, deterministic code generation for everything that is already decided, and architectural context in plain text files that developers, generators and agents can all read.

The skills live in [zenwave-sdd](https://github.com/ZenWave360/zenwave-sdd). They are still early, extracted from [Arcadia Editions](/articles/arcadia/001-meet-arcadia-editions), which is where I am testing this process end to end.

If you want the details, the [full workflow is in the ZenWave docs](https://www.zenwave360.io/docs/iterative-ai-assisted-development/).
