# Matter Conservation — Handoff

**Task:** MATTER-CONSERVATION resource specialist (swarm/f-matter-conservation)

## What was done

A deterministic matter-conservation core subsystem under `src/engine/world/matter/`:

1. **MaterialComposition** (`material-composition.ts`) — primary material + bulk
   density (kg/m³) + constituents [{materialId, massFraction, grade}] +
   spiritualProperties {qiDensity, elementalAffinity, purity, grade, ageYears}.
   Seeded deterministic table for the existing block palette (stone, earth,
   sand, clay, wood, ore:iron, ore:copper, ore:spirit-stone). `composeFromVolumes`
   builds region compositions (used to prove ore-vein fraction lifting).

2. **MatterRemovalEvent** (`matter-events.ts`) — eventId, actorId, source
   {worldId, regionId, terrainRevision}, bounds, centroid, materials
   [{materialId, removedVolumeM3, removedMassKg, grade, purity}], cause,
   techniqueId/toolId, recovery {baseEfficiency, realizedEfficiency},
   totals, tick.

3. **RecoveryProfile** (`recovery-profile.ts`) — efficiency by cause:
   careful-harvest 0.95-1.0, clean-cut 0.90-1.0, smash 0.80-0.95,
   shockwave 0.70-0.90, explosion 0.60-0.90, disintegration 0.20-0.45,
   material-control 0.90-1.0. Seeded deterministic draw + recoveryBoost clamp.

4. **MatterAccounting** (`matter-accounting.ts`) — idempotent-per-eventId
   "removed vs recovered" ledger, deterministic kg rounding, stable totals.

5. **LootAccumulator** (`loot-accumulator.ts`) — spatial cells (8m default),
   merge window (4 ticks default), compatible = material+grade+owner+cell,
   caps visual orbs per cell (8 default), mass-weighted centroids, flush().

6. **MatterSink** (`matter-sink.ts`) — the single pipeline:
   destruction op → volume (sphere math) → composition → removed mass →
   MatterRemovalEvent → accounting → accumulator. Singleton `getMatterSink()`.

7. **Wiring** — `engine-runtime.ts` terrain.subtract-sphere handler emits
   removal events; matter result rides the transaction inverse payload;
   `EngineRuntimeImpl.matter` exposes the sink. `/api/world/destruct` runs
   the operation through the sink and returns matter accounting.

8. **Conformance** (`matter-conformance.ts`, 54 asserts) — conservation,
   composition, efficiency ordering, aggregation, determinism, ledger
   integrity. Wired into dashboard-data CONFORMANCE_FILES (expected 54).

## Data flow

```
TerrainDestructionOperation (engine-runtime handler /api/world/destruct)
  → MatterSink.onTerrainDestruction()        matter-sink.ts:169
  → sphereVolumeFromTransform()              matter-sink.ts:122
  → getComposition()                         material-composition.ts:177
  → MatterRemovalEvent                       matter-sink.ts:199
  → MatterAccounting.accountRemoval()        matter-accounting.ts:63  (idempotent)
  → LootAccumulator.addEvent()               loot-accumulator.ts:118 (dedupe by eventId)
  → aggregated LootEntry[] (≤8 orbs/cell)    loot-accumulator.ts:224
```

## Verification

- `bun run lint` → exit 0 (0 errors, 2 pre-existing warnings in asset-compiler)
- `bun run typecheck` → exit 0 (manifest blocker resolved on this branch)
- `bun run src/engine/world/matter/matter-conformance.ts` → 54/54, exit 0
- `bun run src/engine/conformance-test.ts` → 37/37, exit 0
- `bun run src/engine/architect/conformance-test.ts` → 113/113, exit 0
- `bun run src/engine/plugins/simulation/conformance-test.ts` → 247/247, exit 0
- Runtime smoke: subtract-sphere via executeCommand → sink summary
  {removed 40714.92 kg, recovered 34929.33 kg, ratio 0.8579 (shockwave range ✓),
   accountedEvents 1, loot 2 orbs}; transaction carries matter result.

## Known limitations (honest)

- Volume is derived from transform.scale sphere math, not a real SDF query
  (no density field exists yet — pre-existing gap, see destruction-milestone).
- Per-constituent volume splits by mass fraction against one bulk density.
- Ledger is append-only; transaction.undo removes the destruction op from
  the log but does NOT reverse the ledger (undo of loot = future work).
- Re-submitting an identical command creates a NEW op id → a new removal,
  consistent with terrain (destructionLog also grows). Same-op-id replay is
  fully idempotent (proven).
- Client vacuum / inventory UI explicitly NOT wired (out of scope).
- API route emits through the sink directly (transport over engine service);
  it does not call executeCommand (no cell exists in the route's current flow).

## Maturity

- Composition/accounting/recovery/aggregation core: working, determinism-proven
- Runtime + API wiring: prototype (in-memory, dev-mode)
- Visual orbs / vacuum / inventory: placeholder (flush() exists, not consumed)
