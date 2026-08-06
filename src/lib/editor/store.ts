/**
 * Live Architect Studio — Editor Store (Zustand)
 *
 * Single source of truth for the editor's reactive state.
 * All panels read from and write to this store.
 */

'use client';

import { create } from 'zustand';
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
  AuthorialOverride,
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
  physicsEnabled: boolean;
  showMinimap: boolean;
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

  // ---- authorial visual overrides (applied by Grand Architect slice) ----
  authorialOverrides: Record<number, AuthorialOverride>;
  authorialHistory: Array<{ entityId: number; override: AuthorialOverride | null; timestamp: number }>;

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
  togglePhysics: () => void;
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

  // ---- authorial override actions ----
  applyAuthorialOverride: (entityId: number, override: AuthorialOverride) => void;
  clearAuthorialOverride: (entityId: number) => void;
  undoAuthorialOverride: () => void;
  getAuthorialOverride: (entityId: number) => AuthorialOverride | null;

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
  physicsEnabled: false,
  showMinimap: false,
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

  // ---- authorial overrides ----
  authorialOverrides: {},
  authorialHistory: [],

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
  togglePhysics: () => set((s) => ({ physicsEnabled: !s.physicsEnabled })),
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
    if (es.length === 0) return;
    // Compute ONE immutable patch and commit once — do NOT call applyEdit
    // per field (that caused multiple state updates and inconsistent
    // intermediate states).
    //
    // UNDO ARCHITECTURE: We store forward + inverse patches (not full
    // snapshots) so undo memory grows with the number of CHANGED fields,
    // not the total edits object size. This is O(changes) not O(total state).
    const state = get();
    const edits = { ...state.edits };
    // Collect inverse patches: for each edit, record the OLD value so
    // undo can restore it.
    const inversePatches: Array<{ entityId: number; field: EntityEdit['field']; value: number | undefined }> = [];

    for (const e of es) {
      const existing = edits[e.entityId] ?? {};
      // Record the old value before overwriting.
      if (e.field === 'position.x') {
        const pos = existing.position ?? getEffectiveStructure(state.settlement, e.entityId)?.position ?? { x: 0, z: 0 };
        inversePatches.push({ entityId: e.entityId, field: 'position.x', value: pos.x });
        edits[e.entityId] = { ...existing, position: { x: e.value, z: pos.z } };
      } else if (e.field === 'position.z') {
        const pos = existing.position ?? getEffectiveStructure(state.settlement, e.entityId)?.position ?? { x: 0, z: 0 };
        inversePatches.push({ entityId: e.entityId, field: 'position.z', value: pos.z });
        edits[e.entityId] = { ...existing, position: { x: pos.x, z: e.value } };
      } else if (e.field === 'rotation') {
        inversePatches.push({ entityId: e.entityId, field: 'rotation', value: existing.rotation });
        edits[e.entityId] = { ...existing, rotation: e.value };
      } else if (e.field === 'width') {
        inversePatches.push({ entityId: e.entityId, field: 'width', value: existing.width });
        edits[e.entityId] = { ...existing, width: e.value };
      } else if (e.field === 'depth') {
        inversePatches.push({ entityId: e.entityId, field: 'depth', value: existing.depth });
        edits[e.entityId] = { ...existing, depth: e.value };
      }
    }
    // Commit once.
    set({ edits });

    // Record transaction with forward + inverse patches for real undo/redo.
    const first = es[0];
    state.recordTransaction({
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
      // Forward + inverse patches for O(changes) undo/redo (not full snapshots).
      _forwardPatches: es,
      _inversePatches: inversePatches,
    });
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

  // ---- authorial visual overrides ----
  applyAuthorialOverride: (entityId, override) => {
    const prev = get().authorialOverrides[entityId] ?? null;
    set((s) => ({
      authorialOverrides: { ...s.authorialOverrides, [entityId]: override },
      authorialHistory: [...s.authorialHistory.slice(-49), { entityId, override: prev, timestamp: Date.now() }],
    }));
    get().log('architect', 'authorial', `Applied visual override to entity ${entityId}: ${override.authorialState ?? 'ancient-sacred'}`);
  },

  clearAuthorialOverride: (entityId) => {
    const prev = get().authorialOverrides[entityId] ?? null;
    if (!prev) return;
    set((s) => {
      const next = { ...s.authorialOverrides };
      delete next[entityId];
      return {
        authorialOverrides: next,
        authorialHistory: [...s.authorialHistory.slice(-49), { entityId, override: prev, timestamp: Date.now() }],
      };
    });
    get().log('info', 'authorial', `Cleared visual override on entity ${entityId} (reverted to original).`);
  },

  undoAuthorialOverride: () => {
    const history = get().authorialHistory;
    if (history.length === 0) return;
    const last = history[history.length - 1];
    set((s) => {
      const next = { ...s.authorialOverrides };
      if (last.override === null) {
        delete next[last.entityId];
      } else {
        next[last.entityId] = last.override;
      }
      return {
        authorialOverrides: next,
        authorialHistory: s.authorialHistory.slice(0, -1),
      };
    });
    get().log('info', 'authorial', `Undid authorial override on entity ${last.entityId}.`);
  },

  getAuthorialOverride: (entityId) => {
    return get().authorialOverrides[entityId] ?? null;
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
    set((s) => {
      const tx = s.transactions.find((t) => t.transactionId === id);
      if (!tx || tx.undone) return {};
      // Apply inverse patches to revert the edits.
      const inversePatches = (tx as unknown as { _inversePatches?: Array<{ entityId: number; field: EntityEdit['field']; value: number | undefined }> })._inversePatches;
      if (!inversePatches || inversePatches.length === 0) {
        // No patches stored (old transaction) — can't undo, just mark.
        return {
          transactions: s.transactions.map((t) =>
            t.transactionId === id ? { ...t, undone: true } : t
          ),
        };
      }
      // Rebuild edits by applying inverse patches.
      const edits = { ...s.edits };
      for (const p of inversePatches) {
        const existing = edits[p.entityId] ?? {};
        if (p.value === undefined) {
          // Field didn't exist before — remove it.
          if (p.field === 'position.x' || p.field === 'position.z') {
            const pos = existing.position;
            if (pos) {
              const newPos: { x?: number; z?: number } = { ...pos };
              if (p.field === 'position.x') delete newPos.x;
              else delete newPos.z;
              // If position is now empty, remove it entirely.
              if (newPos.x === undefined && newPos.z === undefined) {
                const { position: _rmPos, ...restNoPos } = existing;
                edits[p.entityId] = restNoPos;
              } else {
                // Reconstruct with the remaining coordinate.
                const restored: Record<string, unknown> = { ...existing };
                restored.position = { x: newPos.x ?? 0, z: newPos.z ?? 0 };
                edits[p.entityId] = restored as typeof existing;
              }
            }
          } else {
            const rest = { ...existing } as Record<string, unknown>;
            delete rest[p.field];
            edits[p.entityId] = rest as typeof existing;
          }
        } else {
          // Restore the old value.
          if (p.field === 'position.x') {
            const pos = existing.position ?? { z: 0 };
            edits[p.entityId] = { ...existing, position: { x: p.value, z: pos.z } };
          } else if (p.field === 'position.z') {
            const pos = existing.position ?? { x: 0 };
            edits[p.entityId] = { ...existing, position: { x: pos.x, z: p.value } };
          } else if (p.field === 'rotation') {
            edits[p.entityId] = { ...existing, rotation: p.value };
          } else if (p.field === 'width') {
            edits[p.entityId] = { ...existing, width: p.value };
          } else if (p.field === 'depth') {
            edits[p.entityId] = { ...existing, depth: p.value };
          }
        }
      }
      return {
        edits,
        transactions: s.transactions.map((t) =>
          t.transactionId === id ? { ...t, undone: true } : t
        ),
      };
    }),

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
// CRITICAL: This hook uses ATOMIC selectors (stable stored references) and
// useMemo to merge — it does NOT call getEffective() inside the selector.
// The previous implementation returned a new object from the selector on every
// call when edits existed, causing React useSyncExternalStore infinite loops
// ("Maximum update depth exceeded" / "getSnapshot should be cached").
import { useMemo } from 'react';

export function useSelectedStructure(): SerializableStructure | null {
  const selectedId = useEditorStore(
    (s) => (s.selectedEntityIds.length > 0 ? s.selectedEntityIds[0] : null),
  );
  const baseStructure = useEditorStore((s) =>
    selectedId !== null && s.settlement
      ? s.settlement.structures.find((x) => x.entityId === selectedId) ?? null
      : null,
  );
  const entityEdits = useEditorStore((s) =>
    selectedId !== null ? s.edits[selectedId] ?? null : null,
  );

  return useMemo(() => {
    if (!baseStructure) return null;
    if (!entityEdits) return baseStructure;
    return {
      ...baseStructure,
      position: entityEdits.position ?? baseStructure.position,
      rotation: entityEdits.rotation ?? baseStructure.rotation,
      width: entityEdits.width ?? baseStructure.width,
      depth: entityEdits.depth ?? baseStructure.depth,
    };
  }, [baseStructure, entityEdits]);
}
