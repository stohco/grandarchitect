/**
 * Transactional Command System
 *
 * Implements doc 50 §5. Semantic undo, named branches, diffs.
 * Every operation is a transaction with before/after state,
 * validation evidence, and provenance.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  Transaction,
  SemanticDiff,
  ValidationEvidence,
  Tick,
  WorldBranch,
  PermissionClass,
  OperationPlan,
  EntityId,
} from './types';

// ============================================================================
// Branch manager
// ============================================================================

export interface BranchManager {
  createBranch(name: string, parentBranchId: string | null, description: string, isFork: boolean): string;
  getBranch(branchId: string): WorldBranch | undefined;
  listBranches(): WorldBranch[];
  getMainBranch(): WorldBranch;
  addTransaction(branchId: string, transaction: Transaction): boolean;
  mergeBranch(sourceBranchId: string, targetBranchId: string): MergeResult;
  deleteBranch(branchId: string): boolean;
  getTransactionHistory(branchId: string): Transaction[];
}

export interface MergeResult {
  success: boolean;
  mergedTransactionCount: number;
  conflicts: MergeConflict[];
}

export interface MergeConflict {
  fieldPath: string[];
  sourceValue: unknown;
  targetValue: unknown;
  resolved: boolean;
}

export function createBranchManager(currentTick: () => Tick): BranchManager {
  const branches = new Map<string, WorldBranch>();
  const transactionsByBranch = new Map<string, Transaction[]>();

  // Main branch always exists
  const mainId = 'main';
  branches.set(mainId, {
    branchId: mainId,
    name: 'Main',
    parentBranchId: null,
    createdFromTick: currentTick(),
    transactions: [],
    description: 'The canonical world state',
    isFork: false,
  });
  transactionsByBranch.set(mainId, []);

  let branchCounter = 0;

  return {
    createBranch(name: string, parentBranchId: string | null, description: string, isFork: boolean): string {
      const branchId = `branch-${branchCounter++}`;
      const parent = parentBranchId ? branches.get(parentBranchId) : null;
      const branch: WorldBranch = {
        branchId,
        name,
        parentBranchId: parent?.branchId ?? null,
        createdFromTick: currentTick(),
        transactions: [],
        description,
        isFork,
      };
      branches.set(branchId, branch);
      // Child branch starts with parent's transaction history (snapshot semantics)
      const parentHistory = parent ? transactionsByBranch.get(parent.branchId) ?? [] : [];
      transactionsByBranch.set(branchId, [...parentHistory]);
      return branchId;
    },

    getBranch(branchId: string): WorldBranch | undefined {
      return branches.get(branchId);
    },

    listBranches(): WorldBranch[] {
      return Array.from(branches.values());
    },

    getMainBranch(): WorldBranch {
      return branches.get(mainId)!;
    },

    addTransaction(branchId: string, transaction: Transaction): boolean {
      const branch = branches.get(branchId);
      if (!branch) return false;
      const history = transactionsByBranch.get(branchId) ?? [];
      history.push(transaction);
      transactionsByBranch.set(branchId, history);
      branch.transactions.push(transaction.transactionId);
      return true;
    },

    mergeBranch(sourceBranchId: string, targetBranchId: string): MergeResult {
      const source = branches.get(sourceBranchId);
      const target = branches.get(targetBranchId);
      if (!source || !target) {
        return { success: false, mergedTransactionCount: 0, conflicts: [] };
      }

      const sourceHistory = transactionsByBranch.get(sourceBranchId) ?? [];
      const targetHistory = transactionsByBranch.get(targetBranchId) ?? [];

      // Find transactions in source not in target
      const targetTxnIds = new Set(targetHistory.map(t => t.transactionId));
      const newTxns = sourceHistory.filter(t => !targetTxnIds.has(t.transactionId));

      const conflicts: MergeConflict[] = [];
      // Check for field-level conflicts: if both branches modified the same field
      const targetFieldMap = new Map<string, unknown>();
      for (const t of targetHistory) {
        for (const d of t.diffs) {
          targetFieldMap.set(d.fieldPath.join('.'), d.newValue);
        }
      }
      for (const t of newTxns) {
        for (const d of t.diffs) {
          const key = d.fieldPath.join('.');
          if (targetFieldMap.has(key) && targetFieldMap.get(key) !== d.newValue) {
            conflicts.push({
              fieldPath: d.fieldPath,
              sourceValue: d.newValue,
              targetValue: targetFieldMap.get(key),
              resolved: false,
            });
          }
        }
      }

      // Merge: append new transactions to target
      if (conflicts.length === 0) {
        transactionsByBranch.set(targetBranchId, [...targetHistory, ...newTxns]);
        target.transactions.push(...newTxns.map(t => t.transactionId));
      }

      return {
        success: conflicts.length === 0,
        mergedTransactionCount: conflicts.length === 0 ? newTxns.length : 0,
        conflicts,
      };
    },

    deleteBranch(branchId: string): boolean {
      if (branchId === mainId) return false;  // cannot delete main
      const existed = branches.delete(branchId);
      transactionsByBranch.delete(branchId);
      return existed;
    },

    getTransactionHistory(branchId: string): Transaction[] {
      return transactionsByBranch.get(branchId) ?? [];
    },
  };
}

// ============================================================================
// Semantic undo
// ============================================================================

export interface UndoResult {
  success: boolean;
  undoneTransactionIds: string[];
  skippedTransactionIds: string[];  // transactions we were told to keep
  message: string;
}

/**
 * Semantic undo: undo specific operations while keeping others.
 * E.g. "Undo the vegetation from two changes ago, but keep the ruins."
 */
export function semanticUndo(
  branchManager: BranchManager,
  branchId: string,
  transactionIdsToUndo: string[],
  transactionIdsToKeep: string[]
): UndoResult {
  const history = branchManager.getTransactionHistory(branchId);
  const undoSet = new Set(transactionIdsToUndo);
  const keepSet = new Set(transactionIdsToKeep);

  // Validate: can't undo a transaction and keep the same one
  const overlap = transactionIdsToUndo.filter(id => keepSet.has(id));
  if (overlap.length > 0) {
    return {
      success: false,
      undoneTransactionIds: [],
      skippedTransactionIds: [],
      message: `Cannot both undo and keep: ${overlap.join(', ')}`,
    };
  }

  // Validate: all ids must exist in history
  const allIds = new Set(history.map(t => t.transactionId));
  const missing = [...undoSet, ...keepSet].filter(id => !allIds.has(id));
  if (missing.length > 0) {
    return {
      success: false,
      undoneTransactionIds: [],
      skippedTransactionIds: [],
      message: `Unknown transaction ids: ${missing.join(', ')}`,
    };
  }

  // Mark transactions as undone
  let undoneCount = 0;
  for (const txn of history) {
    if (undoSet.has(txn.transactionId)) {
      txn.undone = true;
      undoneCount++;
    }
  }

  return {
    success: true,
    undoneTransactionIds: transactionIdsToUndo,
    skippedTransactionIds: transactionIdsToKeep,
    message: `Undone ${undoneCount} transaction(s), kept ${keepSet.size}`,
  };
}

// ============================================================================
// Semantic diff generation
// ============================================================================

export function generateDiff(
  system: string,
  changeType: 'add' | 'remove' | 'modify',
  entityId: EntityId | undefined,
  fieldPath: string[],
  oldValue: unknown,
  newValue: unknown,
  description: string
): SemanticDiff {
  return {
    system,
    changeType,
    entityId,
    fieldPath,
    oldValue,
    newValue,
    description,
  };
}

export function summarizeDiffs(diffs: SemanticDiff[]): {
  bySystem: Record<string, number>;
  byChangeType: Record<string, number>;
  total: number;
} {
  const bySystem: Record<string, number> = {};
  const byChangeType: Record<string, number> = {};
  for (const d of diffs) {
    bySystem[d.system] = (bySystem[d.system] ?? 0) + 1;
    byChangeType[d.changeType] = (byChangeType[d.changeType] ?? 0) + 1;
  }
  return { bySystem, byChangeType, total: diffs.length };
}

// ============================================================================
// Validation
// ============================================================================

export function runValidation(
  diffs: SemanticDiff[],
  checks: { name: string; fn: (diffs: SemanticDiff[]) => boolean; message: string }[]
): ValidationEvidence[] {
  return checks.map(c => ({
    checkName: c.name,
    passed: c.fn(diffs),
    message: c.message,
  }));
}
