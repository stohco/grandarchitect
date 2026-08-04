'use client';

/**
 * ArchitectPanel — chat with the Grand Architect.
 *
 * Posts to /api/architect/interpret; falls back to a "connecting…" state if
 * the API is unreachable. Quick action buttons send canned intents. Records
 * every exchange as a transaction in the store.
 */

import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'architect';
  text: string;
  tools?: string[];
  ts: number;
}

const QUICK_ACTIONS = [
  { label: 'Fork world', prompt: 'Create a temporary fork of this world so I can explore a what-if.' },
  { label: 'Spawn shrine', prompt: 'Spawn a new spirit shrine near the lineage hall.' },
  { label: 'Advance tick', prompt: 'Advance the world clock by one tick.' },
  { label: 'Bend the sky', prompt: 'Set the weather to a steady spring rain over the bend.' },
];

export default function ArchitectPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const recordTransaction = useEditorStore((s) => s.recordTransaction);
  const log = useEditorStore((s) => s.log);
  const forkWorld = useEditorStore((s) => s.forkWorld);
  const step = useEditorStore((s) => s.step);
  const currentBranchId = useEditorStore((s) => s.currentBranchId);

  const seed = useEditorStore((s) => s.seedInput);
  const tick = useEditorStore((s) => s.frozenTick);

  // Greet on first mount.
  useEffect(() => {
    setMessages([
      {
        id: 'greet',
        role: 'architect',
        text: 'I am the Grand Architect. I shaped these mountains before the Wangs were a surname. Speak, and I will shape.',
        ts: Date.now(),
      },
    ]);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: text.trim(),
      ts: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/architect/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          context: { seed, tick },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { reply: string; toolsUsed: string[]; intent: string };
      const archMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'architect',
        text: data.reply,
        tools: data.toolsUsed,
        ts: Date.now(),
      };
      setMessages((m) => [...m, archMsg]);
      recordTransaction({
        requestedBy: 'user',
        originalRequest: userMsg.text,
        toolsUsed: data.toolsUsed,
        branchId: currentBranchId,
      });

      // Side-effects for known intents.
      if (data.intent === 'fork') forkWorld();
      if (data.intent === 'step') void step();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setMessages((m) => [
        ...m,
        {
          id: `e_${Date.now()}`,
          role: 'architect',
          text: 'My voice cannot reach the kernel right now — the path between us is clouded. Try again in a moment.',
          ts: Date.now(),
        },
      ]);
      log('warn', 'architect', `Interpret failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-emerald-600/20 text-emerald-100'
                    : 'border border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]'
                }`}
              >
                {m.role === 'architect' && (
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400/70">
                    <Sparkles className="h-3 w-3" /> Architect
                  </div>
                )}
                <p>{m.text}</p>
                {m.tools && m.tools.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {m.tools.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-[#2a2a4a] px-1.5 py-0.5 font-mono text-[9px] text-[#8888aa]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-lg border border-[#2a2a4a] bg-[#12122a] px-3 py-2 text-xs text-[#8888aa]">
                <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                The Architect considers…
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-t border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-[11px] text-rose-300">
          <AlertCircle className="h-3 w-3" /> {error}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5 border-t border-[#2a2a4a] px-3 py-2">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.label}
            disabled={busy}
            onClick={() => void send(qa.prompt)}
            className="rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-1 text-[10px] text-[#8888aa] transition-colors hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-40"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-[#2a2a4a] p-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Speak to the Architect…"
          className="h-8 border-[#2a2a4a] bg-[#12122a] text-xs text-[#c8c8e0] placeholder:text-[#5a5a7a]"
        />
        <Button
          type="submit"
          size="sm"
          disabled={busy || !input.trim()}
          className="h-8 bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
