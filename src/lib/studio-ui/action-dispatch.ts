/**
 * Action Dispatch Layer
 * =====================
 *
 * The single entrance every UI surface uses to run an action:
 *
 *   toolbar button / keyboard shortcut / command palette / context menu
 *        → dispatchAction(actionId, data?)
 *        → registry lookup → availability check → invoke
 *        → UiActionResult (completed | failed | blocked | cancelled)
 *
 * ONE definition per action (action-registrations.ts + action-handlers.ts),
 * not one per surface. Every surface resolves the SAME action ID through
 * this layer.
 *
 * The dispatch layer also records every invocation to the editor console
 * so the canonical action path is observable, and it can drive the Zustand
 * store where the action's real effect is a store transition.
 */

import { getUiActionRegistry } from './action-registry';
import type { ActionContext, UiActionResult } from './action-registry';
import '@/lib/studio-ui/action-registrations'; // Ensures all actions are registered in EVERY bundle (client + server)
import { useEditorStore } from '@/lib/editor/store';

/** Build the canonical ActionContext from the editor store + overrides. */
export function buildUiContext(overrides?: Partial<ActionContext>): ActionContext {
  const st = useEditorStore.getState();
  return {
    selectedEntityIds: st.selectedEntityIds,
    selectedAssetIds: [],
    activeWorkspace: 'world',
    worldLoaded: st.settlement !== null,
    inPlaytestMode: st.playtestMode,
    worldRevision: st.frozenTick,
    ...overrides,
  };
}

export interface DispatchOptions {
  signal?: AbortSignal;
  /** Silence the console log line (e.g. for high-frequency calls). */
  quiet?: boolean;
  /** Override fields of the canonical ActionContext (tests, automated callers). */
  context?: Partial<ActionContext>;
}

/**
 * Dispatch an action through the canonical registry path.
 * Returns a UiActionResult — never throws (invoke errors are captured).
 */
export async function dispatchAction(
  actionId: string,
  data?: Record<string, unknown>,
  options?: DispatchOptions,
): Promise<UiActionResult> {
  const registry = getUiActionRegistry();
  const def = registry.get(actionId);
  if (!def) {
    return {
      status: 'failed',
      message: `Action not registered: ${actionId}`,
      error: { code: 'UNKNOWN_ACTION', message: `Action not registered: ${actionId}`, retryable: false },
    };
  }

  const context = buildUiContext({ data, ...options?.context });

  try {
    const availability = def.availability(context);
    if (!availability.available) {
      const result: UiActionResult = {
        status: 'blocked',
        message: `Action unavailable: ${availability.reason}`,
        error: {
          code: 'UNAVAILABLE',
          message: availability.reason ?? 'Unavailable',
          details: { remediation: availability.remediation },
          retryable: false,
        },
      };
      if (!options?.quiet) logInvocation(actionId, result);
      return result;
    }

    const controller = options?.signal ? undefined : new AbortController();
    const signal = options?.signal ?? controller!.signal;
    const result = await def.invoke(context, signal);
    if (!options?.quiet) logInvocation(actionId, result);
    return result;
  } catch (err) {
    const result: UiActionResult = {
      status: 'failed',
      message: err instanceof Error ? err.message : String(err),
      error: { code: 'DISPATCH_ERROR', message: err instanceof Error ? err.message : String(err), retryable: false },
    };
    if (!options?.quiet) logInvocation(actionId, result);
    return result;
  }
}

function logInvocation(actionId: string, result: UiActionResult): void {
  try {
    const st = useEditorStore.getState();
    if (result.status === 'completed') {
      st.log('info', 'action', `${actionId} → ${result.message}`);
    } else if (result.status === 'blocked' || result.status === 'failed') {
      st.log('warn', 'action', `${actionId} → ${result.status}: ${result.message}`);
    }
  } catch {
    // Store logging must never break dispatch (e.g. in tests without a store).
  }
}
