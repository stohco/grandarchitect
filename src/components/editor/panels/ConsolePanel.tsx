/**
 * Live Architect Studio — Console Panel
 *
 * Log viewer with level-based filtering, coloring, and smart auto-scroll.
 *
 * Smart auto-scroll behaviour:
 *   - If the user is already near the bottom (within 50px), new logs
 *     auto-scroll to keep the latest visible.
 *   - If the user has scrolled up to read history, the view is NOT yanked
 *     down — instead a floating "Jump to bottom" button appears.
 */

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Trash2, ChevronDown, TerminalSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/lib/editor/store';
import { dispatchAction } from '@/lib/studio-ui/action-dispatch';
import type { LogEntry, LogLevel } from '@/lib/editor/types';

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: 'text-blue-400', success: 'text-emerald-400', warn: 'text-amber-400',
  error: 'text-red-400', debug: 'text-zinc-500', architect: 'text-purple-400',
};

const LEVEL_BG: Record<LogLevel, string> = {
  info: 'bg-blue-500/10 border-blue-500/20', success: 'bg-emerald-500/10 border-emerald-500/20',
  warn: 'bg-amber-500/10 border-amber-500/20', error: 'bg-red-500/10 border-red-500/20',
  debug: 'bg-zinc-500/10 border-zinc-500/20', architect: 'bg-purple-500/10 border-purple-500/20',
};

const LEVEL_BADGE_COLORS: Record<LogLevel, string> = {
  info: 'bg-blue-500/20 text-blue-300', success: 'bg-emerald-500/20 text-emerald-300',
  warn: 'bg-amber-500/20 text-amber-300', error: 'bg-red-500/20 text-red-300',
  debug: 'bg-zinc-500/20 text-zinc-400', architect: 'bg-purple-500/20 text-purple-300',
};

const ALL_LEVELS: (LogLevel | 'all')[] = ['all', 'info', 'success', 'warn', 'error', 'debug', 'architect'];

/** Distance from the bottom (in px) below which we consider the user "near the bottom". */
const NEAR_BOTTOM_PX = 50;

export default function ConsolePanel() {
  const logs = useEditorStore((s) => s.logs);
  const consoleFilter = useEditorStore((s) => s.consoleFilter);
  const setConsoleFilter = useEditorStore((s) => s.setConsoleFilter);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  /** Find the radix scroll-area viewport inside our ScrollArea. */
  const getViewport = useCallback((): HTMLElement | null => {
    if (!scrollRef.current) return null;
    return scrollRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: logs.length };
    for (const log of logs) { c[log.level] = (c[log.level] ?? 0) + 1; }
    return c;
  }, [logs]);

  const filtered = useMemo(() => {
    if (consoleFilter === 'all') return logs;
    return logs.filter((l) => l.level === consoleFilter);
  }, [logs, consoleFilter]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  };

  /** Attach a scroll listener to the radix viewport (lazily, once we have a ref). */
  useEffect(() => {
    const vp = getViewport();
    if (!vp) return;

    const onScroll = () => {
      const distanceFromBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
      setIsNearBottom(distanceFromBottom <= NEAR_BOTTOM_PX);
    };
    vp.addEventListener('scroll', onScroll, { passive: true });
    // Initialise state on next tick so we don't trigger a synchronous
    // setState-in-effect cascading render.
    const initRaf = requestAnimationFrame(onScroll);
    return () => {
      vp.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(initRaf);
    };
  }, [getViewport]);

  // Auto-scroll to bottom only when the user is already near the bottom.
  useEffect(() => {
    if (!isNearBottom) return;
    const vp = getViewport();
    if (!vp) return;
    // Use requestAnimationFrame so layout has settled after the new log row
    // was committed before we measure scrollHeight.
    const raf = requestAnimationFrame(() => {
      vp.scrollTop = vp.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [logs.length, filtered.length, isNearBottom, getViewport]);

  const jumpToBottom = useCallback(() => {
    const vp = getViewport();
    if (vp) {
      vp.scrollTop = vp.scrollHeight;
      setIsNearBottom(true);
    }
  }, [getViewport]);

  return (
    <div className="flex h-full flex-col">
      {/* Header — consistent with other dock panels. */}
      <div className="flex h-8 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <TerminalSquare className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Console</span>
        <span className="text-[10px] text-[#5a5a7a]">{logs.length}</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" aria-label="Clear logs" className="h-5 w-5 text-[#5a5a7a] hover:text-white" onClick={() => void dispatchAction('diagnostics.clearLogs')}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Level filter row. */}
      <div className="flex items-center gap-1 border-b border-[#2a2a4a] px-2 py-1">
        {ALL_LEVELS.map((level) => (
          <button key={level}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${consoleFilter === level ? 'bg-[#2a2a5a] text-emerald-300' : 'text-[#5a5a7a] hover:bg-[#1e1e3e] hover:text-[#8888aa]'}`}
            onClick={() => setConsoleFilter(level)}
            aria-pressed={consoleFilter === level}>
            {level.toUpperCase().slice(0, 4)}
            {(counts[level] ?? 0) > 0 && <span className="text-[9px] opacity-60">{counts[level]}</span>}
          </button>
        ))}
      </div>

      {/* Log body — relative wrapper so the jump button can float. */}
      <div className="relative min-h-0 flex-1">
        <ScrollArea ref={scrollRef} className="h-full">
          <div className="px-1 py-0.5">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-[#5a5a7a]">{logs.length === 0 ? 'No logs yet.' : 'No matching logs.'}</div>
            ) : (
              filtered.map((log) => (
                <div key={log.id} className={`flex items-start gap-2 rounded px-2 py-0.5 font-mono text-[11px] leading-relaxed ${LEVEL_BG[log.level]} border border-transparent`}>
                  <span className="shrink-0 text-[10px] text-[#4a4a6a]">{formatTime(log.ts)}</span>
                  <span className={`w-9 shrink-0 rounded px-1 py-px text-center text-[9px] font-bold uppercase ${LEVEL_BADGE_COLORS[log.level]}`}>{log.level.slice(0, 4)}</span>
                  <span className="w-24 shrink-0 truncate text-[10px] text-[#5a5a7a]">[{log.source}]</span>
                  <span className={`flex-1 ${LEVEL_COLORS[log.level]}`}>{log.message}</span>
                  <span className="shrink-0 text-[9px] text-[#3a3a5a]">t{log.tick}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Floating "Jump to bottom" button — appears only when scrolled up. */}
        {!isNearBottom && (
          <Button
            variant="secondary"
            size="sm"
            onClick={jumpToBottom}
            aria-label="Jump to most recent log"
            className="absolute bottom-2 left-1/2 z-10 h-6 -translate-x-1/2 gap-1 rounded-full border border-[#2a2a4a] bg-[#1e1e3e] px-3 text-[10px] text-[#c8c8e0] shadow-lg hover:text-white"
          >
            <ChevronDown className="h-3 w-3" />
            Jump to bottom
          </Button>
        )}
      </div>
    </div>
  );
}
