# Stabilize Capability

## Objective

Prove reliable entity transform editing in Firefox and Chromium, including:
- Translate, rotate, scale
- Atomic commit (one store update per drag, not per-field)
- Correct transform semantics (translation doesn't change scale)
- Undo/redo (inverse/forward patches, exact value restoration)
- No Zustand getSnapshot warning
- No error-boundary activation
- Exact build provenance (commit SHA, clean workspace)

## Success Criteria

ALL of the following must pass:

1. `npm run lint` — exit 0
2. `npm run typecheck` — exit 0 (modified files only — 254 pre-existing errors are known debt)
3. `npm run build` — exit 0
4. `npm run test:browser:chromium` — all assertions pass
5. `npm run test:browser:firefox` — all assertions pass (THE USER'S BROWSER)
6. No `getSnapshot should be cached` warning in either browser
7. No `Maximum update depth exceeded` in either browser
8. Exactly one transaction per gizmo drag (not multiple)
9. Undo restores exact previous values
10. Redo restores exact edited values
11. Build SHA in status bar matches committed source
12. Clean worktree at commit time

## Anti-success (any of these = FAILURE)

- Claiming "fixed" without Firefox verification
- Claiming "pushed" without verifying raw GitHub files
- Dev-mode-only testing (production build required)
- Synthetic pointer events (real browser interaction required)
- Self-certification (independent reviewer required)
- Dirty workspace at commit
- Mismatched local/remote SHA
