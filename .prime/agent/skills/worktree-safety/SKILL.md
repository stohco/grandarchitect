# Skill: worktree-safety

## Description

Ensures all agent work happens in isolated Git worktrees — never directly
on main. Prevents merge disasters, unpushed work, and dirty workspace
incidents.

## When to Use

- Before ANY agent starts editing files
- When creating a new work session
- Before committing or pushing

## Rules

### 1. NEVER work on main directly

```bash
# WRONG
cd /home/z/my-project
# ... edit files on main ...

# RIGHT
git worktree add ../grandarchitect-work -b work/transform-reliability
cd ../grandarchitect-work
# ... edit files in isolated worktree ...
```

### 2. One editing agent per worktree

Multiple read-only reviewers can observe, but only ONE agent has write
access to a given worktree. This prevents the merge disaster that
produced 29,000+ conflicting additions in commit 35e617e.

### 3. Always start from a known commit

```bash
git worktree add ../work -b work/task-name <base-commit-sha>
```

Record the base commit SHA in the evidence bundle.

### 4. Commit with provenance

Every commit message must include:
- What was changed
- Why (what bug/feature)
- What was verified
- What was NOT verified (honest limitations)
- Evidence bundle path (if applicable)

### 5. Push before claiming complete

```bash
git push origin work/task-name
```

Verify:
```
git rev-parse HEAD                          # local SHA
git ls-remote origin refs/heads/main        # remote SHA (if merged)
```

Both must match before claiming "pushed".

### 6. Clean up worktrees

After merging:
```bash
git worktree remove ../work
git branch -d work/task-name
```

### 7. Never force-push to main

Force-push is only allowed on work branches, and only after coordinating
with all agents that have access.

## Worktree verification checklist

Before starting work:
- [ ] Worktree is NOT the main repo directory
- [ ] Base commit SHA recorded
- [ ] Branch name is descriptive (work/task-name)
- [ ] Only ONE agent has write access

Before claiming complete:
- [ ] All changes committed (no uncommitted files)
- [ ] Commit message includes provenance
- [ ] Branch pushed to remote
- [ ] Local HEAD === remote HEAD
- [ ] Evidence bundle references the correct commit SHA
- [ ] Worktree is clean (`git status --porcelain` returns empty)
