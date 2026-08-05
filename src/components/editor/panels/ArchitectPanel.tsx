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

      if (lower.includes('lore') || lower.includes('bible') || lower.includes('spirit vein') || lower.includes('cultivation realm')) {
        // Lore search
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
      } else {
        // RCVC interpretation
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
            : 'I could not form a sufficient interpretation. Could you rephrase?',
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

  const quickActions = [
    { label: 'Make sacred', icon: Zap, prompt: 'make this valley feel sacred' },
    { label: 'Describe', icon: BookOpen, prompt: 'describe the current settlement' },
    { label: 'Spirit veins', icon: BookOpen, prompt: 'lore: spirit veins' },
    { label: 'Ecology', icon: Leaf, prompt: 'lore: ecology and qi' },
  ];

  return (
    <div className="flex h-full flex-col">
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

      <ScrollArea ref={scrollRef} className="flex-1">
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

      <div className="flex items-center gap-2 border-t border-[#2a2a4a] px-2 py-1.5">
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
