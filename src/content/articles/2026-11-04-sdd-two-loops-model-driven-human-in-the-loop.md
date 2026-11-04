---
title: "Spec-Driven Development Two Loops: Model-Driven Human in the Loop"
summary: "Spec-driven development with agents runs two different loops: one where the human designs the system, and one where agents implement it while you are away from the keyboard. The second loop can only be trusted if the human could actually read and approve what came out of the first. That is why the first loop should produce models, not Markdown."
date: 2026-11-04
tags:
  - zenwave
  - architecture
  - ddd
  - ai
featured: false
featuredImage: assets/articles/2026-11-04-sdd-two-loops-model-driven-human-in-the-loop.png
featuredImageAlt: "Two loops side by side: on the left a human, assisted by an agent, designs a domain model and reviews its diagrams; on the right agents work alone. The left loop is highlighted."
readingTime: "5 min read"
draft: true
---

In the [first article](/articles/sdd-markdown-is-the-bottleneck/) of this series I wrote that I can not read Markdown at the speed an LLM writes it, and that when I don't read everything, decisions slip into the implementation as if I had already approved them. In the [second one](/articles/sdd-from-event-storming-to-a-model-your-agents-can-read/) I wrote that designing one bounded context at a time is not enough anymore, because agentic loops need a big design upfront.

This article is about how that design gets done, and where it ends.

## Two loops, not one pipeline

When I build with agents there are two different loops, with different jobs and different rules.

The first one is a **Human in the Loop (HITL)** loop. I design the system, with agents helping me: they draft models, challenge them, and generate things from them. But I make the decisions, and I have to understand every one of them.

The second one is an **Away From Keyboard (AFK)** loop. Agents implement what I approved: they pick tasks, write the code and the missing tests, run them, fix what fails and keep going. I am not there, and I should not need to be.

Everybody wants the second loop. The first loop is the price of having it.

## You can only leave the keyboard if you could read what you approved

An AFK loop is only as good as what it was given. If the spec was a pile of Markdown that I skimmed, then I did not really approve it, and the agents will take it as gospel anyway.

So the output of the HITL loop has to be something I can actually read and validate in the time I have. Prose does not give me that. A model does: ZFL for the business flows, ZDL for each bounded context, OpenAPI and AsyncAPI for the contracts. A medium-sized service fits in less than 200 lines.

## Before the loops: Discover

Discovery happens before any loop. Ideally it starts with a PRD, and I use that PRD as the starting point of an interview with skills like [grill-with-docs](https://github.com/mattpocock/skills/blob/main/docs/engineering/grill-with-docs.md). Then comes an Event Storming session between technical experts and domain experts, and the architect translates its findings into a first ZFL draft of each flow.

That first ZFL draft is where the HITL loop starts.

Prose is fine here. The PRD and the research notes are inputs for me and for the agents helping me design. The agents in the AFK loop will never read them.

## The HITL loop: reviewing projections, not prose

In this loop the model is the center. It still contains prose: doc comments, free-text business policies in the ZDL, and ADRs next to it. But the prose lives inside the model, attached to the command or the rule it explains, not in a separate document that nobody will keep in sync.

There are two kinds of review going on in this loop.

**Agents challenge the domain.** They read the models looking for contradictions and decisions nobody made yet. What happens if the payment processor does not answer? Can this command run twice? What if the flow fails halfway? Some answers change the model, others become ADRs.

**I review projections of the model.** I don't review the model only by reading it. ZenWave Platform for IntelliJ and VS Code lets me explore what the model derives: the EventFlow diagram, one sequence diagram for every alternative branch of a ZFL flow, class diagrams and state machines for each aggregate, the commands and the domain events, the OpenAPI and AsyncAPI contracts.

![One model, many projections: EventFlow, sequence diagrams per branch, class diagrams and state machines, OpenAPI, AsyncAPI, and generated code with tests](/assets/articles/2026-11-04-sdd-two-loops-model-driven-human-in-the-loop/projections.png)

And the code is just another projection. ZenWave SDK generates the services, the APIs, the event handlers and a full set of tests. Those tests don't have proper test data or complete assertions yet, but they are a very good entry point: I can start a debug session, or write a few lines by hand, and see if what the model produces is complete enough for the requirements.

When something is wrong I change the model and generate again. Early on I just throw the generated code away.

## The gate

The HITL loop ends when a set of flows is ready to hand over. Not the whole system at once: the methodology is iterative, and while agents implement one batch I can keep designing the next one.

![The gate between the two loops: a batch passes from Shape to Implement & Verify only when it is valid, reviewed, covered by test data, split into tasks and approved](/assets/articles/2026-11-04-sdd-two-loops-model-driven-human-in-the-loop/the-gate.png)

A batch is ready when it is:

- **Valid.** The models parse and their references resolve: every service used in a ZFL flow exists in a ZDL, every emitted event is declared, every API channel exists. This is deterministic, no LLM involved.
- **Reviewed.** The agents have no open questions left, and I have gone through the projections.
- **Covered by test data.** For each use case and each branch of the flow there is test data, with its input and its expected result, generated with the help of an agent and validated by me. This is where the expectations the model can not express live.
- **Split into tasks.** I split the work into tasks with an agent helping me. It can take a few iterations, and the result can be a list or a graph. Each task points at the lines of the model it implements, and says how difficult it is and what it is blocked by.
- **Approved.** I commit or tag that version of the model as the baseline.

The last one is the important one. Agents in the AFK loop treat as decided only what is in the approved baseline, and that is the answer to the problem of the first article: approval is now something you can see.

## The generator is an accelerator, not the method

None of this requires a code generator. The method is modeling the system in structured languages that humans and agents can both read; it works the same in a stack ZenWave SDK does not target.

But when the generator matches your stack, it changes how much is left for the agents. In my projects it generates around 80% of the code, deterministically, from the same models I approved. As I wrote in [Prose Specs vs Domain Models](/articles/spec-driven-vs-model-driven-development/), that is correctness by construction relative to the generator: it builds what the model says. The agents only have to write the remaining 20%.

## And then you leave the keyboard

On the other side of the gate, the agents take over: an orchestrator reads the approved models, picks tasks, routes them to implementer and reviewer subagents, and hands back evidence instead of a diff to read.

That is the [next article](/articles/sdd-two-loops-agentic-away-from-keyboard-loop/). And if you want the whole method on one page, it is in the ZenWave docs: [Two Loops: Model-Driven Development with Agents](https://www.zenwave360.io/docs/ai-assisted-model-driven-development/).
