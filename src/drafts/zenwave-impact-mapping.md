01 — ZenWave Platform
Goal: Build the architectural world model of your software — readable by humans, tools & AI agents

GOAL                         ACTORS               IMPACTS                                                   DELIVERABLES
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
                                                   ┌─ Designs from domain models first —         ─── ZDL + ZFL — structured format for the ubiquitous language
                             ┌─ Software      ────┤   code and docs follow the model              ─── zenwave-architecture.yml — master architecture index
                             │   Architect        └─ Navigates APIs, schemas and bounded         ─── IntelliJ plugin — API & schema explorer
                             │                       contexts directly in the IDE                     with remote registry support (Apicurio)
                             │                       connected to Apicurio and remote registries  ─── LSP server — cross-navigation between
Build the architectural      │                                                                        contexts, APIs, schemas & code
world model of your ─────────┤─ Engineering   ──── ZDL defines what the system is               ─── ZenWave SDK — full Spring Boot architecture
software — readable          │   Team              in the language of the business.                   generated from the ubiquitous language
by humans, tools             │                     SDK generates how it is built.                 ─── ZDL as spec — structured + textual descriptions
& AI agents                  │                     Agents add what it does.                           (policies, rules) as context for AI agents
                             │
                             ├─ CTO /         ──── Understands the system before                 ─── EventCatalog output — publication layer
                             │   Tech Leader       changing it — bounded contexts,                    for broader audiences
                             │                     APIs, events and why they exist
                             │
                             └─ AI Coding     ──── Operates on structured architectural          ─── MCP context layer — structured model
                                 Agent             context instead of free-form prompts               as agent context
                                                   or stale docs



WHY:
Architects don't build from memory. They work from blueprints. ZenWave Platform gives you the blueprints of your company's architecture so your teams, tools and AI agents know what they're working with.