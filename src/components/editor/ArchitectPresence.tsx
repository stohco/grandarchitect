'use client';

/**
 * ArchitectPresence — floating orb (bottom-right of viewport) showing the
 * Grand Architect's status, plus a command palette (Ctrl+K / ⌘K) with
 * three modes: Chat, Actions, Lore.
 *
 *   - Chat: posts to /api/architect/interpret (reuses ArchitectPanel's wire)
 *   - Actions: quick world-mutation buttons (fork, step, spawn, weather)
 *   - Lore: searches the corpus via /api/architect/lore and lists excerpts
 *
 * Platform-aware hotkey label: ⌘K on Mac, Ctrl+K elsewhere.
 *
 * The orb pulses subtly when the Architect is "awake" and dims when
 * "connecting" or "idle". Click opens the palette; the same hotkey toggles.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  MessageSquare,
  Zap,
  BookOpen,
  Send,
  Loader2,
  X,
} from 'lucide-react';

type PaletteMode = 'chat' | 'actions' | 'lore';

interface LoreHit {
  file: string;
  query: string;
  excerpt: string;
}

interface ChatMsg {
  role: 'user' | 'architect';
  text: string;
  tools?: string[];
}

const ACTIONS: { label: string; prompt: string; intent: string }[] = [
  { label: 'Fork world', prompt: 'Create a temporary fork of this world so I can explore a what-if.', intent: 'fork' },
  { label: 'Spawn spirit shrine', prompt: 'Spawn a new spirit shrine near the lineage hall.', intent: 'spawn' },
  { label: 'Advance one tick', prompt: 'Advance the world clock by one tick.', intent: 'step' },
  { label: 'Spring rain over the bend', prompt: 'Set the weather to a steady spring rain over the bend.', intent: 'weather' },
  { label: 'Move selected entity', prompt: 'Move the currently selected structure to a more auspicious position.', intent: 'transform' },
];

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

export default function ArchitectPresence() {
  const presenceOpen = useEditorStore((s) => s.presenceOpen);
  const setPresenceOpen = useEditorStore((s) => s.setPresenceOpen);
  const togglePresence = useEditorStore((s) => s.togglePresence);
  const status = useEditorStore((s) => s.presenceStatus);
  const mood = useEditorStore((s) => s.presenceMood);
  const setPresenceStatus = useEditorStore((s) => s.setPresenceStatus);
  const setPresenceMood = useEditorStore((s) => s.setPresenceMood);

  const forkWorld = useEditorStore((s) => s.forkWorld);
  const step = useEditorStore((s) => s.step);
  const recordTransaction = useEditorStore((s) => s.recordTransaction);
  const currentBranchId = useEditorStore((s) => s.currentBranchId);

  const [mode, setMode] = useState<PaletteMode>('chat');
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [loreQuery, setLoreQuery] = useState('');
  const [loreHits, setLoreHits] = useState<LoreHit[]>([]);
  const [loreBusy, setLoreBusy] = useState(false);

  const mac = useMemo(() => isMac(), []);
  const hotkey = mac ? '⌘K' : 'Ctrl+K';

  // Global hotkey.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePresence();
      }
      if (e.key === 'Escape' && presenceOpen) {
        setPresenceOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePresence, setPresenceOpen, presenceOpen]);

  // Mark presence "awake" shortly after first mount.
  useEffect(() => {
    const t = setTimeout(() => setPresenceStatus('awake'), 1500);
    return () => clearTimeout(t);
  }, [setPresenceStatus]);

  // Mood cycles subtly while awake (purely cosmetic).
  useEffect(() => {
    if (!presenceOpen) return;
    const moods: typeof mood[] = ['calm', 'curious', 'amused', 'stern'];
    let i = moods.indexOf(mood);
    const t = setInterval(() => {
      i = (i + 1) % moods.length;
      setPresenceMood(moods[i]);
    }, 4000);
    return () => clearInterval(t);
  }, [presenceOpen, mood, setPresenceMood]);

  // --- Chat send (reuses /api/architect/interpret) ---
  const sendChat = useCallback(
    async (text: string) => {
      if (!text.trim() || chatBusy) return;
      setChat((m) => [...m, { role: 'user', text: text.trim() }]);
      setChatInput('');
      setChatBusy(true);
      try {
        const res = await fetch('/api/architect/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text.trim() }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { reply: string; toolsUsed: string[]; intent: string };
        setChat((m) => [...m, { role: 'architect', text: data.reply, tools: data.toolsUsed }]);
        recordTransaction({
          requestedBy: 'user',
          originalRequest: text.trim(),
          toolsUsed: data.toolsUsed,
          branchId: currentBranchId,
        });
        if (data.intent === 'fork') forkWorld();
        if (data.intent === 'step') void step();
      } catch {
        setChat((m) => [
          ...m,
          { role: 'architect', text: 'The thread between us is clouded. Try again.' },
        ]);
      } finally {
        setChatBusy(false);
      }
    },
    [chatBusy, recordTransaction, currentBranchId, forkWorld, step],
  );

  // --- Lore search ---
  useEffect(() => {
    if (mode !== 'lore') return;
    const q = loreQuery.trim();
    if (q.length < 2) {
      setLoreHits([]);
      return;
    }
    setLoreBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/architect/lore?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { hits: LoreHit[] };
        setLoreHits(data.hits);
      } catch {
        setLoreHits([]);
      } finally {
        setLoreBusy(false);
      }
    }, 250); // debounce
    return () => clearTimeout(t);
  }, [loreQuery, mode]);

  // --- Action runner ---
  const runAction = (a: (typeof ACTIONS)[number]) => {
    void sendChat(a.prompt);
  };

  const statusColor =
    status === 'awake' ? '#10b981' :
    status === 'busy' ? '#d4a04a' :
    status === 'idle' ? '#5a5a7a' :
    '#8888aa';

  return (
    <>
      {/* Floating orb */}
      <button
        onClick={togglePresence}
        title={`Architect Presence · ${hotkey}`}
        className="pointer-events-auto absolute bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[#2a2a4a] bg-[#12122a]/90 backdrop-blur-sm transition-transform hover:scale-105"
      >
        <span
          className="absolute inset-0 rounded-full opacity-40 animate-ping"
          style={{ background: statusColor, animationDuration: '2.5s' }}
        />
        <span
          className="relative h-7 w-7 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${statusColor}, ${statusColor}33 70%, transparent)`,
            boxShadow: `0 0 12px ${statusColor}88`,
          }}
        />
        <Sparkles className="absolute h-4 w-4 text-white/80" />
      </button>

      {/* Hotkey hint */}
      {!presenceOpen && (
        <div className="pointer-events-none absolute bottom-[68px] right-4 z-30 rounded border border-[#2a2a4a] bg-[#12122a]/90 px-2 py-1 text-[10px] text-[#8888aa] backdrop-blur-sm">
          Press <kbd className="font-mono text-emerald-400">{hotkey}</kbd> to summon
        </div>
      )}

      {/* Command palette */}
      <Dialog open={presenceOpen} onOpenChange={setPresenceOpen}>
        <DialogContent className="max-w-2xl gap-0 overflow-hidden border-[#2a2a4a] bg-[#12122a] p-0 text-[#c8c8e0]">
          <DialogHeader className="border-b border-[#2a2a4a] px-4 py-3">
            <DialogTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
                />
                Grand Architect · <span className="capitalize">{status}</span> · <span className="capitalize">{mood}</span>
              </span>
              <button
                onClick={() => setPresenceOpen(false)}
                className="text-[#5a5a7a] hover:text-[#c8c8e0]"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {/* Mode tabs */}
          <div className="flex border-b border-[#2a2a4a]">
            {([
              { id: 'chat', label: 'Chat', icon: <MessageSquare className="h-3.5 w-3.5" /> },
              { id: 'actions', label: 'Actions', icon: <Zap className="h-3.5 w-3.5" /> },
              { id: 'lore', label: 'Lore', icon: <BookOpen className="h-3.5 w-3.5" /> },
            ] as { id: PaletteMode; label: string; icon: React.ReactNode }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
                  mode === t.id
                    ? 'border-b-2 border-emerald-500 text-emerald-300'
                    : 'border-b-2 border-transparent text-[#8888aa] hover:text-[#c8c8e0]'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Mode body */}
          <div className="h-[420px] overflow-hidden">
            {mode === 'chat' && (
              <div className="flex h-full flex-col">
                <ScrollArea className="flex-1">
                  <div className="space-y-3 p-4">
                    {chat.length === 0 && (
                      <p className="px-1 text-xs text-[#5a5a7a]">
                        The Architect waits. Speak, and the world bends.
                      </p>
                    )}
                    {chat.map((m, i) => (
                      <div
                        key={i}
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'ml-auto bg-emerald-600/20 text-emerald-100'
                            : 'border border-[#2a2a4a] bg-[#0e0e24] text-[#c8c8e0]'
                        }`}
                      >
                        {m.text}
                        {m.tools && m.tools.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {m.tools.map((t) => (
                              <span key={t} className="rounded bg-[#2a2a4a] px-1 py-0.5 font-mono text-[9px] text-[#8888aa]">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {chatBusy && (
                      <div className="flex items-center gap-2 text-xs text-[#8888aa]">
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                        The Architect considers…
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendChat(chatInput);
                  }}
                  className="flex items-center gap-2 border-t border-[#2a2a4a] p-3"
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Speak to the Architect…"
                    autoFocus
                    className="h-8 border-[#2a2a4a] bg-[#0e0e24] text-xs text-[#c8c8e0] placeholder:text-[#5a5a7a]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={chatBusy || !chatInput.trim()}
                    className="h-8 bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            )}

            {mode === 'actions' && (
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 gap-1.5 p-4 sm:grid-cols-2">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => runAction(a)}
                      className="flex items-center gap-2 rounded-md border border-[#2a2a4a] bg-[#0e0e24] px-3 py-2 text-left text-xs text-[#c8c8e0] transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
                    >
                      <Zap className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="flex-1">{a.label}</span>
                    </button>
                  ))}
                </div>
                <p className="px-4 pb-4 text-[10px] text-[#5a5a7a]">
                  Each action routes through the Architect and is recorded as a transaction on the current branch.
                </p>
              </ScrollArea>
            )}

            {mode === 'lore' && (
              <div className="flex h-full flex-col">
                <div className="border-b border-[#2a2a4a] p-3">
                  <Input
                    value={loreQuery}
                    onChange={(e) => setLoreQuery(e.target.value)}
                    placeholder="Search the corpus & engine-architecture docs…"
                    className="h-8 border-[#2a2a4a] bg-[#0e0e24] text-xs text-[#c8c8e0] placeholder:text-[#5a5a7a]"
                  />
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-2 p-3">
                    {loreBusy && (
                      <div className="flex items-center gap-2 text-xs text-[#8888aa]">
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-500" /> Searching the archives…
                      </div>
                    )}
                    {!loreBusy && loreQuery.trim().length >= 2 && loreHits.length === 0 && (
                      <p className="px-1 text-xs text-[#5a5a7a]">No excerpts found.</p>
                    )}
                    {loreHits.map((h, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-[#2a2a4a] bg-[#0e0e24] p-2.5"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-emerald-400">{h.file}</span>
                          <span className="text-[9px] text-[#5a5a7a]">query: "{h.query}"</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-[#c8c8e0]">{h.excerpt}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
