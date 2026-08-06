/**
 * Live Architect Studio — Frontier Panel (Collision Tests + Terrain Pipeline)
 *
 * Displays the results of the frontier engine's collision-test suite and
 * terrain pipeline:
 *   GET /api/frontier/collision-tests → CollisionTestSummary + terrain info
 *
 * The panel auto-runs on mount. The user can re-run via the "Re-run" button.
 * Each collision test is shown as a row with a pass/fail badge and details.
 * The terrain pipeline section shows the density-field hash, the spawn point,
 * and the 5 checkpoints along the tunnel spline.
 *
 * The frontier engine is fully deterministic — running the tests twice
 * produces identical hashes. This panel verifies that contract visually.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  Mountain,
  MapPin,
  Flag,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ----------------------------------------------------------------------------
// Local types — mirror the frontier engine types.
// ----------------------------------------------------------------------------

interface Vec3 { x: number; y: number; z: number; }

interface CollisionTestResult {
  name: string;
  passed: boolean;
  details: string;
  finalPosition: Vec3;
  grounded: boolean;
  nanTicks: number;
  fellThrough: boolean;
  trajectoryHash: string;
  ticks: number;
}

interface BvhDiagnostic {
  name: string;
  triangleCount: number;
  nodeCount: number;
  depth: number;
  averageLeafSize: number;
}

interface FixtureValidation {
  name: string;
  ok: boolean;
  reason?: string;
}

interface TerrainInfo {
  hash: string;
  spawn: Vec3;
  checkpoints: { t: number; position: Vec3 }[];
  fieldSize: number;
  fieldWorldSize: number;
  voxelCount: number;
}

interface CollisionTestsResponse {
  tests: CollisionTestResult[];
  summary: { total: number; passed: number; failed: number };
  fixtureValidation: FixtureValidation[];
  bvhDiagnostics: BvhDiagnostic[];
  terrain: TerrainInfo;
  timestamp: string;
}

// ----------------------------------------------------------------------------
// Panel
// ----------------------------------------------------------------------------

export default function FrontierPanel() {
  const [data, setData] = useState<CollisionTestsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/frontier/collision-tests');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const json = (await res.json()) as CollisionTestsResponse;
      setData(json);
      setLastRun(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const allPass = data?.summary.failed === 0;

  return (
    <div className="flex h-full flex-col bg-[#0e0e24] text-xs text-[#aaaacc]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-2">
        <Boxes className="h-4 w-4 text-emerald-400" />
        <span className="font-semibold uppercase tracking-wider text-[#8888aa]">
          Frontier Engine
        </span>
        <span className="text-[10px] text-[#5a5a7a]">
          Collision · BVH · Terrain
        </span>
        <div className="ml-auto flex items-center gap-2">
          {data && (
            <Badge
              variant="outline"
              className={
                allPass
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/40 bg-red-500/10 text-red-300'
              }
            >
              {data.summary.passed}/{data.summary.total}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={run}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
            Re-run
          </Button>
        </div>
      </div>

<<<<<<< HEAD
      <ScrollArea className="flex-1">
=======
      <ScrollArea className="min-h-0 flex-1">
>>>>>>> 7a4f5e29fb7830ff0142679ec9c1732b964d1184
        <div className="space-y-3 p-3">
          {error && (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-2 text-red-300">
              <div className="flex items-center gap-2 font-medium">
                <XCircle className="h-3.5 w-3.5" />
                Error
              </div>
              <pre className="mt-1 whitespace-pre-wrap text-[10px]">{error}</pre>
            </div>
          )}

          {loading && !data && (
            <div className="flex items-center gap-2 p-4 text-[#5a5a7a]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Running collision fixtures + terrain pipeline…</span>
            </div>
          )}

          {data && (
            <>
              {/* Summary banner */}
              <div
                className={`rounded border p-2 ${
                  allPass
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-red-500/40 bg-red-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {allPass ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span
                    className={`font-medium ${
                      allPass ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {allPass ? 'ALL TESTS PASS' : `${data.summary.failed} TEST(S) FAILED`}
                  </span>
                  <span className="ml-auto text-[10px] text-[#5a5a7a]">
                    {data.summary.passed}/{data.summary.total} passed
                  </span>
                </div>
                {lastRun && (
                  <div className="mt-1 text-[10px] text-[#5a5a7a]">
                    Last run: {new Date(lastRun).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* Collision test results */}
              <Section title="Collision Tests" icon={CheckCircle2}>
                <div className="space-y-1">
                  {data.tests.map((t) => (
                    <div
                      key={t.name}
                      className="flex items-start gap-2 rounded border border-[#2a2a4a] bg-[#161630] p-2"
                    >
                      {t.passed ? (
                        <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-400" />
                      ) : (
                        <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#ccccdd]">{t.name}</span>
                          <span className="text-[10px] text-[#5a5a7a]">
                            final: ({t.finalPosition.x.toFixed(2)}, {t.finalPosition.y.toFixed(2)}, {t.finalPosition.z.toFixed(2)})
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-[#8888aa]">{t.details}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[#5a5a7a]">
                          <span>nan: {t.nanTicks}</span>
                          <span>fell-through: {t.fellThrough ? 'yes' : 'no'}</span>
                          <span>grounded: {t.grounded ? 'yes' : 'no'}</span>
                          <span className="font-mono">hash: {t.trajectoryHash.slice(0, 12)}…</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* BVH diagnostics */}
              <Section title="BVH Diagnostics" icon={Boxes}>
                <div className="overflow-hidden rounded border border-[#2a2a4a]">
                  <table className="w-full text-[10px]">
                    <thead className="bg-[#161630] text-[#8888aa]">
                      <tr>
                        <th className="px-2 py-1 text-left">Fixture</th>
                        <th className="px-2 py-1 text-right">Tris</th>
                        <th className="px-2 py-1 text-right">Nodes</th>
                        <th className="px-2 py-1 text-right">Depth</th>
                        <th className="px-2 py-1 text-right">Avg Leaf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bvhDiagnostics.map((d) => (
                        <tr key={d.name} className="border-t border-[#2a2a4a]">
                          <td className="px-2 py-1 text-[#ccccdd]">{d.name}</td>
                          <td className="px-2 py-1 text-right font-mono text-[#aaaacc]">{d.triangleCount}</td>
                          <td className="px-2 py-1 text-right font-mono text-[#aaaacc]">{d.nodeCount}</td>
                          <td className="px-2 py-1 text-right font-mono text-[#aaaacc]">{d.depth}</td>
                          <td className="px-2 py-1 text-right font-mono text-[#aaaacc]">{d.averageLeafSize.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Terrain pipeline */}
              <Section title="Terrain Pipeline" icon={Mountain}>
                <div className="space-y-2 rounded border border-[#2a2a4a] bg-[#161630] p-2">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-[#5a5a7a]">Density hash:</span>
                    <span className="font-mono text-emerald-300">{data.terrain.hash}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-[#5a5a7a]">Field:</span>
                    <span className="font-mono text-[#aaaacc]">
                      {data.terrain.fieldSize}³ = {data.terrain.voxelCount.toLocaleString()} voxels
                    </span>
                    <span className="text-[#5a5a7a]">({data.terrain.fieldWorldSize}m)</span>
                  </div>
                  <div className="flex items-start gap-2 text-[10px]">
                    <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" />
                    <div>
                      <div className="text-[#5a5a7a]">Spawn point (guaranteed solid floor):</div>
                      <div className="font-mono text-amber-300">
                        ({data.terrain.spawn.x.toFixed(2)}, {data.terrain.spawn.y.toFixed(2)}, {data.terrain.spawn.z.toFixed(2)})
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[10px]">
                    <Flag className="mt-0.5 h-3 w-3 flex-shrink-0 text-sky-400" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[#5a5a7a]">
                        Checkpoints ({data.terrain.checkpoints.length}):
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {data.terrain.checkpoints.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 font-mono text-[10px] text-sky-300">
                            <span className="w-12 text-[#5a5a7a]">t={c.t.toFixed(2)}</span>
                            <span>
                              ({c.position.x.toFixed(2)}, {c.position.y.toFixed(2)}, {c.position.z.toFixed(2)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Fixture validation */}
              <Section title="Fixture Mesh Validation" icon={CheckCircle2}>
                <div className="flex flex-wrap gap-1">
                  {data.fixtureValidation.map((v) => (
                    <Badge
                      key={v.name}
                      variant="outline"
                      className={
                        v.ok
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-red-500/40 bg-red-500/10 text-red-300'
                      }
                    >
                      {v.name}: {v.ok ? 'OK' : v.reason ?? 'FAIL'}
                    </Badge>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Section helper
// ----------------------------------------------------------------------------

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Boxes;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8888aa]">
        <Icon className="h-3 w-3" />
        {title}
      </div>
      {children}
    </div>
  );
}
