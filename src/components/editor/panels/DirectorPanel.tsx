/**
 * Live Architect Studio — Director Panel
 *
 * The directed donghua production desk: Episode 1 shot list (camera cuts,
 * lens, movement, lighting, audio, art-board references), the handcrafted
 * set blueprint stats, the canonical scale registry, and traversal speeds.
 * Data: src/lib/worldproduction.
 */

'use client';

import { useMemo, useState } from 'react';
import { Film, Clapperboard, Ruler, Gauge, Camera, ListChecks } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  EPISODE_1, ART_BOARDS, directorStats,
} from '@/lib/worldproduction/director-script';
import {
  SCALE_REGISTRY, TRAVERSAL_SPEEDS,
} from '@/lib/worldproduction/scale-registry';
import {
  SET_STRUCTURE_COUNT, SET_ROOM_COUNT, SET_PROP_COUNT, WANG_FAMILY_BEND,
} from '@/lib/worldproduction/set-blueprint';

const CUT_COLORS: Record<string, string> = {
  'extreme-wide': 'text-sky-400', wide: 'text-blue-400', medium: 'text-cyan-400',
  close: 'text-yellow-400', 'extreme-close': 'text-amber-400', insert: 'text-orange-400',
  aerial: 'text-violet-400', crane: 'text-purple-400', dolly: 'text-emerald-400', pov: 'text-red-400',
};

function ShotRow({ shot }: { shot: (typeof EPISODE_1.shots)[number] }) {
  const [open, setOpen] = useState(false);
  const frame = `/director-frames/${shot.id}.png`;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11.5px] hover:bg-[#1a1a2e]">
        <span className="w-8 shrink-0 font-mono text-[10px] text-[#5a5a7a]">{shot.number}</span>
        <span className={`w-20 shrink-0 font-mono text-[10px] uppercase ${CUT_COLORS[shot.cut] ?? 'text-zinc-400'}`}>{shot.cut}</span>
        <span className="truncate text-[#c8c8e0]">{shot.subject}</span>
        <span className="ml-auto shrink-0 pr-1 text-[10px] text-[#5a5a7a]">
          {shot.durationSec}s · {shot.camera.lensMm}mm · {shot.camera.movement}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-12 mb-1 rounded border border-[#1a1a2e] bg-[#12122a]/60 px-2 py-1.5 text-[10.5px] leading-4 text-[#8888aa]">
          <div><span className="text-[#5a5a7a]">Location:</span> {shot.location}</div>
          <div><span className="text-[#5a5a7a]">Lighting:</span> {shot.lighting}</div>
          <div><span className="text-[#5a5a7a]">Composition:</span> {shot.composition}</div>
          <div><span className="text-[#5a5a7a]">Audio:</span> {shot.audio}</div>
          <div><span className="text-[#5a5a7a]">Art board:</span> <span className="text-[#a8a8c8]">{shot.artBoard}</span></div>
          {shot.scaleNote && <div><span className="text-[#5a5a7a]">Scale:</span> {shot.scaleNote}</div>}
          {/* rendered frame from the set factory + director renderer */}
          <img
            src={frame}
            alt={`${shot.number} — ${shot.subject}`}
            className="mt-1.5 w-full max-w-[420px] rounded border border-[#2a2a4a]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function DirectorPanel() {
  const stats = useMemo(() => directorStats(), []);
  const [showScale, setShowScale] = useState(false);
  const [showSpeeds, setShowSpeeds] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-[#1a1a2e] px-2 py-1.5">
        <Clapperboard className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8888aa]">Director Desk</span>
        <span className="text-[10px] text-[#5a5a7a]">— {EPISODE_1.title}</span>
        <span className="ml-auto flex items-center gap-2 text-[10px] text-[#5a5a7a]">
          <Film className="h-3 w-3" /> {stats.shots} shots · {stats.cuts.length} cut types
        </span>
      </div>

      <div className="flex items-center gap-2 border-b border-[#1a1a2e] px-2 py-1 text-[10px] text-[#5a5a7a]">
        <ListChecks className="h-3 w-3" />
        Set: {SET_STRUCTURE_COUNT} structures · {SET_ROOM_COUNT} rooms · {SET_PROP_COUNT} props · population {WANG_FAMILY_BEND.population}
        <button onClick={() => setShowScale(!showScale)} className="ml-auto flex items-center gap-1 text-[#a8a8c8] hover:text-white">
          <Ruler className="h-3 w-3" /> {showScale ? 'Hide' : 'Show'} Scale Registry
        </button>
        <button onClick={() => setShowSpeeds(!showSpeeds)} className="flex items-center gap-1 text-[#a8a8c8] hover:text-white">
          <Gauge className="h-3 w-3" /> {showSpeeds ? 'Hide' : 'Show'} Traversal
        </button>
      </div>

      {showScale && (
        <div className="border-b border-[#1a1a2e] bg-[#12122a]/40 px-2 py-1.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8888aa]">Canonical Scale Registry</div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-[10px] text-[#8888aa]">
            {SCALE_REGISTRY.map((s) => (
              <div key={s.id} className="flex items-baseline gap-1">
                <span className="text-[#c8c8e0]">{s.name}</span>
                <span className="text-[#5a5a7a]">{s.min === s.max ? `${s.min} m` : `${s.min}–${s.max} m`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSpeeds && (
        <div className="border-b border-[#1a1a2e] bg-[#12122a]/40 px-2 py-1.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8888aa]">Traversal Speeds (m/s)</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#8888aa]">
            {TRAVERSAL_SPEEDS.map((t) => (
              <span key={t.id}><span className="text-[#c8c8e0]">{t.name}</span> {t.min}–{t.max} m/s</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-[#1a1a2e] px-2 py-1">
        <Camera className="h-3 w-3 text-cyan-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8888aa]">Shot List — {EPISODE_1.timeOfDay}</span>
        <span className="ml-auto text-[10px] text-[#5a5a7a]">{EPISODE_1.logline}</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-1.5 py-1">
          {EPISODE_1.shots.map((shot) => (
            <ShotRow key={shot.id} shot={shot} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
