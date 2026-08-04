'use client';

/**
 * WorldGenBar — seed input + Generate button + preset seeds.
 *
 * The primary "what world are we working in?" control. Sits in the top bar
 * to the left of EditorToolbar. Calls store.generateWorld on submit.
 */

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/lib/editor/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, Globe } from 'lucide-react';

const PRESET_SEEDS: { seed: string; label: string }[] = [
  { seed: 'wang-family-bend-1108', label: 'Wang Family Bend (default)' },
  { seed: 'cangli-reach-2207', label: 'Cangli Reach' },
  { seed: 'reed-ford-3318', label: 'Reed Ford' },
  { seed: 'pine-hollow-4429', label: 'Pine Hollow' },
  { seed: 'three-stones-5530', label: 'Three Stones' },
  { seed: 'oracle-fall-6641', label: 'Oracle Fall' },
];

export default function WorldGenBar() {
  const seedInput = useEditorStore((s) => s.seedInput);
  const setSeedInput = useEditorStore((s) => s.setSeedInput);
  const generateWorld = useEditorStore((s) => s.generateWorld);
  const loading = useEditorStore((s) => s.settlementLoading);

  const [localSeed, setLocalSeed] = useState(seedInput);

  // Sync local input when the store seed changes externally.
  if (localSeed !== seedInput && document.activeElement?.tagName !== 'INPUT') {
    // No reactive effect needed; this runs on every render but only updates
    // when the value diverges and the user is not typing.
    setLocalSeed(seedInput);
  }

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSeedInput(localSeed.trim() || 'wang-family-bend-1108');
      void generateWorld();
    },
    [localSeed, setSeedInput, generateWorld],
  );

  const onPreset = (seed: string) => {
    setLocalSeed(seed);
    setSeedInput(seed);
    void generateWorld();
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Globe className="h-4 w-4 text-emerald-500" />
        <span className="hidden text-xs uppercase tracking-wider text-[#5a5a7a] md:inline">Seed</span>
      </div>
      <Input
        value={localSeed}
        onChange={(e) => setLocalSeed(e.target.value)}
        placeholder="wang-family-bend-1108"
        className="h-8 w-56 border-[#2a2a4a] bg-[#0e0e24] font-mono text-xs text-[#c8c8e0] focus-visible:border-emerald-500/50"
        spellCheck={false}
        autoComplete="off"
      />
      <Button
        type="submit"
        size="sm"
        disabled={loading}
        className="h-8 bg-emerald-600 text-white hover:bg-emerald-500"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        <span className="ml-1">Generate</span>
      </Button>
      <Select value="" onValueChange={onPreset}>
        <SelectTrigger
          size="sm"
          className="h-8 w-[180px] border-[#2a2a4a] bg-[#0e0e24] text-xs text-[#8888aa]"
        >
          <SelectValue placeholder="Presets…" />
        </SelectTrigger>
        <SelectContent className="border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]">
          {PRESET_SEEDS.map((p) => (
            <SelectItem key={p.seed} value={p.seed} className="text-xs">
              <span className="text-[#c8c8e0]">{p.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
