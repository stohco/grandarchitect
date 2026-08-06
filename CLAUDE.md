# Grand Architect Repository Context (Claude Code)

> **This file is a shim.** It exists only because Claude Code reads `CLAUDE.md`
> as repository memory. The canonical instructions live elsewhere. This file
> must never diverge from the other tool shims — all three are generated from
> the same template.

## Read and obey, in order

1. `AGENTS.md` — root constitution.
2. `.ai/START_HERE.md` — 2-minute onboarding.
3. `.ai/project.manifest.json` — verified commands, blockers, maturity.
4. The nearest directory-level `AGENTS.md` for your task subtree
   (`src/engine/AGENTS.md`, `src/components/editor/AGENTS.md`,
   `src/app/api/AGENTS.md`).
5. The active task handoff under `handoffs/<task-id>/` if one was assigned.

## First command

```bash
bun run ai:doctor
```

It prints the exact SHA, dirty state, verified commands, current milestone,
and critical blockers. Use **only** commands it reports as verified.

## Authority precedence

See `.ai/authority-map.json`. Short version: code > tests > generated
manifests > decisions > docs > worklogs > screenshots. When sources
disagree, report the conflict.

## What NOT to do

- Do not rely on `worklog.md` or screenshots as current truth.
- Do not run `bun run dev` (it is already running in this environment).
- Do not use `bun run build` (sandbox restriction; use `bun run lint` and
  `bun run typecheck` instead).
- Do not install packages without an approved capability gap.
- Do not modify `AGENTS.md`, permission boundaries, or audit systems
  without an explicitly authorized task.

## Drift check

Run `bun run ai:check` before claiming any task complete. It fails when
documented commands don't exist, manifests are stale, or the tool shims
drift from each other.
