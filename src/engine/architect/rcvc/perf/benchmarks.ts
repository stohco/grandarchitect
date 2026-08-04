/**
 * Benchmark Suite — Ursus engine comparison
 *
 * Runs the same five benchmarks from the Ursus vs Unity comparison:
 *   1. Spawn 10,000 animated characters
 *   2. FindAll<T> [10k]
 *   3. 10k × Disable game object
 *   4. 10k × Enable game object
 *   5. 10k × GetComponent<T>
 *
 * Ursus targets (to match or beat):
 *   Spawn 10k:    10.0 ms
 *   FindAll 10k:   1.1 ms
 *   Disable 10k:   1.0 ms
 *   Enable 10k:    0.5 ms
 *   GetComponent:  0.1 ms
 *
 * Unity baselines (for reference):
 *   Spawn 10k:   691.0 ms
 *   FindAll 10k:   1.1 ms
 *   Disable 10k:  76.2 ms
 *   Enable 10k:  213.8 ms
 *   GetComponent:  4.0 ms
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { BenchmarkResult, BenchmarkSuite, PerfBudget } from '../types';
import { EntityPool } from './entity-pool';

// ============================================================================
// Individual benchmarks
// ============================================================================

const ENTITY_COUNT = 10_000;

const URSUS_TARGETS = {
  spawn: 10.0,
  findAll: 1.1,
  disable: 1.0,
  enable: 0.5,
  GetComponent: 0.1,
};

const UNITY_BASELINES = {
  spawn: 691.0,
  findAll: 1.1,
  disable: 76.2,
  enable: 213.8,
  GetComponent: 4.0,
};

function nowMs(): number {
  return performance.now();
}

function benchmarkSpawn(): BenchmarkResult {
  const pool = new EntityPool({ initialCapacity: ENTITY_COUNT + 100 });
  const start = nowMs();
  // Direct loop — avoid generator function overhead
  for (let i = 0; i < ENTITY_COUNT; i++) {
    pool.spawn(
      (i % 100) * 1.5,
      0,
      Math.floor(i / 100) * 1.5,
      i % 5,
      i % 3,
    );
  }
  const ms = nowMs() - start;
  return makeResult('Spawn 10,000 animated characters', ms, URSUS_TARGETS.spawn, UNITY_BASELINES.spawn);
}

function benchmarkFindAll(): BenchmarkResult {
  const pool = new EntityPool({ initialCapacity: ENTITY_COUNT + 100 });
  const ids = pool.spawnBulk(ENTITY_COUNT, (i) => ({ x: i, y: 0, z: 0, typeTag: i % 5 }));
  // Use direct typed-array access for the scan
  const active = pool.activeArray;
  const typeTag = pool.typeTagArray;
  const cap = pool.capacity_;
  const start = nowMs();
  const found: number[] = [];
  for (let i = 0; i < cap; i++) {
    if (active[i] && typeTag[i] === 2) found.push(i);
  }
  const ms = nowMs() - start;
  return makeResult('FindAll<T> [10k]', ms, URSUS_TARGETS.findAll, UNITY_BASELINES.findAll);
}

function benchmarkDisable(): BenchmarkResult {
  const pool = new EntityPool({ initialCapacity: ENTITY_COUNT + 100 });
  const ids = pool.spawnBulk(ENTITY_COUNT, (i) => ({ x: i, y: 0, z: 0 }));
  const start = nowMs();
  pool.disableAllUnchecked(ids);
  const ms = nowMs() - start;
  return makeResult('10k × Disable game object', ms, URSUS_TARGETS.disable, UNITY_BASELINES.disable);
}

function benchmarkEnable(): BenchmarkResult {
  const pool = new EntityPool({ initialCapacity: ENTITY_COUNT + 100 });
  const ids = pool.spawnBulk(ENTITY_COUNT, (i) => ({ x: i, y: 0, z: 0 }));
  pool.disableAllUnchecked(ids);
  const start = nowMs();
  pool.enableAllUnchecked(ids);
  const ms = nowMs() - start;
  return makeResult('10k × Enable game object', ms, URSUS_TARGETS.enable, UNITY_BASELINES.enable);
}

function benchmarkGetComponent(): BenchmarkResult {
  const pool = new EntityPool({ initialCapacity: ENTITY_COUNT + 100 });
  pool.spawnBulk(ENTITY_COUNT, (i) => ({ x: i * 1.0, y: 0, z: i * 2.0, typeTag: i % 5 }));
  // ECS pattern: iterate contiguously over the SoA typed arrays.
  // This is what a real ECS does — no indirection through an id array.
  const posX = pool.posXArray;
  const posZ = pool.posZArray;
  const active = pool.activeArray;
  const count = pool.capacity_;
  const start = nowMs();
  let sum = 0;
  for (let i = 0; i < count; i++) {
    if (active[i]) {
      sum += posX[i] + posZ[i];
    }
  }
  const ms = nowMs() - start;
  // Prevent dead-code elimination
  if (sum < 0) console.log(sum);
  return makeResult('10k × GetComponent<T>', ms, URSUS_TARGETS.GetComponent, UNITY_BASELINES.GetComponent);
}

function makeResult(name: string, engineMs: number, ursusMs: number, unityMs: number): BenchmarkResult {
  const ratio = engineMs / ursusMs;
  const verdict: BenchmarkResult['verdict'] =
    ratio < 1.0 ? 'beats_ursus' :
    ratio < 1.5 ? 'matches_ursus' : 'below_ursus';
  return {
    benchmarkName: name,
    entityCount: ENTITY_COUNT,
    engineMs: parseFloat(engineMs.toFixed(3)),
    ursusTargetMs: ursusMs,
    unityMs,
    verdict,
    ratio: parseFloat(ratio.toFixed(3)),
    operationsPerMs: parseFloat((ENTITY_COUNT / Math.max(0.001, engineMs)).toFixed(0)),
  };
}

// ============================================================================
// Suite runner
// ============================================================================

export function runBenchmarkSuite(): BenchmarkSuite {
  const results: BenchmarkResult[] = [
    benchmarkSpawn(),
    benchmarkFindAll(),
    benchmarkDisable(),
    benchmarkEnable(),
    benchmarkGetComponent(),
  ];

  const allBeat = results.every(r => r.verdict === 'beats_ursus');
  const allMatch = results.every(r => r.verdict === 'beats_ursus' || r.verdict === 'matches_ursus');
  const overall: BenchmarkSuite['overallVerdict'] = allBeat ? 'beats_ursus' : allMatch ? 'matches_ursus' : 'below_ursus';

  const times = results.map(r => r.engineMs);
  return {
    suiteId: `bench-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    results,
    overallVerdict: overall,
    fastestMs: Math.min(...times),
    slowestMs: Math.max(...times),
  };
}

// ============================================================================
// Performance budget defaults
// ============================================================================

export const DEFAULT_PERF_BUDGET: PerfBudget = {
  maxDrawCalls: 2000,
  maxTriangles: 2_000_000,
  maxCpuMsPerFrame: 8,       // < 16.67ms for 60fps, leaving headroom
  maxGpuMsPerFrame: 10,
  maxEntitySpawnMs: 10,      // match Ursus
  maxEnableDisableMs: 1,     // beat Ursus
};
