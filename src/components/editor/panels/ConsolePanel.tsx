'use client';

/**
 * ConsolePanel — filtered log list with auto-scroll and clear button.
 *
 * Lives in the bottom dock's Console tab. Reads from store.logs and applies
 * the store.consoleFilter.
 */

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { LogEntry, LogLevel } from '@/lib/editor/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Terminal } from 'lucide-react';

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: '#c8c8e0',
  warn: '#d4a04a',
  error: '#f472b6',
  debug: '#5a5a7a',
};

const LEVEL_BG: Record<LogLevel, string> = {
  info: 'transparent',
  warn: 'bg-amber-500/5',
  error: 'bg-rose-500/5',
  debug: 'transparent',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function Row({ entry }: { entry: LogEntry }) {
  return (
    <div className={`flex items-baseline gap-2 px-2 py-0.5 font-mono text-[11px] leading-5 ${LEVEL_BG[entry.level]}`}>
      <span className="shrink-0 text-[#5a5a7a]">{formatTime(entry.timestamp)}</span>
      <span
        className="shrink-0 w-12 uppercase"
        style={{ color: LEVEL_COLOR[entry.level] }}
      >
        {entry.level}
      </span>
      <span className="shrink-0 w-28 truncate text-[#8888aa]">{entry.source}</span>
      <span className="flex-1 break-words text-[#c8c8e0]">{entry.message}</span>
    </div>
  );
}

export default function ConsolePanel() {
  const logs = useEditorStore((s) => s.logs);
  const filter = useEditorStore((s) => s.consoleFilter);
  const clearLogs = useEditorStore((s) => s.clearLogs);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  // Auto-scroll to the bottom when new logs arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered.length]);

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      <div className="flex h-7 items-center justify-between border-b border-[#2a2a4a] px-2">
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
            Console · {filtered.length} {filter === 'all' ? 'rows' : filter}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={clearLogs}
          className="h-6 px-2 text-[10px] text-[#8888aa] hover:bg-[#1d1d36] hover:text-rose-300"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] text-[#5a5a7a]">No log entries.</p>
        ) : (
          filtered.map((e) => <Row key={e.id} entry={e} />)
        )}
      </div>
    </div>
  );
}
