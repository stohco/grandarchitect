/**
 * Live Architect Studio — Engine Panel
 *
 * Engine status overview. Top: a large TOTAL TESTS stat and the done vs
 * pending phase counts. Phases section: an 8-step vertical timeline (DONE =
 * emerald check, PENDING = amber dimmer). Safety Rails section: all 10 rails
 * with a shield icon in a scrollable area. Autonomy Levels section: a compact
 * horizontal L0–L6 ladder.
 *
 * Palette: dark navy with emerald/amber accents. No indigo or blue.
 */

'use client';

import { useMemo } from 'react';
import {
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Circle,
  FlaskConical,
  GitBranch,
  Boxes,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PHASES,
  TOTAL_TESTS,
  SAFETY_RAILS,
  AUTONOMY_LEVELS,
  type PhaseInfo,
} from '@/lib/engine/dashboard-data';

// ----------------------------------------------------------------------------
// Phase timeline row
// ----------------------------------------------------------------------------

function PhaseRow({ phase, isLast }: { phase: PhaseInfo; isLast: boolean }) {
  const done = phase.status === 'done';
  return (
    <div className="flex gap-2">
      {/* Vertical timeline rail + node */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            done
              ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          }`}
        >
          {done ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <Circle className="h-2.5 w-2.5" />
          )}
        </div>
        {!isLast && (
          <div
            className={`mt-0.5 w-px flex-1 ${
              done ? 'bg-emerald-500/30' : 'bg-amber-500/20'
            }`}
          />
        )}
      </div>

      {/* Body */}
      <div className={`min-w-0 flex-1 pb-2 ${done ? '' : 'opacity-60'}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] text-[#5a5a7a]">P{phase.id}</span>
          <span className="text-[11px] font-semibold text-[#c8c8e0]">{phase.name}</span>
          <Badge
            className={`h-3.5 px-1 text-[8px] font-semibold ${
              done
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {done ? 'DONE' : 'PENDING'}
          </Badge>
          {phase.testCount > 0 && (
            <Badge
              variant="outline"
              className="h-3.5 gap-0.5 border-[#2a2a4a] bg-[#0a0a1e] px-1 font-mono text-[8px] text-[#8888aa]"
            >
              <FlaskConical className="h-2 w-2" />
              {phase.testCount}
            </Badge>
          )}
        </div>
        <div className="mt-0.5 text-[10px] leading-snug text-[#8888aa]">
          <span className="text-[#5a5a7a]">exit:</span>{' '}
          <span className="text-[#aaaacc]">{phase.exitCriteria}</span>
        </div>
        {phase.artifacts.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {phase.artifacts.map((a) => (
              <span
                key={a}
                className="rounded bg-[#1a1a2e] px-1 py-0.5 font-mono text-[9px] text-[#8888aa] border border-[#2a2a4a]"
              >
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Section heading
// ----------------------------------------------------------------------------

function SectionHeading({
  icon: Icon,
  title,
  count,
  accent,
}: {
  icon: typeof Cpu;
  title: string;
  count?: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3 w-3 ${accent}`} />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8888aa]">
        {title}
      </span>
      {typeof count === 'number' && (
        <Badge
          variant="outline"
          className="h-3.5 border-[#2a2a4a] bg-[#0a0a1e] px-1 text-[8px] text-[#5a5a7a]"
        >
          {count}
        </Badge>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Panel
// ----------------------------------------------------------------------------

export default function EnginePanel() {
  const doneCount = useMemo(() => PHASES.filter((p) => p.status === 'done').length, []);
  const pendingCount = PHASES.length - doneCount;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-1.5">
        <Cpu className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Engine Status
        </span>
        <div className="flex-1" />
      </div>

      {/* Body */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-2">
          {/* Top stats row */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2">
              <div className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">
                Total Tests
              </div>
              <div className="font-mono text-[18px] font-bold leading-none text-emerald-300">
                {TOTAL_TESTS.toLocaleString()}
              </div>
            </div>
            <div className="rounded-md border border-[#2a2a4a] bg-[#0a0a1e] p-2">
              <div className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">
                Phases Done
              </div>
              <div className="font-mono text-[18px] font-bold leading-none text-[#c8c8e0]">
                {doneCount}
                <span className="text-[10px] font-normal text-[#5a5a7a]">/{PHASES.length}</span>
              </div>
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
              <div className="text-[9px] uppercase tracking-wider text-[#5a5a7a]">
                Pending
              </div>
              <div className="font-mono text-[18px] font-bold leading-none text-amber-300">
                {pendingCount}
              </div>
            </div>
          </div>

          {/* Phases timeline */}
          <div>
            <div className="mb-1.5">
              <SectionHeading
                icon={GitBranch}
                title="Phases"
                count={PHASES.length}
                accent="text-purple-400"
              />
            </div>
            <div className="rounded-md border border-[#2a2a4a] bg-[#0a0a1e] p-2">
              {PHASES.map((p, i) => (
                <PhaseRow key={p.id} phase={p} isLast={i === PHASES.length - 1} />
              ))}
            </div>
          </div>

          {/* Safety rails */}
          <div>
            <div className="mb-1.5">
              <SectionHeading
                icon={ShieldCheck}
                title="Safety Rails"
                count={SAFETY_RAILS.length}
                accent="text-emerald-400"
              />
            </div>
            <div className="max-h-40 overflow-y-auto rounded-md border border-[#2a2a4a] bg-[#0a0a1e] p-2">
              <ul className="space-y-1">
                {SAFETY_RAILS.map((rail, i) => (
                  <li
                    key={rail}
                    className="flex items-start gap-1.5 text-[10px] leading-snug text-[#aaaacc]"
                  >
                    <ShieldCheck className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-400" />
                    <span className="font-mono text-[8px] text-[#5a5a7a]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{rail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Autonomy levels ladder */}
          <div>
            <div className="mb-1.5">
              <SectionHeading
                icon={Boxes}
                title="Autonomy Levels"
                count={AUTONOMY_LEVELS.length}
                accent="text-amber-400"
              />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {AUTONOMY_LEVELS.map((lvl) => (
                <div
                  key={lvl.level}
                  className="rounded border border-[#2a2a4a] bg-[#0a0a1e] p-1 text-center"
                  title={`${lvl.name} — ${lvl.description}`}
                >
                  <div className="font-mono text-[10px] font-bold text-emerald-300">
                    L{lvl.level}
                  </div>
                  <div className="truncate text-[8px] text-[#8888aa]">{lvl.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
