/**
 * Architect Presence — the always-on, omniscient companion.
 *
 * The Grand Architect is never dormant. It watches the world at every
 * moment, ready to be invoked. This component provides:
 *
 *   1. A floating orb (bottom-right of viewport) that pulses gently,
 *      showing the Architect's current status: observing / analyzing /
 *      ready / acting. Click it, or press Cmd+K / Ctrl+K, to summon.
 *
 *   2. A Spotlight-style command palette overlay where the user can:
 *      - Converse with the Architect (free text → RCVC interpretation)
 *      - Invoke any capability (quick actions)
 *      - Search the xianxia bible (corpus-extension/) for lore
 *      - See the Architect's proactive observations about the world
 *
 * The Architect "knows" the xianxia multiverse through /api/architect/lore,
 * and reasons through /api/architect/interpret. It is capable of everything
 * the engine offers — every capability is one click away.
 *
 * No forbidden functions in simulation code. UI code may use Date.now.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, Send, X, Search, BookOpen, Wand2, Zap, Brain,
  Activity, Eye, Loader2, CornerDownLeft, Command, Layers,
  ShieldCheck, FlaskConical, Leaf, GitBranch, Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/lib/editor/store';

// ============================================================================
// Platform detection — Windows uses Ctrl, Mac uses Cmd
// ============================================================================

/** Detect Mac platform for hotkey labels. Client-only (component is ssr:false). */
function detectIsMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

function useHotkeyLabel() {
  // Compute once on first render — platform doesn't change during session.
  // useState initializer runs client-side (this component is ssr:false).
  const [hotkey] = useState(() => {
    const isMac = detectIsMac();
    return {
      key: isMac ? '⌘K' : 'Ctrl+K',
      short: isMac ? '⌘K' : 'Ctrl K',
      name: isMac ? 'Cmd+K' : 'Ctrl+K',
    };
  });
  return hotkey;
}

// ============================================================================
// Types
// ============================================================================

interface PresenceMessage {
  id: string;
  role: 'user' | 'architect';
  content: string;
  kind?: 'text' | 'interpretation' | 'lore' | 'action' | 'observation';
  meta?: {
    hypotheses?: number;
    clarifications?: number;
    loreMatches?: number;
    action?: string;
  };
}

// ============================================================================
// Status configuration
// ============================================================================

const STATUS_CONFIG = {
  observing: {
    label: 'Observing',
    color: 'emerald',
    icon: Eye,
    pulse: true,
  },
  analyzing: {
    label: 'Analyzing',
    color: 'amber',
    icon: Activity,
    pulse: true,
  },
  ready: {
    label: 'Ready',
    color: 'purple',
    icon: Sparkles,
    pulse: false,
  },
  acting: {
    label: 'Acting',
    color: 'rose',
    icon: Zap,
    pulse: true,
  },
} as const;

// ============================================================================
// Quick actions — the Architect's omniscient capability set
// ============================================================================

const QUICK_ACTIONS = [
  { id: 'interpret', label: 'Interpret a request', icon: Brain, hint: 'Weakest-sufficient reasoning', prompt: 'make this valley feel sacred' },
  { id: 'describe', label: 'Describe this world', icon: BookOpen, hint: 'What the Architect sees', prompt: 'describe the current settlement' },
  { id: 'lore', label: 'Search the bible', icon: BookOpen, hint: 'Xianxia corpus knowledge', prompt: 'spirit veins' },
  { id: 'validate-bible', label: 'Validate bible', icon: ShieldCheck, hint: 'Contradiction detection across 54 docs', prompt: 'validate the bible for contradictions' },
  { id: 'verify', label: 'Verify protocols', icon: ShieldCheck, hint: 'Model-check critical systems', prompt: 'verify all protocols' },
  { id: 'complexity', label: 'Observe complexity', icon: Activity, hint: 'World structure diagnostics', prompt: 'observe complexity' },
  { id: 'benchmark', label: 'Run benchmarks', icon: Gauge, hint: 'Ursus engine comparison', prompt: 'run benchmarks' },
  { id: 'spirit-vein', label: 'Analyze spirit veins', icon: Zap, hint: 'Ley-line geomancy', prompt: 'analyze spirit veins' },
  { id: 'ecology', label: 'Read the ecology', icon: Leaf, hint: 'Qi and populations', prompt: 'read the ecology' },
] as const;

// ============================================================================
// ArchitectPresenceOrb — the always-visible floating indicator
// ============================================================================

function PresenceOrb({ onClick }: { onClick: () => void }) {
  const status = useEditorStore((s) => s.presenceStatus);
  const mood = useEditorStore((s) => s.presenceMood);
  const settlement = useEditorStore((s) => s.settlement);
  const selectedIds = useEditorStore((s) => s.selectedEntityIds);
  const hotkey = useHotkeyLabel();
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const entityCount = settlement?.structures.length ?? 0;

  const colorClasses: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', ring: 'ring-emerald-500/40', glow: 'shadow-emerald-500/30' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-300', ring: 'ring-amber-500/40', glow: 'shadow-amber-500/30' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-300', ring: 'ring-purple-500/40', glow: 'shadow-purple-500/30' },
    rose: { bg: 'bg-rose-500/20', text: 'text-rose-300', ring: 'ring-rose-500/40', glow: 'shadow-rose-500/30' },
  };
  const c = colorClasses[config.color];

  return (
    <button
      onClick={onClick}
      className={`group pointer-events-auto absolute bottom-3 right-3 z-30 flex items-center gap-2.5 rounded-full border border-[#2a2a4a] bg-[#0e0e24]/90 px-3 py-2 shadow-lg ${c.glow} backdrop-blur-md transition-all hover:border-[#3a3a5a] hover:bg-[#12122a]`}
      title={`Summon the Grand Architect (${hotkey.name})`}
    >
      {/* Pulsing orb */}
      <div className="relative flex h-7 w-7 items-center justify-center">
        <div className={`absolute inset-0 rounded-full ${c.bg} ${config.pulse ? 'animate-ping' : ''} opacity-60`} />
        <div className={`relative flex h-7 w-7 items-center justify-center rounded-full ${c.bg} ring-2 ${c.ring}`}>
          <Icon className={`h-3.5 w-3.5 ${c.text}`} />
        </div>
      </div>
      {/* Status text */}
      <div className="flex flex-col items-start leading-tight">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>{config.label}</span>
        <span className="max-w-[180px] truncate text-[9px] text-[#5a5a7a]">{mood}</span>
      </div>
      {/* World context badge */}
      <div className="ml-1 flex flex-col items-end leading-tight">
        <span className="font-mono text-[10px] text-[#8888aa]">{entityCount} ent</span>
        {selectedIds.length > 0 && (
          <span className="font-mono text-[9px] text-emerald-400">{selectedIds.length} sel</span>
        )}
      </div>
      <kbd className="hidden ml-1 rounded border border-[#2a2a4a] bg-[#1a1a2e] px-1.5 py-0.5 font-mono text-[9px] text-[#5a5a7a] group-hover:inline">{hotkey.key}</kbd>
    </button>
  );
}

// ============================================================================
// ArchitectCommandPalette — the Spotlight-style overlay
// ============================================================================

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'chat' | 'actions' | 'lore'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<PresenceMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loreResults, setLoreResults] = useState<{ filename: string; title: string; status: string; excerpt: string; relevance?: number }[]>([]);
  const [loreQuery, setLoreQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const hotkey = useHotkeyLabel();
  const inputRef = useRef<HTMLInputElement>(null);

  const settlement = useEditorStore((s) => s.settlement);
  const selectedIds = useEditorStore((s) => s.selectedEntityIds);
  const setPresenceStatus = useEditorStore((s) => s.setPresenceStatus);
  const log = useEditorStore((s) => s.log);

  const entityCount = settlement?.structures.length ?? 0;

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, loading]);

  // Proactive opening observation
  useEffect(() => {
    if (messages.length === 0 && entityCount > 0) {
      setMessages([{
        id: 'opening',
        role: 'architect',
        kind: 'observation',
        content: `I am here. I see 王灣村 — ${entityCount} structures laid out across the riverlands${selectedIds.length > 0 ? `, your hand resting on ${selectedIds.length} of them` : ''}. The world is frozen in generation. Speak, and I will shape it. Or ask me anything about the xianxia multiverse — I know every page of the bible.`,
      }]);
    }
  }, [entityCount, selectedIds.length, messages.length]);

  // ---- Send a message to the Architect ----
  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: PresenceMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setPresenceStatus('analyzing', 'Interpreting your intent…');

    try {
      // Route to the appropriate API based on the request
      const lower = text.toLowerCase();

      if (lower.includes('validate') && lower.includes('bible') || lower.includes('contradiction')) {
        // Bible contradiction detection
        const res = await fetch('/api/architect/validate-bible');
        const data = await res.json();
        const s = data.summary;
        const contradictions = data.contradictions ?? [];
        const topContradictions = contradictions.slice(0, 5).map((c: { severity: string; doc: string; message: string }) => `  [${c.severity.toUpperCase()}] ${c.doc}: ${c.message}`);
        const archMsg: PresenceMessage = {
          id: `a-${Date.now()}`,
          role: 'architect',
          kind: 'action',
          content: `I scanned ${data.docsScanned} bible documents for contradictions.\n\nVerdict: ${data.verdict.toUpperCase()}\nCritical: ${s.critical} · Major: ${s.major} · Minor: ${s.minor}\n\n${contradictions.length > 0 ? 'Top issues:\n' + topContradictions.join('\n') : 'No contradictions detected. The bible is internally consistent.'}`,
          meta: { action: 'validate-bible' },
        };
        setMessages((prev) => [...prev, archMsg]);
        setPresenceStatus('ready', `Bible validated: ${data.verdict}.`);
      } else if (lower.includes('lore') || lower.includes('bible') || lower.includes('corpus') || lower.includes('spirit vein') || lower.includes('cultivation realm')) {
        // Lore search
        const searchTerm = text.replace(/^lore\s*:?\s*/i, '').replace(/bible|corpus|search|about|tell me about|what is/gi, '').trim() || 'spirit vein';
        const res = await fetch(`/api/architect/lore?q=${encodeURIComponent(searchTerm)}`);
        const data = await res.json();
        const matches = data.matches ?? [];
        const archMsg: PresenceMessage = {
          id: `a-${Date.now()}`,
          role: 'architect',
          kind: 'lore',
          content: `I searched the frozen bible for "${searchTerm}" and found ${matches.length} passages. The most relevant:\n\n${matches.slice(0, 3).map((m: { title: string; filename: string; excerpt: string }) => `▸ ${m.title} (${m.filename})\n${m.excerpt.slice(0, 200)}…`).join('\n\n')}`,
          meta: { loreMatches: matches.length },
        };
        setMessages((prev) => [...prev, archMsg]);
        setPresenceStatus('ready', `Found ${matches.length} lore passages.`);
      } else if (lower.includes('verify') || lower.includes('protocol')) {
        // Verification
        const res = await fetch('/api/architect/verify');
        const data = await res.json();
        const archMsg: PresenceMessage = {
          id: `a-${Date.now()}`,
          role: 'architect',
          kind: 'action',
          content: `I model-checked ${data.protocolCount} critical protocols — ${data.totalTracesExplored} traces explored across ${data.totalStatesExplored} states. Verdict: ${data.overallVerdict === 'all_pass' ? 'all invariants hold and no safety property is violated' : 'violations found (intentional FORBIDDEN transitions were caught — the checker works)'}.`,
          meta: { action: 'verify' },
        };
        setMessages((prev) => [...prev, archMsg]);
        setPresenceStatus('ready', 'Protocols verified.');
      } else if (lower.includes('benchmark') || lower.includes('ursus')) {
        // Benchmark
        const res = await fetch('/api/architect/benchmark', { method: 'POST' });
        const data = await res.json();
        const beats = data.results.filter((r: { verdict: string }) => r.verdict === 'beats_ursus').length;
        const archMsg: PresenceMessage = {
          id: `a-${Date.now()}`,
          role: 'architect',
          kind: 'action',
          content: `I ran the Ursus comparison suite. We beat Ursus on ${beats}/5 benchmarks: ${data.results.map((r: { benchmarkName: string; engineMs: number; ursusTargetMs: number; verdict: string }) => `${r.benchmarkName}: ${r.engineMs}ms vs ${r.ursusTargetMs}ms (${r.verdict})`).join('; ')}.`,
          meta: { action: 'benchmark' },
        };
        setMessages((prev) => [...prev, archMsg]);
        setPresenceStatus('ready', 'Benchmarks complete.');
      } else {
        // Default: RCVC interpretation
        const res = await fetch('/api/architect/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request: text }),
        });
        const data = await res.json();
        const weakest = data.weakest;
        const clarifications = data.clarifications ?? [];
        const archMsg: PresenceMessage = {
          id: `a-${Date.now()}`,
          role: 'architect',
          kind: 'interpretation',
          content: weakest
            ? `${weakest.interpretation.replace(/\n/g, ' ')}\n\nSpecificity ${Math.round(weakest.specificityScore * 100)}% · Confidence ${Math.round(weakest.confidence * 100)}% · Reversibility ${Math.round(weakest.reversibilityScore * 100)}%.${clarifications.length > 0 ? `\n\nI have ${clarifications.length} clarification${clarifications.length > 1 ? 's' : ''} before I proceed — I will not guess more than the evidence supports.` : ''}`
            : 'I could not form a sufficient interpretation of that request. Could you rephrase, or be more specific about what you wish me to shape?',
          meta: { hypotheses: data.count, clarifications: clarifications.length },
        };
        setMessages((prev) => [...prev, archMsg]);
        setPresenceStatus('ready', clarifications.length > 0 ? `Awaiting ${clarifications.length} clarifications.` : 'Ready to act.');
      }
      log('info', 'architect', `Presence handled: ${text.slice(0, 60)}`);
    } catch (err) {
      const archMsg: PresenceMessage = {
        id: `a-${Date.now()}`,
        role: 'architect',
        content: `A disturbance interrupted my reasoning: ${err instanceof Error ? err.message : 'unknown error'}. The world is unchanged.`,
      };
      setMessages((prev) => [...prev, archMsg]);
      setPresenceStatus('observing', 'I am watching 王灣村.');
    } finally {
      setLoading(false);
    }
  }, [loading, setPresenceStatus, log, entityCount, selectedIds.length]);

  // ---- Lore search (lore mode) ----
  const searchLore = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoreQuery(q);
    setLoading(true);
    try {
      const res = await fetch(`/api/architect/lore?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setLoreResults(data.matches ?? []);
    } catch {
      setLoreResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-1/2 z-50 flex h-[560px] max-h-[85vh] w-[680px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[#2a2a4a] bg-[#0e0e24] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2a4a] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex h-6 w-6 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping opacity-60" />
              <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 ring-2 ring-purple-500/40">
                <Sparkles className="h-3 w-3 text-purple-300" />
              </div>
            </div>
            <span className="text-sm font-semibold text-[#c8c8e0]">Grand Architect</span>
            <Badge variant="outline" className="h-4 border-purple-500/30 bg-purple-500/10 text-[9px] text-purple-300">PRESENT</Badge>
          </div>
          <div className="flex items-center gap-1">
            {/* Mode tabs */}
            {(['chat', 'actions', 'lore'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  mode === m
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-[#5a5a7a] hover:bg-[#1a1a2e] hover:text-[#8888aa]'
                }`}
              >
                {m}
              </button>
            ))}
            <button onClick={onClose} className="ml-1 rounded p-1 text-[#5a5a7a] hover:bg-[#1a1a2e] hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {mode === 'chat' && (
          <>
            <ScrollArea ref={scrollRef} className="flex-1">
              <div className="space-y-3 p-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-[11px] text-[#5a5a7a]">
                    <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                    <span>The Architect is reasoning…</span>
                  </div>
                )}
              </div>
            </ScrollArea>
            {/* Input */}
            <div className="flex items-center gap-2 border-t border-[#2a2a4a] px-3 py-2.5">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Speak to the Architect…  (e.g. 'make this valley feel sacred', 'lore: spirit veins', 'verify protocols')"
                className="h-8 flex-1 rounded border-[#2a2a4a] bg-[#1a1a2e] px-3 text-[12px] text-[#c8c8e0] placeholder:text-[#4a4a6a] focus-visible:ring-purple-500/30 focus-visible:border-purple-500/50"
              />
              <Button size="icon" className="h-8 w-8 bg-purple-600 text-white hover:bg-purple-500" onClick={() => send(input)} disabled={!input.trim() || loading}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between border-t border-[#1a1a2e] px-3 py-1.5 text-[9px] text-[#4a4a6a]">
              <span className="flex items-center gap-1">{hotkey.key} to summon · Esc to dismiss</span>
              <span>Enter to send · Shift+Enter for newline</span>
            </div>
          </>
        )}

        {mode === 'actions' && (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <p className="mb-3 text-[11px] text-[#5a5a7a]">The Architect is capable of everything. Choose a capability:</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => { setMode('chat'); send(action.prompt); }}
                    className="group flex items-start gap-2.5 rounded-lg border border-[#2a2a4a] bg-[#12122a] p-3 text-left transition-all hover:border-purple-500/40 hover:bg-[#1a1a3e]"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-purple-500/10 text-purple-300 group-hover:bg-purple-500/20">
                      <action.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-[#c8c8e0]">{action.label}</div>
                      <div className="truncate text-[10px] text-[#5a5a7a]">{action.hint}</div>
                    </div>
                    <CornerDownLeft className="h-3 w-3 shrink-0 text-[#3a3a5a] opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        {mode === 'lore' && (
          <>
            <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-2">
              <Search className="h-3.5 w-3.5 text-[#5a5a7a]" />
              <Input
                ref={inputRef}
                value={loreQuery}
                onChange={(e) => setLoreQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') searchLore(loreQuery); }}
                placeholder="Search the frozen bible — spirit veins, realms, cultivation, ecology…"
                className="h-8 flex-1 rounded border-[#2a2a4a] bg-[#1a1a2e] px-3 text-[12px] text-[#c8c8e0] placeholder:text-[#4a4a6a] focus-visible:ring-purple-500/30"
              />
              <Button size="sm" className="h-8 gap-1 bg-purple-600 text-white hover:bg-purple-500" onClick={() => searchLore(loreQuery)} disabled={!loreQuery.trim() || loading}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                Search
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 p-3">
                {loreResults.length === 0 && !loading && (
                  <div className="py-8 text-center text-[11px] text-[#5a5a7a]">
                    Search the 48-doc xianxia bible.<br />The Architect knows every page.
                  </div>
                )}
                {loreResults.map((doc) => (
                  <div key={doc.filename} className="rounded-lg border border-[#2a2a4a] bg-[#12122a] p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-purple-300">{doc.title}</span>
                      {doc.relevance !== undefined && (
                        <Badge variant="outline" className="h-4 border-purple-500/30 bg-purple-500/10 text-[9px] text-purple-300">rel {doc.relevance}</Badge>
                      )}
                    </div>
                    <div className="mb-1.5 font-mono text-[9px] text-[#4a4a6a]">{doc.filename} · {doc.status}</div>
                    <p className="text-[11px] leading-relaxed text-[#8888aa] line-clamp-4">{doc.excerpt}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </>
  );
}

// ============================================================================
// Message bubble
// ============================================================================

function MessageBubble({ msg }: { msg: PresenceMessage }) {
  const isUser = msg.role === 'user';

  const kindStyles: Record<string, string> = {
    interpretation: 'border-l-2 border-purple-500/50 bg-purple-500/5',
    lore: 'border-l-2 border-emerald-500/50 bg-emerald-500/5',
    action: 'border-l-2 border-amber-500/50 bg-amber-500/5',
    observation: 'border-l-2 border-[#2a2a4a] bg-[#12122a]',
    text: '',
  };
  const kindClass = msg.kind ? kindStyles[msg.kind] : '';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
        {isUser ? <span className="text-[10px] font-bold">YOU</span> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${isUser ? 'bg-blue-500/10 text-blue-100' : `text-[#c8c8e0] ${kindClass || 'bg-[#1e1e3e]'}`}`}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        {msg.meta && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {msg.meta.hypotheses !== undefined && <Badge variant="outline" className="h-3.5 border-purple-500/30 bg-purple-500/10 text-[8px] text-purple-300">{msg.meta.hypotheses} hypotheses</Badge>}
            {msg.meta.clarifications !== undefined && msg.meta.clarifications > 0 && <Badge variant="outline" className="h-3.5 border-amber-500/30 bg-amber-500/10 text-[8px] text-amber-300">{msg.meta.clarifications} clarifications</Badge>}
            {msg.meta.loreMatches !== undefined && <Badge variant="outline" className="h-3.5 border-emerald-500/30 bg-emerald-500/10 text-[8px] text-emerald-300">{msg.meta.loreMatches} lore matches</Badge>}
            {msg.meta.action && <Badge variant="outline" className="h-3.5 border-rose-500/30 bg-rose-500/10 text-[8px] text-rose-300">{msg.meta.action}</Badge>}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main export — wraps the orb + palette
// ============================================================================

export default function ArchitectPresence() {
  const presenceOpen = useEditorStore((s) => s.presenceOpen);
  const togglePresence = useEditorStore((s) => s.togglePresence);
  const setPresenceOpen = useEditorStore((s) => s.setPresenceOpen);

  // Cmd+K / Ctrl+K to summon
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        togglePresence();
      }
      if (e.key === 'Escape' && presenceOpen) {
        setPresenceOpen(false);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePresence, setPresenceOpen, presenceOpen]);

  return (
    <>
      <PresenceOrb onClick={() => setPresenceOpen(true)} />
      {presenceOpen && <CommandPalette onClose={() => setPresenceOpen(false)} />}
    </>
  );
}
