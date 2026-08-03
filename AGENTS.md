# AGENTS.md

This file governs all work in this project. Every agent, every task, every layer. Read it before you start. Honor it while you work. Cite it when you push back.

---

## Part 1 — Ponytail (engineering discipline)

- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.
- Study how established products solve the problem before designing a solution. Adopt their proven patterns and conventions rather than inventing an approach from scratch.

## Part 2 — Karpathy skills (agent behavior)

- Think before coding. State assumptions, surface tradeoffs, push back when warranted.
- Simplicity first. Minimum code that solves the problem. Nothing speculative.
- Surgical changes. Touch only what you must. Clean up only your own mess.
- Goal-driven execution. Define success criteria. Loop until verified.

These bias toward caution over speed. For trivial tasks (typo fixes, obvious one-liners), skip the rigor. The goal is reducing costly mistakes on non-trivial work, not slowing down simple changes.

## Part 3 — Lessons from the xianxia design corpus (engine, not just brake)

These principles are distilled from two rounds of harsh critique on a large design-research corpus. That corpus was the most rigorous negative-feedback control system I have ever reviewed — and it had no positive-feedback design engine. Every principle below exists to prevent that failure mode. Read them as the engine Ponytail and Karpathy do not provide.

### Build the engine, not just the brake
Every forbidding rule must be paired with a positive specification of what you are building toward. A document of prohibitions produces disciplined emptiness. Before adding another gate, ask: what does this gate unlock? If the answer is "more gates," do not write it. State the experience, the outcome, or the capability — not just the constraint.

### Make decisions; do not defer in the name of rigor
"Defer / select none" is not intellectual honesty when it is the answer to every fork. A research program that preserves every option forever ships nothing. Close a door. If the decision is wrong, the world will tell you. The cost of a wrong decision is almost always lower than the cost of no decision multiplied by the number of forks remaining.

### Authorize the smallest end-to-end thing that works
A binary "research / production" gate with a "measured evidence required" exit is a closed loop if measurement requires code. Break it. Authorize narrowly scoped prototypes as research artifacts — one verb, one scene, one transaction — and let measured evidence replace hypothesis. The smallest thing that runs teaches more than the largest thing that is written about.

### Exhibit reviewer voices; do not self-certify
An audit that quotes no first-person objection, preserves no dissent, and names no reviewer is a position paper wearing a review's clothes. If you ran a review, sign it. If a reviewer disagreed, quote them. Uniform "every finding repaired" closure is the tell that no real review happened.

### Do not confuse the apparatus with the work
Governance, ontologies, contradiction registers, test architectures, and red-team checklists are apparatus. They are useful only in service of work someone wants to use. If the apparatus is growing and the work is not, you are building a cathedral of governance for a faith with no congregation. Audit the ratio: every page of apparatus should produce at least one page of experience.

### Confront the central tension directly
Every domain has a central tension between what the doctrine forbids and what the genre/tradition/user expects. Xianxia forbids power acceleration; xianxia readers want power acceleration. Do not dissolve the tension by redefinition and then assert the residue is "worth it." Name the tension, choose a side, defend the choice, and provide a positive account of what the user gets instead.

### Design for joy first; the system serves the experience
Before any ontology, before any contract, before any test architecture, answer: what does the player do in the first hour, and why do they want a second hour? Session 1, session 10, session 100. The first verb. The first awe. The first failure that teaches. The loop. The thing you tell a friend. If this cannot be written, no amount of system rigor will save the project.

### Cite the precedent; do not float above it
Every claim about readability, feel, pacing, or fun must be anchored to a shipped product. "Readable counterplay" means what — as readable as Sekiro's deflection window? As Monster Hunter's tell animations? Name the game, name the mechanic, name the number. Uncalibrated thresholds are aspiration dressed as engineering.

### Police historical derivation as rigorously as literary derivation
If your originality apparatus has twelve tests for "did you copy a novel" and zero tests for "did you silently import a 16th-century social structure as universal," the apparatus is asymmetric. Derivation from history is still derivation. Name the base; audit the base; do not pretend a late-imperial synthesis is an original universe because the proper nouns were changed.

### Engage the primary source, not the secondary summary
A research record built on anglophone academic summaries of a tradition will inherit every emphasis and silence of those summaries. Go to the primary text. Cite the edition. Translate the passage. If you cannot read the source language, name the reviewer who can. A claim sourced from a teaching packet is not the same epistemic object as a claim sourced from the text itself.

### Add exits, not gates
Every governance addition should be measured by whether it reduces the distance from today to a working thing. A new gate that depends on three other unresolved gates multiplies the closure time. A new exit that lets one subsystem proceed while others wait divides it. Prefer exits.

### State the calendar and the budget
Per-track hours without a project-level timeline is a ceiling without a floor. Name the date. Name the budget. Name the staffing. A governance system designed for a fifty-person research institute, run by fewer people than that, is a machine for producing bounded unknowns forever. The honesty about scale is itself a deliverable.

### Ship the working thing before the perfect thing
The smallest end-to-end working product teaches more than the largest incomplete vision. A mortal village that runs in a browser for one hour, with one verb that feels good, is worth more than ten thousand lines of design doctrine about a century-spanning multiverse. Ship the valley. If the valley feels hollow, you have learned the most important thing you could learn — and you have learned it now, not after another year of governance.

## Part 4 — David Ondrej skills (the workflow toolkit)

Source: `github.com/davidondrej/skills` (MIT, 3.0k stars, verified Aug 2026). A library of reusable agent skills grouped into five categories. These are the workflow tools — use them when the task calls for them, not as ambient context. Each skill loads on demand.

### Thinking and docs — use these before and after building

- **`/before-building`** — fire the instant a build is proposed. Surface the 1-3 truly consequential choices hidden in the idea (one-off vs. repeated later, few lines vs. proper module, biggest thing it could break). Gut answer, no tool calls, then stop and wait. This is the Ponytail §8 "study established products" and Karpathy §1 "think before coding" made into a single reflex. Use it before every non-trivial build.
- **`/decisions`** — after a work session, list the choices made that you are not confident about. Retrospective; surfaces the doubts. Pair with Part 3's "Exhibit reviewer voices" — this is how you self-audit instead of self-certify.
- **`/next-decision`** — drill open decisions one at a time: present the most important unresolved decision, give four choices, state a preference, ask the user, then stop. Forward-looking; the complement to `/decisions`. Use when a plan has several unresolved forks and you are tempted to defer all of them (Part 3's "Make decisions" failure mode).
- **`/before-building` → `/decisions` → `/next-decision`** is the decision loop. Before = surface choices. During = do the work. After = surface doubts. Next = pick the next unresolved one. Do not let more than one round of this loop pass without closing a decision.

### Skill authoring — use when writing or revising skills

- **`effective-agent-skills`** — the consolidated reference on how to write SKILL.md files: progressive disclosure, design patterns, anti-patterns, testing, security. Read this whenever a skill is being created, edited, or reviewed. Do not write a SKILL.md without it.

### Research and web — use for the xianxia source research

- **`deep-research`** — find and pull information from the web, research APIs, browsers, and YouTube. Use for the primary-source research the xianxia corpus requires (齊民要術, 王禎農書, 天工開物, 大清律例, 地方志, 族譜).
- **`research-prompt`** — a structured prompt for research tasks. Use when the research question is ambiguous and needs scoping before fetching sources.
- **`browser-harness`** — browser automation for research. Use when a source requires interaction (scrolling, clicking, login) to access.

### Agent orchestration — use for the prototype build

- **`launch-subagent`** / **`codex-subagent`** — delegate work to a subagent. Use for parallelizable prototype tasks (e.g., the determinism module and the asset pipeline can proceed in parallel).
- **`handoff`** — pass work between agents with a clean context. Use when a task crosses the boundary between the lore work and the code work.
- **`goal-loop`** — run an agent against a goal until verified. Use for the prototype's "build → test → fix → re-test until the hash matches" loop (Karpathy §4).
- **`gpt-review`** / **`fable-review`** — independent review of agent output. Use to satisfy Part 3's "Exhibit reviewer voices" — an actual second pass, not a self-certified audit.

### Ops and setup — use for the platform work

- **`global-agent-guardrails`** — cross-cutting safety rules. Use as a baseline before any ops work.
- **`vps-server-management`** — server setup. Use for self-hosting (required for COOP+COEP per the Three.js research; GitHub Pages will not work).

### How to use these skills

- **Load on demand, not ambiently.** A skill loaded into context that is not being used is context tax. Ponytail §2: avoid speculative abstractions, and that includes speculative context.
- **Prefer the slash command.** `/before-building`, `/decisions`, `/next-decision` are designed to be invoked at the moment of need. Do not pre-load them.
- **The skills are tools, not doctrine.** Parts 1-3 are the doctrine that governs *how* and *what*. Part 4 is the toolkit for *when* and *how to execute*. A skill used badly (e.g., `/next-decision` invoked to defer rather than to decide) violates Part 3 even though the skill itself is sound.

---

## How to use this file

- Before starting any task: read Parts 1 and 2. They govern how you work.
- Before designing anything: read Part 3. It governs what you work toward.
- When the task calls for a workflow tool: consult Part 4. Load the skill on demand.
- When you find yourself adding a gate, a contract, or a red-team test: stop. Ask whether you are adding brake or engine. If only brake, also write the engine.
- When you find yourself deferring a decision: ask whether deferral is honesty or refusal. If the latter, decide. Use `/next-decision` to make yourself pick.
- When you finish a task: cite which principles you honored and which you violated, and why. Use `/decisions` to surface the doubts you are not confident about. The citation is the review.
