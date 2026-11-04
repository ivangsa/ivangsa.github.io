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
draft: true
---

This is the second half of [Spec-Driven Development Two Loops](/articles/sdd-two-loops-model-driven-human-in-the-loop/). The first half ended at the gate, with an approved batch of models, test data and tasks. This one is about what agents do with it while I am away from the keyboard.

## The agent loop starting point

An agentic loop is an orchestrator that picks tasks, routes them to implementer and reviewer subagents, waits for results, and repeats until every task is done or blocked.

The orchestrator starts by reading all approved spec artifacts:

- The models: ZFL flows, ZDLs for each bounded context, OpenAPI and AsyncAPI definitions.
- ADRs already validated
- Test data for each use case.
- Task board.
- Generated code, if there is a generator for this stack.

ZFL and ZDL are structured models that read familiar to any technical person, and can be understood by LLMs based on their semantics. This is where we avoid most of the Markdown prose typical of SDD.

![Orchestrator loop: task, route, implement, review, integrate and repeat](/assets/articles/2026-11-05-sdd-two-loops-agentic-away-from-keyboard-loop/orchestrator-cycle.png)

## Creating the Kanban Board

This is an AI-assisted / human-approved task. The board itself can live anywhere: a Markdown list, a folder with one file per task, Jira, GitHub issues, Linear. I use a Markdown list with this convention for the checkboxes, which is as good as any other: `[ ]` pending, `[/]` in progress, `[\]` in review, `[x]` done, `[!]` blocked.

If you use ZenWave SDK, the [zenwave-gap-report](https://github.com/ZenWave360/zenwave-sdd/tree/main/skills/zenwave-gap-report) skill can help identify gaps in your project that need polishing or further implementation.

If you are evolving an existing system or you have generated code with ZenWave SDK, you can ask an agent to analyze your spec and existing code and create a Kanban Board task list.

Use task batches to group review tasks:

```markdown
## Place Order: batch 1

- [x] T-03 · Listen to OrderCreated · orders-checkout · mechanical
      model: flows/place-order.zfl:82
- [x] T-05 · Implement reserveStock · catalog-inventory · bounded
      model: flows/place-order.zfl:84, catalog-inventory/domain-model.zdl:98
- [/] T-07 · Implement authorizePayment · payments-processing · multiple sources
      model: flows/place-order.zfl:86, payments-processing/domain-model.zdl:121
      test data: test-data/place-order/authorize-payment/
      blocked by: T-03, T-05
- [!] T-08 · Confirm stock reservations · catalog-inventory · bounded
      model: catalog-inventory/domain-model.zdl:121
      blocked: model gap, see proposal P-01
- [ ] T-09 · Map PaymentAuthorized to order status · orders-checkout · mechanical
      blocked by: T-07
```

Only the orchestrator writes to the board. Subagents report back to the orchestrator.

## Routing tasks to subagents

Because I personally use multiple subscriptions, I instruct the orchestrator to route each task to a different model and agent based on its difficulty. From less to more difficult:

| Difficulty | What it looks like | Example |
|---|---|---|
| **Mechanical** | Follows a pattern that already exists in the code. No decisions necessary. | Mappers, wiring an event listener (T-03, T-09) |
| **Well defined** | One model element in one module, fully described by the model and the test data. | A service method with a single outcome |
| **Bounded** | Several branches or a state machine, but everything it needs is inside one module. | `reserveStock` with its outcomes (T-05) |
| **Multiple sources** | Needs to put together several models, modules, ADRs or an external API. | `authorizePayment`: the ZFL outcomes, the ZDL, the AsyncAPI, the retry ADR and the payment processor (T-07) |
| **Code review** | A whole batch against the models and the test data, running the full suite. | The batch review |

Cheaper and faster models go at the top of the table, and the strongest ones at the bottom. Reviews get the strongest model, because a finding that slips through costs more than the review.


## Implementer subagents

Implementer subagents work on their own worktree. The orchestrator passes as much context as needed, then it instructs the implementer to read the task, the model lines it points at, the ADRs and the test data.

If you want to speed up development, implementers should run only the focused tests for their task, not the entire suite. This will save you a lot of waiting time.

All required information should come from the model, the business rules, ADRs and test data.

## Review, in batches

As your project grows, so do its build and test times. It's better to review tasks in batches or you will spend most of the agents' time waiting for build and test results.

Use your strongest models for code reviews, and never use one model to review code written by itself, even if it is in a clean session. They tend to have different biases towards implementations and patterns.

## When your Model is wrong

Sometimes the implementation shows that the approved model is wrong or incomplete. In the Arcadia Editions catalog-inventory service, the ZDL says there is one stock reservation per order line, but `confirmStockReservation(id)` takes the id of one single reservation, and an order has many.

Agents should never edit model files on their own.

You can instruct your agents to block the task with at least one proposal: why they need to block it and what would unblock it. The proposal is a report attached to the blocked task, not a change to the model:

```markdown
## P-01 · T-08 blocked: model gap

Problem: catalog-inventory/domain-model.zdl:27 says one reservation per
order line, but confirmStockReservation(id) (domain-model.zdl:121) takes
the id of a single StockReservation. An order has many.

Evidence: test place-order/confirm-stock, order with 3 lines.

Options:
- A: confirm all the reservations of an order in one command, by orderId.
- B: one StockReservation per order, with its lines inside.
```

The report points at the lines of the model, so reviewing it takes me a few minutes. I choose an option or come up with a different one, and I change the model myself, back in the HITL loop. Then I generate again and approve the new baseline. The orchestrator reconciles the new generated code with the code that was already merged, and the blocked tasks are ready again.

## Exiting the loop

The AFK loop is done when:

- every task of the approved board is done;
- the batch review is clean, with no FIX tasks;
- the full suite, or the vertical slices, are green;
- the structural assertions and the approved test data have not changed since the baseline;
- and there are no open proposals.

As an extra validation, once the board is cleared the reviewer can run the task-list agent again over the result. If it comes back empty, nothing is missing between the model and the code. It can also produce a traceability table: each ZFL step and ZDL operation, the code that implements it, and the test that covers each branch.


## Not a framework, an open companion to the Model-Driven HITL loop

This loop is not a framework you have to adopt. It is a companion to the Model-Driven HITL loop, and you can run it with whatever you already use: your own orchestrator and agents, your own task board, your own models and subscriptions. What it needs from the HITL loop is what came out of the gate: approved models, validated test data and an approved task list.

Most of what I described is how I do it today, not a rule. The code generator, where the board lives, routing by difficulty and the reviewer regression tests are all optional. There are only three things I would not drop: the model is the spec, AFK agents never edit it, and they do not decide what passing test cases should look like.
