/**
 * Live Architect Studio — Asset Browser Panel
 *
 * Displays a catalog of game assets with search and type filtering.
 * Static catalog with 24 entries across 6 categories.
 */

import { useState, useMemo } from 'react';
import { FolderOpen, Search, Box, Image, Palette, LayoutGrid, Film, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

type AssetType = 'mesh' | 'texture' | 'material' | 'prefab' | 'animation' | 'vfx';

interface AssetEntry {
  name: string;
  type: AssetType;
  size: string;
}

const ASSET_CATALOG: AssetEntry[] = [
  { name: 'lineage_hall.glb', type: 'mesh', size: '2.4 MB' },
  { name: 'household_compound.glb', type: 'mesh', size: '1.8 MB' },
  { name: 'well_structure.glb', type: 'mesh', size: '0.3 MB' },
  { name: 'spirit_shrine.glb', type: 'mesh', size: '0.9 MB' },
  { name: 'wood_plank_diffuse.png', type: 'texture', size: '512 KB' },
  { name: 'roof_tile_normal.png', type: 'texture', size: '1.2 MB' },
  { name: 'stone_path_ao.png', type: 'texture', size: '768 KB' },
  { name: 'paddy_water_albedo.png', type: 'texture', size: '1.1 MB' },
  { name: 'dark_wood.mat', type: 'material', size: '24 KB' },
  { name: 'clay_roof.mat', type: 'material', size: '18 KB' },
  { name: 'cut_stone.mat', type: 'material', size: '22 KB' },
  { name: 'paddy_soil.mat', type: 'material', size: '16 KB' },
  { name: 'village_gate.prefab', type: 'prefab', size: '4.2 MB' },
  { name: 'rice_paddy_patch.prefab', type: 'prefab', size: '2.8 MB' },
  { name: 'market_stall.prefab', type: 'prefab', size: '3.1 MB' },
  { name: 'stone_bridge.prefab', type: 'prefab', size: '1.9 MB' },
  { name: 'villager_walk.anim', type: 'animation', size: '340 KB' },
  { name: 'villager_farm.anim', type: 'animation', size: '520 KB' },
  { name: 'villager_carry.anim', type: 'animation', size: '410 KB' },
  { name: 'water_flow.anim', type: 'animation', size: '180 KB' },
  { name: 'incense_smoke.vfx', type: 'vfx', size: '90 KB' },
  { name: 'firefly_glow.vfx', type: 'vfx', size: '120 KB' },
  { name: 'rain_splash.vfx', type: 'vfx', size: '200 KB' },
  { name: 'spirit_aura.vfx', type: 'vfx', size: '150 KB' },
];

const TYPE_ICONS: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  mesh: Box, texture: Image, material: Palette, prefab: LayoutGrid, animation: Film, vfx: Sparkles,
};

const TYPE_COLORS: Record<AssetType, string> = {
  mesh: 'text-emerald-400', texture: 'text-amber-400', material: 'text-pink-400',
  prefab: 'text-blue-400', animation: 'text-cyan-400', vfx: 'text-purple-400',
};

const TYPE_BG: Record<AssetType, string> = {
  mesh: 'bg-emerald-500/10 border-emerald-500/20', texture: 'bg-amber-500/10 border-amber-500/20',
  material: 'bg-pink-500/10 border-pink-500/20', prefab: 'bg-blue-500/10 border-blue-500/20',
  animation: 'bg-cyan-500/10 border-cyan-500/20', vfx: 'bg-purple-500/10 border-purple-500/20',
};

const ALL_TYPES: AssetType[] = ['mesh', 'texture', 'material', 'prefab', 'animation', 'vfx'];

export default function AssetBrowserPanel() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ASSET_CATALOG.filter((a) => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, filterType]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 items-center gap-2 border-b border-[#2a2a4a] px-3">
        <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8888aa]">Asset Browser</span>
        <Badge variant="outline" className="h-4 border-[#2a2a4a] bg-[#1a1a2e] text-[9px] text-[#aaaacc]">{ASSET_CATALOG.length}</Badge>
      </div>

      <div className="flex items-center gap-2 border-b border-[#2a2a4a] px-2 py-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#4a4a6a]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets…"
            className="h-6 rounded border-[#2a2a4a] bg-[#1a1a2e] pl-6 pr-2 font-mono text-[11px] text-[#c8c8e0] placeholder:text-[#4a4a6a] focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50" />
        </div>
        <div className="flex items-center gap-1">
          <button className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors ${filterType === 'all' ? 'bg-[#2a2a5a] text-emerald-300' : 'text-[#5a5a7a] hover:text-[#8888aa]'}`} onClick={() => setFilterType('all')}>All</button>
          {ALL_TYPES.map((t) => (
            <button key={t} className={`rounded px-1.5 py-0.5 text-[9px] font-medium capitalize transition-colors ${filterType === t ? `bg-[#2a2a5a] ${TYPE_COLORS[t]}` : 'text-[#5a5a7a] hover:text-[#8888aa]'}`} onClick={() => setFilterType(t)}>{t}</button>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-3 gap-2 p-3">
          {filtered.map((asset) => {
            const Icon = TYPE_ICONS[asset.type];
            return (
              <div key={asset.name} className={`flex flex-col gap-1.5 rounded-lg border p-2 transition-colors ${TYPE_BG[asset.type]} hover:brightness-125 cursor-pointer`}>
                <Icon className={`h-5 w-5 ${TYPE_COLORS[asset.type]}`} />
                <span className="truncate text-[10px] font-medium text-[#c8c8e0]">{asset.name}</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] capitalize ${TYPE_COLORS[asset.type]}`}>{asset.type}</span>
                  <span className="text-[9px] text-[#4a4a6a]">· {asset.size}</span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
