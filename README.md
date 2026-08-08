# Live Architect Studio — 仙侠 Multiverse Engine

A deterministic xianxia multiverse RPG engine with a Live Architect Studio editor.

**Current status:** Research Prototype. Not a production game engine. See `worklog.md` for honest maturity assessment.

## What This Is

The Live Architect Studio is a Next.js 16 + React Three Fiber + Zustand + shadcn/ui application that explores:

- A **deterministic simulation core** (LCG PRNG, no `Math.random` in simulation code)
- A **Live Architect Studio editor** with 3D viewport, outliner, inspector, and 14-tab bottom dock
- A **Crash Observatory** that captures real browser exceptions with full diagnostic bundles
- A **TransformProxy architecture** for transactional gizmo editing
- A **frontier engine** with capsule-sweep collision, BVH acceleration, and terrain pipeline
- A **Visual Evidence Fabric** schema (provider-neutral multimodal observation)
- An **RCVC** (Reasoning/Constraint/Verification/Complexity) research library

## Quick Start

```bash
bun install
bun run ai:doctor  # first command — prints SHA, blockers, verified commands
bun run dev        # http://localhost:3000
bun run lint       # ESLint
bun run typecheck  # TypeScript --noEmit (exit 0; verified by ai:doctor)
bun run ai:check   # consistency gate; fails on drift
```

> **New agent?** Read `AGENTS.md` and `.ai/START_HERE.md` first. The
> `.ai/project.manifest.json` file is the verified machine-readable front
> door — never run a command that isn't listed there as `verified: true`.

## Tech Stack

- **Framework:** Next.js 16 with App Router (Turbopack)
- **Language:** TypeScript 5 (strict)
- **3D:** Three.js + React Three Fiber + Drei
- **State:** Zustand
- **UI:** shadcn/ui (New York) + Tailwind CSS 4 + Lucide icons
- **Database:** Prisma ORM (SQLite)
- **Auth:** NextAuth.js v4 (available)

## Architecture

```
Editor (Next.js + R3F)
  ↕ commands / subscriptions
Authoritative World Repository
  ├── Simulation Scheduler
  ├── Plugin Capabilities
  ├── Persistence
  └── Event Log
      ↕
Derived Artifact Coordinator
  ├── Render Artifacts
  ├── Collision Artifacts
  ├── Navigation Artifacts
  └── Streaming Artifacts
      ↕
Presentation Backends (Three.js WebGL2/WebGPU)
```

## Honest Maturity Assessment

| Area | Maturity |
|------|----------|
| Vision and architecture | Extensive |
| Deterministic simulation modules | Pure prototype |
| Editor shell | Prototype |
| Crash Observatory | Working |
| Transform editing | Fixed (TransformProxy) |
| Terrain pipeline | Laboratory |
| Physics and embodiment | Experimental |
| Grand Architect control plane | Interface prototype |
| Visual Evidence Fabric | Schema prototype |
| Production readiness | Not established |

## Key Files

- `src/components/editor/` — Editor UI (viewport, panels, toolbar)
- `src/lib/editor/store.ts` — Zustand store (world, selection, edits, transactions)
- `src/lib/editor/crash-observatory.ts` — Browser crash capture and diagnostic bundles
- `src/lib/editor/transform-proxy.ts` — Transactional gizmo lifecycle
- `src/engine/frontier/` — Capsule collision, BVH, terrain, character controller
- `src/app/api/` — API routes (build-info, crash-report, collision-tests, world, etc.)

## License

Proprietary. See `LICENSE` for details.
