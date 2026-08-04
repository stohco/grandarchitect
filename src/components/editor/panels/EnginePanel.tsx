'use client';

/**
 * EnginePanel — engine readiness dashboard (static).
 *
 * Shows the engine's 8-phase build timeline, the safety rails list, and
 * the L0-L6 autonomy ladder. All data is static (the engine does not yet
 * expose a live status endpoint) but the panel is structured so a future
 * /api/engine/status could replace the constants.
 */

import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Circle,
  Shield,
  ShieldCheck,
  Gauge,
  Cpu,
} from 'lucide-react';

type PhaseStatus = 'DONE' | 'PENDING';

interface Phase {
  id: string;
  label: string;
  status: PhaseStatus;
  detail: string;
}

interface SafetyRail {
  id: string;
  label: string;
  enforced: boolean;
  detail: string;
}

interface AutonomyLevel {
  level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  label: string;
  reached: boolean;
  blurb: string;
}

const PHASES: Phase[] = [
  { id: 'p1', label: 'Kernel + Determinism', status: 'DONE', detail: 'Tick loop, transaction ledger, xoshiro256** RNG, replay harness.' },
  { id: 'p2', label: 'Entity Pool (SoA)', status: 'DONE', detail: '10k entities, spawn/disable/enable/findAll in <10ms (Ursus parity).' },
  { id: 'p3', label: 'World Generator', status: 'DONE', detail: 'Seeded village layout: 51 structures, 22 households, Wang Family Bend.' },
  { id: 'p4', label: 'RCVC Stack', status: 'DONE', detail: 'Reasoning + Constraints + Verification + Complexity (3 hypothesis tiers, proof objects, model checker, observatory).' },
  { id: 'p5', label: 'Simulation Domains', status: 'DONE', detail: '12 domains implemented: physics, ecology, combat, cultivation, quest, economy, etc.' },
  { id: 'p6', label: 'Grand Architect', status: 'PENDING', detail: 'Autonomous change validation, promotion gating, capability resource protocol.' },
  { id: 'p7', label: 'VLM Observation', status: 'PENDING', detail: 'Browser VLM visual QA loop — verify generated scenes against art direction.' },
  { id: 'p8', label: 'Packaging + Deploy', status: 'PENDING', detail: 'Build pipeline, save migration, deploy targets.' },
];

const SAFETY_RAILS: SafetyRail[] = [
  { id: 'sr1', label: 'Determinism invariant', enforced: true, detail: 'No Math.random / Date.now / performance.now in simulation code. RNG via xoshiro256** only.' },
  { id: 'sr2', label: 'Transaction ledger', enforced: true, detail: 'Every mutation recorded; undo replays the inverse. Forks share parent history.' },
  { id: 'sr3', label: 'Engine-invariant scope', enforced: true, detail: 'Hypotheses that touch engine-invariants score 0 on reversibility and are never auto-enacted.' },
  { id: 'sr4', label: 'Soft vs. hard constraints', enforced: true, detail: 'Hard violations block solve; soft violations incur penalty but allow a best-effort assignment.' },
  { id: 'sr5', label: 'Proof objects', enforced: true, detail: 'Every constraint solution ships a justification tree the user can audit.' },
  { id: 'sr6', label: 'Protocol model checker', enforced: true, detail: '6 built-in protocols BFS-checked for invariant + reachability properties.' },
  { id: 'sr7', label: 'Promotion gating', enforced: false, detail: 'Autonomous changes must pass model-check + conformance before promotion to canonical. (Pending.)' },
  { id: 'sr8', label: 'VLM cross-check', enforced: false, detail: 'Generated scenes validated by vision model before commit. (Pending.)' },
];

const AUTONOMY: AutonomyLevel[] = [
  { level: 'L0', label: 'Frozen', reached: true, blurb: 'Generation freeze — nothing ticks.' },
  { level: 'L1', label: 'Dormant', reached: true, blurb: 'World alive, architect offline.' },
  { level: 'L2', label: 'Selective', reached: true, blurb: 'One domain awakens under user direction.' },
  { level: 'L3', label: 'Step', reached: true, blurb: 'User advances one tick at a time.' },
  { level: 'L4', label: 'Full', reached: true, blurb: 'All enabled domains tick every frame.' },
  { level: 'L5', label: 'Embodied', reached: false, blurb: 'Player inhabits an entity in the world.' },
  { level: 'L6', label: 'Autonomous', reached: false, blurb: 'Architect proposes + validates + promotes changes unattended.' },
];

export default function EnginePanel() {
  const doneCount = PHASES.filter((p) => p.status === 'DONE').length;
  const pendingCount = PHASES.length - doneCount;
  const totalTests = 37 + 113 + 252 + 247 + 203 + 202 + 224; // From run-tests CONFORMANCE_FILES
  const highestAutonomy = AUTONOMY.filter((a) => a.reached).slice(-1)[0];

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Header */}
      <div className="flex h-8 items-center justify-between border-b border-[#2a2a4a] px-3">
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
            Engine · {doneCount}/{PHASES.length} phases · autonomy {highestAutonomy?.level ?? 'L0'}
          </span>
        </div>
        <span className="font-mono text-[10px] text-emerald-300">
          {totalTests.toLocaleString()} tests
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-3">
          {/* Phase timeline */}
          <section className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                Build Phases
              </h3>
              <span className="text-[10px] text-[#5a5a7a]">
                <span className="text-emerald-300">{doneCount} done</span>
                <span className="mx-1">·</span>
                <span className="text-amber-300">{pendingCount} pending</span>
              </span>
            </div>
            <ol className="relative border-l border-[#2a2a4a] pl-4">
              {PHASES.map((p) => (
                <li key={p.id} className="mb-2 last:mb-0">
                  <div className="flex items-start gap-2">
                    <span
                      className="absolute -left-[9px] mt-0.5 flex h-4 w-4 items-center justify-center rounded-full"
                      style={{
                        background: p.status === 'DONE' ? '#10b981' : '#12122a',
                        border: `1.5px solid ${p.status === 'DONE' ? '#10b981' : '#d4a04a'}`,
                      }}
                    >
                      {p.status === 'DONE' ? (
                        <CheckCircle2 className="h-3 w-3 text-[#0e0e24]" />
                      ) : (
                        <Circle className="h-2 w-2 text-amber-400" />
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-[#c8c8e0]">
                          {p.label}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            p.status === 'DONE'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] leading-snug text-[#8888aa]">{p.detail}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Right column: safety rails + autonomy */}
          <section className="space-y-3">
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Shield className="h-3 w-3 text-purple-400" /> Safety Rails
              </h3>
              <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {SAFETY_RAILS.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded border px-2 py-1.5 ${
                      s.enforced
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-amber-500/30 bg-amber-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {s.enforced ? (
                        <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                      ) : (
                        <Shield className="h-3 w-3 shrink-0 text-amber-400" />
                      )}
                      <span className="text-[10px] font-medium text-[#c8c8e0]">{s.label}</span>
                      <span
                        className={`ml-auto shrink-0 text-[9px] uppercase ${
                          s.enforced ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {s.enforced ? 'enforced' : 'pending'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[9px] leading-snug text-[#8888aa]">{s.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                <Gauge className="h-3 w-3 text-emerald-400" /> Autonomy Ladder
              </h3>
              <div className="flex items-stretch gap-0.5">
                {AUTONOMY.map((a) => (
                  <div
                    key={a.level}
                    title={`${a.level} — ${a.label}: ${a.blurb}`}
                    className={`flex-1 rounded-sm border px-1 py-1 text-center ${
                      a.reached
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-[#2a2a4a] bg-[#12122a] opacity-50'
                    }`}
                  >
                    <div
                      className={`font-mono text-[10px] font-bold ${
                        a.reached ? 'text-emerald-300' : 'text-[#5a5a7a]'
                      }`}
                    >
                      {a.level}
                    </div>
                    <div className="text-[8px] uppercase text-[#8888aa]">{a.label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[9px] leading-snug text-[#5a5a7a]">
                Highest reached: <span className="text-emerald-300">{highestAutonomy?.level}</span> —{' '}
                {highestAutonomy?.blurb}
              </p>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
