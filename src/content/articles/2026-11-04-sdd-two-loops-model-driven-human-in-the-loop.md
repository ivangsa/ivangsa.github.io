---
title: "Spec-Driven Development Two Loops: Model-Driven Human in the Loop"
summary: "How to create and validate complete Model-Driven specifications, assisted by AI agents, without all the markdown prose."
date: 2026-11-04
tags:
  - zenwave
  - architecture
  - ddd
  - ai
featured: false
featuredImage: assets/articles/2026-11-04-sdd-two-loops-model-driven-human-in-the-loop.png
featuredImageAlt: "Software development in two loops: Human in the loop and Away From Keyboard loop. This one if for HITL"
readingTime: "5 min read"
draft: false
---

In the [first article](/articles/sdd-markdown-is-the-bottleneck/) of this series I wrote that I cannot read Markdown at the speed an LLM writes it, and that when I don't read everything, decisions slip into the implementation as if I had already approved them. In the [second one](/articles/sdd-from-event-storming-to-a-model-your-agents-can-read/) I wrote that designing one bounded context at a time is not enough anymore, because agentic loops need a big design upfront.

This article is about how to create Model-Driven specifications humans can read and validate, while leveraging AI agents to help you with the task.

## Two loops in one pipeline

There are two main loops in this proposed workflow:

- **Human in the Loop (HITL)** loop. This is about applying time-proven Domain-Driven Design techniques to discover and then capture those findings in compact and developer-friendly DSLs like [ZFL Flow Language](https://www.zenwave360.io/docs/event-driven-design/zenwave-flow-language/) to express process-level event storming sessions and [ZDL Domain Language](https://www.zenwave360.io/docs/event-driven-design/zenwave-domain-language/) for modeling a service or bounded context.

- **Away From Keyboard (AFK)** loop. Agents split those models into a backlog of tasks, and as soon as I verify and approve that backlog, an orchestrator agent can start this second loop autonomously.

The second loop is a technical challenge, but once it is set up, you can fire and forget. The first loop is about modeling and product builder mentality, assisted by AI and domain modeling tools, and it's where I expect it will make the difference.

## You can only leave the keyboard if you could read what you approved

If you ask your agent to write a pile of Markdown you cannot even read or approve, then the AFK loop is a liability.

I found time and time again decisions I didn't approve or misunderstandings taken as gospel by the agents writing the spec or the code, only to find them when testing the end result.

So the spec from the HITL loop has to be something you can actually read and validate, and with tons of verbose prose you can hardly do that.

A concise Domain Model can: ZFL for the business flows, ZDL for each bounded context, OpenAPI and AsyncAPI for the contracts. A medium-sized service fits in less than 200 lines. I've been doing this in production for 4 years, writing domain models by hand and then generating all the boring parts. Now agents can assist in that too.

## Everything starts with Business Discovery

Business Discovery is a discrete task that starts before any loop. Here are some tools for discovery:

- A PRD as the starting point
- Agentic interviews with skills like [grill-with-docs](https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md).
- Event Storming session between technical experts and domain experts.

The first HITL loop starts with those as inputs: text, diagrams, pictures from EventStorming, and online whiteboard tools.

The next step is to convert those findings into structured documents, and that's when the HITL loop starts.

## The HITL loop: writing structured models, reviewing projections, not text

The models bring structure to your design. Prose is contained in doc comments, free-text business policies in the ZDL, and ADRs next to it.

But the center is domain modeling and structure, not text.

There are two ways to review these domain models:

- **Agents challenge the domain.** They read the models looking for contradictions and decisions nobody made yet. An event without listeners, a missing correlation, some fields missing. Some of the answers change the model, others become ADRs.

- **Humans review projections of the model**: Models can be converted to different representations, easy to read and validate by experienced software engineers and architects: flowchart diagrams, sequence diagrams for each alternative branch of a ZFL flow, class diagrams and state machines for each aggregate, the commands and the domain events, and the OpenAPI and AsyncAPI contracts.

![One model, many projections: EventFlow, sequence diagrams per branch, class diagrams and state machines, OpenAPI, AsyncAPI, and generated code with tests](/assets/articles/2026-11-04-sdd-two-loops-model-driven-human-in-the-loop/projections.png)

And source code is just another projection. [ZenWave SDK](https://www.zenwave360.io/docs/zenwave-sdk/) can generate Spring Boot backend services, APIs, event handlers and full test suites. This is very effective and efficient: you can review the code your models produce in a matter of seconds and validate whether that entity, endpoint signature, or domain events fit what you have in mind while developing. You can even fire a debug session with one of those unit or integration tests or write a few lines by hand, and see if what the model produces matches the requirements.

When something is wrong, you can change the model and generate again, in seconds, with no tokens involved. Early code is throwaway code. If this matches your backend stack, it's a very efficient way to design and produce software, but you can still rely on agents to generate your code.

The main idea here is modeling structure rooted in Domain-Driven Design building blocks.

## HITL handover to the AFK loop

The HITL loop runs until you are happy with what you are designing. ZFL and ZDL read as code, but in their most compact form, so you can verify and validate that it is correct. But agents have the ability to hold all the information in context and challenge any gap or contradiction.

When you are happy with your domain models, it is time to:

- Generate the full backend project if it fits your technical stack, and
- Ask an AI agent to produce a detailed backlog of tasks from those models, and code.

![HITL handover to the AFK loop](/assets/articles/2026-11-04-sdd-two-loops-model-driven-human-in-the-loop/the-gate.png)

HITL is ready when:

- **Models are Valid.** Models can be parsed, no linting errors and all projections can be rendered. This is deterministic, no LLM involved.
- **Human and Agent Reviewed.** You have reviewed all the projections and diagrams, and the agents have no open questions left.
- **Covered by test data.** For each use case and each branch of the flow, you need to create and validate test data. This is something an LLM can assist with, but you must validate that it conforms with the domain and requirements, as it will be part of the gate of the second loop.
- **Task Backlog.** Ask an agent to assist you in splitting work into tasks. The result can be a list, a graph, Markdown files, remote tickets...
- **Approved and Tagged.** Commit and tag models and backlog as the baseline.

Approved and Tagged is very important so agents take that as the valid handoff they cannot edit or modify.

## ZenWave SDK is an (optional) accelerator

ZenWave SDK generator plugins are optional. The method is modeling the system in structured languages that humans and agents can both read; it works the same in a stack ZenWave SDK does not target.

When software was created by hand by engineering teams, I used these structured models, ZDL in particular, to design and create a shared understanding with the whole team before writing any code. In production projects I have generated around 80% of the code, deterministically, from those same models. Then I ran the last mile: the remaining 20% and all the tests by hand.

ZenWave SDK output is fast and deterministic, and the agents only have to write the remaining 20%.

Now agents can help with that last mile too.

## AFK means Away From Keyboard

The agents take over: an orchestrator reads the approved models, picks tasks, and routes them to implementer and reviewer subagents. You can follow task completion from any remote connection, depending on where your agent is executing.

That is the [next article](/articles/sdd-two-loops-agentic-away-from-keyboard-loop/). You can also read the ZenWave docs: [Two Loops: Model-Driven Development with Agents](https://www.zenwave360.io/docs/ai-assisted-model-driven-development/).
