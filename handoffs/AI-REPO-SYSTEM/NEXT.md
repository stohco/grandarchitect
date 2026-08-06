# Next — AI-REPO-SYSTEM

## One bounded next step

Run `bun run ai:doctor` and `bun run ai:check` to verify the system works
end-to-end. Fix any drift they report. Then append a work record to
`worklog.md` and commit.

## After this step (follow-up tasks, not this one)

These are **separate tasks** — do not attempt them as part of AI-REPO-SYSTEM:

1. **Untrack `tsconfig.tsbuildinfo`** — `git rm --cached tsconfig.tsbuildinfo`.
   It is gitignored but tracked from before. Low-severity; ai:check flags it.

2. **Fix the existing TypeScript errors** in `src/engine/studio/*` (missing
   re-exports of `CapabilityId`, `EntityId`, `PluginId`, `Tick` from
   `src/engine/studio/types.ts`) and `src/lib/determinism/hash.ts`
   (`Uint8Array<ArrayBufferLike>` not assignable to `BufferSource`). This
   unblocks `bun run typecheck` exit 0.

3. **Add a canonical `test` script** to `package.json` that runs all
   conformance tests in one command. Currently they must be run individually
   as standalone TypeScript files.

4. **Archive historical testimony** — move `recovery-manifest.json`,
   `retrofit-audit-report.md`, and stale `roadmap-state.json` into
   `docs/archive/` with a clear index. They remain testimony (rank 6 in the
   authority map) but no longer clutter the repository root.

5. **Build the architecture graph generator** (`scripts/ai-context/graph.ts`)
   that programmatically derives `.ai/architecture.graph.json` from the
   TypeScript import/export structure, API routes, StudioActionRegistry,
   Architect tool registry, capability/provider registrations, Prisma schema,
   and test imports. Per the directive: every generated node must include
   source file and source span; do not create unsupported semantic edges
   through LLM guessing.

6. **Build the generated context summaries** (`.ai/generated/core-context.md`,
   `ui-context.md`, `engine-context.md`, `authorial-context.md`) from the
   context profiles. These are the "30 seconds / 3 minutes / 10 minutes"
   layer the directive describes.

7. **Build the clean-clone onboarding test harness** (directive section 13).
   Spin up a fresh worktree, hand a new agent only the repository URL and a
   task ID, and measure: commands attempted, failed commands, files read,
   elapsed time, context size, incorrect claims.

8. **Build the optional MCP server** (directive section 14) exposing
   `repo.describe`, `repo.doctor`, `repo.getCurrentMilestone`, etc. as
   read-only tools. Must read the generated repository model — must not
   become another manually maintained truth source.

9. **Migrate root-level PNGs** into `evidence/screenshots/` or
   `docs/archive/screenshots/`. ai:check currently warns (does not fail)
   about tracked root PNGs.

## Do NOT do next

- Do not start a new engine feature until the typecheck blocker is resolved.
- Do not add new panels or endpoints.
- Do not modify `AGENTS.md`, permission boundaries, or audit systems without
  an explicitly authorized task.
- Do not load the entire `corpus-extension/` Bible into a single agent startup
  context. Use the `authorial` context profile and retrieve sections on
  demand.
