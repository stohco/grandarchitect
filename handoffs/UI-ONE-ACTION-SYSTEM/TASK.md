# TASK — UI-ONE-ACTION-SYSTEM

## Mission

Finish the interrupted ONE-ACTION-SYSTEM work in worktree `swarm-a` (branch
`swarm/a-one-action-system`, base commit `064a14e`), then prove it:

1. **Invoke path** — every action resolves to a real handler or an honest
   `DISABLED_WITH_REASON`; never a silent no-op.
2. **UI wiring** — toolbar / keyboard shortcuts / command palette / context
   menus all resolve through the canonical registry.
3. **Broken controls** — toolbar Stop (illegal world-state transition),
   playtest chat input focus guard, fork, Ctrl+Z.
4. **Parity conformance test** — 5 actions (world.generate, global.select,
   global.translateMode, global.undo, playtest.toggle) reachable by the same
   ID from: UI registry, keyboard shortcuts, command palette, Architect
   discovery; invoke() returns real results or honest disabled reasons.
5. **Self-verify** — typecheck, lint, 3 conformance suites (exact exit codes).
6. **Clean** — delete `dev-smoke.log.err`, restore `tsconfig.tsbuildinfo`.
7. **Commit** on the branch.

## Constraints honored

- No `Math.random()` in simulation paths.
- No React state in physics hot paths (playtest remains runtime-driven).
- No new UI panels as proof (palette panel was pre-existing).
- Never touched `main`; no edits to `src/engine/assets/**`,
  `terrain-plugin.ts`, `physics-runtime.ts`, `src/engine/plugins/simulation/**`.
- `bun run build` NOT run (mission constraint).
- No packages installed.

## Outcome

Commit `1738795088ae68426d417062dd9b75c9051a4789` on
`swarm/a-one-action-system`. See `CHANGES.md`, `EVIDENCE.json`, `NEXT.md`.
