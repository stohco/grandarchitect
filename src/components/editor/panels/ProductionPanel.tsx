'use client';

/**
 * ProductionPanel — bottom dock panel for the production bible
 *
 * Shows an overview of all production factory types:
 *   - Character factory (scale, slots, hide zones, sockets, budgets)
 *   - Terrain factory (8 biome kits)
 *   - Structure factory (8+ kits, damage states)
 *   - UI system (HUD elements, technique wheel, typography)
 *   - Streaming (tiers, traversal, performance budgets)
 *   - Asset gauntlet (10-step pipeline)
 *   - Naming convention validator
 */

import { useCallback, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Users, Mountain, Building2, Monitor, Gauge,
  CheckCircle, XCircle, FileText, Search,
} from 'lucide-react';

interface ProductionInfo {
  character: {
    equipmentSlots: number;
    bodyHideZones: number;
    sockets: number;
    maleScale: { heightM: number };
    femaleScale: { heightM: number };
    materialSpecs: number;
    triangleBudgets: Record<string, { lod0: [number, number] }>;
  };
  terrain: {
    biomeKits: number;
    biomes: Array<{ id: string; name: string }>;
  };
  structures: {
    requiredKits: number;
    damageStates: number;
    gridM: number;
  };
  ui: {
    hudElements: number;
    techniqueCategories: number;
  };
  streaming: {
    worldScaleEntries: number;
    traversalModes: number;
    streamingTiers: number;
    performanceBudgets: number;
    fpsTarget: number;
  };
  summary: {
    bibleLines: number;
    biblePath: string;
  };
}

interface ValidationResult {
  valid: boolean;
  assetId: string;
  parsed: Record<string, string | undefined>;
  errors: string[];
  warnings: string[];
}

export default function ProductionPanel() {
  const [info, setInfo] = useState<ProductionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [assetId, setAssetId] = useState('CHR_PLAYER_BASE_M_01');
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production');
      if (res.ok) setInfo(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchInfo(); }, [fetchInfo]);

  const validate = useCallback(async () => {
    try {
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      if (res.ok) {
        const data = await res.json();
        setValidation(data.result);
      }
    } catch { /* ignore */ }
  }, [assetId]);

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <FileText className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Production Bible
        </span>
        <span className="text-[10px] text-[#5a5a7a]">
          {info ? `${info.summary.bibleLines} lines` : 'loading…'}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] text-[#5a5a7a] hover:text-white" onClick={() => void fetchInfo()} disabled={loading}>
          {loading ? '…' : 'Refresh'}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3 space-y-3">
          {/* Naming convention validator */}
          <section className="rounded border border-[#2a2a4a] bg-[#12122a] p-2.5">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              <Search className="h-3 w-3" /> Asset ID Validator
            </h3>
            <div className="flex gap-1.5">
              <Input
                value={assetId}
                onChange={(e) => setAssetId(e.target.value.toUpperCase())}
                className="h-7 flex-1 border-[#2a2a4a] bg-[#0e0e24] font-mono text-xs text-[#c8c8e0]"
                placeholder="CHR_PLAYER_BASE_M_01"
              />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => void validate()}>
                Validate
              </Button>
            </div>
            {validation && (
              <div className="mt-2">
                <div className={`flex items-center gap-1.5 text-[10px] ${validation.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {validation.valid ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {validation.valid ? 'VALID' : 'INVALID'}
                </div>
                {validation.errors.length > 0 && (
                  <div className="mt-1 text-[9px] text-rose-300">
                    {validation.errors.map((e, i) => <div key={i}>• {e}</div>)}
                  </div>
                )}
                {validation.warnings.length > 0 && (
                  <div className="mt-1 text-[9px] text-amber-300">
                    {validation.warnings.map((w, i) => <div key={i}>• {w}</div>)}
                  </div>
                )}
                {validation.valid && (
                  <div className="mt-1 font-mono text-[9px] text-[#8888aa]">
                    type={validation.parsed.type} · faction={validation.parsed.factionBiome ?? '—'} · cat={validation.parsed.category}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Character Factory */}
          {info && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Users className="h-3 w-3" /> Character Factory
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                <StatCard label="Male height" value={`${info.character.maleScale.heightM}m`} />
                <StatCard label="Female height" value={`${info.character.femaleScale.heightM}m`} />
                <StatCard label="Equipment slots" value={info.character.equipmentSlots} />
                <StatCard label="Body hide zones" value={info.character.bodyHideZones} />
                <StatCard label="Skeleton sockets" value={info.character.sockets} />
                <StatCard label="Material specs" value={info.character.materialSpecs} />
              </div>
              <div className="mt-1.5 rounded border border-[#2a2a4a] bg-[#12122a] p-1.5">
                <div className="text-[9px] font-semibold uppercase text-[#5a5a7a]">Triangle Budgets (LOD0)</div>
                {Object.entries(info.character.triangleBudgets).slice(0, 5).map(([key, val]) => (
                  <div key={key} className="flex justify-between font-mono text-[9px] text-[#8888aa]">
                    <span>{key}</span>
                    <span>{val.lod0[0].toLocaleString()}–{val.lod0[1].toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Terrain Factory */}
          {info && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Mountain className="h-3 w-3" /> Terrain Factory
              </h3>
              <div className="space-y-1">
                {info.terrain.biomes.map((b) => (
                  <div key={b.id} className="flex items-center gap-1.5 rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-1">
                    <Mountain className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                    <span className="text-[10px] text-[#c8c8e0]">{b.name}</span>
                    <span className="ml-auto font-mono text-[8px] text-[#5a5a7a]">{b.id}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Structures */}
          {info && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Building2 className="h-3 w-3" /> Structure Factory
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                <StatCard label="Required kits" value={info.structures.requiredKits} />
                <StatCard label="Damage states" value={info.structures.damageStates} />
                <StatCard label="Grid" value={`${info.structures.gridM}m`} />
              </div>
            </section>
          )}

          {/* UI System */}
          {info && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Monitor className="h-3 w-3" /> UI System
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                <StatCard label="HUD elements" value={info.ui.hudElements} />
                <StatCard label="Technique categories" value={info.ui.techniqueCategories} />
              </div>
            </section>
          )}

          {/* Streaming */}
          {info && (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Gauge className="h-3 w-3" /> Streaming & Optimization
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                <StatCard label="World scale entries" value={info.streaming.worldScaleEntries} />
                <StatCard label="Traversal modes" value={info.streaming.traversalModes} />
                <StatCard label="Streaming tiers" value={info.streaming.streamingTiers} />
                <StatCard label="Perf budgets" value={info.streaming.performanceBudgets} />
                <StatCard label="FPS target" value={info.streaming.fpsTarget} />
              </div>
            </section>
          )}

          {/* Bible reference */}
          {info && (
            <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-2 text-[10px] text-[#5a5a7a]">
              <strong className="text-[#8888aa]">Production Bible:</strong>{' '}
              {info.summary.bibleLines} lines at{' '}
              <code className="text-amber-300">{info.summary.biblePath}</code>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-[#2a2a4a] bg-[#12122a] p-1.5">
      <div className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">{label}</div>
      <div className="font-mono text-xs text-[#c8c8e0]">{value}</div>
    </div>
  );
}
