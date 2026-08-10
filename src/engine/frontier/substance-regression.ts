#!/usr/bin/env bun
/**
 * frontier/substance-regression.ts — the mandatory test for every performance
 * optimization (Frontier Maturity Directive §6).
 *
 * Every optimization must prove it preserves semantic substance. This module
 * defines the canonical semantic fingerprint of a world state and the check:
 *
 *   fingerprint(before) === fingerprint(after)  →  valid representation optimization
 *   fingerprint(before) !== fingerprint(after)  →  SEMANTIC REGRESSION (rejected)
 *
 * Fingerprint dimensions (directive §6): world entities, ecological state,
 * NPC causal history, interactions, terrain capability, formation behavior,
 * animation possibilities, material conservation, AI choices, persistent history.
 *
 * Run: bun run src/engine/frontier/substance-regression.ts
 */

export interface SemanticFingerprint {
  /** Count of live entities per tier. */
  entityCounts: Record<string, number>;
  /** Ids of entities whose causal history changed since the baseline. */
  causalHistory: string[];
  /** Ecological state: species → population (aggregate, not per-animal). */
  ecology: Record<string, number>;
  /** Interaction ledger: entity → last interaction tick+type (causal, not cosmetic). */
  interactions: Record<string, string>;
  /** Terrain capability: cells that are cutable/breakable per realm-gate class. */
  terrainCapability: Record<string, number>;
  /** Formation behavior: formation → active member count. */
  formations: Record<string, number>;
  /** Animation possibilities: distinct semantic action ids available. */
  animationPossibilities: string[];
  /** Material conservation: mass/material ledger (matter-conservation invariant). */
  materials: Record<string, number>;
  /** AI choices: last decision hash per decision-capable entity. */
  aiChoices: Record<string, string>;
  /** Persistent history: canonical event ledger (hashed entries, not prose). */
  history: string[];
}

export interface SubstanceBaseline {
  fingerprint: SemanticFingerprint;
  capturedAtTick: number;
  description: string;
}

/**
 * Canonical semantic fingerprint of a world state. All fields are causal
 * substance: things whose change means the universe changed, not the pixels.
 */
export function fingerprint(world: {
  entities?: { id: string; tier: number }[];
  history?: string[];
  ecology?: Record<string, number>;
  materials?: Record<string, number>;
  interactions?: Record<string, string>;
  aiChoices?: Record<string, string>;
  terrainCapability?: Record<string, number>;
  formations?: Record<string, number>;
  animationPossibilities?: string[];
}): SemanticFingerprint {
  const entityCounts: Record<string, number> = {};
  for (const e of world.entities ?? []) {
    const k = `S${e.tier}`;
    entityCounts[k] = (entityCounts[k] ?? 0) + 1;
  }
  return {
    entityCounts,
    causalHistory: [...(world.history ?? [])],
    ecology: { ...(world.ecology ?? {}) },
    interactions: { ...(world.interactions ?? {}) },
    terrainCapability: { ...(world.terrainCapability ?? {}) },
    formations: { ...(world.formations ?? {}) },
    animationPossibilities: [...(world.animationPossibilities ?? [])].sort(),
    materials: { ...(world.materials ?? {}) },
    aiChoices: { ...(world.aiChoices ?? {}) },
    history: [...(world.history ?? [])],
  };
}

function entriesEqual(a: Record<string, number> | undefined, b: Record<string, number> | undefined): boolean {
  const ka = Object.keys(a ?? {}).sort();
  const kb = Object.keys(b ?? {}).sort();
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if ((a ?? {})[k] !== (b ?? {})[k]) return false;
  }
  return true;
}

function stringRecordEqual(a: Record<string, string> | undefined, b: Record<string, string> | undefined): boolean {
  const ka = Object.keys(a ?? {}).sort();
  const kb = Object.keys(b ?? {}).sort();
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if ((a ?? {})[k] !== (b ?? {})[k]) return false;
  }
  return true;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
  return true;
}

/** The substance check: identical fingerprints = valid optimization. */
export function isSemanticallyIdentical(before: SemanticFingerprint, after: SemanticFingerprint): boolean {
  return (
    entriesEqual(before.entityCounts, after.entityCounts) &&
    arraysEqual(before.causalHistory, after.causalHistory) &&
    entriesEqual(before.ecology, after.ecology) &&
    stringRecordEqual(before.interactions, after.interactions) &&
    entriesEqual(before.terrainCapability, after.terrainCapability) &&
    entriesEqual(before.formations, after.formations) &&
    arraysEqual(before.animationPossibilities, after.animationPossibilities) &&
    entriesEqual(before.materials, after.materials) &&
    stringRecordEqual(before.aiChoices, after.aiChoices) &&
    arraysEqual(before.history, after.history)
  );
}

/** Which dimensions diverged (for the rejection report). */
export function semanticDeltas(before: SemanticFingerprint, after: SemanticFingerprint): string[] {
  const deltas: string[] = [];
  if (!entriesEqual(before.entityCounts, after.entityCounts)) deltas.push('entityCounts');
  if (!arraysEqual(before.causalHistory, after.causalHistory)) deltas.push('causalHistory');
  if (!entriesEqual(before.ecology, after.ecology)) deltas.push('ecology');
  if (!stringRecordEqual(before.interactions, after.interactions)) deltas.push('interactions');
  if (!entriesEqual(before.terrainCapability, after.terrainCapability)) deltas.push('terrainCapability');
  if (!entriesEqual(before.formations, after.formations)) deltas.push('formations');
  if (!arraysEqual(before.animationPossibilities, after.animationPossibilities)) deltas.push('animationPossibilities');
  if (!entriesEqual(before.materials, after.materials)) deltas.push('materials');
  if (!stringRecordEqual(before.aiChoices, after.aiChoices)) deltas.push('aiChoices');
  if (!arraysEqual(before.history, after.history)) deltas.push('history');
  return deltas;
}

/**
 * The report a performance optimization must produce: timings BEFORE/AFTER
 * plus the semantic delta. Per directive §6: a speedup with ANY semantic delta
 * is a FAILURE even if the frame time improved.
 */
export interface OptimizationReport {
  name: string;
  before: { renderMs: number; simMs: number; animationMs: number };
  after: { renderMs: number; simMs: number; animationMs: number };
  semanticDelta: string[];
  passed: boolean;
}

export function reportOptimization(
  name: string,
  before: OptimizationReport['before'],
  after: OptimizationReport['after'],
  beforeFp: SemanticFingerprint,
  afterFp: SemanticFingerprint,
): OptimizationReport {
  const delta = semanticDeltas(beforeFp, afterFp);
  const faster = after.renderMs + after.simMs + after.animationMs < before.renderMs + before.simMs + before.animationMs;
  return {
    name,
    before,
    after,
    semanticDelta: delta,
    passed: faster && delta.length === 0,
  };
}

// ---- conformance: the harness runs here when executed directly ----

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

function run() {
  console.log('=== Substance Regression Conformance ===\n');

  // identical worlds → identical fingerprints
  const worldA = {
    entities: [{ id: 'e1', tier: 4 }, { id: 'e2', tier: 2 }],
    history: ['tick:100 event:harvest village:wang'],
    ecology: { wolf: 12, sheep: 34 },
    materials: { iron_ore: 40, spirit_stone: 120 },
    interactions: { e1: 'tick:90 talk wang_lin' },
    aiChoices: { e1: 'seed:42 decision:work' },
    terrainCapability: { cutable_cells: 5000 },
    formations: { restricting: 3 },
    animationPossibilities: ['sword.heaven-split', 'weave.basket'],
  };
  const fa = fingerprint(worldA);
  assert(isSemanticallyIdentical(fa, fingerprint(worldA)), 'same world → same fingerprint');

  // representation optimization (culling, LOD, batching) → identical semantics
  const worldB = { ...worldA, entities: worldA.entities.map((e) => ({ ...e })) };
  assert(isSemanticallyIdentical(fa, fingerprint(worldB)), 'representation change → identical fingerprint');

  // forbidden optimization: deleting NPCs → semantic regression detected
  const worldC = { ...worldA, entities: worldA.entities.filter((e) => e.id === 'e1') };
  const deltasC = semanticDeltas(fa, fingerprint(worldC));
  assert(deltasC.includes('entityCounts'), 'deleting an NPC → entityCounts delta detected');
  assert(!isSemanticallyIdentical(fa, fingerprint(worldC)), 'deleting an NPC → NOT semantically identical');

  // forbidden: freezing distant ecology
  const worldD = { ...worldA, ecology: { ...worldA.ecology, wolf: 0 } };
  assert(semanticDeltas(fa, fingerprint(worldD)).includes('ecology'), 'freezing ecology → ecology delta detected');

  // forbidden: dropping history (settlement unchanged after ten years)
  const worldE = { ...worldA, history: [] };
  assert(semanticDeltas(fa, fingerprint(worldE)).includes('history'), 'dropping history → history delta detected');

  // matter conservation: removing materials is a delta
  const worldF = { ...worldA, materials: { ...worldA.materials, iron_ore: 0 } };
  assert(semanticDeltas(fa, fingerprint(worldF)).includes('materials'), 'matter removal → materials delta detected');

  // report semantics: faster + zero delta = pass; faster + delta = FAIL
  const rep1 = reportOptimization(
    'cluster-lod', 
    { renderMs: 15.9, simMs: 5.2, animationMs: 2.8 },
    { renderMs: 9.7, simMs: 3.1, animationMs: 1.4 },
    fa,
    fingerprint(worldB),
  );
  assert(rep1.passed && rep1.semanticDelta.length === 0, 'valid optimization (faster, delta=0) → PASS');
  const rep2 = reportOptimization(
    'delete-50-npcs',
    { renderMs: 15.9, simMs: 5.2, animationMs: 2.8 },
    { renderMs: 9.0, simMs: 2.0, animationMs: 0.5 },
    fa,
    fingerprint(worldC),
  );
  assert(!rep2.passed && rep2.semanticDelta.includes('entityCounts'), 'delete-50-npcs → FAIL despite faster');

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) run();
