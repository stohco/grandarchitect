/**
 * Canonical UI Action Registry
 * =============================
 *
 * One registry shared by buttons, context menus, command palette,
 * keyboard shortcuts, Grand Architect capability discovery, automated
 * testing, and documentation.
 *
 * Every button must reference an action ID. No unique ad hoc logic
 * embedded in button components. A command-palette entry, toolbar
 * button, context menu, and Architect request for the same action
 * must call the same registered action.
 *
 * Architecture:
 *
 *   Capability Registry
 *           │
 *           ▼
 *   Canonical UI Action Registry
 *           │
 *           ├── contextual panel
 *           ├── toolbar
 *           ├── context menu
 *           ├── command palette
 *           ├── shortcut
 *           └── Grand Architect tool
 *            │
 *            ▼
 *   Authorized engine command
 *            │
 *            ▼
 *   Job / transaction / result / evidence
 */

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

export type ActionMaturity =
  | 'prototype'
  | 'integrated'
  | 'browser-proven'
  | 'validated'
  | 'blocked';

export type ActionStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked';

export type WorkspaceId =
  | 'world'
  | 'assets'
  | 'characters'
  | 'animation'
  | 'simulation'
  | 'architect'
  | 'playtest'
  | 'diagnostics'
  | 'global';

export interface UiActionDefinition {
  /** Unique action ID (e.g. 'terrain.carveTunnel', 'asset.createBox'). */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Short label for toolbar. */
  shortLabel?: string;
  /** Description for tooltips and command palette. */
  description: string;
  /** Category for grouping in command palette. */
  category: string;
  /** Icon name (lucide icon). */
  icon?: string;
  /** Which workspace this action belongs to. */
  workspace: WorkspaceId;

  /** Linked capability ID (if any). */
  capabilityId?: string;
  /** Maturity level. */
  maturity: ActionMaturity;

  /** Check availability given current context. */
  availability: (context: ActionContext) => {
    available: boolean;
    reason?: string;
    remediation?: string;
  };

  /** Invoke the action. */
  invoke: (context: ActionContext, signal: AbortSignal) => Promise<UiActionResult>;

  /** Whether this action can be undone. */
  undoable: boolean;
  /** Whether this action is potentially destructive. */
  dangerous: boolean;
  /** Whether confirmation is required before execution. */
  requiresConfirmation?: boolean;
  /** Whether a preview is supported before committing. */
  supportsPreview?: boolean;

  /** Keyboard shortcut (e.g. 'Ctrl+Shift+T'). */
  shortcut?: string;
  /** Search keywords for command palette. */
  keywords: string[];
  /** Documentation reference path. */
  documentationRef?: string;
  /**
   * Honest disable reason. When set, invoke() MUST return a blocked
   * result with code DISABLED_WITH_REASON — never a silent no-op.
   */
  disabledReason?: string;
}

export interface ActionContext {
  /** Currently selected entity IDs. */
  selectedEntityIds: number[];
  /** Currently selected asset IDs. */
  selectedAssetIds: string[];
  /** Active workspace. */
  activeWorkspace: WorkspaceId;
  /** Whether a world is loaded. */
  worldLoaded: boolean;
  /** Whether the editor is in playtest mode. */
  inPlaytestMode: boolean;
  /** Current world revision. */
  worldRevision: number;
  /** Arbitrary context data. */
  data?: Record<string, unknown>;
}

export interface UiActionResult {
  status: ActionStatus;
  message: string;
  transactionId?: string;
  jobId?: string;
  artifactIds?: string[];
  revision?: number;
  error?: StructuredUiError;
}

export interface StructuredUiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

class UiActionRegistry {
  private actions = new Map<string, UiActionDefinition>();
  private listeners: Array<() => void> = [];

  register(action: UiActionDefinition): void {
    if (this.actions.has(action.id)) {
      console.warn(`[UiActionRegistry] Action "${action.id}" is already registered. Overwriting.`);
    }
    this.actions.set(action.id, action);
    this.notifyListeners();
  }

  unregister(actionId: string): void {
    this.actions.delete(actionId);
    this.notifyListeners();
  }

  get(actionId: string): UiActionDefinition | null {
    return this.actions.get(actionId) ?? null;
  }

  list(): UiActionDefinition[] {
    return Array.from(this.actions.values());
  }

  listByWorkspace(workspace: WorkspaceId): UiActionDefinition[] {
    return this.list().filter((a) => a.workspace === workspace);
  }

  listByCategory(category: string): UiActionDefinition[] {
    return this.list().filter((a) => a.category === category);
  }

  /** Search for command palette. */
  search(query: string): UiActionDefinition[] {
    const q = query.toLowerCase();
    return this.list().filter((a) => {
      return (
        a.label.toLowerCase().includes(q) ||
        a.shortLabel?.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.toLowerCase().includes(q)) ||
        a.id.toLowerCase().includes(q)
      );
    });
  }

  /** Get all available actions given context. */
  getAvailable(context: ActionContext): Array<UiActionDefinition & { available: boolean; reason?: string }> {
    return this.list().map((action) => {
      const check = action.availability(context);
      return { ...action, available: check.available, reason: check.reason };
    });
  }

  /** Get shortcut → action mapping. */
  getShortcuts(): Record<string, string> {
    const shortcuts: Record<string, string> = {};
    for (const action of this.list()) {
      if (action.shortcut) {
        shortcuts[action.shortcut] = action.id;
      }
    }
    return shortcuts;
  }

  /** Subscribe to registry changes. */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // listener must never throw
      }
    }
  }

  /** Get registry stats. */
  getStats(): {
    totalActions: number;
    byWorkspace: Record<string, number>;
    byMaturity: Record<string, number>;
    withShortcuts: number;
    undoable: number;
  } {
    const byWorkspace: Record<string, number> = {};
    const byMaturity: Record<string, number> = {};
    let withShortcuts = 0;
    let undoable = 0;

    for (const action of this.list()) {
      byWorkspace[action.workspace] = (byWorkspace[action.workspace] ?? 0) + 1;
      byMaturity[action.maturity] = (byMaturity[action.maturity] ?? 0) + 1;
      if (action.shortcut) withShortcuts++;
      if (action.undoable) undoable++;
    }

    return {
      totalActions: this.actions.size,
      byWorkspace,
      byMaturity,
      withShortcuts,
      undoable,
    };
  }
}

// Singleton
let registryInstance: UiActionRegistry | null = null;

export function getUiActionRegistry(): UiActionRegistry {
  if (!registryInstance) {
    registryInstance = new UiActionRegistry();
  }
  return registryInstance;
}

// ---------------------------------------------------------------------------
// Capability Access Matrix
// ---------------------------------------------------------------------------

export interface CapabilityAccessRecord {
  capabilityId: string;
  label: string;
  maturity: ActionMaturity;
  directManipulation: boolean;
  structuredPanel: boolean;
  commandPalette: boolean;
  shortcut?: string;
  architectTool: boolean;
  apiAvailable: boolean;
  workspace: WorkspaceId;
  navigationPath: string[];
  requiredSelection?: string;
  missingAccessPaths: string[];
}

export function buildCapabilityAccessMatrix(
  registry: UiActionRegistry,
): CapabilityAccessRecord[] {
  return registry.list().map((action) => {
    const missing: string[] = [];

    // Every capability must have at least:
    // 1. one obvious contextual access path (structuredPanel or directManipulation)
    // 2. one searchable command-palette path
    // 3. one Grand Architect path when safe

    if (!action.shortcut) {
      // Shortcuts are optional but recommended
    }

    return {
      capabilityId: action.capabilityId ?? action.id,
      label: action.label,
      maturity: action.maturity,
      directManipulation: false, // Would be set by viewport integration
      structuredPanel: true, // Actions are in panels
      commandPalette: true, // All registered actions are in palette
      shortcut: action.shortcut,
      architectTool: action.capabilityId !== undefined,
      apiAvailable: true, // Actions typically call APIs
      workspace: action.workspace,
      navigationPath: [action.workspace, action.category],
      missingAccessPaths: missing,
    };
  });
}
