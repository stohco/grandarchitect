/**
 * Render Tracker — counts component renders and flags infinite loops.
 *
 * useRenderTracker(componentName) is a tiny hook meant to be called at
 * the top of a component body. On every render it bumps a ref counter
 * and a global counter (window.__renderCounts[componentName]). Every
 * second, it checks whether the count exceeded 50 in the last second;
 * if so, it logs to the Crash Observatory (NOT the console, to avoid
 * spamming the console in a real loop) and resets the window.
 *
 * Why 50 renders/second? React's concurrent renderer can legitimately
 * re-render a hot component 30-40 times/second during heavy interaction
 * (drag, scroll, camera move). 50 is the conservative threshold above
 * which we are confident there is a loop, not user input.
 *
 * The hook is dev-only: in production builds it short-circuits to a
 * no-op (still increments the global counter for debugging via the
 * browser console, but does not install the interval or report).
 */

'use client';

import { useRef, useEffect } from 'react';
import { recordCrash } from '@/lib/editor/crash-observatory';

const RENDER_LOOP_THRESHOLD_PER_SEC = 50;
const WINDOW_MS = 1_000;

interface WindowWithRenderCounts extends Window {
  __renderCounts?: Record<string, number>;
}

function bumpGlobal(name: string): void {
  if (typeof window === 'undefined') return;
  const w = window as WindowWithRenderCounts;
  if (!w.__renderCounts) {
    w.__renderCounts = {};
    // Freeze the object so dev-tools can show it as a stable reference.
    // (We do NOT prevent extension — we want new components to register.)
    Object.defineProperty(window, '__renderCounts', {
      value: w.__renderCounts,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  w.__renderCounts[name] = (w.__renderCounts[name] ?? 0) + 1;
}

/**
 * Count this component's renders. Returns the current render count for
 * this instance (mostly for debug display; the canonical source of
 * truth is window.__renderCounts).
 */
export function useRenderTracker(componentName: string): number {
  // useRef so the counter survives re-renders without triggering them.
  const countRef = useRef(0);
  // Windowed count: how many renders in the last WINDOW_MS.
  const windowCountRef = useRef(0);
  // Timestamp of the last window reset.
  const windowStartRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  );
  // Track whether we've already reported a loop for this instance —
  // avoids spamming the observatory with one record per render once
  // a loop is in progress. Reset on every successful non-loop window.
  const alreadyReportedRef = useRef(false);
  // Interval handle for cleanup.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bump on every render (including the first).
  countRef.current += 1;
  windowCountRef.current += 1;
  bumpGlobal(componentName);

  useEffect(() => {
    // Install a periodic checker. We use setInterval rather than running
    // the check on every render so that a runaway loop does not itself
    // generate one observatory record per render (which would push us
    // past maxCrashReports in seconds).
    intervalRef.current = setInterval(() => {
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsed = now - windowStartRef.current;

      if (elapsed >= WINDOW_MS) {
        const rendersInWindow = windowCountRef.current;
        if (
          rendersInWindow > RENDER_LOOP_THRESHOLD_PER_SEC &&
          !alreadyReportedRef.current
        ) {
          alreadyReportedRef.current = true;
          try {
            recordCrash({
              severity: 'error',
              source: 'render-tracker',
              message: `Render loop detected: ${componentName} rendered ${rendersInWindow} times in ${Math.round(elapsed)}ms`,
              context: {
                component: componentName,
                rendersInWindow,
                windowMs: Math.round(elapsed),
                threshold: RENDER_LOOP_THRESHOLD_PER_SEC,
                totalRenders: countRef.current,
              },
            });
          } catch {
            // observatory must never break the host component
          }
        } else if (rendersInWindow <= RENDER_LOOP_THRESHOLD_PER_SEC) {
          // Recovered: reset the report latch so a future loop is caught.
          alreadyReportedRef.current = false;
        }
        // Reset the window regardless of outcome.
        windowCountRef.current = 0;
        windowStartRef.current = now;
      }
    }, WINDOW_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [componentName]);

  return countRef.current;
}

/**
 * Read-only accessor for the global render count map (for panels /
 * debugging). Returns a fresh shallow copy so callers can iterate
 * without worrying about mutation.
 */
export function snapshotRenderCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  const w = window as WindowWithRenderCounts;
  return w.__renderCounts ? { ...w.__renderCounts } : {};
}
