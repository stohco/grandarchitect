'use client';

/**
 * ActionRegistryBrowser
 * ======================
 *
 * Replaces the hardcoded QUICK_ACTIONS in the command palette with a
 * searchable browser that fetches from the canonical UI Action Registry.
 *
 * Every registered action (39 across 8 workspaces) is now searchable
 * and invocable from the command palette — the same actions that buttons,
 * shortcuts, and the Grand Architect use.
 */

import { useCallback, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { CornerDownLeft, Search, Loader2, AlertCircle } from 'lucide-react';

interface RegistryAction {
  id: string;
  label: string;
  description: string;
  category: string;
  workspace: string;
  maturity: string;
  shortcut?: string;
  keywords: string[];
}

interface ActionRegistryBrowserProps {
  onClose: () => void;
  onSwitchToChat: () => void;
  send: (text: string) => void;
}

export function ActionRegistryBrowser({ onClose, onSwitchToChat, send }: ActionRegistryBrowserProps) {
  const [query, setQuery] = useState('');
  const [actions, setActions] = useState<RegistryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoking, setInvoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all actions on mount
  useEffect(() => {
    fetch('/api/studio-ui')
      .then((r) => r.json())
      .then((data) => {
        setActions(data.actions ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load actions');
        setLoading(false);
      });
  }, []);

  // Search actions
  const filtered = query.trim()
    ? actions.filter((a) => {
        const q = query.toLowerCase();
        return (
          a.label.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.keywords.some((k) => k.toLowerCase().includes(q)) ||
          a.category.toLowerCase().includes(q)
        );
      })
    : actions;

  // Group by workspace
  const byWorkspace: Record<string, RegistryAction[]> = {};
  for (const a of filtered) {
    const ws = a.workspace;
    if (!byWorkspace[ws]) byWorkspace[ws] = [];
    byWorkspace[ws].push(a);
  }

  const handleInvoke = useCallback(async (action: RegistryAction) => {
    setInvoking(action.id);
    setError(null);
    try {
      const res = await fetch('/api/studio-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invoke', actionId: action.id }),
      });
      const data = await res.json();
      if (data.ok) {
        // Switch to chat to show the result
        onSwitchToChat();
        send(`Executed: ${action.label}. Result: ${data.result?.message ?? 'completed'}`);
        onClose();
      } else {
        setError(data.error ?? 'Action failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setInvoking(null);
    }
  }, [onSwitchToChat, send, onClose]);

  const maturityColors: Record<string, string> = {
    integrated: 'text-emerald-400',
    prototype: 'text-amber-400',
    'browser-proven': 'text-cyan-400',
    validated: 'text-emerald-300',
    blocked: 'text-rose-400',
  };

  return (
    <>
      {/* Search bar */}
      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-3 py-2">
        <Search className="h-3.5 w-3.5 text-[#5a5a7a]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${actions.length} registered actions...`}
          className="h-7 flex-1 border-[#2a2a4a] bg-[#1a1a2e] px-3 text-[12px] text-[#c8c8e0] placeholder:text-[#4a4a6a] focus-visible:ring-purple-500/30"
          autoFocus
        />
        <span className="font-mono text-[9px] text-[#5a5a7a]">{filtered.length} matches</span>
      </div>

      {/* Results */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              <span className="ml-2 text-[11px] text-[#5a5a7a]">Loading registry...</span>
            </div>
          )}

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded border border-rose-500/30 bg-rose-500/5 p-2 text-[11px] text-rose-300">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {error}
            </div>
          )}

          {!loading && Object.entries(byWorkspace).map(([workspace, wsActions]) => (
            <div key={workspace} className="mb-4">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
                  {workspace}
                </span>
                <span className="text-[9px] text-[#3a3a5a]">{wsActions.length}</span>
              </div>
              <div className="space-y-1">
                {wsActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => void handleInvoke(action)}
                    disabled={invoking === action.id}
                    className="group flex w-full items-center gap-2.5 rounded border border-[#2a2a4a] bg-[#12122a] px-2.5 py-1.5 text-left transition-all hover:border-purple-500/40 hover:bg-[#1a1a3e] disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-[#c8c8e0]">{action.label}</span>
                        <span className={`text-[8px] uppercase ${maturityColors[action.maturity] ?? 'text-[#5a5a7a]'}`}>
                          {action.maturity}
                        </span>
                        {action.shortcut && (
                          <kbd className="rounded border border-[#2a2a4a] bg-[#0e0e24] px-1 font-mono text-[8px] text-[#8888aa]">
                            {action.shortcut}
                          </kbd>
                        )}
                      </div>
                      <div className="truncate text-[9px] text-[#5a5a7a]">{action.description}</div>
                    </div>
                    {invoking === action.id ? (
                      <Loader2 className="h-3 w-3 shrink-0 animate-spin text-purple-400" />
                    ) : (
                      <CornerDownLeft className="h-3 w-3 shrink-0 text-[#3a3a5a] opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="py-8 text-center text-[11px] text-[#5a5a7a]">
              No actions match "{query}"
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}
