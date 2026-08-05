# Skill: evidence-bundle

## Description

Produces structured evidence bundles that prove a capability works —
not just that code exists. Every completion report MUST include an
evidence bundle.

## When to Use

- Before reporting any task as complete
- When claiming a bug is fixed
- For capability promotion (prototype → browser-proven)
- As input to independent reviewer verdicts

## Instructions

### 1. Gather required evidence

Every evidence bundle must contain:

```
evidence/<date>-<task-name>/
├── build-info.json          # commit SHA, branch, dirty, build timestamp
├── commands.log             # every command executed + exit codes
├── test-results/            # raw test output (JSON, not regex-parsed)
│   ├── lint.json
│   ├── typecheck.json
│   ├── unit-tests.json
│   └── browser-tests/
│       ├── chromium.json
│       └── firefox.json
├── screenshots/             # key workflow steps
├── video.webm               # screen recording of workflow
├── console-output.log       # browser console (errors + warnings)
├── crash-reports/           # crash observatory dumps (if any)
├── transform-events.json    # gizmo lifecycle events (if editor)
├── reviewer-verdicts.json   # independent reviewer pass/fail
└── verdict.json             # overall pass/fail + known limitations
```

### 2. Build info

Fetch from `/api/build-info` — must include:
- `artifact.commitSha` (the build-time commit)
- `artifact.buildTimestamp` (actual build time, not request time)
- `artifact.dirty` (whether workspace was dirty at build)
- `workspace.commitSha` (current workspace commit)
- `workspaceChanged` (whether workspace differs from artifact)

If `workspaceChanged === true`, the evidence is INVALID — rebuild.

### 3. Command log

Record every command with:
- Full command string
- Exit code (must be 0 for required gates)
- Duration in milliseconds
- Stdout/stderr tail (last 20 lines)

### 4. Test results

Must be machine-readable JSON, NOT regex-parsed stdout. Each test suite
must report:
- `suite`: suite name
- `passed`: count
- `failed`: count
- `total`: count
- `ok`: boolean (exitCode === 0 && total > 0 && failed === 0)
- `exitCode`: actual process exit code
- `timedOut`: boolean

### 5. Known limitations

Honest list of what is NOT verified or NOT working:
- "Only tested on Linux, not macOS"
- "Playwright can't simulate real pointer capture — Firefox test uses synthetic events"
- "Undo restores edits but not entity creation/deletion"
- "Production build has 254 pre-existing TypeScript errors not introduced by this task"

### 6. Reviewer verdicts

Each independent reviewer provides:
- `reviewer`: role (browser-verifier, architecture-reviewer, etc.)
- `verdict`: pass | fail | needs-review
- `notes`: what they checked and what they found

A task is NOT complete unless ALL reviewers return `pass`.

### 7. Verdict file

```json
{
  "task": "Fix transform editing reliability",
  "verdict": "pass",
  "buildSha": "abc123...",
  "remoteSha": "abc123...",
  "cleanWorktree": true,
  "gatesPassed": ["lint", "typecheck", "build", "browser-chromium", "browser-firefox"],
  "gatesFailed": [],
  "knownLimitations": [...],
  "reviewerVerdicts": [...],
  "evidencePath": "evidence/2026-08-05-transform-reliability/"
}
```
