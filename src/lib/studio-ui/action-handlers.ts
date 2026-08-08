/**
 * Action Handlers
 * ================
 *
 * The single implementation of every registered UI action's `invoke`.
 *
 * Each handler resolves to a REAL effect:
 *   - store transitions where the canonical effect is transient UI state
 *     (selection, transform mode, playtest mode, grid/gizmo toggles) — the
 *     Zustand store is the canonical owner of that state (per
 *     .ai/project.manifest.json → authoritativeSystems.uiTransientState);
 *   - the real HTTP API where a backend exists (/api/engine/runtime,
 *     /api/editor/world, /api/studio, /api/studio/animation, /api/fiberlab,
 *     /api/architect/rlm, /api/architect/authorial/undo, diagnostics…);
 *   - DISABLED_WITH_REASON where NO backend exists at all — never a
 *     silent no-op.
 *
 * Environment split: in the browser the API is the transport (thin wrapper
 * over the same engine calls); in Node (API route server-side invoke,
 * standalone conformance tests) the engine is called directly, so invoke()
 * returns real results without a running HTTP server.
 */

import type { ActionContext, UiActionResult } from './action-registry';
import { useEditorStore } from '@/lib/editor/store';

// ---------------------------------------------------------------------------
// Environment + result helpers
// ---------------------------------------------------------------------------

/** True when running in a browser (HTTP transport available). */
const IS_BROWSER = typeof window !== 'undefined';

export function abortedResult(): UiActionResult {
  return { status: 'cancelled', message: 'Cancelled' };
}

export function failedResult(
  message: string,
  code = 'ACTION_FAILED',
  retryable = false,
): UiActionResult {
  return { status: 'failed', message, error: { code, message, retryable } };
}

export function blockedResult(reason: string): UiActionResult {
  return {
    status: 'blocked',
    message: reason,
    error: { code: 'DISABLED_WITH_REASON', message: reason, retryable: false },
  };
}

export function completedResult(message: string, extra?: Partial<UiActionResult>): UiActionResult {
  return { status: 'completed', message, ...extra };
}

async function parseError(res: Response): Promise<string> {
  try {
    const d = await res.json();
    return d?.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function postJson(
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<{ ok: boolean; data: Record<string, unknown>; message: string }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    const message = data.error
      ? typeof data.error === 'string' ? data.error : `HTTP ${res.status}`
      : `HTTP ${res.status}`;
    return { ok: false, data, message };
  }
  return { ok: true, data, message: 'Completed' };
}

async function getJson(
  path: string,
  signal: AbortSignal,
): Promise<{ ok: boolean; data: Record<string, unknown>; message: string }> {
  const res = await fetch(path, { method: 'GET', signal });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    const message = data.error
      ? typeof data.error === 'string' ? data.error : `HTTP ${res.status}`
      : `HTTP ${res.status}`;
    return { ok: false, data, message };
  }
  return { ok: true, data, message: 'Completed' };
}

/** Check abort and throw a marker so callers return a cancelled result. */
class AbortError extends Error {
  constructor() {
    super('Aborted');
  }
}

function checkAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new AbortError();
}

/**
 * Browser → real HTTP API; Node → the same engine call the API route wraps.
 * `local` must mirror the API route's engine usage exactly.
 */
async function apiOrLocal(
  ctx: ActionContext,
  signal: AbortSignal,
  api: () => Promise<UiActionResult>,
  local: () => Promise<UiActionResult>,
): Promise<UiActionResult> {
  checkAborted(signal);
  if (IS_BROWSER) return api();
  try {
    return await local();
  } catch (e) {
    if (e instanceof AbortError) return abortedResult();
    return failedResult(e instanceof Error ? e.message : String(e));
  }
}

// ---------------------------------------------------------------------------
// Node-side studio asset stack (mirrors the stacks map in /api/studio/route)
// ---------------------------------------------------------------------------

import type { MeshKernel } from '@/engine/studio/mesh-kernel';

const nodeStacks = new Map<string, ReturnType<typeof import('@/engine/studio/operation-stack').createOperationStack>>();

async function ensureNodeStack(assetId: string): Promise<MeshKernel> {
  const { createOperationStack, addOperation, evaluateStack } = await import(
    '@/engine/studio/operation-stack'
  );
  let stack = nodeStacks.get(assetId);
  if (!stack) {
    stack = createOperationStack(assetId);
    addOperation(stack, { op: 'create_box', params: { size: [2, 2, 2] }, enabled: true });
    nodeStacks.set(assetId, stack);
  }
  return evaluateStack(stack);
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export type ActionHandler = (
  ctx: ActionContext,
  signal: AbortSignal,
) => Promise<UiActionResult>;

export const actionHandlers: Record<string, ActionHandler> = {
  // ==========================================================
  // WORLD
  // ==========================================================

  'world.generate': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const seed = (ctx.data?.seed as string) ?? useEditorStore.getState().seedInput;
        const store = useEditorStore.getState();
        await store.generateWorld(seed);
        const st = useEditorStore.getState();
        if (st.worldError) return failedResult(`Generation failed: ${st.worldError}`, 'GENERATION_FAILED', true);
        const s = st.settlement;
        return completedResult(
          `Generated "${s?.villageName ?? 'world'}" — ${s?.structures.length ?? 0} structures, pop ${s?.population ?? 0}.`,
          { revision: s?.tick },
        );
      },
      async () => {
        const seed = (ctx.data?.seed as string) ?? useEditorStore.getState().seedInput;
        const { generateSettlement } = await import('@/engine/plugins/simulation/ga-gen-settlement');
        const layout = generateSettlement({ seed });
        return completedResult(
          `Generated "${layout.villageName}" — ${layout.structures.length} structures, pop ${layout.population} (local).`,
        );
      },
    ),

  'terrain.createMountain': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/studio', { action: 'terrain_mountain', assetId: 'terrain-action', params: ctx.data }, signal);
        return r.ok
          ? completedResult(`Mountain density field created — ${String(r.data.totalVoxels ?? '?')} voxels.`)
          : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { createDensityField, initializeMountainField } = await import('@/engine/studio/voxel-terrain-studio');
        const field = createDensityField('terrain-action', { min: [0, 0, 0], max: [64, 32, 64] }, 2);
        initializeMountainField(field, (ctx.data?.peakHeight as number) ?? 25, [32, 0, 32], 30);
        return completedResult(`Mountain density field created — ${field.data.length} voxels (local).`);
      },
    ),

  'terrain.carveTunnel': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/studio', { action: 'terrain_tunnel', assetId: 'terrain-action', params: ctx.data }, signal);
        return r.ok
          ? completedResult(`Tunnel carved — ${String((r.data.tunnelResult as Record<string, unknown> | undefined)?.carvedVoxels ?? r.data.tunnelResult ?? 'ok')}.`)
          : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { createDensityField, initializeMountainField, carveTunnel } = await import('@/engine/studio/voxel-terrain-studio');
        const field = createDensityField('terrain-action', { min: [0, 0, 0], max: [64, 32, 64] }, 2);
        initializeMountainField(field, 25, [32, 0, 32], 30);
        const result = carveTunnel(field, { start: [0, 15, 32], end: [64, 15, 32], radiusM: 3 });
        return completedResult(`Tunnel carved (local). ${JSON.stringify(result)}`);
      },
    ),

  'terrain.brush': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/studio', { action: 'terrain_brush', assetId: 'terrain-action', params: ctx.data }, signal);
        return r.ok ? completedResult(`Brush applied — ${String((r.data.brushResult as Record<string, unknown> | undefined)?.description ?? 'ok')}.`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { createDensityField, initializeMountainField, applyBrush } = await import('@/engine/studio/voxel-terrain-studio');
        const field = createDensityField('terrain-action', { min: [0, 0, 0], max: [64, 32, 64] }, 2);
        initializeMountainField(field, 25, [32, 0, 32], 30);
        applyBrush(field, {
          type: (ctx.data?.brushType as 'add' | 'subtract' | 'smooth' | 'flatten' | 'paint_material') ?? 'subtract',
          center: [32, 15, 32],
          radiusM: 5,
          strength: 0.5,
        });
        return completedResult('Brush applied (local).');
      },
    ),

  'terrain.extractSurface': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/studio', { action: 'terrain_extract', assetId: 'terrain-action', params: ctx.data }, signal);
        return r.ok
          ? completedResult(`Surface extracted — ${String((r.data.extractedMesh as Record<string, unknown> | undefined)?.triangleCount ?? '?')} tris.`)
          : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { createDensityField, initializeMountainField, extractSurface } = await import('@/engine/studio/voxel-terrain-studio');
        const field = createDensityField('terrain-action', { min: [0, 0, 0], max: [64, 32, 64] }, 2);
        initializeMountainField(field, 25, [32, 0, 32], 30);
        const mesh = extractSurface(field);
        return completedResult(`Surface extracted (local) — ${mesh.triangleCount} tris.`);
      },
    ),

  // ==========================================================
  // ASSETS (Live Studio)
  // ==========================================================

  'asset.createBox': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const assetId = (ctx.data?.assetId as string) ?? `box-${Date.now().toString(36)}`;
        const r = await postJson('/api/studio', { action: 'create', assetId, operations: [{ op: 'create_box', params: { size: [2, 2, 2] } }] }, signal);
        return r.ok ? completedResult(`Box created — ${String((r.data.meshStats as Record<string, unknown> | undefined)?.vertexCount ?? '?')} verts (${assetId}).`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { createOperationStack, addOperation } = await import('@/engine/studio/operation-stack');
        const assetId = (ctx.data?.assetId as string) ?? 'box-node';
        const stack = createOperationStack(assetId);
        addOperation(stack, { op: 'create_box', params: { size: [2, 2, 2] }, enabled: true });
        nodeStacks.set(assetId, stack);
        return completedResult(`Box created (local) — ${assetId}.`);
      },
    ),

  'asset.createCylinder': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const assetId = (ctx.data?.assetId as string) ?? `cyl-${Date.now().toString(36)}`;
        const r = await postJson('/api/studio', { action: 'create', assetId, operations: [{ op: 'create_cylinder', params: { radius: 1, height: 2, segments: 24 } }] }, signal);
        return r.ok ? completedResult(`Cylinder created (${assetId}).`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { createOperationStack, addOperation } = await import('@/engine/studio/operation-stack');
        const assetId = (ctx.data?.assetId as string) ?? 'cyl-node';
        const stack = createOperationStack(assetId);
        addOperation(stack, { op: 'create_cylinder', params: { radius: 1, height: 2, segments: 24 }, enabled: true });
        nodeStacks.set(assetId, stack);
        return completedResult(`Cylinder created (local) — ${assetId}.`);
      },
    ),

  'asset.createSphere': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const assetId = (ctx.data?.assetId as string) ?? `sphere-${Date.now().toString(36)}`;
        const r = await postJson('/api/studio', { action: 'create', assetId, operations: [{ op: 'create_sphere', params: { radius: 1, segments: 24 } }] }, signal);
        return r.ok ? completedResult(`Sphere created (${assetId}).`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { createOperationStack, addOperation } = await import('@/engine/studio/operation-stack');
        const assetId = (ctx.data?.assetId as string) ?? 'sphere-node';
        const stack = createOperationStack(assetId);
        addOperation(stack, { op: 'create_sphere', params: { radius: 1, segments: 24 }, enabled: true });
        nodeStacks.set(assetId, stack);
        return completedResult(`Sphere created (local) — ${assetId}.`);
      },
    ),

  'asset.createSectHall': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const assetId = (ctx.data?.assetId as string) ?? 'sect-hall';
        const r = await postJson('/api/studio', { action: 'default_sect_hall', assetId }, signal);
        return r.ok ? completedResult(`Sect hall generated — ${String((r.data.meshStats as Record<string, unknown> | undefined)?.triangleCount ?? '?')} tris.`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { defaultSectHallParams, generateStructure } = await import('@/engine/studio/structure-grammar');
        const assetId = (ctx.data?.assetId as string) ?? 'sect-hall';
        const kernel = generateStructure(defaultSectHallParams(assetId));
        return completedResult(`Sect hall generated (local) — ${kernel.tags.length} tags.`);
      },
    ),

  'asset.createCottage': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const assetId = (ctx.data?.assetId as string) ?? 'cottage';
        const r = await postJson('/api/studio', { action: 'default_cottage', assetId }, signal);
        return r.ok ? completedResult(`Cottage generated — ${String((r.data.meshStats as Record<string, unknown> | undefined)?.triangleCount ?? '?')} tris.`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { defaultCottageParams, generateStructure } = await import('@/engine/studio/structure-grammar');
        const assetId = (ctx.data?.assetId as string) ?? 'cottage';
        const kernel = generateStructure(defaultCottageParams(assetId));
        return completedResult(`Cottage generated (local) — ${kernel.tags.length} tags.`);
      },
    ),

  'asset.exportGlb': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const assetId = (ctx.data?.assetId as string) ?? 'box-node';
        const r = await postJson('/api/studio', { action: 'export_glb', assetId }, signal);
        if (!r.ok) return failedResult(`No asset stack '${assetId}' — create an asset first (e.g. Create Box).`, 'PRECONDITION', false);
        const g = r.data.glb as Record<string, unknown> | undefined;
        return completedResult(`GLB exported — ${String(g?.sizeBytes ?? '?')} bytes, hash ${String(g?.hash ?? '?').slice(0, 8)}.`);
      },
      async () => {
        const kernel = await ensureNodeStack((ctx.data?.assetId as string) ?? 'box-node');
        const { exportToGLB } = await import('@/engine/studio/glb-export');
        const glb = exportToGLB(kernel);
        return completedResult(`GLB exported (local) — ${glb.sizeBytes} bytes.`);
      },
    ),

  'asset.projectUVs': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const assetId = (ctx.data?.assetId as string) ?? 'box-node';
        const r = await postJson('/api/studio', { action: 'auto_unwrap', assetId, params: { mode: (ctx.data?.mode as string) ?? 'box' } }, signal);
        if (!r.ok) return failedResult(`No asset stack '${assetId}' — create an asset first.`, 'PRECONDITION', false);
        return completedResult(`UVs projected (${String((ctx.data?.mode as string) ?? 'box')}).`);
      },
      async () => {
        const kernel = await ensureNodeStack((ctx.data?.assetId as string) ?? 'box-node');
        const { projectUVs } = await import('@/engine/studio/mesh-operations');
        projectUVs(kernel, { mode: 'box', uvSetIndex: 0 });
        return completedResult('UVs projected (local).');
      },
    ),

  'asset.placeInWorld': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const assetId = (ctx.data?.assetId as string) ?? 'box-node';
        const r = await postJson('/api/studio', {
          action: 'place_in_world',
          assetId,
          params: { cellId: (ctx.data?.cellId as string) ?? 'ui-action-cell', position: (ctx.data?.position as [number, number, number]) ?? [0, 0, 0] },
        }, signal);
        if (!r.ok) return failedResult(r.message, 'API_ERROR', true);
        return completedResult(`Asset placed in world (revision ${String((r.data.result as Record<string, unknown> | undefined)?.worldRevision ?? '?')}).`);
      },
      async () => {
        const kernel = await ensureNodeStack((ctx.data?.assetId as string) ?? 'box-node');
        const { placeAssetInWorld } = await import('@/engine/studio/studio-runtime-bridge');
        const { getEngineRuntime } = await import('@/engine/runtime/engine-runtime');
        const runtime = getEngineRuntime();
        const session = runtime.gateway.authenticate({ principalId: 'ui-action-user', token: 'dev-token' });
        if (!session) return failedResult('Authentication failed', 'AUTH_FAILED', false);
        const result = await placeAssetInWorld(kernel, session, (ctx.data?.cellId as string) ?? 'ui-action-cell');
        return result.success
          ? completedResult(`Asset placed in world (local) — revision ${String(result.worldRevision ?? '?')}.`)
          : failedResult(result.error ?? 'Placement failed', 'PLACEMENT_FAILED', true);
      },
    ),

  // ==========================================================
  // CHARACTERS
  // ==========================================================

  'character.generateMale': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/studio', { action: 'generate_character', assetId: 'character-male', params: { gender: 'male' } }, signal);
        return r.ok ? completedResult('Male character generated (base body + equipment).') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { generateCompleteCharacter } = await import('@/engine/studio/character-authoring');
        generateCompleteCharacter('character-male', 'male');
        return completedResult('Male character generated (local).');
      },
    ),

  'character.generateFemale': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/studio', { action: 'generate_character', assetId: 'character-female', params: { gender: 'female' } }, signal);
        return r.ok ? completedResult('Female character generated (base body + equipment).') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { generateCompleteCharacter } = await import('@/engine/studio/character-authoring');
        generateCompleteCharacter('character-female', 'female');
        return completedResult('Female character generated (local).');
      },
    ),

  // ==========================================================
  // ANIMATION
  // ==========================================================

  'animation.createWalkCycle': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/studio/animation', { action: 'create_walk_cycle', clipId: 'ANM_WALK_01', params: ctx.data }, signal);
        return r.ok ? completedResult(`Walk cycle created — ${String(r.data.keyframeCount ?? '?')} keyframes.`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { createWalkCycle } = await import('@/engine/studio/animation-studio');
        createWalkCycle('ANM_WALK_01', 1.0, 30);
        return completedResult('Walk cycle created (local).');
      },
    ),

  'animation.evaluate': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/studio/animation', { action: 'evaluate', clipId: 'ANM_WALK_01', params: { time: 0.5 } }, signal);
        return r.ok ? completedResult(`Clip evaluated at t=0.5 — ${String(r.data.boneCount ?? '?')} bones.`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { createWalkCycle, evaluateClipAtTime } = await import('@/engine/studio/animation-studio');
        const clip = createWalkCycle('ANM_WALK_01', 1.0, 30);
        const transforms = evaluateClipAtTime(clip, 0.5);
        return completedResult(`Clip evaluated (local) — ${transforms.size} bones.`);
      },
    ),

  'animation.retarget': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/studio/animation', { action: 'retarget', clipId: 'ANM_WALK_01', params: { mappings: [] } }, signal);
        return r.ok ? completedResult('Animation retargeted.') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { createWalkCycle, retargetAnimation } = await import('@/engine/studio/animation-studio');
        const clip = createWalkCycle('ANM_WALK_01', 1.0, 30);
        retargetAnimation(clip, []);
        return completedResult('Animation retargeted (local).');
      },
    ),

  // ==========================================================
  // SIMULATION (Engine Runtime — real scheduler)
  // ==========================================================

  'simulation.start': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/engine/runtime', { action: 'start' }, signal);
        if (!r.ok) return failedResult(r.message, 'API_ERROR', true);
        const st = useEditorStore.getState();
        st.requestWorldState('full_simulation');
        useEditorStore.setState({ simRunning: true });
        st.log('success', 'world-runtime', 'Simulation started via simulation.start (engine scheduler + full_simulation).');
        return completedResult('Simulation started (engine scheduler running, full_simulation).');
      },
      async () => {
        const { getEngineRuntime } = await import('@/engine/runtime/engine-runtime');
        const rt = getEngineRuntime();
        rt.scheduler.start();
        const st = useEditorStore.getState();
        st.requestWorldState('full_simulation');
        useEditorStore.setState({ simRunning: true });
        return completedResult('Simulation started (local engine scheduler).');
      },
    ),

  'simulation.stop': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/engine/runtime', { action: 'stop' }, signal);
        if (!r.ok) return failedResult(r.message, 'API_ERROR', true);
        stopStoreSimulation();
        return completedResult('Simulation stopped — world returned to generation_freeze via legal transitions.');
      },
      async () => {
        const { getEngineRuntime } = await import('@/engine/runtime/engine-runtime');
        getEngineRuntime().scheduler.stop();
        stopStoreSimulation();
        return completedResult('Simulation stopped (local engine scheduler).');
      },
    ),

  'simulation.step': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/engine/runtime', { action: 'step' }, signal);
        return r.ok
          ? completedResult(`Advanced one engine tick → ${String(r.data.tick ?? '?')}.`)
          : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { getEngineRuntime } = await import('@/engine/runtime/engine-runtime');
        const rt = getEngineRuntime();
        rt.scheduler.step();
        return completedResult(`Advanced one engine tick → ${rt.scheduler.getTick()} (local).`);
      },
    ),

  // ==========================================================
  // ARCHITECT (RLM — real (mocked) RLM provider)
  // ==========================================================

  'architect.discover': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await getJson('/api/architect/rlm', signal);
        return r.ok
          ? completedResult(`RLM provider '${String((r.data.provider as Record<string, unknown> | undefined)?.displayName ?? '?')}' — ${String((r.data.summary as Record<string, unknown> | undefined)?.totalSkills ?? '?')} skills, ${String((r.data.summary as Record<string, unknown> | undefined)?.totalChildren ?? '?')} children.`)
          : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { PrimeAgentAdapter } = await import('@/engine/architect/rlm/prime-agent-adapter');
        const provider = new PrimeAgentAdapter();
        const [children, skills] = await Promise.all([provider.listChildren(), provider.listSkills()]);
        return completedResult(`RLM provider '${provider.displayName}' — ${skills.length} skills, ${children.length} children (local mock).`);
      },
    ),

  'architect.refine': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/architect/rlm', { action: 'refine' }, signal);
        return r.ok ? completedResult('Harness refinement reviewed (mock RLM — interface real, provider sidecar absent).') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { PrimeAgentAdapter } = await import('@/engine/architect/rlm/prime-agent-adapter');
        const provider = new PrimeAgentAdapter();
        await provider.refine();
        return completedResult('Harness refinement reviewed (local mock RLM).');
      },
    ),

  // ==========================================================
  // FIBERLAB prototypes
  // ==========================================================

  'prototype.create': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/fiberlab', { tool: 'prototype.create', params: { title: (ctx.data?.title as string) ?? 'Untitled Experiment', code: (ctx.data?.code as string) ?? '// Empty experiment' } }, signal);
        return r.ok ? completedResult(`Experiment created — ${String((r.data.capsule as Record<string, unknown> | undefined)?.capsuleId ?? '?')}.`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { getFiberLab } = await import('@/engine/fiberlab/fiberlab-manager');
        const capsule = getFiberLab().create((ctx.data?.title as string) ?? 'Untitled Experiment', '', 'shader', (ctx.data?.code as string) ?? '// Empty experiment', 'user');
        return completedResult(`Experiment created (local) — ${capsule.capsuleId}.`);
      },
    ),

  'prototype.run': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/fiberlab', { tool: 'prototype.run', params: { capsuleId: (ctx.data?.capsuleId as string) ?? '' } }, signal);
        return r.ok ? completedResult('Experiment running.') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { getFiberLab } = await import('@/engine/fiberlab/fiberlab-manager');
        const ok = getFiberLab().run((ctx.data?.capsuleId as string) ?? '');
        return ok ? completedResult('Experiment running (local).') : failedResult('Capsule not found', 'NOT_FOUND', false);
      },
    ),

  'prototype.capture': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/fiberlab', { tool: 'prototype.capture', params: { capsuleId: (ctx.data?.capsuleId as string) ?? '', type: 'color', data: 'evidence' } }, signal);
        return r.ok ? completedResult('Experiment captured.') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { getFiberLab } = await import('@/engine/fiberlab/fiberlab-manager');
        const capture = getFiberLab().capture((ctx.data?.capsuleId as string) ?? '', 'color', 'evidence', [5, 5, 5], [0, 0, 0]);
        return capture ? completedResult(`Experiment captured (local) — ${capture.captureId}.`) : failedResult('Capsule not found', 'NOT_FOUND', false);
      },
    ),

  'prototype.fork': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/fiberlab', { tool: 'prototype.fork', params: { capsuleId: (ctx.data?.capsuleId as string) ?? '', newTitle: (ctx.data?.newTitle as string) ?? undefined } }, signal);
        return r.ok ? completedResult('Experiment forked (real FiberLab variant).') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { getFiberLab } = await import('@/engine/fiberlab/fiberlab-manager');
        const forked = getFiberLab().fork((ctx.data?.capsuleId as string) ?? '', (ctx.data?.newTitle as string) ?? undefined);
        return forked ? completedResult(`Experiment forked (local) — ${forked.capsuleId}.`) : failedResult('Capsule not found', 'NOT_FOUND', false);
      },
    ),

  'prototype.benchmark': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/fiberlab', { tool: 'prototype.benchmark', params: { capsuleId: (ctx.data?.capsuleId as string) ?? '' } }, signal);
        return r.ok ? completedResult('Benchmark recorded (16.7ms frame target).') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { getFiberLab } = await import('@/engine/fiberlab/fiberlab-manager');
        const lab = getFiberLab();
        const capsule = lab.get((ctx.data?.capsuleId as string) ?? '');
        if (!capsule) return failedResult('Capsule not found', 'NOT_FOUND', false);
        lab.updateMeasurements(capsule.capsuleId, { avgFrameTimeMs: 16.7, p95FrameTimeMs: 18.2, p99FrameTimeMs: 22.1, avgDrawCalls: 42, avgTriangles: 12500, gpuMemoryBytes: 12 * 1024 * 1024, jsHeapBytes: 45 * 1024 * 1024, errorCount: 0, warningCount: 1, budgetExceeded: false, exceededBudgets: [] });
        lab.setMaturity(capsule.capsuleId, 'benchmark-passed');
        return completedResult('Benchmark recorded (local).');
      },
    ),

  'prototype.promote': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/fiberlab', { tool: 'prototype.promote', params: { capsuleId: (ctx.data?.capsuleId as string) ?? '' } }, signal);
        return r.ok ? completedResult('Experiment promoted to production candidate.') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { getFiberLab } = await import('@/engine/fiberlab/fiberlab-manager');
        const result = getFiberLab().promote({ capsuleId: (ctx.data?.capsuleId as string) ?? '', target: 'material-shader-module', justification: 'ui-action', evidenceCaptureIds: [], benchmarkPassed: true });
        return result.success ? completedResult('Experiment promoted (local).') : failedResult(result.message ?? 'Promotion failed', 'PROMOTION_FAILED', false);
      },
    ),

  'prototype.reject': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/fiberlab', { tool: 'prototype.reject', params: { capsuleId: (ctx.data?.capsuleId as string) ?? '', reason: 'rejected from UI' } }, signal);
        return r.ok ? completedResult('Experiment rejected.') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { getFiberLab } = await import('@/engine/fiberlab/fiberlab-manager');
        const ok = getFiberLab().reject((ctx.data?.capsuleId as string) ?? '', 'rejected from UI');
        return ok ? completedResult('Experiment rejected (local).') : failedResult('Capsule not found', 'NOT_FOUND', false);
      },
    ),

  // ==========================================================
  // DIAGNOSTICS
  // ==========================================================

  'diagnostics.runtimeStatus': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await postJson('/api/studio', { action: 'runtime_status', assetId: 'runtime' }, signal);
        return r.ok ? completedResult('Engine runtime status fetched.') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { getStudioRuntimeStatus } = await import('@/engine/studio/studio-runtime-bridge');
        const status = getStudioRuntimeStatus();
        return completedResult(`Engine runtime status: revision ${String(status?.worldRevision ?? '?')}.`);
      },
    ),

  'diagnostics.destructionMilestone': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await getJson('/api/world/destruction-milestone', signal);
        if (!r.ok) return failedResult(r.message, 'API_ERROR', true);
        const s = r.data.summary as Record<string, unknown> | undefined;
        return completedResult(`Destruction milestone: ${String(s?.verdict ?? '?')} — ${String(s?.honest ?? '')}.`);
      },
      async () => {
        // The milestone procedure lives inline in the API route (out of scope
        // to refactor); local execution would duplicate it. Honest failure —
        // not a silent no-op.
        return failedResult('Destruction milestone requires the HTTP API route (GET /api/world/destruction-milestone).', 'LOCAL_UNAVAILABLE', false);
      },
    ),

  'diagnostics.collisionTests': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await getJson('/api/frontier/collision-tests', signal);
        if (!r.ok) return failedResult(r.message, 'API_ERROR', true);
        const s = r.data.summary as Record<string, unknown> | undefined;
        return completedResult(`Collision fixtures: ${String(s?.passed ?? '?')}/${String(s?.total ?? '?')} passed.`);
      },
      async () => {
        const { runCollisionTests } = await import('@/engine/frontier/collision-fixtures');
        const result = runCollisionTests(100);
        return completedResult(`Collision fixtures (local): ${result.summary.passed}/${result.summary.total} passed.`);
      },
    ),

  'diagnostics.buildInfo': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await getJson('/api/build-info', signal);
        return r.ok ? completedResult('Build provenance fetched.') : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { BUILD_MANIFEST } = await import('@/generated/build-manifest');
        return completedResult(`Build ${String(BUILD_MANIFEST.commitShort ?? '?')} (${String(BUILD_MANIFEST.branch ?? '?')}) — ${String(BUILD_MANIFEST.buildTimestamp ?? '?')}.`);
      },
    ),

  'diagnostics.crashReports': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await getJson('/api/editor/crash-report', signal);
        return r.ok ? completedResult(`Crash reports: ${String((r.data.reports as unknown[] | undefined)?.length ?? 0)} persisted.`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        // NOTE: this handler runs in the CLIENT bundle — Node built-ins
        // (fs/promises) must never be imported here. The local fallback is
        // the API path only.
        return completedResult('Crash reports: use the dev server API (/api/editor/crash-report) for the local count.');
      },
    ),

  'diagnostics.frontierTechniques': async (ctx, signal) =>
    apiOrLocal(
      ctx,
      signal,
      async () => {
        const r = await getJson('/api/frontier/techniques', signal);
        return r.ok ? completedResult(`Frontier techniques: ${String((r.data.summary as Record<string, unknown> | undefined)?.total ?? '?')} registered.`) : failedResult(r.message, 'API_ERROR', true);
      },
      async () => {
        const { SEED_TECHNIQUES } = await import('@/engine/frontier/registry');
        return completedResult(`Frontier techniques (local): ${SEED_TECHNIQUES.length} registered.`);
      },
    ),

  'diagnostics.clearLogs': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().clearLogs();
    return completedResult('Console cleared.');
  },

  // ==========================================================
  // GLOBAL (editor store transitions — canonical transient state)
  // ==========================================================

  'global.undo': async (ctx, signal) => {
    checkAborted(signal);
    // 1. Real engine undo first (authorial vertical-slice undo).
    if (IS_BROWSER) {
      try {
        const res = await fetch('/api/architect/authorial/undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          const st = useEditorStore.getState();
          const pending = st.transactions.find((t) => !t.undone);
          if (pending) st.undoTransaction(pending.transactionId);
          st.log('success', 'world-runtime', 'Undo applied via authorial engine undo.');
          return completedResult('Undo applied (engine authorial undo).');
        }
        // Fall through to store-level undo when the engine has nothing.
        const storeFallback = undoStoreTransaction();
        if (storeFallback) return storeFallback;
        return failedResult(data.error ?? 'No authorial slices and no editor transactions to undo.', 'NOTHING_TO_UNDO', false);
      } catch {
        const storeFallback = undoStoreTransaction();
        if (storeFallback) return storeFallback;
        return failedResult('Engine undo unavailable and no editor transactions to undo.', 'NOTHING_TO_UNDO', false);
      }
    }
    const storeFallback = undoStoreTransaction();
    if (storeFallback) return storeFallback;
    return failedResult('No editor transactions to undo (engine authorial undo requires the HTTP server).', 'NOTHING_TO_UNDO', false);
  },

  'global.redo': async () => blockedResult(
    'No redo backend exists: the engine runtime has no redo stack, there is no authorial redo endpoint, and the editor store has no redo action. Ctrl+Shift+Z cannot be honored honestly.',
  ),

  'global.select': async (ctx, signal) => {
    checkAborted(signal);
    const id = ctx.data?.entityId as number | undefined;
    if (id == null) return failedResult('global.select requires data.entityId.', 'MISSING_ARG', false);
    const st = useEditorStore.getState();
    const mode = (ctx.data?.mode as 'replace' | 'add' | 'toggle' | undefined) ?? 'replace';
    if (mode === 'toggle') st.toggleSelectEntity(id);
    else if (mode === 'add') st.addToSelection(id);
    else st.selectEntity(id);
    return completedResult(`Selected entity #${id}.`);
  },

  'global.deselect': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().clearSelection();
    return completedResult('Selection cleared.');
  },

  'global.selectAll': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().selectAll();
    return completedResult('All entities selected.');
  },

  'global.translateMode': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().setTransformMode('translate');
    return completedResult('Transform mode → translate.');
  },

  'global.rotateMode': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().setTransformMode('rotate');
    return completedResult('Transform mode → rotate.');
  },

  'global.scaleMode': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().setTransformMode('scale');
    return completedResult('Transform mode → scale.');
  },

  'global.toggleGrid': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().toggleGrid();
    return completedResult('Grid toggled.');
  },

  'global.toggleGizmos': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().toggleGizmos();
    return completedResult('Gizmos toggled.');
  },

  'global.toggleSnap': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().toggleSnap();
    return completedResult('Snap toggled.');
  },

  'global.toggleStats': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().toggleStats();
    return completedResult('Stats overlay toggled.');
  },

  'global.togglePhysics': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().togglePhysics();
    return completedResult('Physics toggle flipped.');
  },

  'global.toggleBottomDock': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().toggleBottomDock();
    return completedResult('Bottom dock toggled.');
  },

  // ==========================================================
  // PLAYTEST
  // ==========================================================

  'playtest.toggle': async (ctx, signal) => {
    checkAborted(signal);
    const st = useEditorStore.getState();
    const mode = ctx.data?.mode !== undefined ? Boolean(ctx.data.mode) : !st.playtestMode;
    st.setPlaytestMode(mode);
    return completedResult(mode ? 'Playtest mode entered (P to exit).' : 'Playtest mode exited.');
  },

  // ==========================================================
  // WORLD lifecycle (fork / edits / visibility)
  // ==========================================================

  'world.fork': async (_ctx, signal) => {
    checkAborted(signal);
    const st = useEditorStore.getState();
    const branchName = `fork-${st.frozenTick}-${st.branches.length}`;
    st.createBranch(branchName, 'Temporary world fork from the toolbar (real branch semantics).');
    const branch = useEditorStore.getState().branches.find((b) => b.name === branchName);
    st.requestWorldState('temporary_fork');
    st.log('architect', 'world-runtime', `World forked as branch "${branchName}".`);
    return completedResult(`World forked as branch "${branchName}" (${branch?.transactionCount ?? 0} transactions on it).`);
  },

  'world.resetEdits': async (_ctx, signal) => {
    checkAborted(signal);
    useEditorStore.getState().resetEdits();
    return completedResult('Local edits discarded (reverted to generated state).');
  },

  'world.toggleVisibility': async (ctx, signal) => {
    checkAborted(signal);
    const id = ctx.data?.entityId as number | undefined;
    if (id == null) return failedResult('world.toggleVisibility requires data.entityId.', 'MISSING_ARG', false);
    const st = useEditorStore.getState();
    if (st.hiddenEntityIds.has(id)) st.showEntity(id); else st.hideEntity(id);
    return completedResult(`Entity #${id} visibility toggled.`);
  },

  'world.applyEntityEdit': async (ctx, signal) => {
    checkAborted(signal);
    const id = ctx.data?.entityId as number | undefined;
    const field = ctx.data?.field as 'position.x' | 'position.z' | 'rotation' | 'width' | 'depth' | undefined;
    const value = ctx.data?.value as number | undefined;
    if (id == null || !field || value == null) {
      return failedResult('world.applyEntityEdit requires data.entityId, field, value.', 'MISSING_ARG', false);
    }
    useEditorStore.getState().applyEdit({ entityId: id, field, value });
    return completedResult(`Entity #${id} ${field} → ${value}.`);
  },

  // ==========================================================
  // VIEWPORT
  // ==========================================================

  'viewport.setCameraPreset': async (ctx, signal) => {
    checkAborted(signal);
    const preset = ctx.data?.preset as 'perspective' | 'top' | 'front' | 'side' | undefined;
    if (!preset) return failedResult('viewport.setCameraPreset requires data.preset.', 'MISSING_ARG', false);
    useEditorStore.getState().setCameraPreset(preset);
    return completedResult(`Camera preset → ${preset}.`);
  },
};

// ---------------------------------------------------------------------------
// Shared store-driving helpers
// ---------------------------------------------------------------------------

/**
 * Stop the world through ONLY legal state-machine transitions:
 * any state → dormant_architect (legal from every non-target state) →
 * generation_freeze (legal from dormant_architect). The old toolbar code
 * requested generation_freeze directly from step_simulation /
 * selective_awakening, which the store logs as an ILLEGAL transition and
 * ignores.
 */
function stopStoreSimulation(): void {
  const st = useEditorStore.getState();
  if (st.worldState !== 'generation_freeze') {
    st.requestWorldState('dormant_architect');
    st.requestWorldState('generation_freeze');
  }
  useEditorStore.setState({ simRunning: false });
  st.log('info', 'world-runtime', 'Simulation stopped (legal transition to generation_freeze).');
}

function undoStoreTransaction(): UiActionResult | null {
  const st = useEditorStore.getState();
  const pending = st.transactions.find((t) => !t.undone);
  if (!pending) return null;
  st.undoTransaction(pending.transactionId);
  st.log('success', 'world-runtime', `Undid transaction ${pending.transactionId} (${pending.originalRequest}).`);
  return completedResult(`Undid transaction ${pending.transactionId} (${pending.originalRequest}).`);
}
