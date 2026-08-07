/**
 * Editable Operation Graph — non-destructive editing engine
 *
 * Inspired by Unbound's SDF operation stacks. Every edit is a node in a
 * graph that remains: selectable, reorderable, parameterized, previewable,
 * attributable, independently disableable, undoable, procedurally regenerable.
 *
 * Only the final runtime representation is baked into optimized meshes.
 * The Live Studio retains the editable source graph.
 *
 * Works for: terrain, structures, characters, settlements, technique-effects.
 * No forbidden functions. No Three.js, no DOM.
 */

import { createHash } from 'crypto';

// ============================================================================
// Types (re-exported from frontier/types.ts for convenience)
// ============================================================================

export type { EditableOperation, EditableOperationGraph, OperationType } from './types';

import type { EditableOperation, EditableOperationGraph, OperationType } from './types';

// ============================================================================
// Operation Graph Manager
// ============================================================================

export interface OperationGraphManager {
  /** Create a new graph for a target (terrain, structure, character, etc.) */
  create(graphType: EditableOperationGraph['graphType']): EditableOperationGraph;

  /** Add an operation to the end of the graph */
  addOperation(graphId: string, op: Omit<EditableOperation, 'operationId' | 'timestamp'>): string;

  /** Insert an operation at a specific position */
  insertOperation(graphId: string, index: number, op: Omit<EditableOperation, 'operationId' | 'timestamp'>): string;

  /** Remove an operation by ID */
  removeOperation(graphId: string, operationId: string): boolean;

  /** Reorder an operation (move from one position to another) */
  reorderOperation(graphId: string, operationId: string, newIndex: number): boolean;

  /** Toggle an operation's enabled state (disable without removing) */
  toggleOperation(graphId: string, operationId: string): boolean;

  /** Update an operation's parameters */
  updateParameters(graphId: string, operationId: string, params: Record<string, unknown>): boolean;

  /** Undo the last operation (marks as disabled, doesn't delete) */
  undo(graphId: string): string | null;

  /** Redo (re-enable the most recently undone operation) */
  redo(graphId: string): string | null;

  /** Get a graph by ID */
  get(graphId: string): EditableOperationGraph | undefined;

  /** List all graphs */
  list(): EditableOperationGraph[];

  /** Bake a graph into a runtime representation (marks as baked) */
  bake(graphId: string): { baked: boolean; operationCount: number; hash: string };

  /** Get the history of operations for attribution (user vs architect) */
  getHistory(graphId: string): Array<{ operationId: string; label: string; attributableTo: string; timestamp: string; enabled: boolean }>;

  /** Serialize a graph to JSON for persistence */
  serialize(graphId: string): string;

  /** Deserialize a graph from JSON */
  deserialize(json: string): EditableOperationGraph;
}

// ============================================================================
// Implementation
// ============================================================================

export function createOperationGraphManager(): OperationGraphManager {
  const graphs = new Map<string, EditableOperationGraph>();
  const undoStacks = new Map<string, string[]>(); // graphId → operation IDs that were undone
  let graphCounter = 0;
  let opCounter = 0;

  function newOpId(): string {
    return `op-${Date.now().toString(36)}-${(opCounter++).toString(36)}`;
  }

  function newGraphId(graphType: string): string {
    return `graph-${graphType}-${Date.now().toString(36)}-${(graphCounter++).toString(36)}`;
  }

  return {
    create(graphType) {
      const graphId = newGraphId(graphType);
      const graph: EditableOperationGraph = {
        graphId,
        graphType,
        operations: [],
        runtimeBaked: false,
      };
      graphs.set(graphId, graph);
      undoStacks.set(graphId, []);
      return graph;
    },

    addOperation(graphId, op) {
      const graph = graphs.get(graphId);
      if (!graph) throw new Error(`Graph not found: ${graphId}`);
      const operationId = newOpId();
      const fullOp: EditableOperation = {
        ...op,
        operationId,
        timestamp: new Date().toISOString(),
      };
      graph.operations.push(fullOp);
      graph.runtimeBaked = false; // adding an operation invalidates the bake
      return operationId;
    },

    insertOperation(graphId, index, op) {
      const graph = graphs.get(graphId);
      if (!graph) throw new Error(`Graph not found: ${graphId}`);
      const operationId = newOpId();
      const fullOp: EditableOperation = {
        ...op,
        operationId,
        timestamp: new Date().toISOString(),
      };
      graph.operations.splice(index, 0, fullOp);
      graph.runtimeBaked = false;
      return operationId;
    },

    removeOperation(graphId, operationId) {
      const graph = graphs.get(graphId);
      if (!graph) return false;
      const idx = graph.operations.findIndex(o => o.operationId === operationId);
      if (idx === -1) return false;
      graph.operations.splice(idx, 1);
      graph.runtimeBaked = false;
      return true;
    },

    reorderOperation(graphId, operationId, newIndex) {
      const graph = graphs.get(graphId);
      if (!graph) return false;
      const idx = graph.operations.findIndex(o => o.operationId === operationId);
      if (idx === -1 || idx === newIndex) return false;
      const [op] = graph.operations.splice(idx, 1);
      graph.operations.splice(Math.min(newIndex, graph.operations.length), 0, op);
      graph.runtimeBaked = false;
      return true;
    },

    toggleOperation(graphId, operationId) {
      const graph = graphs.get(graphId);
      if (!graph) return false;
      const op = graph.operations.find(o => o.operationId === operationId);
      if (!op) return false;
      op.enabled = !op.enabled;
      graph.runtimeBaked = false;
      return true;
    },

    updateParameters(graphId, operationId, params) {
      const graph = graphs.get(graphId);
      if (!graph) return false;
      const op = graph.operations.find(o => o.operationId === operationId);
      if (!op) return false;
      op.parameters = { ...op.parameters, ...params };
      graph.runtimeBaked = false;
      return true;
    },

    undo(graphId) {
      const graph = graphs.get(graphId);
      if (!graph) return null;
      // Find the last enabled operation
      for (let i = graph.operations.length - 1; i >= 0; i--) {
        if (graph.operations[i].enabled) {
          graph.operations[i].enabled = false;
          const undoStack = undoStacks.get(graphId) ?? [];
          undoStack.push(graph.operations[i].operationId);
          undoStacks.set(graphId, undoStack);
          graph.runtimeBaked = false;
          return graph.operations[i].operationId;
        }
      }
      return null;
    },

    redo(graphId) {
      const graph = graphs.get(graphId);
      if (!graph) return null;
      const undoStack = undoStacks.get(graphId) ?? [];
      if (undoStack.length === 0) return null;
      const opId = undoStack.pop()!;
      undoStacks.set(graphId, undoStack);
      const op = graph.operations.find(o => o.operationId === opId);
      if (op) {
        op.enabled = true;
        graph.runtimeBaked = false;
        return opId;
      }
      return null;
    },

    get(graphId) {
      return graphs.get(graphId);
    },

    list() {
      return Array.from(graphs.values());
    },

    bake(graphId) {
      const graph = graphs.get(graphId);
      if (!graph) throw new Error(`Graph not found: ${graphId}`);
      const enabledOps = graph.operations.filter(o => o.enabled);
      const hash = createHash('sha256')
        .update(JSON.stringify(enabledOps.map(o => ({ t: o.type, p: o.parameters }))))
        .digest('hex');
      graph.runtimeBaked = true;
      graph.lastBakedAt = new Date().toISOString();
      return { baked: true, operationCount: enabledOps.length, hash };
    },

    getHistory(graphId) {
      const graph = graphs.get(graphId);
      if (!graph) return [];
      return graph.operations.map(o => ({
        operationId: o.operationId,
        label: o.label,
        attributableTo: o.attributableTo,
        timestamp: o.timestamp,
        enabled: o.enabled,
      }));
    },

    serialize(graphId) {
      const graph = graphs.get(graphId);
      if (!graph) throw new Error(`Graph not found: ${graphId}`);
      return JSON.stringify(graph, null, 2);
    },

    deserialize(json) {
      const graph = JSON.parse(json) as EditableOperationGraph;
      graphs.set(graph.graphId, graph);
      undoStacks.set(graph.graphId, []);
      return graph;
    },
  };
}

// ============================================================================
// Standard operation factories
// ============================================================================

export function addTerrainPrimitive(label: string, shape: string, position: [number, number, number], size: [number, number, number]): Omit<EditableOperation, 'operationId' | 'timestamp'> {
  return {
    type: 'add',
    label,
    parameters: { shape, position, size },
    enabled: true,
    attributableTo: 'user',
  };
}

export function subtractVolume(label: string, shape: string, position: [number, number, number], size: [number, number, number]): Omit<EditableOperation, 'operationId' | 'timestamp'> {
  return {
    type: 'subtract',
    label,
    parameters: { shape, position, size },
    enabled: true,
    attributableTo: 'user',
  };
}

export function paintMaterial(label: string, materialId: string, area: string): Omit<EditableOperation, 'operationId' | 'timestamp'> {
  return {
    type: 'paint',
    label,
    parameters: { materialId, area },
    enabled: true,
    attributableTo: 'user',
  };
}

export function scatterVegetation(label: string, species: string, density: number, area: string): Omit<EditableOperation, 'operationId' | 'timestamp'> {
  return {
    type: 'scatter',
    label,
    parameters: { species, density, area },
    enabled: true,
    attributableTo: 'user',
  };
}

export function applyErosion(label: string, iterations: number, rainfall: number): Omit<EditableOperation, 'operationId' | 'timestamp'> {
  return {
    type: 'erosion',
    label,
    parameters: { iterations, rainfall },
    enabled: true,
    attributableTo: 'user',
  };
}

export function placeEntity(label: string, entityType: string, position: [number, number, number]): Omit<EditableOperation, 'operationId' | 'timestamp'> {
  return {
    type: 'place',
    label,
    parameters: { entityType, position },
    enabled: true,
    attributableTo: 'user',
  };
}
