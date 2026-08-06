'use client';

/**
 * StudioPanel — Live Studio modeling kernel panel
 *
 * The Live Studio IS the asset authoring environment (Blender replacement).
 * This panel lets you:
 *   - Create assets from operation stacks
 *   - Generate procedural structures (sect hall, cottage)
 *   - Inspect mesh stats (vertices, faces, half-edges, UVs, regions)
 *   - Run UV auto-unwrap
 *   - View the serialized operation stack (YAML-like)
 *
 * Three.js is only the rendering layer. The MeshKernel is authoritative.
 */

import { useCallback, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Box, Building2, Layers, Zap, Code, Eye } from 'lucide-react';

interface StudioInfo {
  architecture: string;
  pipeline: string;
  stacks: Array<{
    assetId: string;
    operationCount: number;
    dirty: boolean;
    meshStats: {
      vertexCount: number;
      faceCount: number;
      halfEdgeCount: number;
      uvSetCount: number;
      regionCount: number;
      socketCount: number;
    };
  }>;
  availableOperations: string[];
}

export default function StudioPanel() {
  const [info, setInfo] = useState<StudioInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [assetId, setAssetId] = useState('STR_CLOUD_SECT_HALL_TEST');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [serialized, setSerialized] = useState<string>('');

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/studio');
      if (res.ok) setInfo(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchInfo(); }, [fetchInfo]);

  const createAction = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, assetId, ...extra }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (data.serialized) setSerialized(data.serialized);
        void fetchInfo();
      }
    } catch { /* ignore */ }
  }, [assetId, fetchInfo]);

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <Layers className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Live Studio
        </span>
        <span className="text-[10px] text-[#5a5a7a]">Blender-replacement kernel</span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] text-[#5a5a7a] hover:text-white" onClick={() => void fetchInfo()} disabled={loading}>
          {loading ? '…' : 'Refresh'}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3 space-y-3">
          {/* Architecture banner */}
          <div className="rounded border border-cyan-500/30 bg-cyan-500/5 p-2 text-[10px] text-cyan-200/80">
            <strong className="text-cyan-300">Live Studio = Blender replacement.</strong>{' '}
            Three.js is rendering only. MeshKernel is authoritative. GLM writes
            operations → Live Studio evaluates → Three.js renders.
          </div>

          {/* Asset ID input */}
          <section className="rounded border border-[#2a2a4a] bg-[#12122a] p-2.5">
            <Label className="text-[10px] text-[#8888aa]">Asset ID</Label>
            <Input
              value={assetId}
              onChange={(e) => setAssetId(e.target.value.toUpperCase())}
              className="h-7 mt-1 border-[#2a2a4a] bg-[#0e0e24] font-mono text-xs text-[#c8c8e0]"
              placeholder="STR_CLOUD_SECT_HALL_A01"
            />
          </section>

          {/* Quick actions */}
          <section>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={() => void createAction('default_sect_hall')}>
                <Building2 className="mr-1 h-3 w-3" /> Sect Hall
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => void createAction('default_cottage')}>
                <Building2 className="mr-1 h-3 w-3" /> Cottage
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => void createAction('create', {
                operations: [
                  { op: 'create_box', params: { widthM: 2, heightM: 1.5, depthM: 1 } },
                  { op: 'generate_normals', params: {} },
                ],
              })}>
                <Box className="mr-1 h-3 w-3" /> Create Box
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => void createAction('auto_unwrap', { params: { mode: 'box' } })}>
                <Eye className="mr-1 h-3 w-3" /> UV Unwrap
              </Button>
            </div>
          </section>

          {/* Active stacks */}
          <section>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              Active Stacks ({info?.stacks.length ?? 0})
            </h3>
            <div className="space-y-1">
              {info?.stacks.map((s) => (
                <div key={s.assetId} className="rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#c8c8e0]">{s.assetId}</span>
                    {s.dirty && <span className="text-[8px] text-amber-400">dirty</span>}
                    <span className="ml-auto text-[9px] text-[#5a5a7a]">{s.operationCount} ops</span>
                  </div>
                  <div className="mt-0.5 flex gap-2 font-mono text-[9px] text-[#5a5a7a]">
                    <span>{s.meshStats.vertexCount} verts</span>
                    <span>{s.meshStats.faceCount} faces</span>
                    <span>{s.meshStats.halfEdgeCount} he</span>
                    {s.meshStats.regionCount > 0 && <span>{s.meshStats.regionCount} regions</span>}
                  </div>
                </div>
              ))}
              {info && info.stacks.length === 0 && (
                <div className="text-[10px] text-[#5a5a7a]">No assets. Use quick actions above.</div>
              )}
            </div>
          </section>

          {/* Last result */}
          {result && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Zap className="h-3 w-3" /> Last Result
              </h3>
              <pre className="max-h-40 overflow-auto rounded border border-[#2a2a4a] bg-[#0e0810] p-2 font-mono text-[10px] leading-relaxed text-[#b8a8b0]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </section>
          )}

          {/* Serialized stack */}
          {serialized && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Code className="h-3 w-3" /> Serialized Stack (GLM-readable)
              </h3>
              <pre className="max-h-40 overflow-auto rounded border border-[#2a2a4a] bg-[#0e0810] p-2 font-mono text-[10px] leading-relaxed text-[#b8a8b0]">
                {serialized}
              </pre>
            </section>
          )}

          {/* Available operations */}
          {info && (
            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                Available Operations ({info.availableOperations.length})
              </h3>
              <div className="flex flex-wrap gap-1">
                {info.availableOperations.map((op) => (
                  <span key={op} className="rounded bg-[#12122a] px-1.5 py-0.5 font-mono text-[8px] text-[#8888aa]">
                    {op}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
