/** Benchmark suite — Ursus engine comparison. */
import { EntityPool } from './entity-pool';
import type { BenchmarkResult, BenchmarkSuite } from '../types';

const N = 10_000;
const URSUS = { spawn: 10.0, findAll: 1.1, disable: 1.0, enable: 0.5, GetComponent: 0.1 };
const UNITY = { spawn: 691.0, findAll: 1.1, disable: 76.2, enable: 213.8, GetComponent: 4.0 };

function now(): number { return performance.now(); }

function benchSpawn(): BenchmarkResult {
  const pool = new EntityPool({ initialCapacity: N + 100 });
  const s = now();
  for (let i = 0; i < N; i++) pool.spawn((i % 100) * 1.5, 0, Math.floor(i / 100) * 1.5, i % 5, i % 3);
  const ms = now() - s;
  return make('Spawn 10,000 animated characters', ms, URSUS.spawn, UNITY.spawn);
}

function benchFindAll(): BenchmarkResult {
  const pool = new EntityPool({ initialCapacity: N + 100 });
  pool.spawnBulk(N, i => ({ x: i, y: 0, z: 0, typeTag: i % 5 }));
  const active = pool.activeArray; const typeTag = pool.typeTagArray; const cap = pool.capacity_;
  const s = now(); const found: number[] = [];
  for (let i = 0; i < cap; i++) { if (active[i] && typeTag[i] === 2) found.push(i); }
  const ms = now() - s;
  return make('FindAll<T> [10k]', ms, URSUS.findAll, UNITY.findAll);
}

function benchDisable(): BenchmarkResult {
  const pool = new EntityPool({ initialCapacity: N + 100 });
  const ids = pool.spawnBulk(N, i => ({ x: i, y: 0, z: 0 }));
  const s = now(); pool.disableAllUnchecked(ids); const ms = now() - s;
  return make('10k × Disable game object', ms, URSUS.disable, UNITY.disable);
}

function benchEnable(): BenchmarkResult {
  const pool = new EntityPool({ initialCapacity: N + 100 });
  const ids = pool.spawnBulk(N, i => ({ x: i, y: 0, z: 0 }));
  pool.disableAllUnchecked(ids);
  const s = now(); pool.enableAllUnchecked(ids); const ms = now() - s;
  return make('10k × Enable game object', ms, URSUS.enable, UNITY.enable);
}

function benchGetComponent(): BenchmarkResult {
  const pool = new EntityPool({ initialCapacity: N + 100 });
  pool.spawnBulk(N, i => ({ x: i * 1.0, y: 0, z: i * 2.0, typeTag: i % 5 }));
  const posX = pool.posXArray; const posZ = pool.posZArray; const active = pool.activeArray; const cap = pool.capacity_;
  const s = now(); let sum = 0;
  for (let i = 0; i < cap; i++) { if (active[i]) sum += posX[i] + posZ[i]; }
  const ms = now() - s; if (sum < 0) console.log(sum);
  return make('10k × GetComponent<T>', ms, URSUS.GetComponent, UNITY.GetComponent);
}

function make(name: string, engineMs: number, ursusMs: number, unityMs: number): BenchmarkResult {
  const ratio = engineMs / ursusMs;
  const verdict = ratio < 1.0 ? 'beats_ursus' : ratio < 1.5 ? 'matches_ursus' : 'below_ursus';
  return { benchmarkName: name, entityCount: N, engineMs: parseFloat(engineMs.toFixed(3)), ursusTargetMs: ursusMs, unityMs, verdict, ratio: parseFloat(ratio.toFixed(3)), operationsPerMs: parseFloat((N / Math.max(0.001, engineMs)).toFixed(0)) };
}

export function runBenchmarkSuite(): BenchmarkSuite {
  const results = [benchSpawn(), benchFindAll(), benchDisable(), benchEnable(), benchGetComponent()];
  const allBeat = results.every(r => r.verdict === 'beats_ursus');
  const allMatch = results.every(r => r.verdict === 'beats_ursus' || r.verdict === 'matches_ursus');
  const overall = allBeat ? 'beats_ursus' : allMatch ? 'matches_ursus' : 'below_ursus';
  const times = results.map(r => r.engineMs);
  return { suiteId: `bench-${Date.now().toString(36)}`, timestamp: new Date().toISOString(), results, overallVerdict: overall, fastestMs: Math.min(...times), slowestMs: Math.max(...times) };
}
