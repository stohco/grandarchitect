'use client';

/**
 * AssetBrowserPanel — placeholder grid of asset cards.
 *
 * In a full editor this would query the asset registry
 * (engine-architecture/16_ASSET_REGISTRY_IMPORT_PIPELINE.md). For now it
 * shows a curated set of definition cards drawn from
 * src/lib/engine/definitions.ts so the tab is informative, not empty.
 */

import { useMemo } from 'react';
import { ALL_DEFINITIONS } from '@/lib/engine/definitions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package } from 'lucide-react';
import { useState } from 'react';

const KIND_COLOR: Record<string, string> = {
  metaphysical_essence: '#a855f7',
  realm: '#10b981',
  technique: '#f472b6',
  cultivation_practice: '#d4a04a',
  deviation: '#f43f5e',
  location: '#4ade80',
};

export default function AssetBrowserPanel() {
  const [filter, setFilter] = useState('');

  const cards = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return ALL_DEFINITIONS.slice(0, 60);
    return ALL_DEFINITIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.nameHanzi ?? '').includes(q) ||
        d.kind.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    ).slice(0, 60);
  }, [filter]);

  return (
    <div className="flex h-full flex-col bg-[#0e0e24]">
      <div className="flex h-8 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <Package className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-[10px] uppercase tracking-wider text-[#5a5a7a]">
          Asset Browser · {cards.length} definitions
        </span>
        <div className="relative ml-auto w-40">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#5a5a7a]" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="h-6 w-full rounded border border-[#2a2a4a] bg-[#12122a] pl-6 pr-2 text-[11px] text-[#c8c8e0] placeholder:text-[#5a5a7a] focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((d) => (
            <div
              key={d.id}
              className="group rounded-md border border-[#2a2a4a] bg-[#12122a] p-2 transition-colors hover:border-emerald-500/40"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: KIND_COLOR[d.kind] ?? '#5a5a7a' }}
                />
                <span className="truncate text-[11px] font-medium text-[#c8c8e0]">{d.name}</span>
              </div>
              {d.nameHanzi && (
                <span className="mt-0.5 block text-[10px] text-[#8888aa]">{d.nameHanzi}</span>
              )}
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#5a5a7a]">
                {d.description}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {d.tags.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="rounded bg-[#0e0e24] px-1 py-0.5 text-[9px] text-[#5a5a7a]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <p className="col-span-full px-3 py-8 text-center text-xs text-[#5a5a7a]">
              No assets match the filter.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
