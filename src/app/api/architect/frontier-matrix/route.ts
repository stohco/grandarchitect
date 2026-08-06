/**
 * GET /api/architect/frontier-matrix
 * -----------------------------------
 * Returns the status of all S-tier frontier technology adapters.
 *
 * Per the FRONTIER_TECHNOLOGY_MATRIX.md directive, this endpoint reports:
 *   - Which adapters are installed and available
 *   - Which are pending (need server-side services)
 *   - Which are in the Frontier Lab (experimental)
 *   - The 3 ordered bake-offs
 */

import { NextResponse } from 'next/server';
import { getZ3Solver } from '@/engine/architect/z3-verifier';
import { getCedarAuthorizer } from '@/engine/architect/cedar-auth';
import { getPlanningRouter } from '@/engine/architect/planning-router/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const z3 = getZ3Solver();
    const cedar = getCedarAuthorizer();
    const router = getPlanningRouter();

    // Check if glTF-Transform and meshoptimizer are installed.
    let gltfTransformAvailable = false;
    let meshoptimizerAvailable = false;
    try {
      require('@gltf-transform/core');
      gltfTransformAvailable = true;
    } catch { /* not installed */ }
    try {
      require('meshoptimizer');
      meshoptimizerAvailable = true;
    } catch { /* not installed */ }

    const sTier = [
      {
        name: 'Restate',
        role: 'Durable UnboundLoop execution',
        status: 'pending-bake-off',
        available: false,
        reason: 'Requires server-side Restate service. Bake-off 1: Restate vs DBOS.',
        installMode: 'server-side service + TypeScript SDK',
      },
      {
        name: 'Unified Planning',
        role: 'Planner-independent action/temporal planning',
        status: 'pending-bake-off',
        available: false,
        reason: 'Requires Python server-side adapter. Bake-off 2.',
        installMode: 'server-side Python + JSON API',
      },
      {
        name: 'OR-Tools CP-SAT',
        role: 'Scheduling, layout, resource allocation',
        status: 'pending-bake-off',
        available: false,
        reason: 'Bake-off 2: multi-solver planning.',
        installMode: 'npm ortools (WASM) or server-side Python',
      },
      {
        name: 'Z3',
        role: 'Universe-law invariant checking (SMT)',
        status: 'adapter-created',
        available: z3.available,
        reason: z3.reason,
        installMode: 'npm z3-solver (WASM)',
        invariants: 7,
      },
      {
        name: 'clingo',
        role: 'Lore, defaults, exceptions (ASP)',
        status: 'pending-bake-off',
        available: false,
        reason: 'Requires server-side Python. Bake-off 2.',
        installMode: 'server-side Python + JSON API',
      },
      {
        name: 'Cedar',
        role: 'Authorization (policy-separated)',
        status: 'adapter-created',
        available: cedar.isAvailable(),
        reason: cedar.getReason(),
        installMode: 'npm @cedar-policy/cedar-wasm',
        policies: 8,
      },
      {
        name: 'Wasmtime/WIT',
        role: 'Plugin ABI (server-side)',
        status: 'pending-bake-off',
        available: false,
        reason: 'Requires server-side Rust service. Bake-off 3.',
        installMode: 'server-side Rust',
      },
      {
        name: 'Extism',
        role: 'Cross-language plugin hosting',
        status: 'pending-bake-off',
        available: false,
        reason: 'Bake-off 3: plugin sandbox.',
        installMode: 'npm @extism/extism',
      },
      {
        name: 'Quint',
        role: 'Formal specification (temporal logic)',
        status: 'pending',
        available: false,
        reason: 'Not yet integrated. Install npm @informalsystems/quint.',
        installMode: 'npm + CLI',
      },
      {
        name: 'Playwright',
        role: 'Browser verification (Chromium + Firefox)',
        status: 'available',
        available: true,
        reason: 'Available via agent-browser CLI.',
        installMode: 'already installed',
      },
      {
        name: '3DTilesRendererJS',
        role: 'Planetary streaming',
        status: 'installed',
        available: false,
        reason: 'npm 3d-tiles-renderer installed — adapter created, pending WASM init test',
        installMode: 'npm 3d-tiles-renderer',
      },
      {
        name: 'glTF-Transform',
        role: 'Asset processing (dedup, resample, compress)',
        status: 'installed',
        available: gltfTransformAvailable,
        reason: gltfTransformAvailable ? 'npm @gltf-transform/core installed' : 'not installed',
        installMode: 'npm @gltf-transform/core',
      },
      {
        name: 'meshoptimizer',
        role: 'Mesh simplification, LOD, meshlets',
        status: 'installed',
        available: meshoptimizerAvailable,
        reason: meshoptimizerAvailable ? 'npm meshoptimizer installed' : 'not installed',
        installMode: 'npm meshoptimizer (WASM)',
      },
      {
        name: 'Rapier',
        role: 'Browser physics (WASM)',
        status: 'installed',
        available: false,
        reason: 'npm @dimforge/rapier3d-compat installed — adapter created, pending WASM init test',
        installMode: 'npm @dimforge/rapier3d-compat',
      },
    ];

    const bakeOffs = [
      {
        id: 1,
        name: 'Durable Grand Architect Execution',
        solvers: ['Restate', 'DBOS'],
        status: 'pending',
        description: 'Same reference workflow in Restate and DBOS. Kill server at every stage, restart, repeat messages, delay providers, cancel jobs, test 1000 concurrent workflows.',
      },
      {
        id: 2,
        name: 'Multi-Solver Authorial Planning',
        solvers: ['Unified Planning', 'OR-Tools', 'Z3', 'clingo'],
        status: 'z3-adapter-ready',
        description: 'One real request: "Create an ancient declining sword-sect city while preserving the river and village road." Compare to LLM-only plan.',
      },
      {
        id: 3,
        name: 'Plugin Sandbox',
        solvers: ['Wasmtime', 'Extism', 'Cedar'],
        status: 'cedar-adapter-ready',
        description: 'Malicious test plugin attempts: filesystem escape, network, process spawn, memory, infinite loop, world mutation, policy alteration. Every unauthorized action must fail.',
      },
      {
        id: 4,
        name: 'Versioned Canon',
        solvers: ['TerminusDB'],
        status: 'pending',
        description: '100,000 rules + 1,000,000 relationships + branches + retcons + source spans + character-knowledge projections.',
      },
      {
        id: 5,
        name: 'Planet Traversal',
        solvers: ['3DTilesRendererJS', 'Rapier'],
        status: 'pending',
        description: 'Stand on surface → fly upward → cross atmosphere → orbital frame → travel globe → descend. Test precision, floating-origin, streaming, physics continuity.',
      },
      {
        id: 6,
        name: 'Production Character',
        solvers: ['MHR', 'Momentum', 'Kimodo', 'ozz', 'ACL'],
        status: 'pending',
        description: 'MHR base → stylization → Momentum retargeting → Kimodo motion → ozz runtime → ACL compression → browser playback.',
      },
      {
        id: 7,
        name: 'Destructible Planetary Terrain',
        solvers: ['3DTilesRendererJS', 'custom SDF', 'Rapier'],
        status: 'pending',
        description: 'Planetary terrain → sparse SDF shell → carve tunnel → local remesh → matching collision/nav rebuild → walk through → undo → save → reload.',
      },
    ];

    return NextResponse.json({
      ok: true,
      sTierCandidates: sTier,
      sTierAvailable: sTier.filter((s) => s.available).length,
      sTierTotal: sTier.length,
      bakeOffs,
      reclassified: {
        STOK: 'Frontier Lab only — NOT foundational',
        FDRS: 'Frontier Lab only — NOT foundational',
      },
      planningRouter: {
        solvers: router.listSolvers(),
        note: 'Router dispatches to specialized solvers based on problem type.',
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
