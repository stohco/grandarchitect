# Skill: capability-promotion

## Description

Defines the exact process for promoting a capability from one maturity
level to the next. Prevents false "done" claims by requiring evidence
at each stage.

## When to Use

- When a capability is ready to move up the maturity ladder
- Before updating a dashboard or status report
- When registering a frontier technique as "accepted"

## Maturity Ladder

```
vision → specified → typed-interface-only → pure-prototype →
  integrated-prototype → browser-proven → production-candidate → validated
```

Also: `rejected` (tried and abandoned) and `blocked` (has a known blocker).

## Promotion Requirements

### vision → specified
- A document describes the capability
- Acceptance criteria are defined
- No code yet

### specified → typed-interface-only
- TypeScript interface/types defined
- No runtime implementation
- Must NOT be claimed as "implemented"

### typed-interface-only → pure-prototype
- A working implementation exists in isolation
- Unit tests pass for the pure functions
- NOT integrated into the editor/runtime

### pure-prototype → integrated-prototype
- The capability is wired into the editor or runtime
- It can be exercised through the UI
- NOT verified in production build
- NOT verified in real browser

### integrated-prototype → browser-proven
- Works in REAL Firefox browser (not headless synthetic)
- Works in REAL Chromium browser
- Production build succeeds
- No console errors during the workflow
- Evidence bundle preserved
- The EXACT user workflow passes end-to-end

### browser-proven → production-candidate
- All acceptance gates pass (lint, typecheck, build, browser tests)
- Undo/redo works correctly
- No memory leaks after 100 repetitions
- Independent reviewer returns "pass"
- Evidence bundle reviewed by a human

### production-candidate → validated
- Independently verified by a second agent or human
- Evidence bundle preserved permanently
- Known limitations documented
- Added to the capability ledger with `lastVerifiedCommit`

## Anti-patterns (NEVER do these)

- Claim "implemented" when only the interface exists
- Claim "browser-proven" when only dev mode was tested
- Claim "fixed" without reproducing the original failure
- Claim "validated" without an evidence bundle
- Promote a capability without a `lastVerifiedCommit` SHA
- Treat a passing lint as proof of anything beyond lint cleanliness
- Treat a 200 API response as proof of a working capability
- Treat a registry entry as proof of implementation

## Required fields for each capability

```
capability_id: string
owner_module: string (source file path)
maturity: (from ladder above)
last_verified_commit: string | null
acceptance_suite: string | null
evidence_bundle: string | null
known_limitations: string[]
current_blocker: string | null
```
