# The Grammar IS the Prompt

Three files. That is all it took.

A grammar file (`Zdl.g4`), one working example (`complete.zdl`), and a ZFL flow describing a business process. The instruction was four lines long. The output was five valid domain models — one per bounded context — with correct syntax, aggregate entities, state machines, and proper AsyncAPI and REST annotations.

No fine-tuning. No ZDL training data. No prompt engineering to speak of.

## Why it worked

A well-designed DSL with a clean grammar is machine-legible without explanation. The grammar encodes the rules. The example shows the idiom. The rest is pattern recognition.

The ZFL flow is a state machine in disguise. Every `when X { service S command C event E }` block is an arc in a graph. Grouping those arcs by service gives you the command surface for each bounded context. The events each service publishes fall out of the same structure. The `@transition` annotations are already implied by the flow's sequencing — the AI just made them explicit.

What the model added on top — entity fields, enum values, topic naming conventions, the full shipment pipeline with `PICKING → PACKING → SHIPPED → DELIVERED` — is domain knowledge layered on a structurally sound scaffold. That is where AI earns its place, not in repeating what the grammar already describes.

## The instruction

```
For each system in the flow, create a domain-model.zdl with:
- config (title, basePackage)
- one aggregate entity with @lifecycle and initial state
- a service with the commands from the flow
- events matching each command output
- @rest on actor-initiated commands, @asyncapi on event-triggered commands
- @transition on each method with from/to states derived from the flow
```

That was it. Grammar and example did the rest.

## The CLI problem

The structural mapping from ZFL to ZDL skeletons is deterministic enough for a ZenWave SDK plugin. Parse the flow, group by system, emit one ZDL skeleton per service. Mechanical.

The UX is where it gets hard.

A CLI command works well for a single, well-scoped transformation with clear inputs and a predictable output location. This transformation produces multiple new files across multiple repos that may partially overlap with what already exists. Do you overwrite? Merge? Scaffold only what is missing? What if two services are already modeled and three are not? What if the entity exists but the lifecycle annotation is missing?

That is a lot of decisions before you get a useful first run. And every wrong default becomes a bug report.

An AI agent sidesteps most of that. It reads what exists, reasons about what to create or update, and applies judgment about what to preserve. The "UX" is a short conversation. The agent handles partial states naturally because it understands context, not just file paths.

The right answer is probably both: a plugin that generates a deterministic skeleton, and an AI agent that enriches and updates it with domain knowledge. The plugin gives the agent something grounded to work from. The agent handles everything the plugin cannot know.

## What this means for DSL design

If your grammar is clear enough that an AI can use it correctly from one example, your DSL is well-designed. The grammar is doing its job as a specification, not just as a parser definition.

If the AI produces invalid output or misses the idiom, the grammar is telling you something about its own clarity.

ZDL passed that test. Worth noting when you are deciding whether a domain-specific language is worth the investment.
