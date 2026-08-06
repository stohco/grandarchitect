'use client';

/**
 * ViewportOverlay — the HUD drawn on top of the 3D viewport:
 *   - Top-left: settlement name + tick + world state badge
 *   - Top-right: FPS / frame ms / draw calls / triangles / entities
 *   - Bottom-left: legend of structure-kind colours
 *   - Bottom-right: hovered entity tooltip
 *
 * Reads from the editor store; never touches Three.js itself.
 */

import { useEditorStore } from '@/lib/editor/store';
import {
  STRUCTURE_COLOR,
  STRUCTURE_LABEL,
  WORLD_STATE_LABEL,
  WorldExecutionState,
  StructureKind,
} from '@/lib/editor/types';

const STATE_COLOR: Record<WorldExecutionState, string> = {
  generation_freeze: '#5a5a7a',
  dormant_architect: '#8888aa',
  selective_awakening: '#facc15',
  step_simulation: '#d4a04a',
  full_simulation: '#10b981',
  player_embodiment: '#a855f7',
  temporary_fork: '#f472b6',
};

export default function ViewportOverlay() {
  const settlement = useEditorStore((s) => s.settlement);
  const worldState = useEditorStore((s) => s.worldState);
  const frozenTick = useEditorStore((s) => s.frozenTick);
  const perf = useEditorStore((s) => s.perf);
  const showStats = useEditorStore((s) => s.showStats);
  const hoveredEntityId = useEditorStore((s) => s.hoveredEntityId);
  const branch = useEditorStore((s) => s.branches.find((b) => b.branchId === s.currentBranchId));

  const hovered = hoveredEntityId !== null
    ? settlement?.structures.find((s) => s.entityId === hoveredEntityId)
    : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {/* Top-left: settlement card */}
      <div className="absolute left-3 top-3 rounded-md border border-[#2a2a4a] bg-[#12122a]/80 px-3 py-2 backdrop-blur-sm">
        {settlement ? (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-[#c8c8e0]">{settlement.name}</span>
              <span className="text-xs text-[#8888aa]">{settlement.nameHanzi}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#5a5a7a]">
              <span>seed: <span className="text-[#8888aa]">{settlement.seed}</span></span>
              <span>·</span>
              <span>tick: <span className="text-[#8888aa]">{frozenTick}</span></span>
              {branch && branch.isFork && (
                <>
                  <span>·</span>
                  <span className="text-rose-400">fork: {branch.name}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-[#5a5a7a]">No settlement</span>
        )}
      </div>

      {/* World-state badge */}
      <div className="absolute left-3 top-[68px]">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{
            color: STATE_COLOR[worldState],
            borderColor: `${STATE_COLOR[worldState]}55`,
            background: `${STATE_COLOR[worldState]}11`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: STATE_COLOR[worldState] }}
          />
          {WORLD_STATE_LABEL[worldState]}
        </span>
      </div>

      {/* Top-right: perf stats */}
      {showStats && (
        <div className="absolute right-3 top-3 rounded-md border border-[#2a2a4a] bg-[#12122a]/80 px-3 py-2 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono">
            <Stat label="fps" value={String(perf.fps)} accent={perf.fps >= 50 ? '#10b981' : perf.fps >= 30 ? '#d4a04a' : '#f472b6'} />
            <Stat label="frame" value={`${perf.frameMs}ms`} />
            <Stat label="draws" value={String(perf.drawCalls)} />
            <Stat label="tris" value={perf.triangles.toLocaleString()} />
            <Stat label="entities" value={String(perf.entities)} />
          </div>
        </div>
      )}

      {/* Bottom-left: legend */}
      <div className="absolute bottom-3 left-3 rounded-md border border-[#2a2a4a] bg-[#12122a]/80 px-2.5 py-1.5 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {(Object.keys(STRUCTURE_COLOR) as StructureKind[]).map((kind) => (
            <div key={kind} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: STRUCTURE_COLOR[kind] }}
              />
              <span className="text-[10px] text-[#8888aa]">{STRUCTURE_LABEL[kind].en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom-right: hovered tooltip */}
      {hovered && (
        <div className="absolute bottom-3 right-3 rounded-md border border-[#2a2a4a] bg-[#12122a]/90 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-baseline gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: STRUCTURE_COLOR[hovered.kind] }}
            />
            <span className="text-sm text-[#c8c8e0]">{hovered.name}</span>
            <span className="text-xs text-[#8888aa]">{hovered.nameHanzi}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-[#5a5a7a]">
            id {hovered.entityId} · x {hovered.position.x.toFixed(2)} z {hovered.position.z.toFixed(2)} · r {(hovered.rotation * 180 / Math.PI).toFixed(0)}°
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[#5a5a7a]">{label}</span>
      <span className="text-[#c8c8e0]" style={accent ? { color: accent } : undefined}>{value}</span>
    </div>
  );
}
