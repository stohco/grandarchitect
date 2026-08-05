/**
 * Inspector Stability Check — a dev-only conformance hook that runs
 * inside InspectorPanel and watches for two failure modes that have
 * historically plagued the inspector:
 *
 *   1. The "getSnapshot should be cached" warning emitted by React's
 *      useSyncExternalStore when a store's getSnapshot returns a fresh
 *      reference every call. This causes an infinite render loop that
 *      React detects and warns about — but the warning is easy to miss
 *      in the console, and the loop silently destroys performance.
 *
 *   2. Inspector renders > 100 times in a single second, indicating a
 *      render loop that React did NOT catch (e.g. a derived selector
 *      that returns a new array every call without tripping the
 *      getSnapshot cache check).
 *
 * Both are reported to the Crash Observatory as `transform-lifecycle`
 * events with `eventType: 'error'`, so they appear alongside other
 * transform failures in the Crash Observatory panel.
 *
 * The hook is a no-op in production builds (process.env.NODE_ENV ===
 * 'production') to avoid the overhead of patching console.warn.
 */

'use client';

import { useRef, useEffect } from 'react';
import {
  recordCrash,
  recordTransformEvent,
} from '@/lib/editor/crash-observatory';

const RENDER_RATE_THRESHOLD_PER_SEC = 100;
const WINDOW_MS = 1_000;

// Match the canonical warning substring used by React's useSyncExternalStore.
const SNAPSHOT_WARNING_PATTERN = /getSnapshot should be cached/i;

interface InspectorStabilityState {
  snapshotWarningSeen: boolean;
  renderCount: number;
  windowStart: number;
  reportedThisWindow: boolean;
  intervalHandle: ReturnType<typeof setInterval> | null;
}

/**
 * Install the stability check. Returns a function that uninstalls it.
 * Intended to be called from a useEffect inside InspectorPanel.
 */
export function useInspectorStabilityCheck(): void {
  // useRef so the state survives re-renders without triggering them.
  const stateRef = useRef<InspectorStabilityState>({
    snapshotWarningSeen: false,
    renderCount: 0,
    windowStart:
      typeof performance !== 'undefined' ? performance.now() : Date.now(),
    reportedThisWindow: false,
    intervalHandle: null,
  });

  // Bump the render counter on every render (including the first mount).
  stateRef.current.renderCount += 1;

  useEffect(() => {
    // Production short-circuit.
    if (
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV === 'production'
    ) {
      return;
    }
    if (typeof window === 'undefined') return;

    // --- Patch console.warn to sniff for the snapshot warning. ---
    // We use the original warn for everything else, so the editor's
    // normal console output is unchanged.
    const originalWarn = console.warn;
    const patchedWarn = (
      ...args: Parameters<typeof console.warn>
    ): void => {
      try {
        const text = args
          .map((a) => (typeof a === 'string' ? a : ''))
          .join(' ');
        if (
          SNAPSHOT_WARNING_PATTERN.test(text) &&
          !stateRef.current.snapshotWarningSeen
        ) {
          stateRef.current.snapshotWarningSeen = true;
          // Report to the observatory as a transform-lifecycle error.
          recordTransformEvent({
            eventType: 'error',
            source: 'inspector-stability-check',
            message:
              'React "getSnapshot should be cached" warning detected — Inspector store may return a fresh snapshot reference on every call. This causes an infinite render loop.',
          });
          // Also record as a crash so it appears in the crashes list
          // and triggers an auto-submit to the server.
          recordCrash({
            severity: 'error',
            source: 'inspector-stability-check',
            message:
              'Inspector store getSnapshot not cached — infinite render loop imminent',
            context: {
              warningText: text.slice(0, 500),
              reactWarning: true,
            },
          });
        }
      } catch {
        // never let the sniffer throw
      }
      // Always forward to the original warn so behavior is unchanged.
      return originalWarn.apply(console, args);
    };
    console.warn = patchedWarn;

    // --- Install a 1s interval to check the render rate. ---
    stateRef.current.intervalHandle = setInterval(() => {
      const s = stateRef.current;
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsed = now - s.windowStart;

      if (elapsed >= WINDOW_MS) {
        if (
          s.renderCount > RENDER_RATE_THRESHOLD_PER_SEC &&
          !s.reportedThisWindow
        ) {
          s.reportedThisWindow = true;
          try {
            recordTransformEvent({
              eventType: 'error',
              source: 'inspector-stability-check',
              message: `Inspector render rate exceeded threshold: ${s.renderCount} renders in ${Math.round(elapsed)}ms (threshold ${RENDER_RATE_THRESHOLD_PER_SEC}/s)`,
              durationMs: Math.round(elapsed),
            });
            recordCrash({
              severity: 'error',
              source: 'inspector-stability-check',
              message: `Inspector render loop: ${s.renderCount} renders in ${Math.round(elapsed)}ms`,
              context: {
                rendersInWindow: s.renderCount,
                windowMs: Math.round(elapsed),
                threshold: RENDER_RATE_THRESHOLD_PER_SEC,
              },
            });
          } catch {
            // observability must never break the host
          }
        } else if (s.renderCount <= RENDER_RATE_THRESHOLD_PER_SEC) {
          // Recovered: allow future reports.
          s.reportedThisWindow = false;
        }
        s.renderCount = 0;
        s.windowStart = now;
      }
    }, WINDOW_MS);

    return () => {
      // Restore console.warn so HMR doesn't stack patches.
      if (console.warn === patchedWarn) {
        console.warn = originalWarn;
      }
      if (stateRef.current.intervalHandle !== null) {
        clearInterval(stateRef.current.intervalHandle);
        stateRef.current.intervalHandle = null;
      }
    };
  }, []);
}
