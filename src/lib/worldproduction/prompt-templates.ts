/**
 * Prompt Templates — machine-built generation prompts for the xianxia
 * multiverse (see docs/AI_PROMPT_PLAYBOOK.md).
 *
 * buildShotPrompt() emits a deterministic, generation-ready prompt from a
 * director-script shot + the set blueprint + the scale registry — the same
 * brief for the human director and the Grand Architect.
 */

import { EPISODE_1, type Shot } from './director-script';
import { WANG_FAMILY_BEND } from './set-blueprint';

const STYLE_BLOCK =
  'Painterly 3D render, hand-painted materials, believable PBR; ethereal teals, soft blues, forest greens; gold/brass lantern accents; deep red sparingly; purple/magenta reserved for spiritual energy. Ancient-sacred weathering: moss, pitting, patina, restraint over ornament.';

const NEGATIVE_BLOCK =
  'No western armor or architecture, no neon or RGB accents, no cyberpunk, no chromatic aberration, no lens flare, no glow orbs without a diegetic source, no wrong-scale subjects, no modern objects, no wireframe HUD in the world, one action per shot, canon characters only.';

/** Diegetic-diagnostic vocabulary keyed by concept (from the concept reviews). */
export const DIAGNOSTIC_TOKENS: Record<string, string> = {
  formation_failing: 'flickering formation nodes, spirit stones dimming, barrier ripples spreading farther, cracks beginning',
  qi_depleted: 'herbs dull, ambient particles diminished, techniques reading weaker',
  divine_sense: 'blue-tinted spiritual perception: spirit-vein currents, ore and herb clusters, residue gradients, dead nodes',
  domain: 'a bounded region where light bends to its rules; physics visibly defer',
  law_pressure: 'shallow scars, absorbed blasts, suppressed flight, technique dissipation',
  traces: 'a faint luminous glyph at the anchored location, decaying, readable only through qi sense',
};

export interface PromptSpec {
  shot: Shot;
  subject?: string;
  canonRule?: string;
  diagnostics?: string[];
}

/** Build the full generation prompt for a shot. */
export function buildShotPrompt(spec: PromptSpec): string {
  const s = spec.shot;
  const structure = WANG_FAMILY_BEND.structures.find((x) => x.id === s.structureId);
  const setting = structure
    ? `${structure.name} — ${structure.construction}`
    : s.location;
  const scale = structure ? `${structure.w} × ${structure.d} m footprint` : s.scaleNote ?? '';

  const blocks: string[] = [
    `${s.cut} shot, ${s.camera.lensMm} mm lens, camera ${s.camera.heightM} m, ${s.camera.movement}, ${s.durationSec} seconds.`,
    `Subject: ${spec.subject ?? s.subject}.`,
    `Setting: ${setting}. ${scale}`.trim(),
    `Action: ${s.subject} — one action per shot.`,
    `Lighting: ${s.lighting}.`,
    `Atmosphere: ${s.audio}; diegetic sound and particles only.`,
    `Composition: ${s.composition}.`,
    `Style: ${STYLE_BLOCK} Art board: ${s.artBoard}`,
  ];
  if (spec.canonRule) blocks.push(`Canon: ${spec.canonRule}.`);
  if (spec.diagnostics && spec.diagnostics.length > 0) {
    blocks.push(`The world shows: ${spec.diagnostics.map((d) => DIAGNOSTIC_TOKENS[d] ?? d).join('; ')}.`);
  }
  blocks.push(`Negative: ${NEGATIVE_BLOCK}`);
  return blocks.join('\n');
}

/** Prompts for every shot in the episode (deterministic). */
export function episodePrompts(): Array<{ shotId: string; prompt: string }> {
  return EPISODE_1.shots.map((shot) => ({ shotId: shot.id, prompt: buildShotPrompt({ shot }) }));
}
