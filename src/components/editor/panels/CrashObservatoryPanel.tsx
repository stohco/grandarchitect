/**
 * Live Architect Studio — Crash Observatory Panel
 *
 * Bottom-dock panel that surfaces the in-memory Crash Observatory:
 *   - Recent crashes (time / source / message, color-coded by severity)
 *   - Recent transform-lifecycle events (last 20)
 *   - "Clear all" — wipe the in-memory ring buffers
 *   - "Download full bundle" — save the diagnostic bundle as a local JSON file
 *   - "Submit to server" — POST the bundle to /api/editor/crash-report
 *
 * The panel installs the observatory on mount (so global error handlers
 * are live even before any crash is recorded) and subscribes to live
 * updates so the list refreshes without polling.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  Trash2,
  Download,
  UploadCloud,
  Activity,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  installCrashObservatory,
  recordCrash,
  recordTransformEvent,
  subscribeToCrashes,
  subscribeToTransforms,
  getCrashes,
  getTransformEvents,
  getCrashCount,
  clearAll,
  buildDiagnosticBundle,
  submitBundleNow,
  getSessionId,
  getUptime,
  type CrashReport,
  type TransformEvent,
  type CrashSeverity,
  type TransformEventType,
} from '@/lib/editor/crash-observatory';

// ---------------------------------------------------------------------------
// Severity / event-type styling
// ---------------------------------------------------------------------------

const SEVERITY_DOT: Record<CrashSeverity, string> = {
  info: 'bg-blue-400',
  warn: 'bg-amber-400',
  error: 'bg-red-400',
  fatal: 'bg-rose-500',
};

const SEVERITY_TEXT: Record<CrashSeverity, string> = {
  info: 'text-blue-300',
  warn: 'text-amber-300',
  error: 'text-red-300',
  fatal: 'text-rose-300',
};

const EVENT_COLOR: Record<TransformEventType, string> = {
  apply: 'text-emerald-300',
  commit: 'text-blue-300',
  rollback: 'text-amber-300',
  error: 'text-red-300',
};

const EVENT_BADGE: Record<TransformEventType, string> = {
  apply: 'bg-emerald-500/20 text-emerald-300',
  commit: 'bg-blue-500/20 text-blue-300',
  rollback: 'bg-amber-500/20 text-amber-300',
  error: 'bg-red-500/20 text-red-300',
};

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function CrashRow({ c }: { c: CrashReport }) {
  return (
    <div className="flex items-start gap-2 rounded px-2 py-0.5 font-mono text-[11px] leading-relaxed hover:bg-[#1a1a3e]">
      <span className="shrink-0 text-[10px] text-[#4a4a6a]">
        {formatTime(c.ts)}
      </span>
      <span
        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[c.severity]}`}
      />
      <span className="w-32 shrink-0 truncate text-[10px] text-[#5a5a7a]">
        [{c.source}]
      </span>
      <span className={`flex-1 ${SEVERITY_TEXT[c.severity]}`}>
        {c.message}
      </span>
      {c.occurrences > 1 && (
        <span className="shrink-0 rounded bg-[#2a2a4a] px-1 text-[9px] text-[#8888aa]">
          ×{c.occurrences}
        </span>
      )}
    </div>
  );
}

function TransformRow({ e }: { e: TransformEvent }) {
  return (
    <div className="flex items-start gap-2 rounded px-2 py-0.5 font-mono text-[11px] leading-relaxed hover:bg-[#1a1a3e]">
      <span className="shrink-0 text-[10px] text-[#4a4a6a]">
        {formatTime(e.ts)}
      </span>
      <span
        className={`w-14 shrink-0 rounded px-1 text-center text-[9px] font-bold uppercase ${EVENT_BADGE[e.eventType]}`}
      >
        {e.eventType}
      </span>
      <span className="w-28 shrink-0 truncate text-[10px] text-[#5a5a7a]">
        [{e.source}]
      </span>
      <span className={`flex-1 ${EVENT_COLOR[e.eventType]}`}>
        {e.message}
      </span>
      {e.durationMs !== undefined && (
        <span className="shrink-0 text-[9px] text-[#3a3a5a]">
          {e.durationMs}ms
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export default function CrashObservatoryPanel() {
  const [crashes, setCrashes] = useState<CrashReport[]>(() => getCrashes());
  const [events, setEvents] = useState<TransformEvent[]>(() =>
    getTransformEvents()
  );
  const [count, setCount] = useState<number>(() => getCrashCount());
  const [uptime, setUptime] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Install the observatory once for the whole editor, then subscribe.
  useEffect(() => {
    const uninstall = installCrashObservatory();
    const unsubCrashes = subscribeToCrashes(() => {
      setCrashes(getCrashes());
      setCount(getCrashCount());
    });
    const unsubTransforms = subscribeToTransforms(() => {
      setEvents(getTransformEvents());
    });

    // Tick uptime every second.
    const uptimeTimer = setInterval(() => {
      setUptime(getUptime());
    }, 1000);
    setUptime(getUptime());

    return () => {
      unsubCrashes();
      unsubTransforms();
      clearInterval(uptimeTimer);
      uninstall();
    };
  }, []);

  const handleClear = useCallback(() => {
    clearAll();
    setCrashes([]);
    setEvents([]);
    setCount(0);
  }, []);

  const handleDownload = useCallback(() => {
    try {
      const bundle = buildDiagnosticBundle();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crash-bundle-${getSessionId().slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[crash-observatory] download failed:', err);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const filename = await submitBundleNow();
      setLastSubmit(filename);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Submit failed (see console)'
      );
    } finally {
      setSubmitting(false);
    }
  }, []);

  // "Seed" button for dev: injects a synthetic crash so the panel can be
  // verified end-to-end without waiting for a real error. Hidden behind a
  // tooltip so end users won't trigger it accidentally.
  const handleSeed = useCallback(() => {
    recordCrash({
      severity: 'warn',
      source: 'crash-observatory-panel',
      message: `Synthetic crash ${count + 1} — panel self-test`,
    });
    recordTransformEvent({
      eventType: 'apply',
      source: 'crash-observatory-panel',
      message: 'Synthetic transform event — panel self-test',
      durationMs: Math.floor(Math.random() * 10),
    });
  }, [count]);

  return (
    <div className="flex h-full flex-col">
      {/* Header bar: stats + actions */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-2 py-1">
        <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8888aa]">
          Observatory
        </span>
        <Badge
          variant="outline"
          className="h-4 gap-1 border-[#2a2a4a] px-1 text-[9px] text-[#c8c8e0]"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${count > 0 ? 'bg-red-400' : 'bg-emerald-400'}`}
          />
          {count} crashes
        </Badge>
        <Badge
          variant="outline"
          className="h-4 gap-1 border-[#2a2a4a] px-1 text-[9px] text-[#5a5a7a]"
        >
          <Clock className="h-2.5 w-2.5" />
          {formatUptime(uptime)}
        </Badge>

        <div className="flex-1" />

        {submitError && (
          <span className="text-[9px] text-red-400">{submitError}</span>
        )}
        {lastSubmit && !submitError && (
          <span className="text-[9px] text-emerald-400">
            saved {lastSubmit}
          </span>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 gap-1 px-1.5 text-[9px] text-[#5a5a7a] hover:text-white"
              onClick={handleSeed}
            >
              <RefreshCw className="h-2.5 w-2.5" />
              Seed
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Inject a synthetic crash + transform event (dev self-test)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[#5a5a7a] hover:text-white"
              onClick={handleDownload}
            >
              <Download className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Download full diagnostic bundle as JSON
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-5 w-5 ${submitting ? 'text-amber-400' : 'text-[#5a5a7a]'} hover:text-white`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              <UploadCloud className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {submitting
              ? 'Submitting…'
              : 'Submit full diagnostic bundle to server'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[#5a5a7a] hover:text-red-400"
              onClick={handleClear}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Clear all in-memory crashes + events
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Two-column body: crashes | transform events */}
      <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden md:flex-row">
        <div className="flex min-h-0 flex-1 flex-col border-r border-[#2a2a4a]">
          <div className="flex items-center gap-1.5 border-b border-[#2a2a4a] px-2 py-0.5">
            <ShieldAlert className="h-2.5 w-2.5 text-red-400" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8888aa]">
              Recent Crashes
            </span>
            <span className="ml-auto text-[9px] text-[#4a4a6a]">
              {crashes.length}
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="max-h-96 overflow-y-auto px-0.5 py-0.5">
              {crashes.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center text-[11px] text-[#5a5a7a]">
                  <ShieldAlert className="h-5 w-5 text-emerald-500/40" />
                  <span>No crashes recorded.</span>
                  <span className="text-[9px] text-[#3a3a5a]">
                    The observatory is watching.
                  </span>
                </div>
              ) : (
                crashes.map((c) => <CrashRow key={c.id} c={c} />)
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5 border-b border-[#2a2a4a] px-2 py-0.5">
            <Activity className="h-2.5 w-2.5 text-emerald-400" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8888aa]">
              Transform Events
            </span>
            <span className="ml-auto text-[9px] text-[#4a4a6a]">
              {events.length}
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="max-h-96 overflow-y-auto px-0.5 py-0.5">
              {events.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center text-[11px] text-[#5a5a7a]">
                  <Activity className="h-5 w-5 text-[#3a3a5a]" />
                  <span>No transform events yet.</span>
                  <span className="text-[9px] text-[#3a3a5a]">
                    Edit an entity to populate this list.
                  </span>
                </div>
              ) : (
                events.map((e) => <TransformRow key={e.id} e={e} />)
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
