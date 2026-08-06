/**
 * Live Architect Studio — Architect AI Chat Panel
 *
 * Simulated AI chat with quick action buttons.
 * Messages stored in local state, not the store.
 */

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, User, Loader2, Zap, BookOpen, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/lib/editor/store';

/** Detect Mac vs Windows/Linux for hotkey labels. Client-only (component is ssr:false). */
function useHotkeyLabel() {
  const [label] = useState(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    return isMac ? '⌘K' : 'Ctrl+K';
  });
  return label;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'architect';
  content: string;
  kind?: 'interpretation' | 'lore' | 'text';
  meta?: { hypotheses?: number; clarifications?: number; loreMatches?: number };
}

let msgCounter = 0;

export default function ArchitectPanel() {
  const capabilities = useEditorStore((s) => s.capabilities);
  const setPresenceOpen = useEditorStore((s) => s.setPresenceOpen);
  const hotkey = useHotkeyLabel();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, typing]);

  const send = async (text: string) => {
    if (!text.trim() || typing) return;
    const userMsg: ChatMessage = { id: `msg-${++msgCounter}`, role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const lower = text.toLowerCase();
      let archMsg: ChatMessage;

      // World inspection — detect when user asks about structures, clipping, etc.
      if (lower.includes('clip') || lower.includes('overlap') || lower.includes('overlap') ||
          lower.includes('building') && (lower.includes('into') || lower.includes('each other')) ||
          lower.includes('structure') && (lower.includes('problem') || lower.includes('issue') || lower.includes('wrong')) ||
          lower.includes('why are') && (lower.includes('building') || lower.includes('structure'))) {
        archMsg = inspectWorldForClipping();
      }
      // Settlement description
      else if (lower.includes('describe') || lower.includes('settlement') || lower.includes('village') || lower.includes('what is here')) {
        archMsg = describeSettlement();
      }
      // Capabilities / help
      else if (lower.includes('what can you') || lower.includes('help') || lower.includes('capabilit') || lower.includes('what do you do')) {
        archMsg = describeCapabilities();
      }
      // Lore search
      else if (lower.includes('lore') || lower.includes('bible') || lower.includes('spirit vein') || lower.includes('cultivation realm')) {
        const term = text.replace(/^lore\s*:?\s*/i, '').replace(/bible|corpus|search|about|tell me about|what is/gi, '').trim() || 'spirit vein';
        const res = await fetch(`/api/architect/lore?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        const matches = data.matches ?? [];
        archMsg = {
          id: `msg-${++msgCounter}`,
          role: 'architect',
          kind: 'lore',
          content: `I searched the frozen bible for "${term}" — ${matches.length} passages found.\n\n${matches.slice(0, 3).map((m: { title: string; filename: string; excerpt: string }) => `▸ ${m.title} (${m.filename})\n${m.excerpt.slice(0, 180)}…`).join('\n\n')}`,
          meta: { loreMatches: matches.length },
        };
      }
      // Sacred / ancient transformation
      else if (lower.includes('sacred') || lower.includes('ancient') || lower.includes('weather') || lower.includes('make this')) {
        const selected = useEditorStore.getState().selectedEntityIds;
        if (selected.length > 0) {
          archMsg = {
            id: `msg-${++msgCounter}`,
            role: 'architect',
            kind: 'interpretation',
            content: `I can transform the selected structure. Click "Make Ancient & Sacred" in the Authorial Action bar above, or I can apply it now.\n\nI will:\n• Apply weathered stone palette (gray, roughness 0.92)\n• Add moss and fracture weathering\n• Set restrained ornamentation\n• Record a narrative promise\n\nShall I proceed?`,
          };
        } else {
          archMsg = {
            id: `msg-${++msgCounter}`,
            role: 'architect',
            kind: 'interpretation',
            content: `Select a structure in the viewport first, then I can make it ancient and sacred. I will apply weathering, restrained ornamentation, and the sacred palette.`,
          };
        }
      }
      // Default: RCVC interpretation
      else {
        const res = await fetch('/api/architect/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request: text }),
        });
        const data = await res.json();
        const weakest = data.weakest;
        const clarifications = data.clarifications ?? [];
        archMsg = {
          id: `msg-${++msgCounter}`,
          role: 'architect',
          kind: 'interpretation',
          content: weakest
            ? `${weakest.interpretation.replace(/\n/g, ' ')}\nSpecificity ${Math.round(weakest.specificityScore * 100)}% · Confidence ${Math.round(weakest.confidence * 100)}%.${clarifications.length > 0 ? `\n${clarifications.length} clarification(s) pending — I will not guess more than the evidence supports.` : ''}`
            : 'I could not form a sufficient interpretation. Could you rephrase?\n\nI can help with: structure clipping, settlement description, lore search, sacred transformations, or interpreting your requests.',
          meta: { hypotheses: data.count, clarifications: clarifications.length },
        };
      }
      setMessages((prev) => [...prev, archMsg]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: `msg-${++msgCounter}`,
        role: 'architect',
        content: `A disturbance interrupted my reasoning: ${err instanceof Error ? err.message : 'unknown'}.`,
      }]);
    } finally {
      setTyping(false);
    }
  };

  /** Inspect the world for structure clipping/overlapping. */
  function inspectWorldForClipping(): ChatMessage {
    const settlement = useEditorStore.getState().settlement;
    if (!settlement) {
      return {
        id: `msg-${++msgCounter}`,
        role: 'architect',
        kind: 'interpretation',
        content: 'No settlement is loaded. Generate a world first.',
      };
    }

    const structures = settlement.structures;
    const overlaps: Array<{ a: string; b: string; aId: number; bId: number; overlap: number }> = [];

    // Check all pairs for bounding-box overlap.
    for (let i = 0; i < structures.length; i++) {
      for (let j = i + 1; j < structures.length; j++) {
        const a = structures[i]!;
        const b = structures[j]!;
        // Skip flat structures (paths, paddies, etc.)
        if (a.kind === 'path' || a.kind === 'paddy' || a.kind === 'dryland_garden' || a.kind === 'threshing_ground') continue;
        if (b.kind === 'path' || b.kind === 'paddy' || b.kind === 'dryland_garden' || b.kind === 'threshing_ground') continue;

        const aHalfW = a.width / 2;
        const aHalfD = a.depth / 2;
        const bHalfW = b.width / 2;
        const bHalfD = b.depth / 2;

        const dx = Math.abs(a.position.x - b.position.x);
        const dz = Math.abs(a.position.z - b.position.z);

        const overlapX = (aHalfW + bHalfW) - dx;
        const overlapZ = (aHalfD + bHalfD) - dz;

        if (overlapX > 0.1 && overlapZ > 0.1) {
          const overlapArea = overlapX * overlapZ;
          overlaps.push({
            a: a.name,
            b: b.name,
            aId: a.entityId,
            bId: b.entityId,
            overlap: overlapArea,
          });
        }
      }
    }

    if (overlaps.length === 0) {
      return {
        id: `msg-${++msgCounter}`,
        role: 'architect',
        kind: 'interpretation',
        content: `I inspected all ${structures.length} structures in ${settlement.villageName}. No significant clipping detected — structures are properly spaced.`,
      };
    }

    // Sort by overlap area (largest first)
    overlaps.sort((a, b) => b.overlap - a.overlap);

    const lines = overlaps.slice(0, 8).map((o, i) => {
      return `${i + 1}. "${o.a}" (#${o.aId}) overlaps "${o.b}" (#${o.bId}) — ${o.overlap.toFixed(1)}m² intersection`;
    });

    return {
      id: `msg-${++msgCounter}`,
      role: 'architect',
      kind: 'interpretation',
      content: `I found ${overlaps.length} structure(s) clipping into each other in ${settlement.villageName}:\n\n${lines.join('\n')}\n\nI can fix this. Select a structure in the viewport and I can move it, or I can suggest new positions. The generation algorithm places structures by kind-group without collision checking — this is a known limitation I can address by:\n• Spreading overlapping structures apart\n• Resizing to fit available space\n• Relocating to nearby valid positions\n\nWould you like me to fix specific overlaps?`,
    };
  }

  /** Describe the current settlement. */
  function describeSettlement(): ChatMessage {
    const settlement = useEditorStore.getState().settlement;
    if (!settlement) {
      return {
        id: `msg-${++msgCounter}`,
        role: 'architect',
        kind: 'interpretation',
        content: 'No settlement is loaded.',
      };
    }

    const byKind: Record<string, number> = {};
    for (const s of settlement.structures) {
      byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
    }

    const kindList = Object.entries(byKind)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    return {
      id: `msg-${++msgCounter}`,
      role: 'architect',
      kind: 'lore',
      content: `${settlement.villageName} (${settlement.villageNameHanzi})\n\nPopulation: ${settlement.population} · Households: ${settlement.householdCount} · Structures: ${settlement.structures.length} · Tick: ${settlement.tick}\n\nStructure census: ${kindList}\n\nI can inspect for clipping, search lore, or transform any structure. Select one and ask me to make it ancient and sacred.`,
    };
  }

  /** Describe architect capabilities. */
  function describeCapabilities(): ChatMessage {
    return {
      id: `msg-${++msgCounter}`,
      role: 'architect',
      kind: 'interpretation',
      content: `I am the Grand Architect. Here is what I can do:\n\n• Inspect structures — ask "why are buildings clipping" and I will detect overlaps\n• Describe settlement — ask "describe the village" for a census\n• Make sacred — select a structure, then I apply weathering, restraint, and sacred palette\n• Search lore — ask "lore: spirit veins" to search the frozen bible\n• Interpret requests — describe what you want and I will reason about it\n• Run authorial slice — the 13-stage UnboundLoop transforms structures with canon/style enforcement\n\nI can also: move structures (via transform gizmo), apply visual overrides, record narrative promises, and persist decisions that affect future requests.`,
    };
  }

  const quickActions = [
    { label: 'Inspect', icon: Zap, prompt: 'why are buildings clipping into each other' },
    { label: 'Describe', icon: BookOpen, prompt: 'describe the current settlement' },
    { label: 'Make sacred', icon: Zap, prompt: 'make this sacred' },
    { label: 'Help', icon: BookOpen, prompt: 'what can you do' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-8 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <div className="relative flex h-4 w-4 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping opacity-60" />
          <Sparkles className="relative h-3.5 w-3.5 text-purple-400" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Grand Architect</span>
        <Badge variant="outline" className="h-4 border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-300">PRESENT</Badge>
        {capabilities.length > 0 && (
          <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-purple-300">{capabilities.length} caps</Badge>
        )}
        <Button variant="ghost" size="sm" className="ml-auto h-5 gap-1 px-1.5 text-[9px] text-[#5a5a7a] hover:text-purple-300" onClick={() => setPresenceOpen(true)}>
          {hotkey}
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-[#2a2a4a] px-2 py-1.5">
        {quickActions.map((action) => (
          <Button key={action.label} variant="ghost" size="sm"
            className="h-6 gap-1 rounded border border-[#2a2a4a] px-2 text-[10px] text-[#8888aa] hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-300"
            onClick={() => send(action.prompt)}>
            <action.icon className="h-3 w-3" />
            {action.label}
          </Button>
        ))}
      </div>

      <ScrollArea ref={scrollRef} className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {messages.length === 0 && !typing && (
            <div className="py-6 text-center text-[11px] text-[#5a5a7a]">
              The Grand Architect is present and watching.<br />
              <span className="text-[10px]">Speak, or press <kbd className="rounded border border-[#2a2a4a] bg-[#1a1a2e] px-1 font-mono text-[9px]">{hotkey}</kbd> for the full command palette.</span>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {msg.role === 'user' ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              </div>
              <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-[11px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-500/10 text-blue-200'
                  : msg.kind === 'interpretation'
                    ? 'border-l-2 border-purple-500/50 bg-purple-500/5 text-[#c8c8e0]'
                    : msg.kind === 'lore'
                      ? 'border-l-2 border-emerald-500/50 bg-emerald-500/5 text-[#c8c8e0]'
                      : 'bg-[#1e1e3e] text-[#c8c8e0]'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.meta && (msg.meta.hypotheses || msg.meta.clarifications || msg.meta.loreMatches) && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {msg.meta.hypotheses !== undefined && <span className="rounded bg-purple-500/10 px-1 text-[9px] text-purple-300">{msg.meta.hypotheses} hyp</span>}
                    {msg.meta.clarifications !== undefined && msg.meta.clarifications > 0 && <span className="rounded bg-amber-500/10 px-1 text-[9px] text-amber-300">{msg.meta.clarifications} clarify</span>}
                    {msg.meta.loreMatches !== undefined && <span className="rounded bg-emerald-500/10 px-1 text-[9px] text-emerald-300">{msg.meta.loreMatches} lore</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                <Sparkles className="h-3 w-3" />
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-[#1e1e3e] px-3 py-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                <span className="text-[11px] text-[#5a5a7a]">The Architect is reasoning…</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex shrink-0 items-center gap-2 border-t border-[#2a2a4a] px-2 py-1.5">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
          placeholder="Speak to the Architect… (e.g. 'make this valley feel sacred')"
          className="h-7 flex-1 rounded border-[#2a2a4a] bg-[#1a1a2e] px-2 font-mono text-[11px] text-[#c8c8e0] placeholder:text-[#4a4a6a] focus-visible:ring-purple-500/30 focus-visible:border-purple-500/50" />
        <Button size="icon" className="h-7 w-7 bg-purple-600 text-white hover:bg-purple-500" onClick={() => send(input)} disabled={!input.trim() || typing}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
