# 24 — Cosmology & Spatial Topology

**Status:** Engineering specification. How the engine represents the three strata, the stratum interfaces (Cloud Veil, Heavenly Stem), grotto-heavens nested in the Acquired Stratum, Law Reaches as regions in the Precelestial, the 1:365 time ratio, spatial pockets (nested `SpatialNode`s), the ran-substrate of the Higher Immortal World, and travel between strata and realms at each tier.
**Date:** 2026-08-03

---

## 0. What this document is

This document specifies the engine's spatial data model for a finite, qi-stratified cosmos. The lore (docs 00 §1, 15, 19, 24, 36, 37, 40, 48) commits to a specific topology: three horizontal layers stacked along a vertical axis, coextensive in horizontal position but distinct in altitude, with pocket worlds nested inside them, faster-time regions inside those, and a higher-order substrate above all of it. This document turns that topology into TypeScript interfaces and engine systems.

The central architectural commitment: **space is a tree of `SpatialNode`s, not a flat coordinate space.** A position in the world is not `(x, y, z)`; it is `(nodePath, localPosition)`, where `nodePath` is a list of `SpatialNode` IDs from the cosmos root down to the leaf pocket the position is in, and `localPosition` is the `(x, y, z)` within that node. This is the only data model that can express "a grotto-heaven inside the Acquired Stratum, accessed through a cave in the Mortal Stratum, whose interior time runs 10× faster than the Mortal Stratum's" without ad-hoc hacks.

### Precedents cited (AGENTS.md Part 3: "Cite the precedent")

- **Unreal Engine 5 World Partition / Level Instance** — nested level hierarchies with transforms relative to parent. Adopted as the `SpatialNode` parent-child model.
- **Minecraft's Nether / End dimensions** — separate worlds with portal-based travel and per-dimension time. Our grotto-heavens are the same idea, generalised to N-deep nesting.
- **No Man's Sky's local-to-universal coordinate transform** — each planet has local coords; the universal coord is the planet ID + local. Our `nodePath` is the analogue.
- **Outer Wilds' quantum moon / nested worlds** — the design inspiration for time-rate-varying nested spaces. (Cited for the experience, not the implementation — Outer Wilds is hand-authored; we generate.)
- **CRDTs for nested trees** — the `SpatialNode` tree is a CRDT-mergeable structure (relevant for future multiplayer; not in scope for v1 but the data model does not preclude it).

---

## 1. The three strata — representation

### 1.1 The stratum enum

```typescript
type Stratum = 'precelestial' | 'acquired' | 'mortal';
```

The three values match the cosmology (doc 00 §1, doc 36 §1.1). Each has different qi density, time rate, and law substrate. The engine's spatial model treats them as three top-level `SpatialNode`s under the cosmos root.

### 1.2 The cosmos root

```typescript
interface CosmosNode extends SpatialNode {
  kind: 'cosmos';
  shape: 'lenticular';             // per doc 36 §1.1
  horizontalExtent: number;        // ~10000 li (doc 36 §1.1)
  verticalHeight: number;          // ~1000 li
  children: [PrecelestialNode, AcquiredNode, MortalNode];
  origin: Vec3;                    // the lens's geometric center, in cosmic coords
}
```

The cosmos root is the only `SpatialNode` without a parent. Its origin is `(0, 0, 0)` in cosmic coordinates. All other nodes' positions are relative to their parent.

### 1.3 The stratum nodes

```typescript
interface PrecelestialNode extends SpatialNode {
  kind: 'stratum';
  stratum: 'precelestial';
  verticalBounds: [number, number];   // upper third of the lens, per doc 36 §1.1
  qiDensity: number;                  // 1.0 (normalised; this is the densest)
  timeRate: 1 / 365;                  // 1 day precelestial = 365 days mortal (doc 15 §7)
  lawSubstrate: 'precelestial';       // undifferentiated potency
}

interface AcquiredNode extends SpatialNode {
  kind: 'stratum';
  stratum: 'acquired';
  verticalBounds: [number, number];   // middle bulge
  qiDensity: number;                  // 0.3 (normalised)
  timeRate: 1;                        // 1:1 with mortal (the reference rate)
  lawSubstrate: 'acquired';           // differentiated qi
}

interface MortalNode extends SpatialNode {
  kind: 'stratum';
  stratum: 'mortal';
  verticalBounds: [number, number];   // lower third
  qiDensity: number;                  // 0.05 (normalised)
  timeRate: 1;                        // reference
  lawSubstrate: 'mortal';             // diffuse ambient
}
```

The `timeRate` is the *ratio* of local time to the cosmos's reference (the Mortal Stratum's time). The Precelestial's `1/365` means: 1 tick of Precelestial time elapses per 365 ticks of Mortal time. This is the doc 15 §7 commitment.

### 1.4 The stratum nodes are siblings, not nested

The three strata are **sibling children** of the cosmos root, not nested inside each other. They are stacked vertically (the lens's three horizontal layers). This is the doc 36 §1.1 commitment: "coextensive in horizontal position, distinct in altitude." A cultivator ascending from Mortal to Acquired does not enter a "child node"; they move vertically within the same parent's coordinate space, crossing the Cloud Veil boundary (§2).

---

## 2. Stratum interfaces — Cloud Veil and Heavenly Stem

### 2.1 The Cloud Veil (Mortal ↔ Acquired)

The Cloud Veil (雲幕) is the boundary between the Mortal and Acquired Strata. Per doc 36 §2.4, it sits at ~1000 li altitude in the Mortal Stratum's coordinate space. It is a `BoundaryNode`:

```typescript
interface CloudVeilNode extends BoundaryNode {
  kind: 'boundary';
  boundaryType: 'cloud_veil';
  altitude: number;                    // 1000 li above Mortal surface
  permeability: PermeabilityProfile;   // who can cross, under what conditions
  visualShader: 'cloud_veil';          // the renderer's shader for the sky
}

interface PermeabilityProfile {
  mortalCanCross: false;               // mortals suffocate in the qi-thin gradient
  qiInductionCanCross: false;
  qiCondensationCanCross: 'with_effort';  // requires sustained qi routing
  foundationEstablishmentCanCross: 'flight';  // standard cultivator flight
  coreFormationCanCross: 'trivial';
  // ... etc.
  crossingCost: Record<Realm, number>; // qwu required to cross
  crossingTimeTicks: Record<Realm, number>;
}
```

### 2.2 The Heavenly Stem (Acquired ↔ Precelestial)

The Heavenly Stem (天柱) is the boundary between the Acquired and Precelestial Strata. Per doc 15, it is far more selective: only Tribulation Crossing+ cultivators cross it alive. It is also a `BoundaryNode`:

```typescript
interface HeavenlyStemNode extends BoundaryNode {
  kind: 'boundary';
  boundaryType: 'heavenly_stem';
  permeability: PermeabilityProfile;
  // Crossing requires surviving tribulation (doc 15 §6)
  tribulationRequired: true;
  tribulationForm: 'heavenly_tribulation';
  visualShader: 'heavenly_stem';
}
```

### 2.3 The boundary-crossing failure case

**Failure case (boundary crossing):** A Qi Condensation cultivator attempts to fly up through the Cloud Veil. Their `qiCondensationCanCross: 'with_effort'` requires sustained qi routing; if their routing drops (deviation onset, distraction), they fall back. The fix: the boundary-crossing system checks the cultivator's realm + current routing state every tick during ascent. If the routing fails, the cultivator's `gravityScale` snaps back to 1.0 and they fall. This is the genre's "the heavens resist the unworthy" trope, enforced as physics.

Rejected alternative: a hard wall that physically blocks cultivators below a realm. Rejected because (a) it removes the dramatic possibility of a desperateQi Condensation cultivator forcing their way up and burning out; (b) it conflicts with the genre's tribulation-as-gate pattern (doc 15 §6). The boundary is permeable-with-cost, not impermeable.

---

## 3. Grotto-heavens nested in the Acquired Stratum

### 3.1 The grotto-heaven as a child SpatialNode

Per doc 19, a grotto-heaven is a pocket world inside the Acquired Stratum, accessed through a geographic anchor in the Mortal Stratum. The engine represents it as a `GrottoHeavenNode` whose parent is the Acquired stratum node, but whose *anchor* (the entrance point) is a position in the Mortal Stratum.

```typescript
interface GrottoHeavenNode extends SpatialNode {
  kind: 'grotto_heaven';
  parent: 'acquired';                  // the grotto-heaven is nested in the Acquired
  anchor: GrottoHeavenAnchor;          // where in the Mortal Stratum the entrance is
  interior: GrottoHeavenInterior;      // the pocket world's content
  timeRate: number;                    // 1, 10, 0.1 (doc 19 §2.4)
  qiDensity: number;                   // 10-100× Mortal ambient (doc 19 §3.2)
  phaseSpecialization: Phase | 'balanced';
  owner: string | null;                // sect ID, or null for unclaimed
  boundaryLaw: 'grotto_heaven';        // the hard-edge boundary (doc 19 §2.2)
}

interface GrottoHeavenAnchor {
  mortalPosition: Vec3;                // where the entrance is, in Mortal coords
  anchorType: 'cave' | 'cliff_crack' | 'sealed_gate' | 'pool' | 'tree' | 'formation';
  openCondition: AnchorOpenCondition;  // token, qi-signature, oath, formation-activation
  sealed: boolean;                     // true if the anchor was destroyed (doc 19 §2.3)
}

interface GrottoHeavenInterior {
  size: 'minor' | 'major' | 'peak';    // per doc 19 §2.1
  area: number;                        // km²
  terrainSeed: string;
  ecologySeed: string;
  qiClimateSeed: string;
  falseSky: boolean;                   // some grotto-heavens have a false sun/moon
  boundaryEdge: 'hard_wall' | 'curved_horizon';
}
```

### 3.2 The nesting diagram

```
CosmosNode (root)
├── PrecelestialNode
│   ├── CourtOfHeavenNode ("the Heavenly Court")
│   ├── AncestralCourtNode ("the Wang lineage's ancestral court")
│   ├── SpiritWildsNode
│   └── LawReachNode (multiple, per doc 40)
├── AcquiredNode
│   ├── GrottoHeavenNode (the Azure Sword Sect's grotto)
│   │   └── ...interior content
│   ├── GrottoHeavenNode (the Jade Void Holy Land's peak grotto)
│   └── BroadLandNode (Acquired Broad Lands, per doc 36 §3.3)
└── MortalNode
    ├── MortalPlanetNode (the single planet, doc 36 §2.1)
    │   ├── ContinentNode (Central Continent)
    │   │   ├── RegionNode (Cangli Riverlands)
    │   │   │   ├── SettlementNode (Wang Family Bend)
    │   │   │   ├── SettlementNode (Li Family Creek)
    │   │   │   └── ...
    │   │   └── ...
    │   └── ...other continents
    └── (no other planets — doc 36 §2.1: "the only world in the Mortal Stratum")
```

### 3.3 The anchor-crossing

When the player walks into a grotto-heaven anchor (a cave behind a waterfall), the engine:

1. Detects the trigger overlap (the anchor's `openCondition` is satisfied).
2. Emits a `StratumTransition` event.
3. The renderer fades the Mortal Stratum scene out.
4. The engine loads the `GrottoHeavenNode`'s interior content (lazy generation, doc 23 §5).
5. The renderer fades the grotto-heaven scene in.
6. The player's `currentNodePath` updates from `[cosmos, mortal, planet, continent, region, settlement]` to `[cosmos, acquired, grotto_heaven_azure_sword]`.
7. The player's `localPosition` is set to the grotto-heaven's entrance point.

The transition is **instantaneous in the simulation** (one tick) and **faded in the renderer** (over 30 ticks). The simulation's instant transition preserves determinism; the renderer's fade preserves immersion.

### 3.4 The sealed-anchor failure case

**Failure case (sealed anchor):** A grotto-heaven's anchor is destroyed (the cave collapses). Per doc 19 §2.3, the grotto-heaven is sealed — its inhabitants are trapped. The engine marks the `GrottoHeavenAnchor.sealed = true`. Any subsequent attempt to enter through that anchor fails: the trigger is no longer registered. Players already inside can move around normally; they cannot leave through the sealed anchor. They may be able to leave through a *different* anchor (if one exists — most grotto-heavens have only one) or by breaching the boundary from inside (requires immense power; doc 19 §2.2).

Rejected alternative: destroy the grotto-heaven entirely when the anchor is destroyed. Rejected because the lore (doc 19 §2.3) is explicit: the grotto-heaven persists; only the surface trace is gone. The vein inside still feeds it.

---

## 4. Law Reaches as regions in the Precelestial

### 4.1 The Law Reach as a SpatialNode

Per docs 15 §5 and 40, a Law Reach (法域) is a region in the Precelestial's outer ring where the law-substrate has thinned or not formed. The engine represents it as a `LawReachNode` whose parent is the Precelestial stratum node.

```typescript
interface LawReachNode extends SpatialNode {
  kind: 'law_reach';
  parent: 'precelestial';
  reachId: string;                     // 'reach.sundered_stratum' | 'reach.caged_sky' | ...
  substrateState: 'thinned' | 'unformed' | 'paradoxical';
  area: number;                        // km²; some reaches are vast (doc 40)
  lawProfile: LawProfile;              // what laws hold, what don't, what's paradoxical
  claimedBy: string | null;            // a Mahayana's ID, or null (open)
  claimStability: number;              // 0..1; how stable the claim is
}

interface LawProfile {
  gravity: 'holds' | 'thin' | 'absent' | 'inverted';
  time: 'holds' | 'variable' | 'absent';
  phaseInteraction: 'holds' | 'unconstrained' | 'paradoxical';
  qiForm: 'qi' | 'precelestial_substrate' | 'undifferentiated';
  authorshipAllowed: boolean;          // Mahayana can author new law here (doc 24 §1.1)
  paradoxRisk: number;                 // 0..1; risk of law-paradox when authoring
}
```

### 4.2 Law Reaches are precelestial children

Per doc 40, Law Reaches sit at the Precelestial's outer ring. They are siblings of the Courts of Heaven, the Spirit Wilds, and the Ancestral Courts — all children of the Precelestial stratum node. They are **not** in the Acquired or Mortal strata; reaching them requires Tribulation Crossing (doc 15 §5.3).

### 4.3 The reach-authorship failure case

**Failure case (reach authorship):** A Mahayana cultivator authors a law in a Law Reach; the law is paradoxical (the law claims "X is true" while the local substrate says "X is false"). The engine's law-authorship system (doc 24 §1.1 Reach-authorship) checks the `paradoxRisk` and rolls a deterministic check. If the check fails, the law collapses; the Reach's `substrateState` may degrade further (per doc 40: Lie Fa's Reach collapsed entirely from a failed authorship). The fix: this is the design. Reach-authorship is a high-risk, high-reward action with consequences. The engine enforces them.

---

## 5. The 1:365 time ratio — implementation

### 5.1 The time model

Every `SpatialNode` has a `timeRate` field. The engine's simulation tick advances at the Mortal Stratum's rate (60 Hz by default). For each node, the simulation advances local time by `tick × timeRate`:

```
Mortal Stratum:       timeRate = 1     → 1 tick = 1/60 s of local time
Acquired Stratum:     timeRate = 1     → 1 tick = 1/60 s of local time
Precelestial Stratum: timeRate = 1/365 → 1 tick = 1/(60×365) s of local time
Grotto-heaven (10×):  timeRate = 10    → 1 tick = 10/60 s of local time
```

### 5.2 The time-debt

A cultivator who enters a 10× grotto-heaven and stays for 30 days of local time experiences 30 days of subjective time, but the Mortal Stratum has only aged 3 days. This is the **time-debt** (doc 15 §7): the cultivator returns to find the world 27 days behind them. The engine tracks each entity's `subjectiveTime` separately from the global `tick`:

```typescript
interface EntityTimeState {
  currentNodePath: NodePath;
  subjectiveTime: number;        // total ticks of local time experienced
  globalTickAtLastTransition: number;  // the global tick when the entity entered the current node
}

function entityLocalTick(entity: Entity): number {
  const node = resolveNode(entity.currentNodePath);
  return (host.getState('ga:core').tick - entity.subjectiveTimeAnchor) * node.timeRate;
}
```

### 5.3 The 1:365 simulation implication

The Precelestial's `timeRate = 1/365` means: for every 365 ticks of Mortal time, the Precelestial simulates 1 tick. The simulation scheduler (doc 17 §6.1, doc 25) advances Precelestial entities only every 365 ticks. This is a **365× performance gain** for Precelestial content — the Courts of Heaven can simulate in full detail without consuming 365× the CPU, because they only run 1/365 as often.

### 5.4 The time-rate failure case

**Failure case (time rate):** A cultivator in a 10× grotto-heaven casts a qi technique whose effect propagates to the Mortal Stratum (e.g., a domain ability that extends through the anchor). The effect's timing in Mortal time must be 1/10 of its timing in grotto-heaven time. The fix: every effect that crosses a `timeRate` boundary carries its `sourceTimeRate` and the engine converts: `targetDuration = sourceDuration × (targetTimeRate / sourceTimeRate)`. A 60-frame (1-second) qi technique in a 10× grotto appears in the Mortal Stratum as a 6-frame (0.1-second) effect. This is the time-debt applied to effects, not just entities.

Rejected alternative: lock all effects to their source stratum's time. Rejected because cultivators can project effects across strata (Nascent Soul+, per doc 32 §1.2); the engine must handle the conversion.

### 5.5 The 1:365 cross-stratum perception failure case

**Failure case (1:365 perception):** A Mahayana cultivator in the Precelestial perceives events in the Mortal Stratum. From their perspective, the Mortal Stratum moves 365× faster. A mortal's lifetime (60 years) is ~60 days of Precelestial time. The engine's perception system (doc 11 §3.2) renders the Mortal Stratum at 1/365 speed for the Mahayana observer, but does **not** slow the simulation — the simulation runs at full speed; the perception is a renderer-level timescale. The Mahayana's view is "the Mortal Stratum is a blur"; they can slow it to real-time by attending, but that costs attention (doc 13 §5.2).

---

## 6. Spatial pockets — nested SpatialNodes

### 6.1 The SpatialNode base interface

```typescript
interface SpatialNode {
  id: string;                          // unique within the cosmos
  kind: SpatialNodeKind;
  parent: string | null;               // null only for the cosmos root
  localOrigin: Vec3;                   // this node's origin in parent's coords
  localExtent: AABB;                   // this node's bounds in parent's coords
  timeRate: number;                    // relative to parent
  qiDensity: number;                   // normalised
  lawSubstrate: LawSubstrate;
  children: string[];                  // child node IDs
}

type SpatialNodeKind =
  | 'cosmos' | 'stratum' | 'boundary' | 'mortal_planet' | 'continent'
  | 'region' | 'settlement' | 'grotto_heaven' | 'broad_land'
  | 'court_of_heaven' | 'ancestral_court' | 'spirit_wilds' | 'law_reach'
  | 'higher_immortal_world';

type LawSubstrate =
  | 'precelestial' | 'acquired' | 'mortal'
  | 'grotto_heaven' | 'law_reach_thinned' | 'law_reach_unformed'
  | 'ran_substrate';
```

### 6.2 The node path

A position in the world is `(nodePath, localPosition)`:

```typescript
type NodePath = string[];              // ['cosmos', 'mortal', 'planet', 'continent', 'region', 'settlement']

interface WorldPosition {
  nodePath: NodePath;
  localPosition: Vec3;
  localRotation: Quat;
}
```

The `nodePath` is the chain of ancestors from the cosmos root to the current node. The `localPosition` is the position within the current node's coordinate space. Converting to a parent's coordinate space is `parentPosition = node.localOrigin + localPosition` (plus rotation, if the node has a non-identity orientation — most don't).

### 6.3 Nested pockets — the general case

A grotto-heaven inside a grotto-heaven (a deep cultivation retreat nested inside a sect's grotto) is represented as a `GrottoHeavenNode` whose parent is another `GrottoHeavenNode`. The engine supports arbitrary nesting depth; in practice, the lore caps it at 2 (a grotto inside a grotto is rare; deeper nesting is mythic). The `nodePath` reflects the nesting:

```
['cosmos', 'mortal', 'planet', 'continent', 'region']
   → walking around the Cangli Riverlands
['cosmos', 'acquired', 'grotto_azure_sword']
   → inside the Azure Sword Sect's grotto-heaven
['cosmos', 'acquired', 'grotto_azure_sword', 'grotto_inner_retreat']
   → inside the inner retreat (a deeper grotto)
['cosmos', 'precelestial', 'court_jade_void']
   → inside the Jade Void Court of Heaven (requires Tribulation Crossing)
```

### 6.4 The nested-pocket failure case

**Failure case (nested pockets):** A cultivator in a 10× grotto inside a 100× grotto experiences 1000× time-rate relative to the Mortal Stratum. The `timeRate` field multiplies down the tree. The engine's `effectiveTimeRate(nodePath)` walks the path and multiplies. A 1000× time-rate means 1000 Mortal ticks per 1 local tick — but the simulation runs at Mortal rate (60 Hz), so the local simulation runs at 60 kHz. This is too fast for the scheduler. The fix: cap effective time-rate at 100×; deeper nesting is lore-permitted but engine-clamped. The clamp is documented in the lore as "the deep grotto's time-rate is rumoured to exceed 1000×, but no cultivator has confirmed this — the simulation substrate does not permit it." This is the doctrine's "Cite the precedent" applied to our own engine's limits.

---

## 7. The Higher Immortal World's ran-substrate

### 7.1 The ran-substrate

Per doc 48, beyond Mahayana lies the Higher Immortal World, whose substrate is **ran** (然) — not qi, but a higher-order substance from which qi is derived. The engine represents this as a `HigherImmortalWorldNode` with `lawSubstrate: 'ran_substrate'`:

```typescript
interface HigherImmortalWorldNode extends SpatialNode {
  kind: 'higher_immortal_world';
  parent: 'cosmos';                    // sibling to the three strata
  ranSubstrateDensity: number;         // ~1000× Precelestial qiDensity
  timeRate: number;                    // very slow; doc 48 specifies
  accessRealm: 'xianren';              // requires the post-Mahayana realm
  lawSubstrate: 'ran_substrate';
  qiConversionRate: number;            // 1 unit ran = N units qi (when descending)
}
```

### 7.2 Ran is not qi

The engine enforces this distinction at the type level:

```typescript
type QiState = {
  reservoir: number;                   // in qwu
  phaseAffinity: PhaseVector;
  yinYang: number;
};

type RanState = {
  ranReservoir: number;                // in ran-units (not qwu)
  // no phase, no yin-yang — ran is pre-differentiation
  derivationPotential: number;         // how much qi can be derived per tick
};
```

A Higher Immortal's `RanState` is separate from any cultivator's `QiState`. When a Higher Immortal descends to the Precelestial (rare; doc 48), their `RanState` is converted to `QiState` at the stratum boundary, at the `qiConversionRate`. The conversion is lossy (most of the ran is "spent" pushing through the boundary); the Higher Immortal arrives with a finite qi reservoir that does not naturally replenish in the lower strata.

### 7.3 The ran-substrate failure case

**Failure case (ran-substrate):** A plugin treats a Higher Immortal's `RanState` as if it were `QiState` (e.g., a combat technique that drains qi tries to drain ran). The type system prevents this — `RanState` and `QiState` are distinct types; the combat system's `drainQi(target: QiState)` does not accept a `RanState`. Rejected alternative: a unified `Energy` type with a `kind` discriminator. Rejected because it permits the conflation at runtime; the type-level separation is the contract.

### 7.4 The Higher Immortal World is out of scope for v1

Per doc 48, the Higher Immortal World is the post-game horizon — the setting for a sequel, not v1's playable space. The engine represents it in the data model (so v1 saves are forward-compatible with v2), but no v1 plugin simulates it. The `HigherImmortalWorldNode` exists in the cosmos tree as a placeholder; it has no children, no simulation, no rendering. The player cannot reach it. This is the doctrine's "Add exits, not gates" (AGENTS.md Part 3): the data model has the exit; the gate is the v1 plugin boundary.

---

## 8. Travel between strata and realms at each tier

### 8.1 The travel matrix

| From → To | Required realm | Mechanism | Engine system |
|---|---|---|---|
| Mortal → Acquired (within Mortal Stratum, below Cloud Veil) | any | walking, climbing | navigation (doc 22) |
| Mortal → Acquired (crossing Cloud Veil) | Foundation Establishment+ | flight (with sustained qi routing) | flight controller (doc 22 §7) |
| Acquired → Mortal (descending Cloud Veil) | any cultivator | flight, falling | flight controller |
| Acquired → Precelestial (crossing Heavenly Stem) | Tribulation Crossing | survive tribulation | tribulation system (doc 15 §6) |
| Precelestial → Acquired (descending Heavenly Stem) | Tribulation Crossing+ | descent (no tribulation on descent) | stratum transition |
| Mortal Stratum → Grotto-heaven | any (the anchor is in the Mortal Stratum) | walk into the anchor | trigger overlap, stratum transition (§3.3) |
| Grotto-heaven → Mortal Stratum | any (if the anchor is intact) | walk back through the anchor | stratum transition |
| Grotto-heaven → Acquired Stratum (breaching from inside) | Nascent Soul+ | breach the boundary (immense qi cost) | boundary-breach system |
| Precelestial → Law Reach | Mahayana | travel to the outer ring | navigation within Precelestial |
| Any stratum → Higher Immortal World | Xianren (post-Mahayana) | not implemented in v1 | n/a |

### 8.2 The stratum-transition system

```typescript
interface StratumTransitionSystem {
  initiateTransition(entity: Entity, targetNodePath: NodePath, options: TransitionOptions): TransitionHandle;
  cancelTransition(handle: TransitionHandle): void;
  onTransitionComplete(cb: (entity, fromPath, toPath) => void): void;
}

interface TransitionOptions {
  fadeTicks: number;                   // renderer fade duration; default 30
  requireTribulation: boolean;         // for Heavenly Stem crossings
  requireOpenCondition: boolean;       // for grotto-heaven anchors
  reason: string;                      // 'flight' | 'anchor_entry' | 'breach' | 'descent'
}
```

The transition is **instantaneous in the simulation** (the entity's `currentNodePath` updates on tick T) and **faded in the renderer** (the fade runs from tick T-15 to tick T+15, centered on the transition tick). This preserves determinism (the entity is at the new node at tick T, period) while preserving immersion (the player sees a fade, not a teleport).

### 8.3 The tribulation crossing

Crossing the Heavenly Stem requires surviving tribulation (doc 15 §6). The engine's tribulation system:

1. Detects the entity's attempt to cross the Heavenly Stem.
2. Pauses the entity's upward motion.
3. Spawns a `TribulationEvent` at the entity's position, scaled by the entity's karmic trace and realm.
4. The tribulation runs as a combat encounter (lightning strikes, karmic manifestations, law-paradox tests).
5. If the entity survives: the stratum transition completes; the entity is now in the Precelestial.
6. If the entity dies: the canonical state records the death; the entity's anchor transitions to the bardo (per doc 00 §2).

The tribulation is part of the canonical state — it is in the input log if player-initiated, regenerated from the seed if simulation-initiated. Two replays with the same seed + same inputs produce the same tribulation.

### 8.4 The travel-failure case

**Failure case (travel):** A Foundation Establishment cultivator in a 10× grotto-heaven wants to return to the Mortal Stratum. Their subjective time is 30 days ahead of Mortal time. They walk back through the anchor and emerge in the Mortal Stratum 3 days after they entered (from the Mortal perspective). The engine handles this automatically: the cultivator's `subjectiveTime` is preserved; their `currentNodePath` updates; their `globalTickAtLastTransition` is the current global tick. The Mortal Stratum has aged 3 days; the cultivator has aged 30. This is the time-debt, enforced.

Rejected alternative: synchronise subjective time on stratum transition. Rejected because it would void the time-debt — the central dramatic mechanism of the grotto-heaven (doc 19 §2.4).

---

## 9. The position-resolution API

### 9.1 Converting between coordinate spaces

```typescript
interface SpatialResolver {
  // Convert a position from one node's local space to another's
  convertPosition(pos: WorldPosition, targetNodePath: NodePath): WorldPosition;

  // Get the effective time rate at a node path (multiplying down the tree)
  effectiveTimeRate(nodePath: NodePath): number;

  // Get the effective qi density at a node path
  effectiveQiDensity(nodePath: NodePath): number;

  // Find the nearest ancestor of a given kind
  findAncestor(nodePath: NodePath, kind: SpatialNodeKind): NodePath | null;

  // Check if a transition between two node paths is valid for an entity
  canTransition(entity: Entity, from: NodePath, to: NodePath): TransitionCheckResult;
}
```

### 9.2 The cross-node query failure case

**Failure case (cross-node query):** A combat technique in the Mortal Stratum targets an entity in a grotto-heaven. The targeting system resolves the grotto-heaven entity's position by walking up the node tree to the cosmos root and back down to the Mortal Stratum. The conversion is expensive (matrix multiplications per node); for performance, the resolver caches conversions per `(sourcePath, targetPath)` pair, invalidated when either node's `localOrigin` changes (rare — nodes don't move).

### 9.3 The node-tree determinism

The `SpatialNode` tree is part of the canonical state. Every node has a deterministic ID derived from the seed (per doc 23 §4.2: `deriveSeed(parentSeed, childName)`). The same seed produces the same node tree, bit-for-bit. The tree is CBOR-serializable and hashable; the determinism verification (doc 21 §7.3 protocol) covers it.

---

## 10. Failure cases (consolidated)

1. **Insufficient realm for boundary crossing** — permeability check; cultivator falls back (§2.3).
2. **Grotto-heaven anchor destroyed** — sealed; no entry (§3.4).
3. **Law Reach authorship paradox** — check fails; reach degrades (§4.3).
4. **Time-rate exceeds 100×** — clamped; documented in lore (§6.4).
5. **Ran treated as qi** — type system prevents (§7.3).
6. **Travel to Higher Immortal World in v1** — not implemented; the node exists but has no children (§7.4).
7. **Time-debt voided on transition** — forbidden; subjective time preserved (§8.4).
8. **Cross-node combat target query slow** — cached conversion matrices (§9.2).
9. **Node-tree non-determinism** — seed-derived IDs; covered by determinism verification (§9.3).
10. **Transition during tribulation** — forbidden; tribulation must complete or the entity dies (§8.3).

---

## 11. Rejected alternatives

### 11.1 Flat coordinate space with stratum flags

Represent every position as `(x, y, z, stratum)`. Rejected because (a) grotto-heavens are not in the same coordinate space as the Mortal Stratum — they are nested pockets with their own interiors; (b) the time-rate and qi-density of a position cannot be a function of `(x, y, z)` alone; (c) the anchor relationship (a grotto-heaven whose entrance is in the Mortal Stratum but whose interior is in the Acquired) cannot be expressed in a flat space. The `SpatialNode` tree is the only model that fits.

### 11.2 Per-stratum separate scenes (Unity-style multi-scene)

Load a separate Unity-style scene per stratum; transition = scene load. Rejected because (a) does not support arbitrary nesting (grotto-inside-grotto); (b) does not support cross-stratum perception (a Mahayana perceiving the Mortal Stratum); (c) scene loads are not deterministic in their timing. The `SpatialNode` tree is one tree, with the renderer deciding which subset to render based on the player's `currentNodePath`.

### 11.3 Quantum-moon style "the world changes when you look away"

Outer Wilds's quantum moon shifts between worlds when the player is not observing. Rejected for the grotto-heaven / stratum topology because (a) the lore commits to grotto-heavens as persistent spaces (doc 19 §2.1); (b) quantum-shifting breaks the determinism contract (the "observing" state is non-deterministic across browsers); (c) the genre does not demand it. Outer Wilds's pattern is appropriate for Outer Wilds; ours is not Outer Wilds.

### 11.4 A single global time

All strata share one time. Rejected because (a) the lore commits to 1:365 (doc 15 §7) and grotto-heaven time-rates (doc 19 §2.4); (b) the genre's time-debt is a central dramatic mechanism; (c) the 1:365 ratio is also a performance optimisation (§5.3) — losing it would force 365× more Precelestial simulation.

### 11.5 Treating ran as a high-tier qi

A unified `Energy` type with `qi` and `ran` as variants. Rejected in §7.3 — the type-level separation is the contract that prevents the conflation the lore forbids.

---

## 12. What this document enables

- The cosmos is a tree of `SpatialNode`s with the cosmos root at the top and pocket worlds as children.
- The three strata are sibling children of the cosmos root, vertically stacked in a lenticular volume.
- The Cloud Veil and Heavenly Stem are `BoundaryNode`s with permeability profiles and tribulation requirements.
- Grotto-heavens are `GrottoHeavenNode`s nested in the Acquired Stratum, with anchors in the Mortal Stratum.
- Law Reaches are `LawReachNode`s in the Precelestial's outer ring, with thinned/unformed/paradoxical law substrates.
- The 1:365 time ratio is implemented as a per-node `timeRate` field, multiplied down the tree; the scheduler advances Precelestial entities 1/365 as often.
- Spatial pockets are nested `SpatialNode`s of arbitrary depth (clamped at effective time-rate 100×).
- The Higher Immortal World's ran-substrate is a distinct `LawSubstrate` type; ran is not qi, enforced at the type level.
- Travel between strata/realm is governed by a travel matrix; transitions are instantaneous in simulation, faded in renderer; tribulation is required for Heavenly Stem crossings.
- Rejected alternatives (flat space, multi-scene, quantum-moon, single time, unified energy) are documented.

The next step is to implement the `SpatialNode` tree, the `SpatialResolver`, and the stratum-transition system, starting with the Mortal Stratum and a single grotto-heaven. The smallest end-to-end test: the player walks into a cave behind a waterfall, the renderer fades, the player emerges in a grotto-heaven with a 10× time-rate, the player walks back out, the Mortal Stratum has aged only 1/10 as much. That is the gate.
