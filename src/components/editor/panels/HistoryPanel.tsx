'use client';

/**
 * HistoryPanel — branches list + transactions list.
 *
 * Top half: the branch tree (current branch highlighted, click to switch).
 * Bottom half: the transaction log for the current branch, with undo.
 */

import { useEditorStore } from '@/lib/editor/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { GitBranch, GitFork, Undo2, Clock, User, Bot } from 'lucide-react';
import { useState } from 'react';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export default function HistoryPanel() {
  const branches = useEditorStore((s) => s.branches);
  const currentBranchId = useEditorStore((s) => s.currentBranchId);
  const switchBranch = useEditorStore((s) => s.switchBranch);
  const createBranch = useEditorStore((s) => s.createBranch);
  const transactions = useEditorStore((s) => s.transactions);
  const undoTransaction = useEditorStore((s) => s.undoTransaction);

  const [newName, setNewName] = useState('');

  const visible = transactions.filter((t) => t.branchId === currentBranchId);

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      <div className="flex h-8 items-center justify-between border-b border-[#2a2a4a] px-3">
        <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
          History · {branches.length} branches · {visible.length} txns
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {/* Branches */}
          <section className="mb-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              <GitBranch className="h-3 w-3" /> Branches
            </h3>
            <div className="space-y-1">
              {branches.map((b) => {
                const active = b.branchId === currentBranchId;
                return (
                  <button
                    key={b.branchId}
                    onClick={() => switchBranch(b.branchId)}
                    className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left text-xs transition-colors ${
                      active
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-[#2a2a4a] bg-[#12122a] text-[#8888aa] hover:border-[#3a3a5a]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {b.isFork ? <GitFork className="h-3 w-3" /> : <GitBranch className="h-3 w-3" />}
                      <span>{b.name}</span>
                      <span className="font-mono text-[9px] text-[#5a5a7a]">{b.branchId.slice(-6)}</span>
                    </span>
                    <span className="text-[9px] text-[#5a5a7a]">{b.transactionCount} tx</span>
                  </button>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName.trim()) return;
                createBranch(newName.trim());
                setNewName('');
              }}
              className="mt-2 flex gap-1.5"
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New branch name…"
                className="h-7 flex-1 rounded border border-[#2a2a4a] bg-[#12122a] px-2 text-[11px] text-[#c8c8e0] placeholder:text-[#5a5a7a] focus:outline-none focus:border-emerald-500/50"
              />
              <Button
                type="submit"
                size="sm"
                className="h-7 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
              >
                <GitFork className="h-3 w-3" />
              </Button>
            </form>
          </section>

          {/* Transactions */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              <Clock className="h-3 w-3" /> Transactions · {currentBranchId.slice(-6)}
            </h3>
            <div className="space-y-1">
              {visible.length === 0 && (
                <p className="px-2 py-4 text-center text-[11px] text-[#5a5a7a]">
                  No transactions on this branch yet.
                </p>
              )}
              {visible.map((t) => (
                <div
                  key={t.transactionId}
                  className={`rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-1.5 ${
                    t.undone ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#c8c8e0]">
                      {t.requestedBy === 'user' ? (
                        <User className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Bot className="h-3 w-3 text-purple-400" />
                      )}
                      <span className="truncate">{t.originalRequest}</span>
                    </span>
                    {!t.undone && (
                      <button
                        onClick={() => undoTransaction(t.transactionId)}
                        className="shrink-0 text-[#5a5a7a] hover:text-rose-300"
                        title="Undo"
                      >
                        <Undo2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[#5a5a7a]">
                    <span>{formatTime(t.timestamp)}</span>
                    <span>·</span>
                    <span className="font-mono">{t.transactionId.slice(-8)}</span>
                    {t.toolsUsed.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{t.toolsUsed.join(', ')}</span>
                      </>
                    )}
                    {t.undone && <span className="text-rose-400">· undone</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
