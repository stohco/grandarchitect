# Audit Completion

## Objective

Before reporting ANY task as complete, verify:

1. **Git state convergence**
   - `git status --porcelain` returns empty (clean worktree)
   - `git rev-parse HEAD` === `git ls-remote origin refs/heads/main`
   - Raw GitHub files at that SHA match local files

2. **Build provenance**
   - `/api/build-info` returns the correct commit SHA
   - `artifact.dirty === false` (workspace was clean at build time)
   - `workspaceChanged === false` (no post-build changes)

3. **Acceptance gates**
   - All required gates passed (lint, typecheck, build, browser tests)
   - Exit codes are 0
   - Test reports are machine-readable JSON (not regex-parsed stdout)
   - Browser tests used real pointer events in Firefox AND Chromium

4. **Evidence bundle**
   - Saved to `evidence/<date>-<task>/`
   - Contains: build-info.json, commands.log, test-results/, screenshots/, console-output.log, verdict.json
   - Known limitations documented honestly
   - Independent reviewer verdicts included

5. **Honest classification**
   - Capability maturity correctly classified on the ladder
   - No false "done" / "implemented" / "fixed" claims
   - Known limitations explicitly stated
   - Current blocker documented (if any)

## Red flags (STOP if any of these are true)

- "I pushed it" but `git ls-remote` doesn't match local HEAD
- "It works" but only dev mode was tested
- "Fixed" but Firefox wasn't verified
- "Tests pass" but exit code wasn't checked
- "Clean" but `git status --porcelain` is non-empty
- "Implemented" but only the interface exists
- "Browser-proven" but synthetic events were used
- "Validated" but no evidence bundle exists
