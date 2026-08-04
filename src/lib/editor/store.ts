/**
 * Live Architect Studio — Editor Zustand Store
 *
 * Single source of truth for the editor UI: the loaded settlement, the
 * world execution state, all editor toggles, selection, edits, logs,
 * transactions, branches, capabilities, perf stats, and the architect
 * presence. All actions are defined here so components stay declarative.
 *
 * Persistence: NONE. The editor is a live tool; we do not persist to
 * localStorage by design (the world snapshot is large and the seed alone
 * reproduces it).
 */

import { create } from 'zustand';
import {
  ALL_DOMAINS,
  CapabilityDescriptorLite,
  EditorMode,
  EntityEdit,
  LogLevel,
  LogEntry,
  PerfStats,
  RenderMode,
  SerializableSettlement,
  SimulationDomain,
  StructureKind,
  TransactionLite,
  TransformMode,
  WorldBranchLite,
  WorldExecutionState,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeLog(level: LogLevel, source: string, message: string): LogEntry {
  return { id: uid('log'), timestamp: nowIso(), level, source, message };
}

// ---------------------------------------------------------------------------
// State + Actions
// ---------------------------------------------------------------------------

export interface EditorEdits {
  [entityId: number]: Partial<{
    'position.x': number;
    'position.z': number;
    rotation: number;
    width: number;
    depth: number;
  }>;
}

export interface EditorState {
  // --- World / settlement ---
  settlement: SerializableSettlement | null;
  settlementLoading: boolean;
  settlementError: string | null;
  seedInput: string;
  worldState: WorldExecutionState;
  frozenTick: number;
  isStepping: boolean;
  stepError: string | null;
  domainActivations: Record<SimulationDomain, boolean>;

  // --- Editor mode / tool / render ---
  editorMode: EditorMode;
  transformMode: TransformMode;
  renderMode: RenderMode;
  snapEnabled: boolean;
  showGrid: boolean;
  showGizmos: boolean;
  showStats: boolean;
  showMinimap: boolean;
  showOutliner: boolean;
  showInspector: boolean;
  showBottomDock: boolean;

  // --- Camera ---
  cameraPreset: 'perspective' | 'top' | 'front' | 'side';
  cameraFocusEntity: number | null;

  // --- Outliner / console ---
  outlinerFilter: string;
  outlinerGrouping: 'kind' | 'none';
  consoleFilter: LogLevel | 'all';
  activeBottomTab:
    | 'console'
    | 'architect'
    | 'assets'
    | 'simulation'
    | 'history'
    | 'conformance'
    | 'capabilities'
    | 'engine'
    | 'reasoning'
    | 'constraints'
    | 'complexity'
    | 'benchmarks'
    | 'claims';

  // --- Selection / hover / edits ---
  selectedEntityIds: number[];
  hoveredEntityId: number | null;
  edits: EditorEdits;
  hiddenEntityIds: number[]; // serialised as array (Set is not JSON-friendly)

  // --- Logs / transactions / branches ---
  logs: LogEntry[];
  transactions: TransactionLite[];
  branches: WorldBranchLite[];
  currentBranchId: string;

  // --- Capabilities ---
  capabilities: CapabilityDescriptorLite[];
  capabilitiesLoading: boolean;

  // --- Perf ---
  perf: PerfStats;
  fpsHistory: number[];

  // --- Architect presence ---
  presenceOpen: boolean;
  presenceStatus: 'connecting' | 'awake' | 'idle' | 'busy';
  presenceMood: 'calm' | 'curious' | 'amused' | 'stern';

  // --- Actions: world ---
  setSeedInput: (seed: string) => void;
  generateWorld: () => Promise<void>;
  setWorldState: (s: WorldExecutionState) => void;
  requestWorldState: (s: WorldExecutionState) => void;
  step: () => Promise<void>;
  toggleSim: () => void;
  toggleDomain: (d: SimulationDomain) => void;
  forkWorld: () => void;

  // --- Actions: editor / tool / render ---
  setEditorMode: (m: EditorMode) => void;
  setTransformMode: (m: TransformMode) => void;
  setRenderMode: (m: RenderMode) => void;
  toggleSnap: () => void;
  toggleGrid: () => void;
  toggleGizmos: () => void;
  toggleStats: () => void;
  toggleMinimap: () => void;
  toggleOutliner: () => void;
  toggleInspector: () => void;
  toggleBottomDock: () => void;
  setCameraPreset: (p: 'perspective' | 'top' | 'front' | 'side') => void;
  setCameraFocus: (entityId: number | null) => void;
  setOutlinerFilter: (s: string) => void;
  setOutlinerGrouping: (g: 'kind' | 'none') => void;
  setConsoleFilter: (f: LogLevel | 'all') => void;
  setActiveBottomTab: (t: EditorState['activeBottomTab']) => void;

  // --- Actions: selection ---
  selectEntity: (id: number | null) => void;
  addToSelection: (id: number) => void;
  toggleSelectEntity: (id: number) => void;
  clearSelection: () => void;
  setHovered: (id: number | null) => void;
  selectAll: () => void;

  // --- Actions: edits ---
  applyEdit: (edit: EntityEdit) => void;
  applyEdits: (edits: EntityEdit[]) => void;
  hideEntity: (id: number) => void;
  showEntity: (id: number) => void;
  resetEdits: (entityId?: number) => void;

  // --- Actions: logs / transactions / branches ---
  log: (level: LogLevel, source: string, message: string) => void;
  clearLogs: () => void;
  recordTransaction: (t: Omit<TransactionLite, 'transactionId' | 'timestamp' | 'undone'>) => void;
  undoTransaction: (transactionId: string) => void;
  createBranch: (name: string) => void;
  switchBranch: (branchId: string) => void;

  // --- Actions: capabilities ---
  loadCapabilities: () => Promise<void>;

  // --- Actions: perf ---
  setPerf: (p: PerfStats) => void;

  // --- Actions: presence ---
  setPresenceOpen: (open: boolean) => void;
  togglePresence: () => void;
  setPresenceStatus: (s: EditorState['presenceStatus']) => void;
  setPresenceMood: (m: EditorState['presenceMood']) => void;
}

// Default domain activations: physics + animation on by default, others off.
function defaultDomainActivations(): Record<SimulationDomain, boolean> {
  const out = {} as Record<SimulationDomain, boolean>;
  for (const d of ALL_DOMAINS) {
    out[d] = d === 'physics' || d === 'animation';
  }
  return out;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useEditorStore = create<EditorState>((set, get) => ({
  // --- World / settlement ---
  settlement: null,
  settlementLoading: false,
  settlementError: null,
  seedInput: 'wang-family-bend-1108',
  worldState: 'generation_freeze',
  frozenTick: 0,
  isStepping: false,
  stepError: null,
  domainActivations: defaultDomainActivations(),

  // --- Editor mode / tool / render ---
  editorMode: 'live_architect',
  transformMode: 'translate',
  renderMode: 'shaded',
  snapEnabled: true,
  showGrid: true,
  showGizmos: true,
  showStats: true,
  showMinimap: false,
  showOutliner: true,
  showInspector: true,
  showBottomDock: true,

  // --- Camera ---
  cameraPreset: 'perspective',
  cameraFocusEntity: null,

  // --- Outliner / console ---
  outlinerFilter: '',
  outlinerGrouping: 'kind',
  consoleFilter: 'all',
  activeBottomTab: 'console',

  // --- Selection / hover / edits ---
  selectedEntityIds: [],
  hoveredEntityId: null,
  edits: {},
  hiddenEntityIds: [],

  // --- Logs / transactions / branches ---
  logs: [
    makeLog('info', 'editor', 'Live Architect Studio initialised. Awaiting a seed.'),
  ],
  transactions: [],
  branches: [
    { branchId: 'main', name: 'Main', parentBranchId: null, transactionCount: 0, isFork: false },
  ],
  currentBranchId: 'main',

  // --- Capabilities ---
  capabilities: [],
  capabilitiesLoading: false,

  // --- Perf ---
  perf: { fps: 0, frameMs: 0, drawCalls: 0, triangles: 0, entities: 0 },
  fpsHistory: [],

  // --- Architect presence ---
  presenceOpen: false,
  presenceStatus: 'connecting',
  presenceMood: 'calm',

  // --- Actions: world ---
  setSeedInput: (seed) => set({ seedInput: seed }),

  generateWorld: async () => {
    const seed = get().seedInput.trim() || 'wang-family-bend-1108';
    set({ settlementLoading: true, settlementError: null });
    get().log('info', 'world.gen', `Requesting settlement for seed "${seed}"…`);
    try {
      const res = await fetch(`/api/editor/world?seed=${encodeURIComponent(seed)}`);
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const settlement = (await res.json()) as SerializableSettlement;
      set({
        settlement,
        settlementLoading: false,
        frozenTick: 0,
        worldState: 'generation_freeze',
        edits: {},
        selectedEntityIds: [],
        hoveredEntityId: null,
        hiddenEntityIds: [],
        currentBranchId: 'main',
        branches: [
          { branchId: 'main', name: 'Main', parentBranchId: null, transactionCount: 0, isFork: false },
        ],
        transactions: [],
      });
      get().log('info', 'world.gen', `Generated "${settlement.name}" (${settlement.nameHanzi}) — ${settlement.structures.length} structures, ${settlement.households.length} households.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ settlementLoading: false, settlementError: msg });
      get().log('error', 'world.gen', `Generation failed: ${msg}`);
    }
  },

  setWorldState: (s) => {
    set({ worldState: s });
    get().log('debug', 'world.state', `World state → ${s}`);
  },

  requestWorldState: (s) => {
    // requestWorldState is the user-facing "I want this state" verb: it logs
    // as info (not debug) and applies the transition.
    set({ worldState: s });
    get().log('info', 'world.state', `Requested world state: ${s}`);
    set({ presenceMood: s === 'player_embodiment' ? 'stern' : 'curious' });
  },

  step: async () => {
    const { settlement, domainActivations, isStepping } = get();
    if (!settlement || isStepping) return;
    const activeDomains = (Object.keys(domainActivations) as SimulationDomain[]).filter(
      (d) => domainActivations[d],
    );
    set({ isStepping: true, stepError: null });
    try {
      const res = await fetch('/api/editor/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlement, domains: activeDomains }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { settlement: SerializableSettlement; advancedTick: number };
      set({
        settlement: data.settlement,
        frozenTick: data.advancedTick,
        isStepping: false,
      });
      get().log('debug', 'world.step', `Advanced to tick ${data.advancedTick}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isStepping: false, stepError: msg });
      get().log('error', 'world.step', `Step failed: ${msg}`);
    }
  },

  toggleSim: () => {
    const cur = get().worldState;
    const next: WorldExecutionState =
      cur === 'full_simulation' ? 'dormant_architect' : 'full_simulation';
    get().requestWorldState(next);
  },

  toggleDomain: (d) => {
    set((s) => ({
      domainActivations: { ...s.domainActivations, [d]: !s.domainActivations[d] },
    }));
    get().log('debug', 'world.domain', `Toggled domain ${d} → ${get().domainActivations[d]}`);
  },

  forkWorld: () => {
    const branchId = uid('branch');
    const parent = get().currentBranchId;
    const branch: WorldBranchLite = {
      branchId,
      name: `Fork ${get().branches.length}`,
      parentBranchId: parent,
      transactionCount: 0,
      isFork: true,
    };
    set((s) => ({ branches: [...s.branches, branch], currentBranchId: branchId, worldState: 'temporary_fork' }));
    get().log('info', 'world.fork', `Forked from ${parent} → ${branchId}.`);
  },

  // --- Actions: editor / tool / render ---
  setEditorMode: (m) => set({ editorMode: m }),
  setTransformMode: (m) => set({ transformMode: m }),
  setRenderMode: (m) => set({ renderMode: m }),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleGizmos: () => set((s) => ({ showGizmos: !s.showGizmos })),
  toggleStats: () => set((s) => ({ showStats: !s.showStats })),
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
  toggleOutliner: () => set((s) => ({ showOutliner: !s.showOutliner })),
  toggleInspector: () => set((s) => ({ showInspector: !s.showInspector })),
  toggleBottomDock: () => set((s) => ({ showBottomDock: !s.showBottomDock })),
  setCameraPreset: (p) => set({ cameraPreset: p }),
  setCameraFocus: (entityId) => set({ cameraFocusEntity: entityId }),
  setOutlinerFilter: (s) => set({ outlinerFilter: s }),
  setOutlinerGrouping: (g) => set({ outlinerGrouping: g }),
  setConsoleFilter: (f) => set({ consoleFilter: f }),
  setActiveBottomTab: (t) => set({ activeBottomTab: t }),

  // --- Actions: selection ---
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
    const { settlement } = get();
    if (!settlement) return;
    set({ selectedEntityIds: settlement.structures.map((s) => s.entityId) });
  },

  // --- Actions: edits ---
  applyEdit: (edit) =>
    set((s) => ({
      edits: {
        ...s.edits,
        [edit.entityId]: {
          ...(s.edits[edit.entityId] ?? {}),
          [edit.field]: edit.value,
        },
      },
    })),
  applyEdits: (edits) => {
    set((s) => {
      const next = { ...s.edits };
      for (const e of edits) {
        next[e.entityId] = { ...(next[e.entityId] ?? {}), [e.field]: e.value };
      }
      return { edits: next };
    });
  },
  hideEntity: (id) =>
    set((s) => ({
      hiddenEntityIds: s.hiddenEntityIds.includes(id)
        ? s.hiddenEntityIds
        : [...s.hiddenEntityIds, id],
    })),
  showEntity: (id) =>
    set((s) => ({ hiddenEntityIds: s.hiddenEntityIds.filter((x) => x !== id) })),
  resetEdits: (entityId) =>
    set((s) => {
      if (entityId === undefined) return { edits: {} };
      const next = { ...s.edits };
      delete next[entityId];
      return { edits: next };
    }),

  // --- Actions: logs / transactions / branches ---
  log: (level, source, message) => {
    const entry = makeLog(level, source, message);
    set((s) => ({ logs: [...s.logs.slice(-499), entry] }));
  },
  clearLogs: () => set({ logs: [] }),
  recordTransaction: (t) => {
    const tx: TransactionLite = {
      ...t,
      transactionId: uid('tx'),
      timestamp: nowIso(),
      undone: false,
    };
    set((s) => {
      const branches = s.branches.map((b) =>
        b.branchId === tx.branchId ? { ...b, transactionCount: b.transactionCount + 1 } : b,
      );
      return { transactions: [tx, ...s.transactions].slice(0, 500), branches };
    });
    get().log('info', 'world.tx', `Transaction: ${tx.originalRequest}`);
  },
  undoTransaction: (transactionId) => {
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.transactionId === transactionId ? { ...t, undone: true } : t,
      ),
    }));
    get().log('info', 'world.tx', `Undid transaction ${transactionId}.`);
  },
  createBranch: (name) => {
    const branchId = uid('branch');
    const branch: WorldBranchLite = {
      branchId,
      name,
      parentBranchId: get().currentBranchId,
      transactionCount: 0,
      isFork: true,
    };
    set((s) => ({ branches: [...s.branches, branch], currentBranchId: branchId }));
    get().log('info', 'world.branch', `Created branch "${name}" (${branchId}).`);
  },
  switchBranch: (branchId) => {
    set({ currentBranchId: branchId });
    get().log('info', 'world.branch', `Switched to branch ${branchId}.`);
  },

  // --- Actions: capabilities ---
  loadCapabilities: async () => {
    set({ capabilitiesLoading: true });
    try {
      const res = await fetch('/api/editor/capabilities');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { capabilities: CapabilityDescriptorLite[] };
      set({ capabilities: data.capabilities, capabilitiesLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ capabilitiesLoading: false });
      get().log('warn', 'editor.capabilities', `Failed to load capabilities: ${msg}`);
    }
  },

  // --- Actions: perf ---
  setPerf: (p) =>
    set((s) => ({
      perf: p,
      fpsHistory: [...s.fpsHistory.slice(-119), p.fps],
    })),

  // --- Actions: presence ---
  setPresenceOpen: (open) => set({ presenceOpen: open }),
  togglePresence: () => set((s) => ({ presenceOpen: !s.presenceOpen })),
  setPresenceStatus: (status) => set({ presenceStatus: status }),
  setPresenceMood: (mood) => set({ presenceMood: mood }),
}));

// ---------------------------------------------------------------------------
// Selector helpers (kept here so components import from one place)
// ---------------------------------------------------------------------------

/** Returns the structure for an entity id, with local edits applied. */
export function selectStructureWithEdits(
  state: EditorState,
  entityId: number,
): SerializableSettlement['structures'][number] | null {
  const s = state.settlement?.structures.find((x) => x.entityId === entityId);
  if (!s) return null;
  const e = state.edits[entityId];
  if (!e) return s;
  return {
    ...s,
    position: {
      x: e['position.x'] ?? s.position.x,
      z: e['position.z'] ?? s.position.z,
    },
    rotation: e.rotation ?? s.rotation,
    width: e.width ?? s.width,
    depth: e.depth ?? s.depth,
  };
}

/** Group structures by kind for the outliner. */
export function groupStructuresByKind(
  structures: SerializableSettlement['structures'],
): Record<StructureKind, SerializableSettlement['structures']> {
  const out = {} as Record<StructureKind, SerializableSettlement['structures']>;
  for (const s of structures) {
    (out[s.kind] ??= []).push(s);
  }
  return out;
}
