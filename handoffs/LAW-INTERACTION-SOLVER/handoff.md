# Law Interaction Solver — Handoff

**Task:** LAW-INTERACTION-SOLVER specialist (swarm/g-law-solver, base
swarm/integration @ 2ce10c4)

**Commit:** `0d582a7` — feat(laws): law interaction solver — realm law
profiles, capability vectors, local law stacks, formations, terrain-op
clipping

## What was done

Deterministic law subsystem under `src/engine/laws/` implementing the
design direction "power is relative to the laws of the environment":

1. **RealmLawProfile + canonical 10-station table** (`realm-law-profile.ts`)
   — the brief's 7 law groups (matter/space/movement/qi/perception/soul/
   causality) with all named factors. Canonical profiles derived from doc 03
   (2× qi per realm = the only [CANON] numeric invariant) + doc 32 §1.2
   (peak strike J, speed, reservoir). Authority-domain floors ([DERIVED]):
   space floors at Nascent Soul strength, soul at Core Formation,
   causality at Tribulation Crossing, perception at Qi Induction — "a low
   world is not a physics-free sandbox" made mechanical. Same-station actor
   in its own world lands at exactly R = 1.0 (normal) by construction.

2. **CapabilityVector + TechniqueInteractionProfile + modifiers**
   (`capability-vector.ts`) — the brief's 10 capabilities mapped to domains
   through a fixed normalized contribution matrix; technique fields
   (physicalForce, penetration, qiPressure, spatialAuthority, soulAuthority,
   affectedRadius, terrainInteraction {fracture/excavation/vaporization},
   materialRecovery {baseEfficiency, collectionRadius}) + artifact /
   comprehension / local-bonus multipliers.

3. **LocalLawStack** (`local-law-stack.ts`) — entries {domain, authority,
   priority, interactionCategory, stackingRule, conflictRule}; resolution
   with explicit conflict semantics: realm-override (replaces the realm
   resistance value), mutual-exclusion pairs cancel, strongest-wins keeps
   max |authority|, priority-wins drops opposite-direction lower-priority
   entries, stacking via multiplicative/additive/max/min. Conflicts are
   recorded, dropped entries reported.

4. **LawInteractionSolver.solve()** (`law-interaction-solver.ts`) —
   Outcome = (capability × technique × artifact × comprehension × local
   bonuses) / (world resistance × local law stack) per interaction
   category. The brief's threshold table implemented as 8 bands with
   per-domain nonlinear curves (authority domains quadratic below 1, sqrt
   above 1 — [DERIVED]). Realizes force (peak strike J × R), speed
   (station speed × R), range (radius × √R); energy cost (qwu) and
   backlash (reflected share, body-durability-reduced, ≥0.6 when
   deflected); world damage (deformation/fracture/spatialDamage); carries
   removedMatter from the terrain clip.

5. **FormationCore / TerritoryAnchor / ProtectedDomain**
   (`formation-core.ts`) — node/edge formations per doc 16 §2, 4 geometry
   kinds (radius analytic sphere-sphere; polygon with deterministic grid
   sampling; volume-mask cell counting; conformal-surface shell cap),
   FormationLoadEvent (absorbed/strained/fractured/partial-breach/breached
   with resisted/penetrated authority + stress), protection retention
   per result, per-domain restriction multipliers.

6. **Terrain-operation clip** (`terrain-operation-clip.ts`) — candidate
   blast volume → sample protection fields → clip/reduce/redirect →
   surviving operation → ONE MatterRemovalEvent for the surviving part
   ONLY (via MatterSink, no double counting; zero event when fully
   protected). removedMatter = clipped volume. Volume conservation
   invariant `clipConservesVolume` proven.

7. **Conformance** (`laws-conformance.ts`, 98 asserts) — threshold bands,
   same-cultivator-in-different-realms (godlike in Mortal world /
   constrained in Mahayana world), forbidden-clash rule, stack
   stacking/conflict, formation reinforcement (wall resists weak, strains
   on peer, breaches on overwhelming, restriction multipliers feed the
   solver), terrain-op clipping (half-protected blast, breached ward,
   full containment → no event, polygon domain, redirect share), and
   determinism (identical inputs → JSON-identical results). Wired into
   dashboard-data CONFORMANCE_FIELS as 'Law Interaction' (expected 98).

## Forbidden-clash rule encoding (doc 32)

`solve()` at law-interaction-solver.ts — the defender's own cultivation is
part of the resistance in a direct clash: when actorRealm < targetRealm the
denominator is multiplied by 2^(Δrealm) (`clashDifferential`, [DERIVED]).
This puts a lower-realm actor at R < 1.0 against a same-station world. If
R < 1.0 in a direct clash the outcome is forced: success=false, band locked,
realized force/speed/range zeroed, backlash ≥ 0.6, `forbiddenClash.deflected
= true`. An explicit `tacticalAdvantageMultiplier` is the ONLY path to
R ≥ 1.0 for a lower-realm actor (proven: ×5 flips the canonical
Qi Condensation vs Core Formation case). Edge case documented in the
conformance test: in a world two stations below the actor, R can reach 1.0
naturally — the rule keys on R < 1.0 per the design brief.

## Verification

- `bun run typecheck` → exit 0 (0 errors, whole project)
- `bun run lint` → exit 0 (0 errors, 2 pre-existing warnings in
  src/engine/architect/asset-compiler — not touched)
- `bun run src/engine/laws/laws-conformance.ts` → 98/98, exit 0
- `bun run src/engine/conformance-test.ts` → 37/37, exit 0
- `bun run src/engine/architect/conformance-test.ts` → 113/113, exit 0
- `bun run src/engine/world/matter/matter-conformance.ts` → 54/54, exit 0
  (matter system regression untouched — the laws clip only consumes
  MatterSink)

## Data flow

```
LawInteractionInput → LawInteractionSolver.solve()   law-interaction-solver.ts
  ├─ effectiveDomainCapability()                    capability-vector.ts:124
  ├─ resolveDomainMultipliers()                     capability-vector.ts:263
  ├─ resolveLocalLawStack()                         local-law-stack.ts:157
  ├─ resistanceOf()                                 realm-law-profile.ts:120
  └─ clashDifferential 2^(Δrealm)                   law-interaction-solver.ts:288

TerrainDestructionOperation → clipTerrainOperation() terrain-operation-clip.ts
  ├─ domainIntersectionWithSphere()                 formation-core.ts:262
  ├─ evaluateFormationLoad()                        formation-core.ts:159
  └─ MatterSink.onTerrainDestruction(survivingOp)   matter-sink.ts (consumed)
```

## Known limitations (honest)

- Volume math for polygon/conformal domains is sampled/grid approximation
  (radius domain is analytic); documented, deterministic.
- Formation `redirect` uses a `'redirect'` key cast inside
  restrictionMultipliers — typed via `REDIRECT_KEY` const; a first-class
  field would be cleaner.
- The solver is NOT yet wired into the engine runtime / combat plugin
  (ga-combat computeDamage remains the phase-routing path; the laws solver
  is the authoritative ratio layer they should call into — integration is
  a follow-up task).
- Realm-law profile values for stations 6–10 are [DERIVED] tuning cells
  (doc 32 marks them unresolvable until playtested).
- Clash differential (2^(Δrealm)) is [DERIVED]; magnitude tunable.

## Maturity

- Solver + profiles + stacks + formations + clip core: working,
  determinism-proven (98 asserts, JSON-identical replay).
- Integration into runtime/combat/NPC layers: NOT STARTED (by design —
  mission scope was the deterministic core).
- Maturity ladder: CORE_PROVEN for the pure functions; INTEGRATION_PENDING.
