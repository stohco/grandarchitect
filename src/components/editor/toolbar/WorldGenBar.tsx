/**
 * Live Architect Studio — World Generation Bar
 *
 * A bar below the toolbar (h-8) with seed input, generate button,
 * and stats badges when a world is loaded.
 */

import { useState, useCallback } from 'react';
import { Sprout, RefreshCw, Loader2, Users, Home, Building2, Clock, AlertCircle, MapPin, Trees } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditorStore } from '@/lib/editor/store';

export default function WorldGenBar() {
  const seedInput = useEditorStore((s) => s.seedInput);
  const setSeedInput = useEditorStore((s) => s.setSeedInput);
  const generateWorld = useEditorStore((s) => s.generateWorld);
  const loadingWorld = useEditorStore((s) => s.loadingWorld);
  const worldError = useEditorStore((s) => s.worldError);
  const settlement = useEditorStore((s) => s.settlement);
  const frozenTick = useEditorStore((s) => s.frozenTick);

  const [localSeed, setLocalSeed] = useState(seedInput);

  const handleGenerate = useCallback(() => {
    const trimmed = localSeed.trim();
    if (!trimmed) return;
    setSeedInput(trimmed);
    generateWorld(trimmed);
  }, [localSeed, setSeedInput, generateWorld]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleGenerate();
    },
    [handleGenerate]
  );

  const handleRandomSeed = useCallback(() => {
    const ts = Date.now().toString(36);
    const seed = `village-${ts}-${(Date.now() % 10000).toString(36)}`;
    setLocalSeed(seed);
    setSeedInput(seed);
    generateWorld(seed);
  }, [setSeedInput, generateWorld]);

  return (
    <div className="flex h-8 items-center gap-2 border-b border-[#2a2a4a] bg-[#0e0e24] px-3">
      <Sprout className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      <span className="text-[11px] font-medium text-[#8888aa]">World Seed</span>

      <Input
        value={localSeed}
        onChange={(e) => setLocalSeed(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a seed…"
        className="h-5 w-56 rounded border-[#2a2a4a] bg-[#1a1a2e] px-2 font-mono text-[11px] text-[#c8c8e0] placeholder:text-[#4a4a6a] focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
      />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-[#8888aa] hover:text-white" onClick={handleRandomSeed} disabled={loadingWorld}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Random seed</TooltipContent>
      </Tooltip>

      <Button
        size="sm"
        className="h-5 gap-1 rounded bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-500"
        onClick={handleGenerate}
        disabled={loadingWorld || !localSeed.trim()}
      >
        {loadingWorld ? (<><Loader2 className="h-3 w-3 animate-spin" />Generating…</>) : 'Generate World'}
      </Button>

      {settlement && (<>
        <div className="mx-1 h-4 w-px bg-[#2a2a4a]" />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-5 gap-1 border-[#2a2a4a] bg-[#1a1a2e] text-[10px] text-[#aaaacc]">
            <Building2 className="h-2.5 w-2.5 text-amber-400" />
            {settlement.villageName}
          </Badge>
          <Badge variant="outline" className="h-5 gap-1 border-[#2a2a4a] bg-[#1a1a2e] text-[10px] text-[#aaaacc]">
            <Home className="h-2.5 w-2.5 text-blue-400" />
            {settlement.householdCount} households
          </Badge>
          <Badge variant="outline" className="h-5 gap-1 border-[#2a2a4a] bg-[#1a1a2e] text-[10px] text-[#aaaacc]">
            <Users className="h-2.5 w-2.5 text-emerald-400" />
            {settlement.population} pop
          </Badge>
          <Badge variant="outline" className="h-5 gap-1 border-[#2a2a4a] bg-[#1a1a2e] text-[10px] text-[#aaaacc]">
            {settlement.structures.length} structures
          </Badge>
          <Badge variant="outline" className="h-5 gap-1 border-[#2a2a4a] bg-[#1a1a2e] text-[10px] text-[#aaaacc]">
            <Clock className="h-2.5 w-2.5 text-purple-400" />
            tick {frozenTick}
          </Badge>
        </div>
      </>)}

      {worldError && (
        <div className="flex items-center gap-1 text-[11px] text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="max-w-48 truncate">{worldError}</span>
        </div>
      )}
    </div>
  );
}
