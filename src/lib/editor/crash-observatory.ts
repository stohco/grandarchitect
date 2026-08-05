/**
 * Live Architect Studio — Crash Observatory
 *
 * A singleton reliability instrument that captures:
 *   - crashes (errors, unhandled promise rejections, render loops)
 *   - transform-lifecycle events (apply/commit/rollback + errors)
 *
 * It is hardened against itself:
 *   - Every listener callback is wrapped in try/catch so a buggy
 *     subscriber can never crash the observatory (or other subscribers).
 *   - A `maxCrashReports` guard caps in-memory storage at 500 entries
 *     (oldest dropped first) so a runaway loop cannot OOM the page.
 *   - Auto-submission to the server is debounced (2s) and de-duplicated
 *     (5s window per crash signature) so a burst of identical crashes
 *     produces at most one persisted report.
 *   - Submission success/failure is logged to `console` only — never to
 *     the observatory itself — to avoid recursion.
 *
 * The observatory is a module-level singleton: it lives outside React,
 * survives HMR, and is installed once per page load (installCrashObservatory()).
 */

'use client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CrashSeverity = 'info' | 'warn' | 'error' | 'fatal';
export type TransformEventType = 'apply' | 'commit' | 'rollback' | 'error';

export interface CrashReport {
  id: string;
  ts: number;
  severity: CrashSeverity;
  source: string;
  message: string;
  stack?: string;
  /** Optional structured payload (e.g. render-count, snapshot size). */
  context?: Record<string, unknown>;
  /** How many times this exact crash signature has been seen this session. */
  occurrences: number;
}

export interface TransformEvent {
  id: string;
  ts: number;
  eventType: TransformEventType;
  source: string;
  entityId?: number;
  field?: string;
  message: string;
  durationMs?: number;
}

export interface DiagnosticBundle {
  sessionId: string;
  uptimeMs: number;
  generatedAt: number;
  userAgent: string;
  url: string;
  crashCount: number;
  transformEventCount: number;
  crashes: CrashReport[];
  transformEvents: TransformEvent[];
  /** Render counts keyed by component name (from useRenderTracker). */
  renderCounts?: Record<string, number>;
}

export interface CrashListener {
  (report: CrashReport): void;
}
export interface TransformListener {
  (event: TransformEvent): void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hard cap on in-memory crash records. Oldest dropped when exceeded. */
const MAX_CRASH_REPORTS = 500;
/** Hard cap on in-memory transform-event records. */
const MAX_TRANSFORM_EVENTS = 200;
/** Dedup window: identical crashes within this many ms are merged, not re-submitted. */
const DEDUP_WINDOW_MS = 5_000;
/** Debounce before submitting a bundle to the server after a new crash. */
const SUBMIT_DEBOUNCE_MS = 2_000;
/** Ring buffer retention for the public UI (last N crashes). */
const PUBLIC_RING_SIZE = 100;

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

const crashes: CrashReport[] = [];
const transformEvents: TransformEvent[] = [];
const crashListeners = new Set<CrashListener>();
const transformListeners = new Set<TransformListener>();

/** Map of crash-signature -> last-seen timestamp (for dedup). */
const recentSignatures = new Map<string, number>();

let installed = false;
let installTime = 0;
let sessionId = '';

/** Pending debounce timer for auto-submit (NodeJS.Timeout in node, number in browser). */
let submitTimer: ReturnType<typeof setTimeout> | null = null;
/** Set of crash ids pending in the next submit (avoid double-submitting). */
const pendingSubmitIds = new Set<string>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  // crypto.randomUUID is available in modern browsers and Node 19+.
  // Fall back to timestamp + random for older runtimes.
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `crash-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function signatureOf(report: Omit<CrashReport, 'id' | 'ts' | 'occurrences'>): string {
  // Stack frames are noisy; rely on source + message for dedup.
  // Truncate the message so very long error strings don't blow up the key.
  const msg = report.message.slice(0, 200);
  return `${report.source}::${report.severity}::${msg}`;
}

function safeNotify<T extends (...args: never[]) => void>(
  listeners: Set<T>,
  ...args: Parameters<T>
): void {
  for (const fn of listeners) {
    try {
      fn(...args);
    } catch (err) {
      // A listener threw. We MUST NOT let this escape — that would
      // crash the observatory (and possibly the editor). Log to console
      // only (never recordCrash — recursion guard).
      console.error('[crash-observatory] listener threw:', err);
    }
  }
}

function pushCrash(report: CrashReport): void {
  crashes.push(report);
  // Enforce the cap. Array.shift is O(n) but only fires when over cap,
  // which is rare and bounded by MAX_CRASH_REPORTS.
  while (crashes.length > MAX_CRASH_REPORTS) {
    crashes.shift();
  }
}

function pushTransformEvent(event: TransformEvent): void {
  transformEvents.push(event);
  while (transformEvents.length > MAX_TRANSFORM_EVENTS) {
    transformEvents.shift();
  }
}

// ---------------------------------------------------------------------------
// Auto-submit (debounced + deduplicated)
// ---------------------------------------------------------------------------

/**
 * Build the full diagnostic bundle for submission or download.
 * Does NOT include the auto-submit bookkeeping fields.
 */
export function buildDiagnosticBundle(): DiagnosticBundle {
  // Pull render counts from the global injected by useRenderTracker.
  let renderCounts: Record<string, number> | undefined;
  try {
    const w = window as unknown as { __renderCounts?: Record<string, number> };
    if (w.__renderCounts && Object.keys(w.__renderCounts).length > 0) {
      renderCounts = { ...w.__renderCounts };
    }
  } catch {
    /* window not available (SSR) — skip */
  }

  return {
    sessionId: getSessionId(),
    uptimeMs: getUptime(),
    generatedAt: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    crashCount: crashes.length,
    transformEventCount: transformEvents.length,
    crashes: crashes.slice(),
    transformEvents: transformEvents.slice(),
    renderCounts,
  };
}

async function submitToServer(): Promise<void> {
  // Snapshot the pending ids, then clear the set so subsequent crashes
  // schedule a fresh submit.
  const idsToSubmit = Array.from(pendingSubmitIds);
  pendingSubmitIds.clear();

  // Build the bundle. We send the entire observatory state, not just the
  // pending ids — the server is the canonical store and may want the full
  // session context. (The persisted file is overwritten per session id
  // only by timestamp, so this is append-only on disk.)
  const bundle = buildDiagnosticBundle();

  try {
    const res = await fetch('/api/editor/crash-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle, crashIds: idsToSubmit }),
    });
    if (!res.ok) {
      console.error(
        `[crash-observatory] submit failed: HTTP ${res.status} ${res.statusText}`
      );
      return;
    }
    const data = (await res.json()) as { ok?: boolean; filename?: string };
    console.log(
      `[crash-observatory] submitted ${idsToSubmit.length} crash(es) → ${data.filename ?? 'unknown file'}`
    );
  } catch (err) {
    // Network error / route missing / JSON parse error. Log to console
    // ONLY — never recordCrash (recursion guard per the task spec).
    console.error('[crash-observatory] submit error:', err);
  }
}

function scheduleSubmit(): void {
  if (submitTimer !== null) {
    clearTimeout(submitTimer);
  }
  submitTimer = setTimeout(() => {
    submitTimer = null;
    void submitToServer();
  }, SUBMIT_DEBOUNCE_MS);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a crash. De-duplicates identical crashes within DEDUP_WINDOW_MS
 * (incrementing `occurrences` instead of pushing a new record) and
 * schedules a debounced server submission.
 */
export function recordCrash(
  report: Omit<CrashReport, 'id' | 'ts' | 'occurrences'>
): CrashReport {
  const sig = signatureOf(report);
  const now = Date.now();

  // Dedup: if we've seen this exact signature within the window, just
  // bump the last matching record's occurrence count and refresh its ts.
  const lastSeen = recentSignatures.get(sig);
  if (lastSeen !== undefined && now - lastSeen < DEDUP_WINDOW_MS) {
    // Find the most recent matching crash (search from the end — it's
    // almost certainly the last one).
    for (let i = crashes.length - 1; i >= 0; i--) {
      const c = crashes[i];
      if (
        c.source === report.source &&
        c.severity === report.severity &&
        c.message === report.message
      ) {
        c.occurrences += 1;
        c.ts = now;
        safeNotify(crashListeners, c);
        // Still schedule a submit so the server eventually sees the
        // updated occurrence count — but we do NOT add a new pending id.
        scheduleSubmit();
        return c;
      }
    }
    // Signature matched but the record was evicted (over the cap). Fall
    // through and create a fresh record.
  }
  recentSignatures.set(sig, now);

  const full: CrashReport = {
    ...report,
    id: generateId(),
    ts: now,
    occurrences: 1,
  };
  pushCrash(full);
  pendingSubmitIds.add(full.id);
  safeNotify(crashListeners, full);
  scheduleSubmit();
  return full;
}

/**
 * Record a transform-lifecycle event. These are NOT auto-submitted
 * individually (they are too frequent) — they ride along with crash
 * submissions in the diagnostic bundle.
 */
export function recordTransformEvent(
  event: Omit<TransformEvent, 'id' | 'ts'>
): TransformEvent {
  const full: TransformEvent = {
    ...event,
    id: generateId(),
    ts: Date.now(),
  };
  pushTransformEvent(full);
  safeNotify(transformListeners, full);
  return full;
}

/** Subscribe to new crash reports. Returns an unsubscribe function. */
export function subscribeToCrashes(fn: CrashListener): () => void {
  crashListeners.add(fn);
  return () => {
    crashListeners.delete(fn);
  };
}

/** Subscribe to new transform-lifecycle events. Returns an unsubscribe function. */
export function subscribeToTransforms(fn: TransformListener): () => void {
  transformListeners.add(fn);
  return () => {
    transformListeners.delete(fn);
  };
}

/** Read-only snapshot of the crash ring buffer (most recent first). */
export function getCrashes(limit = PUBLIC_RING_SIZE): CrashReport[] {
  return crashes.slice(-limit).reverse();
}

/** Read-only snapshot of recent transform events (most recent first). */
export function getTransformEvents(limit = 20): TransformEvent[] {
  return transformEvents.slice(-limit).reverse();
}

/** Total crash count this session (including deduped occurrences). */
export function getCrashCount(): number {
  return crashes.length;
}

/** Clear all in-memory crashes and transform events. */
export function clearAll(): void {
  crashes.length = 0;
  transformEvents.length = 0;
  recentSignatures.clear();
  pendingSubmitIds.clear();
}

/**
 * Force-submit the full diagnostic bundle to the server immediately
 * (bypassing the debounce). Returns the filename on success.
 */
export async function submitBundleNow(): Promise<string> {
  const bundle = buildDiagnosticBundle();
  try {
    const res = await fetch('/api/editor/crash-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle, crashIds: [] }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { ok?: boolean; filename?: string };
    return data.filename ?? 'unknown';
  } catch (err) {
    console.error('[crash-observatory] manual submit error:', err);
    throw err;
  }
}

/**
 * Return a stable session ID generated once per page load.
 * Survives React HMR (module-level singleton).
 */
export function getSessionId(): string {
  if (!sessionId) {
    sessionId = generateId();
  }
  return sessionId;
}

/**
 * Return milliseconds since the observatory was installed.
 * Returns 0 if not yet installed.
 */
export function getUptime(): number {
  if (!installed || installTime === 0) return 0;
  return Date.now() - installTime;
}

/** Whether installCrashObservatory() has run in this page load. */
export function isInstalled(): boolean {
  return installed;
}

// ---------------------------------------------------------------------------
// Installation: global error + unhandled-rejection handlers
// ---------------------------------------------------------------------------

/**
 * Install global crash handlers (window.onerror, unhandledrejection).
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * MUST be called from the client. The hook useCrashObservatory() wraps
 * this for React consumers.
 */
export function installCrashObservatory(): () => void {
  if (installed) {
    // Already installed in this page load. Return a no-op uninstaller
    // so React StrictMode double-invocation doesn't break callers.
    return () => {
      /* no-op */
    };
  }
  installed = true;
  installTime = Date.now();
  // Ensure session id is generated immediately so getUptime() base is stable.
  void getSessionId();

  // --- window.onerror: synchronous errors + resource load failures ---
  const onError = (
    event: ErrorEvent
  ): boolean => {
    try {
      recordCrash({
        severity: 'error',
        source: 'window.onerror',
        message: event.message || 'Unknown error',
        stack: event.error instanceof Error ? event.error.stack : undefined,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    } catch {
      /* observability must never throw */
    }
    // Return false so the default browser error reporting still fires.
    return false;
  };

  // --- unhandledrejection: unhandled promise rejections ---
  const onRejection = (event: PromiseRejectionEvent) => {
    try {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Unhandled promise rejection';
      recordCrash({
        severity: 'error',
        source: 'unhandledrejection',
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
        context: {
          reasonType: typeof reason,
        },
      });
    } catch {
      /* observability must never throw */
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    }
    if (submitTimer !== null) {
      clearTimeout(submitTimer);
      submitTimer = null;
    }
    // NOTE: we intentionally do NOT reset `installed` here. The observatory
    // is a session-scoped singleton; uninstalling listeners should not
    // re-enable crash capture on the next install (React StrictMode).
  };
}
