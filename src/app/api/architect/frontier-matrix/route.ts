/**
 * GET /api/architect/frontier-matrix
 * -----------------------------------
 * Returns the status of all frontier technology candidates.
 *
 * Per the auditor's directive, maturity is NOT self-reported by adapters.
 * It is derived from evidence using the CapabilityMaturity ladder:
 *
 *   DISCOVERED → PINNED → INSTALLED → IMPORTABLE → INSTANTIATED →
 *   EXERCISED → PIPELINE_CONNECTED → WORKFLOW_PROVEN →
 *   ACCEPTANCE_PASSED → PRODUCTION_CANDIDATE → VALIDATED
 *
 * "available" means ONLY: passed acceptance suite in current environment.
 *
 * An importable package is NOT available. It is IMPORTABLE.
 */

import { NextResponse } from 'next/server';
import { CURRENT_MATURITY, MATURITY_DESCRIPTIONS, type ExtendedMaturity } from '@/engine/architect/capability-maturity';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const candidates: Array<{
      name: string;
      role: string;
      maturity: ExtendedMaturity;
      description: string;
      installMode: string;
    }> = [
      {
        name: 'Restate',
        role: 'Durable UnboundLoop execution',
        maturity: 'DISCOVERED',
        description: MATURITY_DESCRIPTIONS['DISCOVERED'],
        installMode: 'server-side service + TypeScript SDK',
      },
      {
        name: 'Unified Planning',
        role: 'Planner-independent action/temporal planning',
        maturity: 'DISCOVERED',
        description: MATURITY_DESCRIPTIONS['DISCOVERED'],
        installMode: 'server-side Python + JSON API',
      },
      {
        name: 'OR-Tools CP-SAT',
        role: 'Scheduling, layout, resource allocation',
        maturity: 'DISCOVERED',
        description: MATURITY_DESCRIPTIONS['DISCOVERED'],
        installMode: 'npm ortools (WASM) or server-side Python',
      },
      {
        name: 'Z3',
        role: 'Universe-law invariant checking (SMT)',
        maturity: CURRENT_MATURITY.z3,
        description: 'Z3 WASM Pthread initialization fails. Fallback is TypeScript null checks, NOT SMT. 7 invariants are DEFINED but not formally checked. Hardcoded absolute path makes it non-portable.',
        installMode: 'npm z3-solver (WASM)',
      },
      {
        name: 'clingo',
        role: 'Lore, defaults, exceptions (ASP)',
        maturity: 'DISCOVERED',
        description: MATURITY_DESCRIPTIONS['DISCOVERED'],
        installMode: 'server-side Python + JSON API',
      },
      {
        name: 'Cedar',
        role: 'Authorization (policy-separated)',
        maturity: CURRENT_MATURITY.cedar,
        description: 'WASM v4.12.0 works, 8/8 tests pass. BUT: policies permit every architect action unconditionally. No real denial proven. Cedar failure falls back to allow (should fail closed). Security theater, not real authorization.',
        installMode: 'npm @cedar-policy/cedar-wasm',
      },
      {
        name: 'Wasmtime/WIT',
        role: 'Plugin ABI (server-side)',
        maturity: 'DISCOVERED',
        description: MATURITY_DESCRIPTIONS['DISCOVERED'],
        installMode: 'server-side Rust',
      },
      {
        name: 'Extism',
        role: 'Cross-language plugin hosting',
        maturity: 'DISCOVERED',
        description: MATURITY_DESCRIPTIONS['DISCOVERED'],
        installMode: 'npm @extism/extism',
      },
      {
        name: 'Quint',
        role: 'Formal specification (temporal logic)',
        maturity: 'DISCOVERED',
        description: MATURITY_DESCRIPTIONS['DISCOVERED'],
        installMode: 'npm + CLI',
      },
      {
        name: 'Playwright',
        role: 'Browser verification (Chromium + Firefox)',
        maturity: CURRENT_MATURITY.playwright,
        description: 'Available via agent-browser CLI. Not yet run in production build with trace capture.',
        installMode: 'already installed',
      },
      {
        name: '3DTilesRendererJS',
        role: 'Planetary streaming',
        maturity: CURRENT_MATURITY.tilesRenderer,
        description: 'Package imports successfully. NO tile sets loaded. NO planetary streaming tested. 6 coordinate frames are type definitions only. Renderer constructible but UNPROVEN.',
        installMode: 'npm 3d-tiles-renderer',
      },
      {
        name: 'glTF-Transform',
        role: 'Asset processing (dedup, resample, compress)',
        maturity: CURRENT_MATURITY.gltfTransform,
        description: 'Pipeline runs on a test cube only. NOT tested on real MeshKernel. LOD chain is no-op on simple geometry. Not integrated with Studio asset pipeline. KTX2 not implemented.',
        installMode: 'npm @gltf-transform/core',
      },
      {
        name: 'meshoptimizer',
        role: 'Mesh simplification, LOD, meshlets',
        maturity: CURRENT_MATURITY.meshoptimizer,
        description: 'Simplifier called on cube only. LOD generation is no-op on trivial geometry. Not tested on real meshes. Not integrated with Studio.',
        installMode: 'npm meshoptimizer (WASM)',
      },
      {
        name: 'Rapier',
        role: 'Browser physics (WASM)',
        maturity: CURRENT_MATURITY.rapier,
        description: 'WASM initializes, World created, capsule constructed. But: no character controller, no movement, no terrain collision, no shape-aware colliders, no render sync. dt is ignored. Only INSTANTIATED, not EXERCISED.',
        installMode: 'npm @dimforge/rapier3d-compat',
      },
    ];

    const bakeOffs = [
      {
        id: 1,
        name: 'Durable Grand Architect Execution',
        solvers: ['Restate', 'DBOS'],
        status: 'DISCOVERED',
        description: 'Same reference workflow in Restate and DBOS. Kill server at every stage, restart, repeat messages, delay providers, cancel jobs, test 1000 concurrent workflows.',
      },
      {
        id: 2,
        name: 'Multi-Solver Authorial Planning',
        solvers: ['Unified Planning', 'OR-Tools', 'Z3', 'clingo'],
        status: 'HARDCODED_REFERENCE_FIXTURE',
        description: 'Current endpoint returns hardcoded actions based on keyword matching. Z3 broken. Cedar rubber stamp. Not real planning.',
      },
      {
        id: 3,
        name: 'Plugin Sandbox',
        solvers: ['Wasmtime', 'Extism', 'Cedar'],
        status: 'EXERCISED',
        description: 'Cedar WASM works but no real denial proven. Wasmtime/Extism not installed.',
      },
      {
        id: 4,
        name: 'Versioned Canon',
        solvers: ['TerminusDB'],
        status: 'DISCOVERED',
        description: '100,000 rules + 1,000,000 relationships + branches + retcons + source spans + character-knowledge projections.',
      },
      {
        id: 5,
        name: 'Planet Traversal',
        solvers: ['3DTilesRendererJS', 'Rapier'],
        status: 'IMPORTABLE',
        description: '3DTilesRendererJS imports but no tiles rendered. Rapier INSTANTIATED but no character controller. Neither proven.',
      },
      {
        id: 6,
        name: 'Production Character',
        solvers: ['MHR', 'Momentum', 'Kimodo', 'ozz', 'ACL'],
        status: 'DISCOVERED',
        description: 'MHR base → stylization → Momentum retargeting → Kimodo motion → ozz runtime → ACL compression → browser playback.',
      },
      {
        id: 7,
        name: 'Destructible Planetary Terrain',
        solvers: ['3DTilesRendererJS', 'custom SDF', 'Rapier'],
        status: 'IMPORTABLE',
        description: 'Planetary terrain → sparse SDF shell → carve tunnel → local remesh → matching collision/nav rebuild → walk through → undo → save → reload.',
      },
    ];

    // Count by maturity level
    const maturityCounts: Record<string, number> = {};
    for (const c of candidates) {
      maturityCounts[c.maturity] = (maturityCounts[c.maturity] ?? 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      sTierCandidates: candidates,
      maturityCounts,
      totalCandidates: candidates.length,
      bakeOffs,
      reclassified: {
        STOK: 'Frontier Lab only — NOT foundational',
        FDRS: 'Frontier Lab only — NOT foundational',
      },
      maturityLadder: Object.entries(MATURITY_DESCRIPTIONS).map(([level, desc]) => ({
        level: level as ExtendedMaturity,
        description: desc,
      })),
      note: 'Maturity is derived from evidence, not self-reported by adapters. "available" means ONLY: passed acceptance suite in current environment.',
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
