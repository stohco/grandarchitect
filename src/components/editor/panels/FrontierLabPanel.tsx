'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Loader2, Search, FlaskConical, CheckCircle2, XCircle, AlertTriangle,
  Beaker, Cpu, Globe, Zap, ExternalLink, Layers, Shield,
} from 'lucide-react';

interface SourceReference {
  type: string; title: string; url?: string; author?: string;
}
interface FrontierTechnique {
  id: string; name: string; category: string;
  problemSolved: string;
  observedSources: SourceReference[];
  underlyingPrinciples: string[];
  maturity: string;
  licenseAssessment: { license: string; compatible: boolean; notes: string };
  browserFeasibility: { browserFeasible: boolean; webgpuRequired: boolean; webgl2Fallback: string; notes: string };
  webgpuRequirements: { feature: string; required: boolean; fallback: string }[];
  expectedBenefits: { metric: string; expected: string; confidence: string }[];
  expectedCosts: { metric: string; expected: string; confidence: string }[];
  knownLimitations: string[];
  integrationStrategy: string;
  decisionStatus: string;
  qualityModes?: { name: string; description: string; gpuRequired: boolean; estimatedCost: string }[];
  applicableSystems: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  rendering: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  geometry: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  terrain: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  simulation: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  animation: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  streaming: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  'asset-authoring': 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  editor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
};

const DECISION_ICONS: Record<string, typeof CheckCircle2> = {
  accepted: CheckCircle2,
  rejected: XCircle,
  researching: Beaker,
  prototyping: FlaskConical,
  unreviewed: AlertTriangle,
};

const MATURITY_LABELS: Record<string, string> = {
  research: 'Research',
  prototype: 'Prototype',
  experimental: 'Experimental',
  'production-proven': 'Production',
};

export default function FrontierLabPanel() {
  const [techniques, setTechniques] = useState<FrontierTechnique[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'matrix'>('list');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/frontier/techniques');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setTechniques(data.techniques);
          setSummary(data.summary);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[11px] text-[#5a5a7a]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
        <span>Loading frontier techniques...</span>
      </div>
    );
  }

  const categories = ['all', ...new Set(techniques.map(t => t.category))];
  const filtered = techniques.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (filter) {
      const q = filter.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.problemSolved.toLowerCase().includes(q) || t.id.includes(q);
    }
    return true;
  });

  const selected = techniques.find(t => t.id === selectedId);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-1.5">
        <FlaskConical className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Frontier Lab</span>
        {summary && (
          <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-[#aaaacc]">
            {summary.total as number} techniques
          </Badge>
        )}
        {summary && (
          <Badge variant="outline" className="h-4 border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-300">
            {summary.accepted as number} accepted
          </Badge>
        )}
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setView('list')}
            className={`rounded px-2 py-0.5 text-[9px] ${view === 'list' ? 'bg-purple-500/20 text-purple-300' : 'text-[#5a5a7a]'}`}
          >List</button>
          <button
            onClick={() => setView('matrix')}
            className={`rounded px-2 py-0.5 text-[9px] ${view === 'matrix' ? 'bg-purple-500/20 text-purple-300' : 'text-[#5a5a7a]'}`}
          >Matrix</button>
        </div>
      </div>

      {view === 'list' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-1.5 border-b border-[#2a2a4a] px-2 py-1.5">
            <Search className="h-3 w-3 text-[#5a5a7a]" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search techniques..."
              className="h-6 flex-1 rounded border-[#2a2a4a] bg-[#1a1a2e] px-2 text-[10px] text-[#c8c8e0]"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-6 rounded border border-[#2a2a4a] bg-[#1a1a2e] px-1.5 text-[10px] text-[#c8c8e0]"
            >
              {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All' : c}</option>)}
            </select>
          </div>

          {/* List + Detail */}
          <div className="flex min-h-0 flex-1">
            {/* List */}
            <ScrollArea className="w-1/2 border-r border-[#2a2a4a]">
              <div className="space-y-1 p-1.5">
                {filtered.map(t => {
                  const Icon = DECISION_ICONS[t.decisionStatus] ?? AlertTriangle;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full rounded border p-1.5 text-left transition-colors ${
                        selectedId === t.id ? 'border-purple-500/40 bg-purple-500/10' : 'border-[#2a2a4a] bg-[#12122a] hover:border-[#3a3a5a]'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Icon className={`h-2.5 w-2.5 shrink-0 ${
                          t.decisionStatus === 'accepted' ? 'text-emerald-400' :
                          t.decisionStatus === 'rejected' ? 'text-rose-400' :
                          t.decisionStatus === 'researching' ? 'text-cyan-400' :
                          'text-amber-400'
                        }`} />
                        <span className="truncate text-[10px] font-medium text-[#c8c8e0]">{t.name}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className={`rounded border px-1 text-[8px] ${CATEGORY_COLORS[t.category] || 'border-[#2a2a4a] text-[#8888aa]'}`}>{t.category}</span>
                        <span className="text-[8px] text-[#5a5a7a]">{MATURITY_LABELS[t.maturity]}</span>
                        {t.browserFeasibility.webgpuRequired && <Zap className="h-2 w-2 text-amber-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Detail */}
            <ScrollArea className="flex-1">
              {selected ? (
                <div className="space-y-2 p-2">
                  <div>
                    <h3 className="text-[12px] font-bold text-[#c8c8e0]">{selected.name}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge variant="outline" className={`h-3.5 border-[1px] px-1 text-[8px] ${CATEGORY_COLORS[selected.category] || ''}`}>{selected.category}</Badge>
                      <span className="text-[9px] text-[#5a5a7a]">{MATURITY_LABELS[selected.maturity]}</span>
                      <Badge variant="outline" className={`h-3.5 px-1 text-[8px] ${
                        selected.decisionStatus === 'accepted' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' :
                        selected.decisionStatus === 'rejected' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' :
                        'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      }`}>{selected.decisionStatus}</Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-medium text-[#5a5a7a]">PROBLEM SOLVED</span>
                    <p className="text-[10px] leading-snug text-[#aaaacc]">{selected.problemSolved}</p>
                  </div>

                  {selected.underlyingPrinciples.length > 0 && (
                    <div>
                      <span className="text-[9px] font-medium text-[#5a5a7a]">PRINCIPLES</span>
                      <ul className="ml-3 list-disc text-[10px] leading-snug text-[#aaaacc]">
                        {selected.underlyingPrinciples.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="flex items-center gap-1 text-[9px] font-medium text-[#5a5a7a]"><Shield className="h-2.5 w-2.5" /> LICENSE</span>
                      <span className={`text-[10px] ${selected.licenseAssessment.compatible ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {selected.licenseAssessment.license} {selected.licenseAssessment.compatible ? '✓' : '✗'}
                      </span>
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-[9px] font-medium text-[#5a5a7a]"><Globe className="h-2.5 w-2.5" /> BROWSER</span>
                      <span className="text-[10px] text-[#aaaacc]">
                        {selected.browserFeasibility.browserFeasible ? 'Feasible' : 'Not feasible'}
                        {selected.browserFeasibility.webgpuRequired && ' (WebGPU)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-medium text-[#5a5a7a]">WEBGL2 FALLBACK</span>
                      <span className={`text-[10px] ${
                        selected.browserFeasibility.webgl2Fallback === 'full' ? 'text-emerald-300' :
                        selected.browserFeasibility.webgl2Fallback === 'reduced' ? 'text-amber-300' :
                        'text-rose-300'
                      }`}>{selected.browserFeasibility.webgl2Fallback}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-medium text-[#5a5a7a]">INTEGRATION</span>
                      <span className="text-[10px] text-[#aaaacc]">{selected.integrationStrategy}</span>
                    </div>
                  </div>

                  {selected.expectedBenefits.length > 0 && (
                    <div>
                      <span className="text-[9px] font-medium text-emerald-400/70">BENEFITS</span>
                      <ul className="ml-3 list-disc text-[10px] text-emerald-300/80">
                        {selected.expectedBenefits.map((b, i) => <li key={i}>{b.metric}: {b.expected} <span className="text-[#5a5a7a]">({b.confidence})</span></li>)}
                      </ul>
                    </div>
                  )}

                  {selected.expectedCosts.length > 0 && (
                    <div>
                      <span className="text-[9px] font-medium text-amber-400/70">COSTS</span>
                      <ul className="ml-3 list-disc text-[10px] text-amber-300/80">
                        {selected.expectedCosts.map((c, i) => <li key={i}>{c.metric}: {c.expected} <span className="text-[#5a5a7a]">({c.confidence})</span></li>)}
                      </ul>
                    </div>
                  )}

                  {selected.knownLimitations.length > 0 && (
                    <div>
                      <span className="text-[9px] font-medium text-rose-400/70">LIMITATIONS</span>
                      <ul className="ml-3 list-disc text-[10px] text-rose-300/80">
                        {selected.knownLimitations.map((l, i) => <li key={i}>{l}</li>)}
                      </ul>
                    </div>
                  )}

                  {selected.qualityModes && selected.qualityModes.length > 0 && (
                    <div>
                      <span className="flex items-center gap-1 text-[9px] font-medium text-[#5a5a7a]"><Layers className="h-2.5 w-2.5" /> QUALITY MODES</span>
                      <div className="mt-0.5 space-y-0.5">
                        {selected.qualityModes.map(m => (
                          <div key={m.name} className="flex items-center gap-1.5 text-[10px]">
                            <span className={`w-12 rounded px-1 text-center text-[8px] ${
                              m.name === 'ultra' ? 'bg-purple-500/20 text-purple-300' :
                              m.name === 'high' ? 'bg-emerald-500/20 text-emerald-300' :
                              m.name === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                              m.name === 'low' ? 'bg-rose-500/20 text-rose-300' :
                              'bg-[#2a2a4a] text-[#8888aa]'
                            }`}>{m.name}</span>
                            <span className="text-[#aaaacc]">{m.description}</span>
                            {m.gpuRequired && <Zap className="h-2 w-2 text-amber-400" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.observedSources.length > 0 && (
                    <div>
                      <span className="text-[9px] font-medium text-[#5a5a7a]">SOURCES</span>
                      <div className="space-y-0.5">
                        {selected.observedSources.map((s, i) => (
                          <div key={i} className="flex items-center gap-1 text-[9px] text-[#8888aa]">
                            <span className="rounded bg-[#1a1a2e] px-1 text-[8px]">{s.type}</span>
                            <span>{s.title}</span>
                            {s.author && <span className="text-[#5a5a7a]">— {s.author}</span>}
                            {s.url && <ExternalLink className="h-2 w-2 text-purple-400" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.applicableSystems.length > 0 && (
                    <div>
                      <span className="flex items-center gap-1 text-[9px] font-medium text-[#5a5a7a]"><Cpu className="h-2.5 w-2.5" /> APPLICABLE SYSTEMS</span>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {selected.applicableSystems.map(s => (
                          <span key={s} className="rounded bg-[#1a1a2e] px-1 py-0.5 text-[8px] text-[#8888aa]">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-[#5a5a7a]">
                  Select a technique to inspect.
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}

      {view === 'matrix' && <CapabilityMatrixView />}
    </div>
  );
}

function CapabilityMatrixView() {
  const [matrix, setMatrix] = useState<{ entries: any[] } | null>(null);

  useEffect(() => {
    fetch('/api/frontier/matrix')
      .then(res => res.json())
      .then(setMatrix)
      .catch(() => {});
  }, []);

  if (!matrix) return <div className="flex h-full items-center justify-center"><Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" /></div>;

  const statusColors: Record<string, string> = {
    native: 'bg-emerald-500/20 text-emerald-300',
    emulated: 'bg-amber-500/20 text-amber-300',
    baked: 'bg-cyan-500/20 text-cyan-300',
    experimental: 'bg-purple-500/20 text-purple-300',
    unavailable: 'bg-rose-500/20 text-rose-300',
    unsupported: 'bg-[#2a2a4a] text-[#5a5a7a]',
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-2">
        <div className="mb-2 text-[10px] text-[#5a5a7a]">Capability Matrix — what's available on each backend and hardware profile</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="text-[#5a5a7a]">
                <th className="p-1 text-left">Capability</th>
                <th className="p-1 text-center">WebGPU</th>
                <th className="p-1 text-center">WebGL2</th>
                <th className="p-1 text-center">Legacy</th>
                <th className="p-1 text-center">Mainstream</th>
                <th className="p-1 text-center">High-end</th>
                <th className="p-1 text-center">Integrated</th>
                <th className="p-1 text-center">Mobile</th>
                <th className="p-1 text-left">Fallback</th>
              </tr>
            </thead>
            <tbody>
              {matrix.entries.map((e: any) => (
                <tr key={e.capabilityId} className="border-t border-[#2a2a4a]">
                  <td className="p-1 text-[#c8c8e0]">{e.capabilityName}</td>
                  <td className={`p-1 text-center ${statusColors[e.byBackend.webgpu]}`}>{e.byBackend.webgpu}</td>
                  <td className={`p-1 text-center ${statusColors[e.byBackend.webgl2]}`}>{e.byBackend.webgl2}</td>
                  <td className={`p-1 text-center ${statusColors[e.byProfile['legacy-desktop']]}`}>{e.byProfile['legacy-desktop']}</td>
                  <td className={`p-1 text-center ${statusColors[e.byProfile['mainstream-desktop']]}`}>{e.byProfile['mainstream-desktop']}</td>
                  <td className={`p-1 text-center ${statusColors[e.byProfile['high-end-desktop']]}`}>{e.byProfile['high-end-desktop']}</td>
                  <td className={`p-1 text-center ${statusColors[e.byProfile['integrated-graphics']]}`}>{e.byProfile['integrated-graphics']}</td>
                  <td className={`p-1 text-center ${statusColors[e.byProfile['mobile-tablet']]}`}>{e.byProfile['mobile-tablet']}</td>
                  <td className="p-1 text-[#8888aa]">{e.fallbackStrategy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[8px]">
          {Object.entries(statusColors).map(([s, c]) => (
            <span key={s} className={`rounded px-1.5 py-0.5 ${c}`}>{s}</span>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
