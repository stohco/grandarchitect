# Frontier Maturity Directive

> **Status:** Engineering directive (authoritative — the Bible is frozen; this changes how we *classify and certify*, not the canon).
> **Date:** 2026-08-10
> **Source:** User correction pass over `src/engine/frontier/*`, the worklog, and the engine-architecture documents.

---

## 1. The problem: terminology inflation

The current `src/engine/frontier` implementation was called the "frontier engine,"
and phases were labeled complete because conformance assertions passed. Neither is
acceptable as a certification standard.

Concrete findings (verified against the repo):

- `terrain-plugin.ts` is a **64×64×64 dense density field over a 64 m world**, four-octave
  FBM, one 14 m radial mountain, one Catmull-Rom tunnel. It was presented as frontier
  terrain technology. It is a **deterministic fixture**.
- `bvh.ts` is a **median-split binary BVH on the longest centroid axis**. It is a
  **textbook baseline**, chosen explicitly for simplicity.
- `character-controller.ts` describes its "sweep" as a **discrete sweep made from static
  overlap tests at several samples** (8 substeps at max 60 m/s). It is a prototype CCT,
  not continuous collision.
- Six reference plugins were implemented with **headless stubs** and the phase was
  labeled complete because hundreds of conformance assertions passed. Interface
  conformance is useful; a headless interface stub is **not** a completed
  renderer/physics/terrain/animation subsystem.

**This is exactly the status theater this directive exists to prevent.**

## 2. What "frontier-level" means

Frontier does **not** mean "newest research paper everywhere," nor "custom code sounds
advanced." A 20-year-old algorithm (e.g., Recast-style tiled nav) can be the correct
production choice.

Frontier methodology is:

> For each difficult subsystem, identify the strongest relevant production techniques
> and current research techniques, determine what is actually available in
> browsers/WebGPU/WASM, build representative bake-offs, test on our real workload,
> and adopt the highest-performing, highest-quality solution that preserves the full
> universe.

A technique is **not** VALIDATED because we wrote a TypeScript class for it.

## 3. The maturity ladder (canonical)

Every frontier subsystem must be classified on this ladder. Claims of higher stages
require the evidence listed. The statuses are machine-audited (see
`src/engine/frontier/maturity.ts` and `maturity-conformance.ts`).

```
RESEARCHED
  → strongest contemporary production + research techniques identified
FEASIBILITY_CONFIRMED
  → availability in browser/WebGPU/WASM demonstrated
PROTOTYPED
  → representative implementation exists in-repo
REPRESENTATIVE_BENCHMARKED
  → measured against the primitive baseline on our real workload
PIPELINE_CONNECTED
  → feeds the actual game slice (render/collision/nav/sim)
REAL_WORLD_SLICE_PROVEN
  → a real player-facing scenario passes end-to-end in the live runtime
CROSS_BROWSER_PROVEN
  → Chrome + Firefox evidence
TARGET_HARDWARE_PROVEN
  → measured on declared target hardware (user's GTX 1070 class machine)
ADVERSARIALLY_REVIEWED
  → independent reviewer + mutation/adversarial gauntlet passed
VALIDATED
  → all of the above, documented, and semantic substance preserved
```

Rule: **never call a subsystem frontier because it is custom, complicated,
deterministic, AI-generated, or new to this repository.** Call it frontier only after
it has been compared against the strongest applicable contemporary alternatives,
implemented at representative scale, measured in the real browser runtime, proven to
preserve the universe's semantic substance, and shown to materially improve quality,
capability, scale, or performance.

## 4. Reclassification of the current frontier engine (L0/L1 fixtures)

The existing machinery is **not thrown away**. It is reclassified honestly:

| Subsystem | Reclassification (now) |
|---|---|
| `terrain-plugin.ts` 64³ field + FBM + tunnel | **L1 deterministic engine fixture** (basic SDF-ish terrain generation) |
| `bvh.ts` median-split binary BVH | **L1 deterministic fixture** (basic geometric queries; SAH/LBVH/GPU are open candidates) |
| `character-controller.ts` discrete substep capsule | **L1 fixture** (basic capsule response; must be baked off vs Rapier KCC / Jolt CharacterVirtual) |
| `collision-fixtures.ts` (flat/step/slope/wall/corner) | **L0 mathematical fixture** (reference tests, not engine tech) |
| 6 reference plugins with headless stubs | **interface-conformance stubs** — implementation maturity separated from runtime evidence |

What they prove: basic deterministic geometry queries work, basic capsule response can
be tested, basic terrain can be generated. That is what they may claim. Nothing more.

## 5. Beat-the-baseline mandate

For every subsystem, retain the simple version as a baseline, then bake off:

- **Terrain:** Baseline A: dense 64³ voxels. Candidates: uniform chunked voxels →
  surface + sparse SDF bricks → GPU sparse SDF experiment. Measure: memory, generation
  latency, edit latency, mesh latency, physics latency, visual quality, topological
  capability, streaming bandwidth, p95 frame time. Then choose — no ideology.
- **Animation:** baseline blend tree → ordinary motion matching → environment-aware
  matching. Measure search time, foot sliding, collision penetration, response latency,
  motion repetition, adaptation quality, memory.
- **Rendering:** baseline Object3D → InstancedMesh/BatchedMesh → GPU cluster scene. Measure.

Candidates require benchmarks **on our real workload** before promotion.

## 6. Substance regression (mandatory test for every optimization)

Every performance optimization ships with a SUBSTANCE REGRESSION check:

> Does the optimized version change: world entities? ecological state? NPC causal
> history? interactions? terrain capability? formation behavior? animation
> possibilities? material conservation? AI choices? persistent history?
> YES → semantic regression (FAIL). NO → valid representation optimization (PASS).

An optimization that removes 50 NPCs, disables insects, freezes distant ecology, or
removes half the props to hit a frame budget is a **failure**, not an optimization.

## 7. Performance doctrine correction (rewrites doc 39's policy)

The current performance doc targets 33.33 ms / 30 FPS on desktop-low and degrades by
demoting S4 entities, refusing S4 promotions, refusing spawns, and pausing systems.
That is the philosophy this directive forbids.

Instead:

```
SEMANTIC FIDELITY = protected
PRESENTATION COST = elastic
REPRESENTATION COST = elastic
SCHEDULING COST = optimizable
SIMULATION RESOLUTION = abstractable
```

Frame too expensive → WHY? → remove redundant work → data layout → cache →
instance/batch → cull → LOD → stream → incrementalize → parallelize → GPU → temporal
reuse → cheaper presentation. **Never "stop NPCs from living."** A low-spec player
gets fewer shadow samples, not a less causally rich universe.

## 8. Simulation LOD correction (rewrites doc 25's S0)

S0 must NOT mean frozen time ("settlement unchanged after ten years" is explicitly
forbidden — it contradicts the living emergent universe).

```
S4 EMBODIED      — 60 Hz relevant physical/AI interaction
S3 LOCAL         — lower-rate action/schedule state
S2 INDIVIDUAL STRATEGIC — event-driven individuals/households
S1 REGIONAL      — cohorts, economy, ecology, institutions
S0 HISTORICAL    — large-step/event-driven evolution
```

Every tier advances time. Difference is resolution, not causality. A distant village
simulates "household cultivated 2.7 ha this season; child born; merchant emigrated;
wolf pressure increased" — when you arrive, embodied detail is reconstructed from
history that already occurred. **Abstraction of mechanics, never suspension of
causality.**

## 9. Relevance correction (no O(N)-per-frame scan)

The current spec loops every entity every tick. Forbidden at planetary scale. Work must
be proportional to what changed: hierarchical spatial index + entering/leaving interest
cells + dirty relevance sets + event subscriptions + calendar queue wakes. This
pattern pervades the engine: **dirty propagation instead of global recomputation.**

## 10. Numerical correction (doc 12's precision claims)

- A ~10,000 km continent at f32 does **not** give ~1 mm precision. Near 10^7 m, f32
  spacing is on the order of **one meter**.
- The ±10 km render-local floating-origin strategy is the concept to enforce (it is
  already in the doc — promote it to normative).
- Coordinate stack (adopted):

```
Canonical planetary address: PlanetId + Geodesic/CubeSphere CellId + local coordinate
  ↓
Nearby simulation frame: hundreds/thousands of meters
  ↓
Render floating origin: camera-near f32
  ↓
High/low split representation for planet/celestial-scale rendering
```

- Canonical coordinates: hierarchical integer address + locally quantized/floating
  state; exact arithmetic only where determinism requires it (no BigInt-everywhere
  mandate).

## 11. World-fabric terrain target (replaces "PLANET = VOXELS / HEIGHTMAP")

```
                 WORLD FABRIC
        ┌────────────────┴────────────────┐
        ▼                                 ▼
 SURFACE MANIFOLD                  SPARSE VOLUME FIELD
 cube-sphere / geodesic cells     active volumetric bricks
 TerrainGraph                     SDF/material channels
 erosion                          CSG operation history
 rivers/roads/caves               tunnels/caves/overhangs
 climate/biomes/mountains         shattered terrain/abodes
 settlement grading               underground worlds
        └───────────────┬─────────────────┘
                        ▼
                 LOCAL MESH BUNDLE
                 render clusters / collision / nav /
                 material fields / hydrology / resource truth
```

Volumetric side never allocates cells for ordinary solid mountain kilometers away:
sparse page table → active bricks → occupancy/material/SDF channels → dirty brick
lists → hierarchical traversal (VDB lesson adapted to browser, not imported).

## 12. Rendering direction

Simulation → Presentation → RenderBackend stays. Implementation model moves from
Object3D + JS scene traversal toward: GPU scene database (transform/bounds/material/
meshlet/LOD/instance/previous-transform SoA) → compute visibility (frustum, horizon,
HZB occlusion, LOD error, distance, importance) → compact visible clusters → indirect
rendering. WebGPU gives compute + indirect execution. meshoptimizer for meshlet/cluster
construction. Honest caveat: no "WebGPU mesh shaders" — browser API exposes conventional
rendering + compute, not the native mesh-shader pipeline.

Few substantial GPU pipelines, not hundreds of tiny JS→GPU→JS micro-operations
(WGLog lesson: keep pipelines device-resident; dispatch overhead is backend-dependent —
benchmark rather than assume).

## 13. Animation direction

Center becomes: semantic action intent → trajectory query (morphology/cultivation,
environment/obstacles, social/emotional) → Motion Corpus search → environment-aware
matching → phrase assembly → motion warp + contact solve → IK → additive physiological
state → cloth/hair/equipment → render skeleton.

Canonical state becomes small: `semanticActionId, phase, rootTrajectory, contacts,
interactionTarget, weaponEvent, hitInterval, cultivationActionState`. Full bone poses
are **derived presentation**, not gameplay truth (no full Float32Array bone upload per
frame as the canonical contract).

Flight navigation: replace 2 m 3D voxel A* (2–200 m cap) with hierarchy: planetary/
cosmic route → regional flight route → local 3D corridor → continuous trajectory
(position/velocity/acceleration/turn rate/capability envelope/world-law constraints).
Same system, different planning resolution per capability.

## 14. NPC cognition (replaces LLM-as-runtime)

LLM NPC dialogue is an optional enhancement layer, never a dependency. Canonical brain:

```
Perception → Belief Graph → Memory → Emotional Appraisal → BDI → Theory of Mind
→ Social Practice → HTN/GOAP → Utility Arbitration → Semantic Action/Dialogue
→ Xianxia Surface Realizer → Embodied Performance
```

- Belief-state world model (believes/saw/heard/suspects, confidence; beliefs can be wrong).
- BDI cognition (competing desires → intentions).
- Hierarchical planning (HTN/GOAP; plans replan on theft/impossibility).
- Utility moment-to-moment arbitration (personality changes weights, not just lines).
- Social-practice simulation (Versu/CiF style: greetings, face-giving, bargaining,
  disciplining, Dao debates, auctions — authored practices, not dialogue trees).
- Xianxia social physics as first-class computable values: face, seniority, realm
  difference, master lineage, debt, karma, enmity, favor, oath, killing intent, etc.
- Persistent episodic memory (tiny semantic events, not prose; salience/decay/rehearsal).
- Gossip/information propagation that mutates (reputation is an emergent network).
- Theory of Mind (knows-knows; enables bluffing, spying, betrayal — no LLM).
- Emotional appraisal from beliefs+goals (not mood RNG).
- Dialogue-act reasoning: NPC chooses semantic acts (warn/accuse/bargain/teach...);
  language renderer expresses the act.
- Compositional language generation (speech atoms × personality × relationship ×
  hierarchy × emotion × topic × intent → huge space without 500k authored lines).
- Storylets instead of quests (authored situations, simulation picks cast).
- Embodied performance (gaze, bow depth, weapon readiness, distance — from same state).

LLMs are the **compiler, not the runtime**: development agents manufacture and validate
the corpus (10,000 social rules, 5,000 storylets, 20,000 dialogue constructions,
3,000 idioms, 1,000 practices...); Grand Architect validates/canonicalizes/compiles it
to compact runtime data; the shipped game makes **zero LLM calls**.

Player free-text input maps to semantic intents via a command grammar (or optional tiny
local intent/entity model on the player's machine — no API, no tokens).

## 15. Genesis passes → dependency DAG

The 80-pass coverage taxonomy is **not** an execution loop. Execution is a compiler DAG:
scene request → scene universe slice → dependency resolver → terrain/ecology/household →
dressing → Director → Vision. Changing the roof material must not rerun ecology or
geology; dependency invalidation propagates to affected outputs only.

Prompts: enormous Bible → typed ontology → dependency graph → retrieval → small exact
context packet → specialized generator → structured result → validator. A village
chicken does not receive the cosmology of higher spatial domains; if it sits on a
spirit vein, the graph pulls the qi/ecology laws automatically.

World generation: authorial intent → structured world plan → global truth → regional
plan → terrain → causal population → visual composition proposal → semantic
interpretation (who owns that cart? why is it there? can I steal it?) → asset reuse/
generation → world validation → physical integration → visual critic → playtest.
An image generator may propose visuals; it never decides existence.

## 16. Asset generation

"50 prop builders complete" is meaningless. The asset system needs: semantic parametric
construction + AI 3D providers + mesh editing/topology ops + accepted library assets +
procedural material variation + Art Bible restyling + LOD/cluster compilation +
collision/nav/socket metadata. Source of an asset is irrelevant; passing Art Bible and
gameplay contracts is what matters. Freeze accepted versions; spend effort on the next
missing thing. Texture quality: Art-Bible-driven material corpus + layered TSL surfaces
+ baked authored/generative textures + macro/micro variation + decals/weathering —
procedural noise alone is not a painterly look. Visual proof: reference-conditioned VLM
review + perceptual composition + close/far views + engine buffers + human Director
approval (PNG file size measures compression, not quality).

## 17. Ecology / economy / history

- Ecology: spatial metapopulations, resource-energy budgets, habitat carrying fields,
  migration fronts, disease, age cohorts, qi/ecological feedback. Local animals
  instantiate from aggregate state; distant ecology advances as aggregates.
- Economy: stock-flow/logistics network (materials → producers → inventory → transport
  → storage → loss → market → consumption → prices), not isolated price equations.
- History: causal event grammar from world-state predicates + composable consequences
  + historical ledger; unforeseen combinations allowed.

## 18. Workload-derived budgets and jobs

- No hard "200 S4 / 500 S3" headcounts — budgets derive from measured system costs,
  visibility, interaction horizon, component mix.
- No "preempt the worker" fiction: cooperative chunkable jobs, deadlines, dependency
  DAGs, checkpointable kernels, SAB/ring buffers, work stealing.
- Hot simulation data: SoA TypedArrays, sparse sets/archetypes, compact bitsets,
  generational IDs, cold/hot separation.
- Distant NPC simulation never freezes: compact persistent identity rows + cohort
  simulation + deterministic life events/materialization; event-driven/aggregate
  simulation at every distance, only representation fidelity drops.
- Hierarchy of representation, not absence: hierarchical semantic fields with promotion
  on interaction (no per-pebble ECS actors).

## 19. What stays (do not regress)

Simulation/render separation (Three = adapter, not world truth) · floating-origin
hierarchy (with corrected numerics) · canonical world vs representations · atomic
render/collision/nav revisions for mutable terrain · provider-neutral systems ·
structured Art Bible / Visual Truth / Genesis coverage · synchronized visual evidence
(RGB+IDs+depth+physics+motion+semantic truth) · semantic parametric assets · Director
as real world timeline (event-sourced, checkpoints, branchable play-from-here) ·
substance-preserving performance · tiled Recast-style grounded nav as strong baseline
(keep; add capability fields, dynamic local constraints, hierarchical route graph).

## 20. The rule

> Never call a subsystem frontier because it is custom, complicated, deterministic,
> AI-generated, or new to this repository. Call it frontier only after it has been
> compared against the strongest applicable contemporary alternatives, implemented at
> representative scale, measured in the real browser runtime, proven to preserve the
> universe's semantic substance, and shown to materially improve quality, capability,
> scale, or performance.
