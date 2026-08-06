# Skill: grandarchitect-repo-truth

## Description

Establishes and maintains honest repository truth — what is actually
implemented vs what is merely registered, interfaced, or prototyped.

## When to Use

- Before claiming any capability is "done" or "implemented"
- When auditing the repository for epistemic integrity
- Before writing a completion report
- When checking whether a registry entry represents real implementation

## Instructions

### 1. Verify implementation, not registration

A capability is NOT implemented because:
- An interface exists in `src/engine/`
- An API route returns 200
- A registry entry was added
- A type was defined
- A test script passed

A capability IS implemented when:
- The code runs in the actual browser
- The user workflow works end-to-end
- Evidence (screenshots, crash reports) confirms it
- It survives a production build

### 2. Check the maturity ladder

Every capability must be classified:
- `vision` — described in docs, no code
- `specified` — types/interfaces defined, no implementation
- `typed-interface-only` — interface exists, no runtime
- `pure-prototype` — works in isolation, not integrated
- `integrated-prototype` — works in the editor, not production-verified
- `browser-proven` — verified in real browser (Firefox + Chromium)
- `production-candidate` — passes all acceptance gates
- `validated` — independently verified + evidence preserved
- `rejected` — tried and abandoned
- `blocked` — has a known blocker

### 3. Verify git provenance

```
git rev-parse HEAD                          # local SHA
git ls-remote origin refs/heads/main        # remote SHA
curl -s "https://raw.githubusercontent.com/stohco/grandarchitect/main/<file>"  # verify GitHub raw
```

All three must match before claiming "pushed".

### 4. Check for dirty workspace

```
git status --porcelain
```

If output is non-empty, the workspace is dirty. Build provenance must
show `dirty: true`. Never claim "clean build" from a dirty workspace.

### 5. Produce a repo-truth report

For each capability checked, report:
- capability_id
- owner_module (source file path)
- maturity (from the ladder above)
- last_verified_commit (SHA or null)
- acceptance_suite (test name or null)
- evidence_bundle (path or null)
- known_limitations (honest list)
- current_blocker (if any)
