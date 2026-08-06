# Skill: architecture-conformance

## Description

Checks that new code conforms to the Grand Architect's architectural
boundaries. Prevents the "several partially overlapping engines" problem
identified in the repository audit.

## When to Use

- Before merging any architectural change
- When reviewing a new subsystem
- During the architecture-reviewer role

## Architectural Boundaries

### 1. One authoritative runtime

All world mutations must pass through:
```
User/Architect intention
  → validated command
  → authoritative world revision
  → derived render/collision/navigation artifacts
  → atomic activation
  → visible and playable result
```

NOT through:
- Direct Zustand store mutation from a React component
- Direct Three.js mesh manipulation from the editor
- An API route that bypasses the operation graph

### 2. Provider neutrality

AI providers (3D generation, VLM, RLM) must implement provider-neutral
interfaces. The engine NEVER imports a provider SDK directly.

```
WRONG: import { Hunyuan3D } from 'hunyuan3d-sdk'
RIGHT: import type { Unified3DProvider } from '@/engine/assets/unified-provider'
```

### 3. Runtime vs editor separation

- Runtime code (game engine, simulation, rendering) must NOT depend on
  React or Zustand
- Editor code (panels, toolbar, store) may use React/Zustand but must
  NOT be authoritative — it sends commands to the runtime
- AI providers must NOT be in the shipped runtime

### 4. Derived artifact coordination

All derivatives (render mesh, collision, navigation) must share the
same source revision. The DerivedArtifactCoordinator must verify
revision match before atomic activation.

### 5. No duplicate systems

Before adding a new system, check if one already exists:
- Operation graph: use `typed-graph.ts`, not a new CRUD manager
- Store: extend the existing Zustand store, don't create a parallel one
- Renderer: go through the renderer plugin, don't create direct Three.js
- Physics: go through the physics plugin, don't create inline collision

### 6. Honest classification

Every capability must be classified on the maturity ladder:
- vision → specified → typed-interface-only → pure-prototype →
  integrated-prototype → browser-proven → production-candidate → validated

Never claim a higher maturity than evidence supports.

## Review Checklist

- [ ] Does the change create a new parallel system?
- [ ] Does it bypass the authoritative runtime path?
- [ ] Does it import a provider SDK directly (instead of through interface)?
- [ ] Does it add runtime dependency on editor/AI code?
- [ ] Does it claim a maturity level without evidence?
- [ ] Does it duplicate an existing capability under a different name?
- [ ] Does it mix implementation, review, and validation in one agent?
- [ ] Does it add unauthenticated mutation routes?

If ANY answer is "yes", the change fails architecture conformance review.
