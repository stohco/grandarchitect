# SUBSTANCE PRESERVATION — Performance Constitution
## Grand Architect engineering directive (authoritative)

Performance optimization is forbidden from silently simplifying the authored
universe. Systems, interactions, histories, ecology, simulation consequences,
visual identity, animation capabilities, terrain capabilities, and xianxia
laws are semantic content. Optimization must preferentially improve
algorithms, representation, scheduling, streaming, data locality, caching,
batching, parallelism, GPU utilization, simulation LOD, render LOD,
compression, and incremental computation. Fidelity may change with distance
and relevance; truth may not. A lower-cost representation must remain
causally compatible with its higher-fidelity form.

One sentence for the Grand Architect itself:

When performance and richness appear to conflict, treat that first as an
engineering problem — not permission to make the universe smaller.

============================================================
0. THE INVARIANT
============================================================

Optimization may reduce the cost of representing, evaluating, transmitting,
storing, animating, or rendering the universe. It may not reduce the
universe itself.

When a frame-rate problem appears, the first question is never:

  "What systems, NPCs, ecology, objects, destruction, animation, or
   background detail can we remove?"

It is always:

  "How can the exact same authoritative world truth be represented and
   processed more intelligently?"

============================================================
1. TRUTH vs REPRESENTATION
============================================================

A distant mountain contains 280,000 trees, 16 spirit-beast populations,
caves, a minor spirit vein, an abandoned cultivator abode, groundwater,
old logging scars, two mortal roads, a hidden sect formation, and hundreds
of years of ecological history. At 30 km away we must not run 280,000
individual tree entities, every beast's skeleton, full groundwater
simulation, full collision, and every cave mesh. But those things still
exist.

AUTHORITATIVE WORLD TRUTH
  280,000 trees | 16 beast populations | caves | spirit vein | abode |
  roads | history | ...

      |  representation compiler (deterministic, per distance band)
      v

30 KM VIEW
  terrain HLOD | forest canopy clusters | population aggregates |
  baked distant shadows | low-cost atmospheric representation |
  spirit-vein field summary | major landmark silhouettes

The system progressively materializes more of the ALREADY-EXISTING truth as
the player approaches: 30 km -> 10 km -> 3 km -> 500 m -> 100 m ->
interaction range. Nothing is invented because you approached. Nothing
ceases to exist because you flew away.

Performance LOD must mean fidelity of computation, not loss of substance.

============================================================
2. ENTITY FIDELITY LADDER (S4 -> S0)
============================================================

A distant NPC is never "deleted". Their representation gets cheaper:

S4 — Embodied: full body, physics, adaptive animation, IK, inventory,
     perception, behavior, dialogue, cultivation, combat, local navigation.

S3 — Interactive Abstract: position, schedule, current activity,
     relationships, inventory deltas, cultivation, regional navigation.

S2 — Individual Strategic: identity, household, job, needs, goals, travel,
     economy, relationships, major events.

S1 — Population / institution simulation: households, demography,
     production, resource consumption, migration, sect activity.

S0 — Historical / causal representation: long-term state changes, event
     probability, population trends, ecological pressure, political change.

When that individual becomes important again, higher fidelity reconstructs
from the lower-tier authoritative state. The NPC did not stop existing;
their representation got cheaper.

============================================================
3. ANIMATION — DO NOT SOLVE PERFORMANCE BY MAKING EVERYBODY STIFF
============================================================

Near: motion matching + environment-aware selection + motion warping + IK +
gaze + hands + facial animation + robes + hair + equipment secondary motion.

Farther: reduced motion search frequency + cached poses + shared pose groups
+ simpler cloth approximation.

Much farther: GPU-skinned low-LOD skeleton or impostor / baked motion
representation.

The Motion Corpus remains just as rich. When the person walks back toward
the player, the full high-quality animation system resumes.

============================================================
4. ECOLOGY — ONE TRUTH, MANY REPRESENTATIONS
============================================================

Never "remove insects, birds and small animals for FPS."

Immediate range: some insects become individually embodied.
Local range: insect populations drive procedural visual/audio emitters.
Regional range: ecological population variables.
Planetary scale: ecosystem state.

ONE ECOLOGICAL TRUTH can have many computational representations. This
keeps enormous ecological complexity at every distance.

============================================================
5. PROPS, CLUTTER, FORESTS, FORMATIONS
============================================================

Courtyards stay dense; density is made cheap through: instancing, geometry
clustering, material atlasing, texture arrays, GPU culling, HLOD, impostors
where appropriate, shared meshes, parametric variation, procedural
placement, streaming, compressed textures, mesh compression.

Forests: near = individual trunks/branches/collision/harvest/damage/wind/
ecology; middle = GPU-instanced families + simpler branches + reduced wind
evaluation; far = canopy clusters / HLOD; extreme = terrain-integrated
representation. Flying there restores the individual forest from
deterministic world state.

Formations: a dormant formation remains in persistent state; only relevant
events (attack, energy depletion, node damage, owner action) wake the
detailed system. Event-driven simulation: huge performance win, zero loss
of gameplay substance.

============================================================
6. THE SCHEDULER — COMPUTATION AS A BUDGETED RESOURCE
============================================================

The nearby world gets first claim on frame time. Distant simulation does
not disappear; it is scheduled:

FRAME N
  critical: player input/movement, nearby physics, nearby combat,
            interaction, terrain collision.
  remaining budget: near NPC updates, animation queries, ecology
            presentation, streaming jobs, background simulation transitions.

Expensive non-critical work moves to workers, WASM, job queues, incremental
processing, future frames — never a 40 ms main-thread hitch.

============================================================
7. THE ESCALATION LADDER (an optimizer's search order)
============================================================

MEASURE -> find actual bottleneck -> remove redundant work -> improve
algorithm -> improve data layout -> cache -> incrementalize -> batch ->
instance -> parallelize -> move suitable work to GPU -> move suitable work
to workers/WASM -> stream -> use hierarchical representation -> use
simulation LOD -> use render LOD -> use temporal reuse -> use spatial reuse
-> compress -> precompute what is safe to precompute -> re-measure.

Only after exhausting appropriate engineering strategies may we discuss
changing visual fidelity — and even then, reduce presentation cost, not
systems.

Frontier techniques to investigate: GPU-driven visibility/culling,
hierarchical scene representations, indirect/instanced rendering, occlusion
culling, cluster-based/HLOD world representation, temporal reuse, virtualized
or streamed geometry (WebGPU/WebGL), GPU terrain evaluation, clipmaps,
sparse SDF bricks, compressed glTF/KTX2, meshoptimizer pipelines,
worker/WASM geometry processing, data-oriented simulation, job graphs,
dirty-region propagation, deterministic incremental recomputation, spatial
databases, asynchronous asset decoding, pose caches, crowd animation
sharing, animation LOD, procedural/detail synthesis at distance, event-driven
rather than permanently ticking simulation.

Every technique must answer: what richness does this allow us to keep that
a naive implementation would force us to remove?

============================================================
8. THE SUBSTANCE PRESERVATION TEST (every optimization PR)
============================================================

PERFORMANCE DELTA
  Before: 22.4 ms frame
  After:  15.7 ms frame

SEMANTIC DELTA (all MUST be 0)
  World systems removed: 0
  Gameplay affordances removed: 0
  Ecological relationships removed: 0
  Persistent entities removed: 0
  Destruction capabilities removed: 0
  Animation capabilities removed: 0
  Art Bible requirements removed: 0
  Simulation truth changed: 0

22 ms -> 14 ms by deleting half the forest or stopping distant NPC lives:
FAIL. 22 ms -> 14 ms by batching forest rendering, caching animation poses,
moving terrain meshing into workers, stopping recalculation of unchanged
formations, HLOD for distant structures, compressing streamed textures:
PASS.

============================================================
9. THE FIDELITY DEGRADATION HIERARCHY (rare, last resort)
============================================================

If the machine truly cannot sustain the target, dynamically reduce in order:
render resolution, shadow resolution, reflection frequency, particle count,
extreme-distance vegetation animation, cloth simulation distance, far-LOD
complexity — BEFORE touching: nearby gameplay, world simulation truth,
terrain interaction, combat behavior, NPC consequences, ecology, formation
mechanics, physics correctness.

A lower-spec computer may see a softer distant shadow. It should not inhabit
a shallower universe.

============================================================
10. THE CONSTITUTION (machine-checked clauses)
============================================================

C1. Optimization may not reduce the universe; only its representation cost.
C2. A lower-cost representation must remain causally compatible with its
    higher-fidelity form.
C3. Entity fidelity follows the S4->S0 ladder; never deletion.
C4. Animation LOD reduces motion-search/shared-pose costs, never the Motion
    Corpus itself.
C5. Ecology has one truth and many representations; no biome removal.
C6. Props/forests/formations use instancing/HLOD/event-driven wakeups, not
    removal.
C7. The scheduler budgets frame time with critical-first ordering; distant
    simulation continues in workers/future frames.
C8. The escalation ladder is followed before any fidelity change.
C9. Every optimization PR reports PERFORMANCE DELTA + SEMANTIC DELTA; any
    nonzero semantic delta is a FAIL.
C10. Fidelity degradation follows the hierarchy (resolution/shadows/
     particles/far-LOD first), never truth-bearing subsystems.
