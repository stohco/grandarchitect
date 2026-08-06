# Skill: browser-reliability

## Description

Verifies that editor workflows work in REAL browsers (Firefox + Chromium)
with REAL pointer events against PRODUCTION builds. Synthetic events and
dev-mode checks do not count.

## When to Use

- After any editor/viewport/store change
- Before claiming a UI bug is "fixed"
- As part of the acceptance gate sequence
- When verifying transform editing, undo/redo, selection, hotkeys

## Instructions

### 1. Build production

```bash
npm run build
npm run start &
```

Dev mode hides defects (React StrictMode off, Fast Refresh recovery, etc.).
Only production builds are valid for reliability verification.

### 2. Launch real browsers

Use Playwright with real browser binaries — NOT headless synthetic events.

```bash
npx playwright test --project=chromium --project=firefox
```

### 3. Execute the canonical workflow

See `src/engine/architect/workspace/acceptance-gates.ts` for the exact
EDITOR_RELIABILITY_WORKFLOW:

1. Generate Wang Family Bend
2. Select entity (real click, not synthetic)
3. Translate (real pointer down on gizmo axis, drag, pointer up)
4. Rotate
5. Scale
6. Undo × 3
7. Redo × 3
8. Switch selection
9. Return to first entity
10. Regenerate world
11. Repeat

### 4. Capture evidence

For each run, capture:
- Console errors and warnings (`page.on('console')`, `page.on('pageerror')`)
- Crash observatory state (`window.__crashObsCrashCount`)
- Transform event log (`window.__transformEvents` or fetch from API)
- Screenshots at key steps
- Video recording (Playwright `video: 'on'`)
- Build SHA from `/api/build-info`

### 5. Assert

All assertions from EDITOR_RELIABILITY_WORKFLOW.assertions must pass:
- No getSnapshot warning
- No error boundary activation
- Exactly one store update per commit
- Exactly one transaction per drag
- Transform values match expected
- Undo/redo restore exact values
- No scale change on translation

### 6. Produce evidence bundle

Save to `evidence/<date>-<workflow>-<browser>/`:
- `console.log` (captured console output)
- `crashes.json` (crash observatory state)
- `transform-events.json` (gizmo lifecycle events)
- `screenshots/` (key step screenshots)
- `video.webm` (screen recording)
- `build-info.json` (provenance)
- `verdict.json` (pass/fail + assertion results)

### Failure handling

If ANY assertion fails:
- Do NOT claim the workflow passes
- Record the exact failure with stack trace
- File as a known limitation in the completion report
- The task is NOT complete until all assertions pass in BOTH browsers
