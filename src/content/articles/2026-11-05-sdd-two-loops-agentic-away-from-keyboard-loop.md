---
title: "Spec-Driven Development Two Loops: Agentic Away from Keyboard Loop"
summary: "How to build an autonomous agentic AFK loop based on your domain models and task list: an orchestrator, a task board, implementer and reviewer subagents, and what to do if the model turns out to be wrong."
date: 2026-11-05
tags:
  - zenwave
  - architecture
  - ddd
  - ai
featured: false
featuredImage: assets/articles/2026-11-05-sdd-two-loops-agentic-away-from-keyboard-loop.png
featuredImageAlt: "Software development in two loops: Human in the loop and Away From Keyboard loop. This one is for the AFK loop"
readingTime: "5 min read"
draft: false
---

This is the second half of [Spec-Driven Development Two Loops](/articles/sdd-two-loops-model-driven-human-in-the-loop/). The first half ended at hand over from the human to the agentic loop.

## The agent loop starting point

An agentic loop is an orchestrator: picks tasks, routes each task to the best implementer and each finished slice to a reviewer subagent, if review is not a PASS sends the work back to the implementer with the review report until it gets a PASS. Repeating the loop until every task is done or blocked waiting for human input. One loop per business flow.

The handover artifacts the orchestrator receives are:

- The models: ZFL flows, ZDLs for each bounded context, OpenAPI and AsyncAPI definitions.
- ADRs already validated
- Test data for each use case.
- Task board.
- Generated code, if there is a generator for this stack.

ZFL and ZDL are structured models that read familiar to any technical person, and can be understood by LLMs based on their semantics. This is where we avoid most of the Markdown prose typical of SDD.

![Orchestrator loop: task, route, implement, review, integrate and repeat](/assets/articles/2026-11-05-sdd-two-loops-agentic-away-from-keyboard-loop/orchestrator-cycle.png)

## Creating the Kanban Board

This is an AI-assisted / human-approved task. You can implement the Board anywhere: one markdown file, one file per task, in Jira, GitHub issues... 

I use a Markdown list with this convention for the checkboxes, which is as good as any other: `[ ]` pending, `[/]` in progress, `[\]` in review, `[x]` done, `[!]` blocked.

If you are evolving an existing system or you have generated code with ZenWave SDK, you can ask an agent to analyze your spec and existing code and create a Kanban Board task list.

Slice tasks vertically, along the paths of the flow, happy path first, and review them slice by slice:

```markdown
## Place Order

- [x] T-03 (mechanical) Some description here that can spans multiple lines
      artifacts: flows/place-order.zfl:82 apis/openapi.yml:85-100
- [x] T-05 (bounded) Implement reserveStock, do reserve the stock
      artifacts: flows/place-order.zfl:84, catalog-inventory/domain-model.zdl:98
- [/] T-07 (advanced) Implement authorizePayment and payments-processing
      artifacts: flows/place-order.zfl:86, payments-processing/domain-model.zdl:121
      test data: test-data/place-order/authorize-payment/
      blocked by: T-03, T-05
- [!] T-08 (bounded) Confirm stock reservations command in catalog-inventory
      artifacts: catalog-inventory/domain-model.zdl:121
      blocked: model gap, see proposal P-01
- [ ] T-09 (mechanical) Map PaymentAuthorized to order status orders-checkout
      blocked by: T-07
```

Only the orchestrator updates to the board.

## Routing tasks to subagents

Because I personally use multiple agent subscriptions, I have the orchestrator to choose model by task difficulty. Use this task difficulties as guide:

| Difficulty | Description |
|---|---|
| **Mechanical** | Mechanical tasks where the agent need to make no decisions, and follows a pattern already present in the code |
| **Bounded** | The task is fully described by the model and the test data. |
| **Advanced** | Needs to put together several models, modules, ADRs or an external API. |
| **Code review** | Reviewing code should be routed to your best models. |

Routing to cheaper models will save you from running out of subscription usage. Take this list just as an example.


## Subagents: The Implementer

I find that development time improves when the Reviewer perform its job on full vertical slices, not on individual tasks.

Implementer subagents work on their own worktree. The orchestrator passes as much context as needed, then it instructs the implementer to read the task, the model lines it points at, the ADRs and the test data.

Test first: the implementer writes a failing test from the approved test data, then the code. It cannot change the test data to fit its code.

If you want to speed up development, implementers should run only the focused tests for their task, not the entire suite. This will save you a lot of waiting time.

All required information should come from the model, the business rules, ADRs and test data.

## Subagents: The Reviewer

As your project grows, so do its build and test times. It's better to review each vertical slice as a whole, running the full suite once, or you will spend most of the agents' time waiting for build and test results.

Use your strongest models for code reviews, and never use one model to review code written by itself, even if it is in a clean session. They tend to have different biases towards implementations and patterns.

## When your Model is wrong

Sometimes the implementation shows that the approved model is wrong or incomplete. I found this gaps in the Arcadia Editions a few timpes, when a correlation value was missing: for instance, in the catalog-inventory service, the ZDL says there is one stock reservation per order line, but confirmation is performed by orderId `confirmStockReservation(id)` and an order has many items.

Hard Rule: Agents should never edit model files on their own.

Agents should block the task and ideally provide with at least one proposal:

```markdown
## P-01 T-08 blocked: model gap

Problem: catalog-inventory/domain-model.zdl:27 says one reservation per
order line, but confirmStockReservation(id) (domain-model.zdl:121) takes
the id of a single StockReservation. An order has many.

Evidence: test place-order/confirm-stock, order with 3 lines.

Options:
- A: confirm all the reservations of an order in one command, by orderId.
- B: one StockReservation per order, with its lines inside.
```

With a solution proposal, you can ask an agent to assist you editing the models, but never allow the AFK loop to modify de models, api contracts or test-data on its own.

## The orchestrator is a coworker

I like the idea to use the orchestrator as a coworker and talk to it from my phone most of the time: I pass it my findings, change priorities, ask how far it is.

## Exiting the loop

The AFK loop is finished when:

- all tasks are either done or blocked
- every slice review is clean, with no FIX tasks
- the full suite is green
- and there are no open proposals

If after exiting the loop you can perform as an extra validation step, to generate a task-list comparing the spec and existing code. If the result is an empty list, then nothing is missing from the model and code.

The agents commit to their own branch. I review it and sign the merge.

Formal verification is another huge topic that need further investigation.


## This AFK is not a formal framework

This loop is not a formal framework, is an ongoing work as Harness Engeneering evolves.

This is a companion method to the Model-Driven HITL loop. The main idea is to use structured specifications, that a human can read and validate, then delegate implementation to an agentic loop.

There are two rules I would keep from this proposal:

- The models are your main spec
- AFK agents never edit models, API contracts or test data.