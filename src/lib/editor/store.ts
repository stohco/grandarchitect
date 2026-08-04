/**
 * Live Architect Studio — Editor Store (Zustand)
 *
 * Single source of truth for the editor's reactive state.
 * All panels read from and write to this store.
 */

'use client';

import { create } from 'zustand';
import { useCallback } from 'react';
import type {
  SerializableSettlement,
  SerializableStructure,
  TransformMode,
  RenderMode,
  CameraPreset,
  EditorMode,
  WorldExecutionState,
  SimulationDomain,
  DomainActivation,
  LogEntry,
  LogLevel,
  TransactionLite,
  WorldBranchLite,
  CapabilityDescriptorLite,
  PerfStats,
  EntityEdit,
} from './types';

// ----------------------------------------------------------------------------
// World state-machine transitions (mirrors studio/world-states.ts)
// ----------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<WorldExecutionState, WorldExecutionState[]> = {
  generation_freeze: ['dormant_architect', 'full_simulation', 'temporary_fork'],
  dormant_architect: ['generation_freeze', 'selective_awakening', 'step_simulation', 'full_simulation', 'player_embodiment', 'temporary_fork'],
  selective_awakening: ['dormant_architect', 'step_simulation', 'full_simulation', 'player_embodiment', 'temporary_fork'],
  step_simulation: ['dormant_architect', 'selective_awakening', 'full_simulation'],
  full_simulation: ['dormant_architect', 'selective_awakening', 'step_simulation', 'player_embodiment', 'temporary_fork'],
  player_embodiment: ['dormant_architect', 'full_simulation', 'selective_awakening'],
  temporary_fork: ['dormant_architect', 'full_simulation'],
};

function canTransition(from: WorldExecutionState, to: WorldExecutionState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

const ALL_DOMAINS: SimulationDomain[] = [
  'physics', 'animation', 'ai', 'ecology', 'economy',
  'weather', 'history', 'combat', 'cultivation', 'social',
  'audio', 'navigation',
];

function defaultDomains(): DomainActivation[] {
  return ALL_DOMAINS.map((d) => ({ domain: d, active: false, scope: 'global' as const }));
}

let logCounter = 0;
function nextLogId() { return `log-${++logCounter}`; }
let txCounter = 0;
function nextTxId() { return `tx-${++txCounter}-${Date.now().toString(36)}`; }

// ----------------------------------------------------------------------------
// Store interface
// ----------------------------------------------------------------------------

export interface EditorStore {
  // ---- world / generation ----
  seed: string;
  seedInput: string;
  settlement: SerializableSettlement | null;
  loadingWorld: boolean;
  worldError: string | null;

  // ---- world runtime ----
  worldState: WorldExecutionState;
  frozenTick: number;
  simRunning: boolean;
  domains: DomainActivation[];
  forks: string[];
  stepping: boolean;

  // ---- editor ui ----
  editorMode: EditorMode;
  transformMode: TransformMode;
  renderMode: RenderMode;
  snapEnabled: boolean;
  showGrid: boolean;
  showGizmos: boolean;
  showStats: boolean;
  showOutliner: boolean;
  showInspector: boolean;
  showBottomDock: boolean;
  cameraPreset: CameraPreset;
  cameraFocusEntity: number | null;
  outlinerFilter: string;
  outlinerGrouping: 'kind' | 'faction' | 'none';
  consoleFilter: LogLevel | 'all';
  activeBottomTab: string;

  // ---- Architect Presence ----
  presenceOpen: boolean;
  presenceStatus: 'observing' | 'analyzing' | 'ready' | 'acting';
  presenceMood: string;

  // ---- selection ----
  selectedEntityIds: number[];
  hoveredEntityId: number | null;

  // ---- local edits (overrides applied on top of generated structures) ----
  edits: Record<number, Partial<Pick<SerializableStructure, 'position' | 'rotation' | 'width' | 'depth'>>>;
  hiddenEntityIds: Set<number>;

  // ---- console ----
  logs: LogEntry[];

  // ---- transactions / branches ----
  transactions: TransactionLite[];
  branches: WorldBranchLite[];
  currentBranchId: string;

  // ---- capabilities ----
  capabilities: CapabilityDescriptorLite[];
  capabilitiesLoading: boolean;

  // ---- performance ----
  perf: PerfStats;
  fpsHistory: number[];

  // ---- actions ----
  setSeedInput: (s: string) => void;
  generateWorld: (seed?: string) => Promise<void>;
  setWorldState: (s: WorldExecutionState) => void;
  requestWorldState: (s: WorldExecutionState) => void;
  step: (granularity: string, count: number) => Promise<void>;
  toggleSim: () => void;
  toggleDomain: (d: SimulationDomain) => void;
  forkWorld: () => string;

  setTransformMode: (m: TransformMode) => void;
  setRenderMode: (m: RenderMode) => void;
  toggleSnap: () => void;
  toggleGrid: () => void;
  toggleGizmos: () => void;
  toggleStats: () => void;
  toggleOutliner: () => void;
  toggleInspector: () => void;
  toggleBottomDock: () => void;
  setCameraPreset: (p: CameraPreset) => void;
  setCameraFocus: (id: number | null) => void;
  setOutlinerFilter: (s: string) => void;
  setOutlinerGrouping: (g: 'kind' | 'faction' | 'none') => void;
  setConsoleFilter: (f: LogLevel | 'all') => void;
  setActiveBottomTab: (t: string) => void;
  setEditorMode: (m: EditorMode) => void;

  // ---- Architect Presence actions ----
  setPresenceOpen: (open: boolean) => void;
  togglePresence: () => void;
  setPresenceStatus: (s: 'observing' | 'analyzing' | 'ready' | 'acting', mood?: string) => void;

  selectEntity: (id: number | null) => void;
  addToSelection: (id: number) => void;
  toggleSelectEntity: (id: number) => void;
  clearSelection: () => void;
  setHovered: (id: number | null) => void;
  selectAll: () => void;

  applyEdit: (e: EntityEdit) => void;
  applyEdits: (edits: EntityEdit[]) => void;
  hideEntity: (id: number) => void;
  showEntity: (id: number) => void;
  resetEdits: () => void;

  log: (level: LogLevel, source: string, message: string) => void;
  clearLogs: () => void;

  recordTransaction: (tx: Omit<TransactionLite, 'transactionId' | 'timestamp' | 'branchId' | 'undone'>) => void;
  undoTransaction: (id: string) => void;
  createBranch: (name: string, description: string) => void;
  switchBranch: (id: string) => void;

  loadCapabilities: () => Promise<void>;

  setPerf: (p: Partial<PerfStats>) => void;
  pushFps: (fps: number) => void;
}

const initialLogs: LogEntry[] = [
  {
    id: nextLogId(), tick: 0, level: 'info', source: 'kernel', ts: Date.now(),
    message: 'Live Architect Studio initialised. Awaiting world generation.',
  },
];

const initialBranch: WorldBranchLite = {
  branchId: 'main',
  name: 'main',
  parentBranchId: null,
  createdFromTick: 0,
  description: 'Primary world timeline',
  isFork: false,
  transactionCount: 0,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  // ---- world ----
  seed: 'wang-family-bend-1108',
  seedInput: 'wang-family-bend-1108',
  settlement: null,
  loadingWorld: false,
  worldError: null,

  // ---- runtime ----
  worldState: 'generation_freeze',
  frozenTick: 0,
  simRunning: false,
  domains: defaultDomains(),
  forks: [],
  stepping: false,

  // ---- ui ----
  editorMode: 'live_architect',
  transformMode: 'translate',
  renderMode: 'shaded',
  snapEnabled: true,
  showGrid: true,
  showGizmos: true,
  showStats: true,
  showOutliner: true,
  showInspector: true,
  showBottomDock: true,
  cameraPreset: 'perspective',
  cameraFocusEntity: null,
  outlinerFilter: '',
  outlinerGrouping: 'kind',
  consoleFilter: 'all',
  activeBottomTab: 'console',

  // ---- Architect Presence ----
  presenceOpen: false,
  presenceStatus: 'observing',
  presenceMood: 'I am watching 王灣村.',

  // ---- selection ----
  selectedEntityIds: [],
  hoveredEntityId: null,

  // ---- edits ----
  edits: {},
  hiddenEntityIds: new Set(),

  // ---- console ----
  logs: initialLogs,

  // ---- transactions ----
  transactions: [],
  branches: [initialBranch],
  currentBranchId: 'main',

  // ---- capabilities ----
  capabilities: [],
  capabilitiesLoading: false,

  // ---- perf ----
  perf: { fps: 0, frameMs: 0, drawCalls: 0, triangles: 0, entities: 0, memMb: 0 },
  fpsHistory: [],

  // ---- actions ----
  setSeedInput: (s) => set({ seedInput: s }),

  generateWorld: async (seedArg) => {
    const seed = seedArg ?? get().seedInput;
    set({ loadingWorld: true, worldError: null });
    get().log('debug', 'gen-settlement', `Generating world from seed "${seed}"…`);
    try {
      const res = await fetch(`/api/editor/world?seed=${encodeURIComponent(seed)}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'generation failed');
      const settlement = json.settlement as SerializableSettlement;
      set({
        seed,
        seedInput: seed,
        settlement,
        loadingWorld: false,
        frozenTick: settlement.tick,
        worldState: 'dormant_architect',
        edits: {},
        hiddenEntityIds: new Set(),
        selectedEntityIds: [],
        cameraFocusEntity: null,
      });
      get().log('success', 'gen-settlement', `Generated "${settlement.villageName}" — ${settlement.structures.length} structures, ${settlement.householdCount} households, pop ${settlement.population}.`);
      if (json.stats?.byKind) {
        const byKind = json.stats.byKind as Record<string, number>;
        const summary = Object.entries(byKind).map(([k, v]) => `${k}:${v}`).join('  ');
        get().log('debug', 'gen-settlement', `Structure census: ${summary}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ loadingWorld: false, worldError: msg });
      get().log('error', 'gen-settlement', `Generation failed: ${msg}`);
    }
  },

  setWorldState: (s) => set({ worldState: s }),

  requestWorldState: (s) => {
    const cur = get().worldState;
    if (cur === s) return;
    if (!canTransition(cur, s)) {
      get().log('warn', 'world-runtime', `Illegal transition ${cur} → ${s} blocked.`);
      return;
    }
    let domains = get().domains;
    if (s === 'dormant_architect' || s === 'generation_freeze') {
      domains = domains.map((d) => ({ ...d, active: false }));
      set({ simRunning: false });
    }
    if (s === 'full_simulation') {
      domains = domains.map((d) => ({ ...d, active: true }));
    }
    set({ worldState: s, domains });
    get().log('info', 'world-runtime', `World state → ${s}`);
  },

  step: async (granularity, count) => {
    if (get().stepping) return;
    const state = get().worldState;
    if (state !== 'step_simulation' && state !== 'selective_awakening' && state !== 'dormant_architect') {
      get().log('warn', 'world-runtime', `Step requires step/selective/dormant state (now ${state}).`);
      return;
    }
    set({ stepping: true });
    try {
      const res = await fetch('/api/editor/step', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ granularity, count, fromTick: get().frozenTick }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'step failed');
      const newTick = json.newTick as number;
      set({ frozenTick: newTick });
      const evs = json.eventsFired as string[];
      if (evs.length) {
        for (const e of evs.slice(0, 8)) get().log('architect', 'sim-event', e);
        if (evs.length > 8) get().log('debug', 'sim-event', `…and ${evs.length - 8} more events`);
      }
      get().log('success', 'world-runtime', `Stepped +${json.ticksAdvanced} (${granularity}×${count}) → tick ${newTick}`);
    } catch (e) {
      get().log('error', 'world-runtime', `Step failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      set({ stepping: false });
    }
  },

  toggleSim: () => {
    const running = get().simRunning;
    if (running) {
      set({ simRunning: false });
      get().requestWorldState('dormant_architect');
      get().log('info', 'world-runtime', 'Simulation paused.');
    } else {
      get().requestWorldState('full_simulation');
      set({ simRunning: true });
      get().log('info', 'world-runtime', 'Simulation running (full_simulation).');
    }
  },

  toggleDomain: (d) => {
    const domains = get().domains.map((dom) =>
      dom.domain === d ? { ...dom, active: !dom.active } : dom
    );
    set({ domains });
    const dom = domains.find((x) => x.domain === d)!;
    get().log('debug', 'world-runtime', `Domain ${d} ${dom.active ? 'awakened' : 'suspended'}.`);
  },

  forkWorld: () => {
    const id = `fork-${get().frozenTick}-${get().forks.length}`;
    set({ forks: [...get().forks, id] });
    get().log('architect', 'world-runtime', `Temporary fork created: ${id}`);
    return id;
  },

  setTransformMode: (m) => set({ transformMode: m }),
  setRenderMode: (m) => set({ renderMode: m }),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleGizmos: () => set((s) => ({ showGizmos: !s.showGizmos })),
  toggleStats: () => set((s) => ({ showStats: !s.showStats })),
  toggleOutliner: () => set((s) => ({ showOutliner: !s.showOutliner })),
  toggleInspector: () => set((s) => ({ showInspector: !s.showInspector })),
  toggleBottomDock: () => set((s) => ({ showBottomDock: !s.showBottomDock })),
  setCameraPreset: (p) => set({ cameraPreset: p }),
  setCameraFocus: (id) => set({ cameraFocusEntity: id }),
  setOutlinerFilter: (s) => set({ outlinerFilter: s }),
  setOutlinerGrouping: (g) => set({ outlinerGrouping: g }),
  setConsoleFilter: (f) => set({ consoleFilter: f }),
  setActiveBottomTab: (t) => set({ activeBottomTab: t }),
  setEditorMode: (m) => set({ editorMode: m }),

  // ---- Architect Presence ----
  setPresenceOpen: (open) => set({ presenceOpen: open }),
  togglePresence: () => set((s) => ({ presenceOpen: !s.presenceOpen })),
  setPresenceStatus: (status, mood) => set((s) => ({ presenceStatus: status, presenceMood: mood ?? s.presenceMood })),

  selectEntity: (id) => set({ selectedEntityIds: id === null ? [] : [id] }),
  addToSelection: (id) =>
    set((s) => ({
      selectedEntityIds: s.selectedEntityIds.includes(id)
        ? s.selectedEntityIds
        : [...s.selectedEntityIds, id],
    })),
  toggleSelectEntity: (id) =>
    set((s) => ({
      selectedEntityIds: s.selectedEntityIds.includes(id)
        ? s.selectedEntityIds.filter((x) => x !== id)
        : [...s.selectedEntityIds, id],
    })),
  clearSelection: () => set({ selectedEntityIds: [] }),
  setHovered: (id) => set({ hoveredEntityId: id }),
  selectAll: () => {
    const st = get().settlement;
    if (!st) return;
    set({ selectedEntityIds: st.structures.map((s) => s.entityId) });
  },

  applyEdit: (e) => {
    const edits = { ...get().edits };
    const existing = edits[e.entityId] ?? {};
    if (e.field === 'position.x') {
      const pos = existing.position ?? getEffectiveStructure(get().settlement, e.entityId)?.position ?? { x: 0, z: 0 };
      edits[e.entityId] = { ...existing, position: { x: e.value, z: pos.z } };
    } else if (e.field === 'position.z') {
      const pos = existing.position ?? getEffectiveStructure(get().settlement, e.entityId)?.position ?? { x: 0, z: 0 };
      edits[e.entityId] = { ...existing, position: { x: pos.x, z: e.value } };
    } else if (e.field === 'rotation') {
      edits[e.entityId] = { ...existing, rotation: e.value };
    } else if (e.field === 'width') {
      edits[e.entityId] = { ...existing, width: e.value };
    } else if (e.field === 'depth') {
      edits[e.entityId] = { ...existing, depth: e.value };
    }
    set({ edits });
  },

  applyEdits: (es) => {
    for (const e of es) get().applyEdit(e);
    if (es.length) {
      const first = es[0];
      get().recordTransaction({
        requestedBy: 'user',
        originalRequest: `Transform edit on entity #${first.entityId}`,
        toolsUsed: ['transform.gizmo'],
        changedProperties: { edits: es.length },
        affectedSystems: ['presentation'],
        diffs: es.map((e) => ({
          system: 'presentation',
          changeType: 'modify' as const,
          fieldPath: [String(e.entityId), e.field],
          description: `${e.field} → ${e.value}`,
        })),
        permissionClass: 'presentation_only',
      });
    }
  },

  hideEntity: (id) => set((s) => {
    const next = new Set(s.hiddenEntityIds); next.add(id); return { hiddenEntityIds: next };
  }),
  showEntity: (id) => set((s) => {
    const next = new Set(s.hiddenEntityIds); next.delete(id); return { hiddenEntityIds: next };
  }),
  resetEdits: () => {
    set({ edits: {} });
    get().log('info', 'editor', 'Local edits discarded (reverted to generated state).');
  },

  log: (level, source, message) =>
    set((s) => ({
      logs: [
        ...s.logs.slice(-499),
        { id: nextLogId(), tick: s.frozenTick, level, source, message, ts: Date.now() },
      ],
    })),

  clearLogs: () => set({ logs: [] }),

  recordTransaction: (tx) =>
    set((s) => {
      const full: TransactionLite = {
        ...tx,
        transactionId: nextTxId(),
        timestamp: s.frozenTick,
        branchId: s.currentBranchId,
        undone: false,
      };
      const branches = s.branches.map((b) =>
        b.branchId === s.currentBranchId
          ? { ...b, transactionCount: b.transactionCount + 1 }
          : b
      );
      return { transactions: [full, ...s.transactions], branches };
    }),

  undoTransaction: (id) =>
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.transactionId === id ? { ...t, undone: true } : t
      ),
    })),

  createBranch: (name, description) =>
    set((s) => ({
      branches: [
        ...s.branches,
        {
          branchId: `branch-${s.branches.length}-${Date.now().toString(36)}`,
          name,
          parentBranchId: s.currentBranchId,
          createdFromTick: s.frozenTick,
          description,
          isFork: false,
          transactionCount: 0,
        },
      ],
    })),

  switchBranch: (id) => {
    if (!get().branches.find((b) => b.branchId === id)) return;
    set({ currentBranchId: id });
    get().log('architect', 'branches', `Switched to branch ${id}.`);
  },

  loadCapabilities: async () => {
    set({ capabilitiesLoading: true });
    try {
      const res = await fetch('/api/editor/capabilities');
      const json = await res.json();
      if (json.ok) set({ capabilities: json.descriptors });
    } catch {
      get().log('warn', 'capabilities', 'Failed to load capability descriptors.');
    } finally {
      set({ capabilitiesLoading: false });
    }
  },

  setPerf: (p) => set((s) => ({ perf: { ...s.perf, ...p } })),
  pushFps: (fps) =>
    set((s) => ({ fpsHistory: [...s.fpsHistory.slice(-119), fps], perf: { ...s.perf, fps } })),
}));

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

export function getEffectiveStructure(
  settlement: SerializableSettlement | null,
  entityId: number
): SerializableStructure | null {
  if (!settlement) return null;
  return settlement.structures.find((s) => s.entityId === entityId) ?? null;
}

/** Merge generated structure with any local edits. */
export function getEffective(
  settlement: SerializableSettlement | null,
  edits: Record<number, Partial<Pick<SerializableStructure, 'position' | 'rotation' | 'width' | 'depth'>>>,
  entityId: number
): SerializableStructure | null {
  const base = getEffectiveStructure(settlement, entityId);
  if (!base) return null;
  const ov = edits[entityId];
  if (!ov) return base;
  return {
    ...base,
    position: ov.position ?? base.position,
    rotation: ov.rotation ?? base.rotation,
    width: ov.width ?? base.width,
    depth: ov.depth ?? base.depth,
  };
}

// Convenience hook for components that just want the current selection's entity.
export function useSelectedStructure(): SerializableStructure | null {
  return useEditorStore((s) => {
    if (!s.settlement || s.selectedEntityIds.length === 0) return null;
    const id = s.selectedEntityIds[0];
    return getEffective(s.settlement, s.edits, id);
  });
}

// Stable no-op callback export for components needing a ref callback.
export const useNoop = useCallback as unknown;
