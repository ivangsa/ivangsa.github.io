01 — ZenWave Platform
Why: Understanding the big picture is the only way to create, maintain, and evolve software well.
Goal: Make the big picture of your software explicit, connected, and navigable

GOAL                         ACTORS               IMPACTS                                                   DELIVERABLES
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
                                                   ┌─ Designs from domain models first —         ─── ZDL + ZFL — structured format for the ubiquitous language
                             ┌─ Software      ────┤   code and docs follow the model              ─── zenwave-architecture.yml — master architecture index
                             │   Architect        └─ Navigates APIs, schemas and bounded         ─── IntelliJ plugin — API & schema explorer
                             │                       contexts directly in the IDE                     with remote registry support (Apicurio)
                             │                       connected to Apicurio and remote registries  ─── LSP server — cross-navigation between
Make the big picture         │                                                                        contexts, APIs, schemas & code
of your software    ─────────┤─ Engineering   ──── ZDL defines what the system is               ─── ZenWave SDK — full Spring Boot architecture
explicit, connected,         │   Team              in the language of the business.                   generated from the ubiquitous language
and navigable                │                     SDK generates how it is built.                 ─── ZDL as spec — structured + textual descriptions
                             │                     Agents add what it does.                           (policies, rules) as context for AI agents
                             │
                             ├─ CTO /         ──── Understands the system before                 ─── EventCatalog output — publication layer
                             │   Tech Leader       changing it — bounded contexts,                    for broader audiences
                             │                     APIs, events and why they exist
                             │
                             └─ AI Coding     ──── Operates on structured architectural          ─── MCP context layer — structured model
                                 Agent             context instead of free-form prompts               as agent context
                                                   or stale docs



WHY:
I believe understanding the big picture is the only way to create, maintain, and evolve software well.
That is why ZenWave Platform exists: to make the big picture of your software explicit, connected, and navigable.

I believe that understanding the big picture is the only way to create software and to maintain it and to evolve it.
Software architecture should be shared, explicit, and usable by everyone changing the system. ZenWave Platform gives you the blueprints of your company's architecture so your teams, tools and AI agents know what they're working with.
