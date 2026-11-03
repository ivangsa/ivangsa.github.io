---
title: "Spec-Driven Development Two Loops: Agentic Away from Keyboard Loop"
summary: "How the autonomous agentic loop works when the spec is a set of approved models: an orchestrator, a task board, implementer and reviewer subagents, and what happens when the model turns out to be wrong."
date: 2026-11-05
tags:
  - zenwave
  - architecture
  - ddd
  - ai
featured: false
readingTime: "5 min read"
draft: true
---

This is the second half of [Spec-Driven Development Two Loops](/articles/sdd-two-loops-model-driven-human-in-the-loop/). The first half ended at the gate, with an approved batch of models, test data and tasks. This one is about what agents do with it while I am away from the keyboard.

## What the loop starts from

An agentic loop is an orchestrator that picks work, hands it to subagents, checks the result, and repeats until everything is done or it is blocked.

Here the orchestrator starts by reading the whole approved spec:

- the models: ZFL flows, one ZDL per bounded context, OpenAPI and AsyncAPI;
- the ADRs;
- the validated test data for each use case;
- the task board;
- and the generated code, if there is a generator for this stack.

There is still prose in there, in the doc comments, the business policies of the ZDL and the ADRs. But there are no Markdown specs. The PRD and the research notes stayed upstream, in the HITL loop.

## The task board

The tasks were split during HITL, by me with an agent helping. That agent started as the [zenwave-gap-report](https://github.com/ZenWave360/zenwave-sdd/tree/main/skills/zenwave-gap-report) skill: it compared the models with the code ZenWave SDK generated and listed what the generator had left for the developer, like mappers, service method bodies and tests.

That made sense when the generator was a given, but it is not anymore. What I need now is a task list derived from the approved model: based on the generated code when there is some, and from a blank slate when there isn't.

The board itself can live anywhere: a Markdown list, a folder with one file per task, Jira, GitHub issues, Linear. What matters is what each task contains:

```yaml
id: T-07
title: Implement authorizePayment
module: payments-processing
model:
  - flows/place-order.zfl:84        # when OrderCreated do authorizePayment
  - payments-processing/domain-model.zdl:121
testData: test-data/place-order/authorize-payment/
difficulty: high                    # three outcomes, external processor
blockedBy: [T-03, T-05]
```

The task does not describe the behavior in prose. It points at the lines of the model that already describe it.

Only the orchestrator writes to the board. Subagents report back to it.

## Pick and route

The orchestrator picks the next task whose blockers are done, and routes it to a model according to its difficulty. Wiring an event listener or a mapper does not need the same model as `authorizePayment`, with its three outcomes and an external payment processor.

## Implement

Each implementer subagent works on its own worktree. It reads the task, the model lines it points at, the ADRs and the test data, and nothing else.

It runs only the focused tests for its task, not the entire suite.

The expected results are not its to decide. The structural assertions come from the model: the events each outcome emits, the state transitions, the API responses. The expected values come from the test data I validated at the gate. When a test fails, the agent fixes the code, never the expectation.

## Review, in batches

Reviews don't happen per task, they happen per batch. The reviewer subagent runs the entire suite, or the vertical slice of one module if the system is a modular monolith, and checks the changes against the model lines and the test data the tasks point at.

It writes a review report, with the range of commits it reviewed:

```markdown
# Review: payments-processing, batch 2

Commits: 4f1c2a9..b77e0d3
Scope: vertical slice payments-processing
Verdict: FIX FIRST

## Findings

- R-1 · T-07 · the `declined` outcome emits PaymentFailed instead of
  PaymentDeclined (flows/place-order.zfl:88)
- R-2 · T-09 · no test for the `failed` retry inside the reservation window
```

The report is always committed with the code. If the verdict is FIX FIRST, the orchestrator delivers the affected tasks again to the implementers, with the report.

The reviewer can also write some regression tests, but that is optional, and those tests must be covered by the model or the test data. On a project without models, a reviewer that finds edge cases is very useful. With models, an edge case the model does not cover is a finding for me, not a test.

## When the model is wrong

Sometimes the implementation shows that the approved model is wrong or incomplete. In the Arcadia Editions catalog-inventory service, the ZDL says there is one stock reservation per order line, but `confirmStockReservation(id)` takes the id of one single reservation, and an order has many.

The agent does not work around it in code, and it never edits the model. It marks the task as blocked by the model, writes a proposal with one or more solutions, and the orchestrator moves on to other tasks that are ready.

```diff
// Option A: confirm all the reservations of an order
-    confirmStockReservation(id) StockReservation withEvents StockReservationConfirmed
+    confirmStockReservations(ConfirmStockReservationsInput) withEvents StockReservationsConfirmed

+input ConfirmStockReservationsInput {
+    orderId String required
+}

// Option B: one reservation per order, with lines
 entity StockReservation {
-    orderLineId String required
+    orderId String required
+    lines StockReservationLine[]
 }
```

The proposal is written in the modeling language, so reviewing it takes me a minute. I choose an option or adjust it, update the model, generate again and approve the new baseline. Then the orchestrator reconciles the new generated code with the code that was already merged, and the blocked tasks are ready again.

## When the batch is done

The batch is done when:

- every task of the approved board is done;
- the batch review is clean, with no FIX FIRST;
- the full suite, or the vertical slices, are green;
- the structural assertions and the approved test data have not changed since the baseline;
- and there are no open proposals.

As an extra validation, once the board is cleared the reviewer can run the task-list agent again over the result. If it comes back empty, nothing is missing between the model and the code. It can also produce a traceability table: each ZFL step and ZDL operation, the code that implements it, and the test that covers each branch.

What I get back is evidence: the review reports, the test results per branch, the open proposals if any, and the running application. I can read code where I want to, but I don't need to read every diff to know whether the batch does what I approved.

## Not a framework

Some of this is optional. The generator, the board backend, routing by difficulty and the reviewer regression tests are things I use, not rules. What I would not drop is that the model is the spec, agents don't edit it, and agents don't decide what passing means.

The whole method, both loops, is in the ZenWave docs: [Two Loops: Model-Driven Development with Agents](https://www.zenwave360.io/docs/two-loops-model-driven-development/).
