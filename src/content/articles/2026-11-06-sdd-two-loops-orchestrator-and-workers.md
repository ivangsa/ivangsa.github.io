---
title: "Spec-Driven Development Two Loops: An Orchestrator That Hands Out Tasks"
summary: "How the AFK loop runs: an orchestrator session that hands independent tasks to Claude, Codex and Grok workers, each in its own clone, checks everything they bring back, and keeps the plan on disk. And why I threw away the bash loop I wrote first."
date: 2026-11-06
tags:
  - zenwave
  - architecture
  - ai
featured: false
readingTime: "6 min read"
draft: true
---

<!-- Draft written before the first real run of the new orchestrator. After that run, replace the claims about what it
does with what it did: how many tasks ran at once, what broke, how long the reviews took. -->

In the [previous article](/articles/sdd-two-loops-agentic-away-from-keyboard-loop/) the AFK loop was a box: an orchestrator picks tasks from the board, an implementer does each one, a reviewer checks each slice. This article is about how that box actually runs, and about the first version of it that I threw away.

## The loop I threw away

My first idea was a Ralph loop: a bash script that runs an agent in a loop, a small step at a time, each step in a fresh context. It is simple and it survives anything, but it has no judgement between steps, and I wanted to talk to the thing from my phone. So I added an orchestrator on top, and then a way for the orchestrator to send it orders, and then policies for who decides what, and then a way to wait out usage limits, and then a lock to stop everyone from writing the board at the same time.

Somewhere around the thousandth line of bash I stopped. I was rebuilding, badly, what Claude Code already does: start agents in the background, get told when they finish, and decide what goes next.

So I asked the orchestrator that had built ZenWave's own repositories in the previous weeks how it had done it. It had not used a script at all.

## What the orchestrator does

It is a Claude Code session, with an agent definition, and it works like this:

1. **It reads the plan.** The board, `docs/tasks.md`, is one file per business flow: vertical slices along the paths of the flow, each task with its model lines, its test data and what it depends on.
2. **It hands out the ready tasks.** A task is ready when what it depends on is merged. Tasks that touch different bounded contexts go out at the same time. Tasks in the same context go one after another.
3. **Each task gets its own clone.** The orchestrator clones the integration branch into a folder, turns off the push URL so a worker can never push, and starts a worker in it with a self-contained prompt.
4. **It waits.** Background work notifies it when it ends. It does not sleep and it does not poll.
5. **It checks.** More on this below.
6. **It merges.** The orchestrator commits what the worker brought, fetches that branch into the integration branch, merges it, ticks the board and deletes the clone.
7. **It reviews each finished slice**, on a snapshot of it, while the next slice goes on.

The workers are Claude subagents, Codex and Grok. For the first, the orchestrator uses the same background agents any Claude Code session has. For the other two, it starts their command line from the clone, in the background.

## Parallel is clones, not repositories

I assumed my orchestrator could run things in parallel because ZenWave has several repositories: the DSL, the language server, the VS Code extension. Three repositories, three tasks.

It was not that. It had several clones of the *same* repository at once, one per task. What lets two tasks run together is that they do not share a checkout and do not touch the same code, not that they live in different repositories.

In a flow that usually means the early slices. A command that calls into three other contexts has three independent tasks. The alternative outcomes of one command, on the other hand, all edit the same method, so they go one after another: running them in parallel would only produce merge conflicts.

## Do not trust the process that ended

The orchestrator's rule that I like the most: a worker finishing is not evidence. In one case a Codex wrapper hung for three hours with the report already written on disk, and the notification never came.

So after a worker ends, the orchestrator looks. Does the report exist? What does the clone say? And before it merges anything:

- it reads the report and the diff;
- it checks that a test exists that asserts the outcome the model names;
- it checks that no approved file changed: models, contracts, test data;
- it runs the focused tests of the task itself;
- if the worker wrote any YAML or Markdown, it reads it, because that is where I have found lines glued together.

Only then does it commit and merge. The worker's word is the report; the orchestrator's decision is the evidence.

## Routing is a file

Which worker takes which kind of work is not in the agent definition. It is a file in the project, `.zenwave/routing.md`:

```markdown
| Work       | First         | Then          | Then          |
|------------|---------------|---------------|---------------|
| mechanical | grok          | claude-sonnet | codex-terra   |
| bounded    | claude-sonnet | codex-terra   | claude-opus   |
| advanced   | codex-sol     | claude-opus   | claude-sonnet |
| review     | claude-opus   | codex-sol     | claude-sonnet |
```

The orchestrator reads it every time it hands out a task. If I tell it "send the advanced ones to Sonnet, Codex is out until six", it changes the file. I used to give percentages (30% to each); in the end "Codex for the hard ones, Sonnet to review" was enough.

## Reviews on a snapshot

When every task of a slice is merged, the reviewer works on a throwaway clone of the integration branch at that commit. It runs the full suite, the one with the integration tests and the containers, once. Meanwhile the implementers keep going on the next slice, on the branch, not on the snapshot. A finding comes back as fix tasks on the slice that was reviewed.

## Usage limits

A headless command line does not wait for anything when it hits its limit: it prints the message and exits. The orchestrator is the one that notices. It writes down which worker is out and when it comes back, routes the following tasks to the next one, and hands the interrupted task to that worker with what was done so far: the original task, the status of the clone and the last message of the previous worker.

## What it costs

I can live with these:

- It spends more tokens than a script would, because it reads the reports.
- If it runs out of its own usage limit, nothing restarts it. I do.
- If its conversation is compacted, it loses what it knew. That is why the board, a short log and the clones are the memory: after a compaction it reads them back.

## Unattended

None of this is an unattended loop. I start the orchestrator myself, on my own machine, and from my phone I talk to the same session. If you want agents running by themselves on a server for a night, that is a different tool. [Sandcastle](https://www.aihero.dev/sandcastle/branch-strategies), by Matt Pocock, runs each agent in a worktree inside a container and has loop templates. The board and the skills of [zenwave-sdd](https://github.com/ZenWave360/zenwave-sdd) do not care which one hands out the tasks.
