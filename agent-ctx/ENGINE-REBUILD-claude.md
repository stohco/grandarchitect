# ENGINE-REBUILD — Claude (sole agent)

**Task:** Rebuild the RCVC (Reasoning, Constraint, Verification, Complexity) engine layer + 5 API routes for the xianxia RPG engine after a `git reset` wiped all engine files.

**Date:** 2026-08-04
**Status:** in progress

## What survived
- `src/engine/architect/rcvc/claims/schema.ts` + `extractor.ts` (untracked, untouched)
- The corpus docs `corpus-extension/00-49` (for the lore + validate-bible APIs to read)
- The determinism stack `src/lib/determinism/{rng,transcendentals,...}.ts` — must reuse this for all random/transcendental needs (NO Math.random/sin/cos/exp/log/pow/atan2 in simulation code)
- The editor at `/` is rebuilt and working with 5 existing routes

## Plan
1. types.ts — full RCVC type vocabulary + VALIDATOR_COVERAGE
2. reasoning/ — scoring, target-resolver, hypothesis (3 hypotheses), clarification
3. constraints/ — ir, backtracking-solver, procedural-solver, proof, service
4. verification/ — model-checker (BFS), protocols (6 specs), contradiction-detector (8 check types, VALIDATOR_COVERAGE)
5. observatory/ — metrics, light-cone (mutual information), sampler
6. perf/ — entity-pool (SoA typed arrays), benchmarks (5 Ursus-comparison runs)
7. rewriting/ — e-graph (AC canonicalisation, pattern matching)
8. index.ts — barrel + createRCVCService facade
9. 5 API routes — POST /api/architect/constraints, GET /api/architect/verify, GET /api/architect/complexity, POST /api/architect/benchmark, GET /api/architect/validate-bible

## Key constraints honoured
- TypeScript strict
- No Math.random/Date.now/performance.now/Math.sin/cos/exp/log/atan2/pow in simulation code (determinism stack used instead)
- No blue/indigo colors (editor concern; engine itself emits no UI)
- VALIDATOR_COVERAGE version 0.1.0-structural-only, 20 known blind spots, 5 unimplemented layers
- contradiction-detector's formatReport() says "This does NOT prove the bible is internally consistent" when 0 findings (NOT "No contradictions detected. The bible is internally consistent.")
