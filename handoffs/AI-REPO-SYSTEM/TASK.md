# AI-REPO-SYSTEM — Create AI-Native Repository Handoff and Introspection System

## User outcome

A completely new AI development studio (Claude Code, Gemini CLI, Codex,
Copilot, Prime Agent, or a future agent) can clone this repository and
**without access to prior chat history**:

1. understand what the project is in 30 seconds;
2. identify which commands actually work in 3 minutes;
3. locate the relevant subsystem, its maturity, and its tests in 10 minutes;
4. resume work on the current milestone from the exact boundary the previous
   agent reached;
5. complete one small change and pass validation.

## In scope

- Audit current context sources (AGENTS.md, README.md, worklog.md,
  roadmap-state.json, recovery-manifest.json, agent-ctx/, .prime/agent/,
  docs/, engine-architecture/, corpus-extension/, screenshots).
- Define a 7-level authority precedence hierarchy (`.ai/authority-map.json`).
- Create `.ai/START_HERE.md` (2-minute onboarding).
- Create `.ai/project.manifest.json` (verified machine-readable front door)
  with actual git SHA, actual package.json scripts, honest unknowns.
- Create `.ai/context-profiles.json` (core/ui/engine/authorial/physics/terrain).
- Create `.ai/schemas/*.schema.json` (JSON Schema for validation).
- Rewrite root `AGENTS.md` as a concise (~2 page) front door.
- Move extended engineering philosophy to
  `docs/product/engineering-principles.md`.
- Add hierarchical `AGENTS.md` files for `src/engine/`,
  `src/components/editor/`, `src/app/api/`.
- Create tool shims: `CLAUDE.md`, `GEMINI.md`,
  `.github/copilot-instructions.md`.
- Create `scripts/ai-context/` with `doctor.ts`, `check.ts`, `build.ts`.
- Add `ai:doctor`, `ai:check`, `ai:build` scripts to `package.json`.
- Create `handoffs/AI-REPO-SYSTEM/` as the example handoff bundle.
- Clean `.gitignore` to exclude runtime data, backups, logs,
  `tsconfig.tsbuildinfo`, `data/`.
- Add a drift-detection case for the README `bun run typecheck` reference.

## Out of scope

- The optional MCP server (directive section 14 — explicitly optional/later).
- A full architecture graph generator (`architecture.graph.json` with
  thousands of nodes) — the directive explicitly warns against a
  manually-maintained graph with thousands of nodes. A minimal version can be
  added in a follow-up task once the static manifest is proven.
- The clean-clone onboarding test harness (directive section 13) — requires
  a fresh worktree and a measurement rig. Follow-up task.
- Generating `core-context.md`, `ui-context.md`, `engine-context.md`,
  `authorial-context.md` under `.ai/generated/`. These are future generated
  summaries — the context profiles are defined but the generator is not built
  yet.
- Auto-discovering capabilities, actions, routes, ui-surfaces, tests,
  maturity, known-failures as separate `.ai/*.json` files. The manifest
  captures the essential blockers and maturity; deeper inventories are a
  follow-up.
- Migrating runtime PNGs out of the repository root (warn-only in ai:check).
- Removing `recovery-manifest.json` (598 KB) from the repository — it is
  gitignored going forward but not deleted.

## Acceptance

See `EVIDENCE.json` for the full claim/evidence mapping. Summary:

1. `bun run ai:doctor` runs and prints a useful report. → proven
2. `bun run ai:check` runs and either passes (exit 0) or fails (exit 1) with
   specific drift messages. → proven
3. `bun run ai:build` runs and refreshes `.ai/project.manifest.json` provenance
   + command exit codes. → proven
4. Tool shims (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`)
   are byte-identical except for the first two lines. → proven
5. `AGENTS.md` is under ~2 pages. → proven
6. Hierarchical `AGENTS.md` files exist for `src/engine/`,
   `src/components/editor/`, `src/app/api/`. → proven
7. The README references `bun run typecheck` and `package.json` defines it
   (the historical drift is fixed; ai:check enforces it going forward).
   → proven
8. `.ai/project.manifest.json` uses the actual git SHA
   `e0ca9b3161a030733c5c9cc16435669265eda9d0` and actual package.json
   scripts. → proven
9. Unknown authoritative paths are marked `"status": "unknown"` with a
   reason — not invented. → proven
10. `.gitignore` excludes runtime data, backups, logs, tsconfig.tsbuildinfo,
    data/, tool-results/, agent-ctx/, upload/. → proven

## Authority

This task is authorized to modify:
- `AGENTS.md` (rewrite — extended essays preserved in
  `docs/product/engineering-principles.md`)
- `README.md` (Quick Start section only)
- `.gitignore` (add patterns)
- `package.json` (add ai:* scripts only)
- New files under `.ai/`, `scripts/ai-context/`, `handoffs/AI-REPO-SYSTEM/`,
  `docs/product/`, `.github/`, and the three hierarchical `AGENTS.md` files.
- New tool shims `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`.

This task is NOT authorized to:
- Modify engine source code, permission systems, audit systems, or the
  autonomous runner.
- Delete `recovery-manifest.json`, `roadmap-state.json`, or other historical
  artifacts (they are testimony per the authority map; archive, do not delete).
- Promote any capability maturity.
- Install new packages.

## References

- Directive: `upload/Pasted Content_1786047075967.txt` (1327 lines)
- Audit baseline: `worklog.md` (1479 lines, historical testimony)
- Honesty baseline: `docs/FRONTIER_SELF_CRITIQUE.md`
