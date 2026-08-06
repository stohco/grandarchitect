# START HERE — Grand Architect Repository Onboarding

> **Read time:** 2 minutes. This file is the only thing you must read at start.

## What this project is

**Grand Architect** (a.k.a. *Live Architect Studio*) is a research-stage
deterministic **xianxia multiverse engine** plus a **Live Architect Studio**
editor. It is **not** production-ready. It is a long-running research codebase
that mixes:

- a Next.js 16 + React Three Fiber editor shell,
- a TypeScript engine kernel with a plugin / capability / architect control plane,
- a Rapier physics runtime,
- a large frozen design corpus (`corpus-extension/`, 48 docs),
- a frozen engine-architecture spec (`engine-architecture/`, 50 docs).

## The four files you actually need

1. **`AGENTS.md`** — root constitution (~2 pages). Universal rules.
2. **`.ai/project.manifest.json`** — verified machine-readable front door.
   Read this before running *any* command. It tells you which commands
   actually exist and which currently fail.
3. **The nearest directory-level `AGENTS.md`** for your task subtree
   (`src/engine/AGENTS.md`, `src/components/editor/AGENTS.md`,
   `src/app/api/AGENTS.md`).
4. **The active task handoff** under `handoffs/<task-id>/` if one was assigned.

## Authority precedence (high to low)

1. Executed source code and configuration
2. Reproducible tests and captured evidence
3. Generated `.ai/*.json` manifests
4. Accepted architectural / product decisions
5. Maintained explanatory documentation
6. Worklogs and agent self-reports
7. Screenshots

When sources disagree, **report the conflict** — do not silently pick one.
See `.ai/authority-map.json`.

## First command

```bash
bun run ai:doctor
```

It prints the exact SHA, dirty state, verified commands, current milestone,
critical blockers, and authoritative paths. Use **only** the commands it
reports as verified. Do not invent scripts.

## Hard rules

- Do **not** install packages without an approved capability gap.
- Do **not** add panels or endpoints as a substitute for integration.
- Do **not** use `Math.random()` in simulation code.
- Do **not** treat a 200 response, a screenshot, a registered type, or an
  agent self-report as implementation proof.
- Do **not** modify `AGENTS.md`, permission boundaries, audit systems, or the
  autonomous runner without an explicitly authorized task.

## Completion report format

When you finish a task, report:

- exact SHA after your work;
- dirty state;
- files changed;
- commands run and their exit codes;
- evidence artifacts (paths under `evidence/` or `artifacts/`);
- known failures (honest);
- maturity assessment (honest).

Then update or create the relevant `handoffs/<task-id>/` bundle.

## Where deeper information lives

- `docs/product/engineering-principles.md` — extended engineering philosophy.
- `docs/FRONTIER_TECHNOLOGY_MATRIX.md` — frontier tech maturity matrix.
- `docs/FRONTIER_SELF_CRITIQUE.md` — brutal honest evaluation.
- `engine-architecture/` — frozen engine architecture spec.
- `corpus-extension/` — frozen xianxia design corpus (Bible).
- `roadmap-state.json` — machine-readable phase/task roadmap.
- `worklog.md` — historical iteration log (testimony, **not** proof).

## What NOT to load at startup

- Do not load the entire `corpus-extension/` Bible. Use the `authorial`
  context profile and retrieve sections on demand.
- Do not load all of `engine-architecture/`. Use the `engine` profile.
- Do not load `recovery-manifest.json` (598 KB). It is archived runtime
  state, not current truth.
- Do not ingest `worklog.md` as proof of current state — it is testimony.
