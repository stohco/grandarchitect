/**
 * Live Architect Studio — Architect AI Chat Panel
 *
 * Simulated AI chat with quick action buttons.
 * Messages stored in local state, not the store.
 */

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, User, Bot, Loader2, Wand2, Zap, BookOpen, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/lib/editor/store';

interface ChatMessage {
  id: string;
  role: 'user' | 'architect';
  content: string;
}

function generateResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('generate') && lower.includes('village')) {
    return 'I can generate a new village for you. Please provide a seed string in the World Seed bar above, or describe the kind of village you envision (e.g., "a riverside fishing hamlet with 8 households").';
  }
  if (lower.includes('spirit vein')) {
    return 'Spirit veins (灵脉) are geomantic energy channels that flow beneath the settlement. They influence cultivation potential, feng shui quality, and shrine placement. I can analyze the current ley line configuration and suggest optimal spirit vein alignments for your village.';
  }
  if (lower.includes('describe') || lower.includes('village')) {
    return 'This settlement features traditional Chinese village architecture organized around a central lineage hall. The spatial layout follows feng shui principles with mountains to the north (backing) and water to the south (facing). Key structures include household compounds, spirit shrines, rice paddies, and communal threshing grounds.';
  }
  if (lower.includes('ecology') || lower.includes('ecological')) {
    return 'Ecology analysis: The rice paddies cover significant acreage and depend on local hydrology. Spirit shrines are positioned at geomantic convergence points. The population density suggests moderate resource pressure. Soil quality varies between paddies (irrigated) and dryland gardens (rain-fed).';
  }
  if (lower.includes('add') || lower.includes('create') || lower.includes('build')) {
    return 'I understand you want to add a new structure. In Live Architect mode, I can propose additions that respect the settlement\'s spatial logic, feng shui constraints, and cultural norms. Please specify the type of structure and any placement preferences.';
  }
  if (lower.includes('weather') || lower.includes('season')) {
    return 'The weather system models seasonal patterns. Spring brings planting rains, summer heat drives rice growth, autumn brings harvest winds, and winter provides a dormant period. I can adjust the weather simulation parameters if needed.';
  }
  if (lower.includes('economy') || lower.includes('trade') || lower.includes('wealth')) {
    return 'The village economy operates on a household-based model. Rice is the primary crop, supplemented by dryland vegetables, livestock (pigs and chickens), and mill processing. Wealth tiers range from rich landlord families to destitute laborers.';
  }
  return 'I\'m the Grand Architect, your AI design partner for this living world. I can help with village generation, structure placement, ecological analysis, economic modeling, and cultural authenticity. Try asking about the village, its ecology, or requesting modifications.';
}

let msgCounter = 0;

export default function ArchitectPanel() {
  const capabilities = useEditorStore((s) => s.capabilities);
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

  const send = (text: string) => {
    if (!text.trim() || typing) return;
    const userMsg: ChatMessage = { id: `msg-${++msgCounter}`, role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    const delay = 600 + (Date.now() % 800);
    setTimeout(() => {
      const response = generateResponse(text);
      const archMsg: ChatMessage = { id: `msg-${++msgCounter}`, role: 'architect', content: response };
      setMessages((prev) => [...prev, archMsg]);
      setTyping(false);
    }, delay);
  };

  const quickActions = [
    { label: 'Generate village', icon: Wand2, prompt: 'Generate a new village with interesting terrain' },
    { label: 'Add spirit vein', icon: Zap, prompt: 'Analyze and suggest spirit vein placement' },
    { label: 'Describe village', icon: BookOpen, prompt: 'Describe this village in detail' },
    { label: 'Show ecology', icon: Leaf, prompt: 'Show ecology stats for this settlement' },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-1.5">
        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Grand Architect</span>
        {capabilities.length > 0 && (
          <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-purple-300">{capabilities.length} capabilities</Badge>
        )}
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
            <div className="py-6 text-center text-[11px] text-[#5a5a7a]">Ask the Grand Architect about your world.<br />Use the quick actions above or type a message below.</div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {msg.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
              </div>
              <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-[11px] leading-relaxed ${msg.role === 'user' ? 'bg-blue-500/10 text-blue-200' : 'bg-[#1e1e3e] text-[#c8c8e0]'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                <Bot className="h-3 w-3" />
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-[#1e1e3e] px-3 py-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                <span className="text-[11px] text-[#5a5a7a]">Thinking…</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2 border-t border-[#2a2a4a] px-2 py-1.5">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
          placeholder="Ask the architect…"
          className="h-7 flex-1 rounded border-[#2a2a4a] bg-[#1a1a2e] px-2 font-mono text-[11px] text-[#c8c8e0] placeholder:text-[#4a4a6a] focus-visible:ring-purple-500/30 focus-visible:border-purple-500/50" />
        <Button size="icon" className="h-7 w-7 bg-purple-600 text-white hover:bg-purple-500" onClick={() => send(input)} disabled={!input.trim() || typing}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
