#!/usr/bin/env bun
/**
 * scripts/gauntlet-audit.ts — the 80-pass production audit, as Markdown.
 *
 * Generates docs/gauntlet-audit.md: every pass of the Universal Genesis
 * Production Gauntlet with its status for the CURRENT production:
 *   ✅ IMPLEMENTED — a runtime consumer exists (and a scene artifact where
 *                    the pass is scene-relevant)
 *   🟡 SPECIFIED   — bound only to spec documents/directives
 *   ⬜ GAP         — no consumer bound (build-blocking)
 * plus a SCENE EVIDENCE column mapping scene-relevant passes to the exact
 * artifacts they produced (set blueprint, factories, director script,
 * player, sound, interactions...). Run BEFORE and AFTER scene changes;
 * the diff between runs is the production ledger.
 */

import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { GAUNTLET, GAUNTLET_RINGS } from '../src/lib/genesis/gauntlet';
import { CONSUMERS } from '../src/lib/genesis/consumer-registry';

/** Scene-relevant passes -> the artifacts that implement them. */
const SCENE_ARTIFACTS: Record<string, string[]> = {
  'pass.01': ['src/lib/worldproduction/director-script.ts'],
  'pass.03': ['src/lib/worldproduction/set-blueprint.ts', 'src/lib/worldproduction/set-blueprint-2.ts'],
  'pass.04': ['src/lib/worldproduction/director-script.ts'],
  'pass.05': ['src/lib/engine/definitions/npcs.ts'],
  'pass.06': ['src/lib/genesis/xianxia-concept-review.ts'],
  'pass.07': ['src/lib/worldproduction/director-script.ts'],
  'pass.08': ['docs/AI_PROMPT_PLAYBOOK.md'],
  'pass.11': ['src/lib/worldproduction/set-blueprint.ts'],
  'pass.15': ['src/lib/engine/definitions/ecology.ts'],
  'pass.16': ['src/lib/assets/factories/dressing-factory.ts', 'src/lib/assets/factories/textures.ts'],
  'pass.17': ['src/lib/worldproduction/set-blueprint.ts', 'src/lib/engine/definitions/npcs.ts'],
  'pass.18': ['src/lib/engine/definitions/npcs.ts'],
  'pass.23': ['src/lib/worldproduction/animation-controller.ts'],
  'pass.25': ['src/lib/worldproduction/coverage-systems.ts'],
  'pass.29': ['src/lib/assets/factories/dressing-factory.ts'],
  'pass.33': ['src/lib/worldproduction/interactions.ts'],
  'pass.35': ['src/lib/worldproduction/interactions.ts'],
  'pass.41': ['src/lib/assets/factories/character-factory.ts'],
  'pass.42': ['src/lib/worldproduction/animation-controller.ts'],
  'pass.47': ['src/lib/worldproduction/animation-controller.ts'],
  'pass.48': ['src/lib/worldproduction/animation-controller.ts'],
  'pass.49': ['src/lib/worldproduction/director-script.ts'],
  'pass.50': ['src/lib/worldproduction/zhumeng-style.ts', 'src/lib/worldproduction/filmic-grade.ts'],
  'pass.53': ['src/lib/assets/sound/sound-designer.ts'],
  'pass.54': ['src/lib/worldproduction/director-script.ts'],
  'pass.57': ['src/lib/determinism/primitives.ts'],
  'pass.65': ['src/components/editor/panels/DirectorPlayerPanel.tsx'],
  'pass.66': ['src/components/editor/panels/DirectorPlayerPanel.tsx'],
  'pass.67': ['scripts/style-gauntlet.ts', 'scripts/detail-audit.mjs'],
  'pass.69': ['src/lib/genesis/emergence-gauntlet.ts'],
  'pass.71': ['src/lib/worldproduction/motion-corpus.ts', 'src/lib/worldproduction/coverage-systems.ts'],
  'pass.72': ['src/lib/worldproduction/production-conformance.ts'],
  'pass.73': ['src/lib/worldproduction/coverage-systems.ts'],
  'pass.74': ['src/lib/worldproduction/coverage-systems.ts'],
  'pass.75': ['src/lib/worldproduction/coverage-systems.ts'],
  'pass.76': ['src/lib/worldproduction/coverage-systems.ts'],
  'pass.77': ['src/lib/worldproduction/coverage-systems.ts'],
  'pass.78': ['src/lib/worldproduction/coverage-systems.ts'],
  'pass.79': ['src/lib/worldproduction/coverage-systems.ts'],
  'pass.80': ['src/lib/worldproduction/scene-universe-slice.ts', 'src/lib/worldproduction/director-script.ts'],
};

function statusFor(passId: string, consumers: string[]): { status: string; evidence: string[] } {
  const hasRuntime = consumers.some((c) => {
    const consumer = CONSUMERS.find((x) => x.id === c);
    return consumer?.kind === 'runtime';
  });
  const sceneArtifacts = SCENE_ARTIFACTS[passId] ?? [];
  const sceneOk = sceneArtifacts.every((p) => existsSync(join(process.cwd(), p)));
  if (consumers.length === 0) return { status: '⬜ GAP', evidence: [] };
  if (hasRuntime && sceneArtifacts.length === 0) return { status: '✅ implemented', evidence: consumers };
  if (hasRuntime && sceneOk) return { status: '✅ implemented + scene', evidence: [...consumers, ...sceneArtifacts] };
  if (hasRuntime) return { status: '🟡 scene pending', evidence: sceneArtifacts };
  return { status: '🟡 specified', evidence: consumers };
}

const counts = { implemented: 0, scene: 0, specified: 0, gap: 0 };
const rows: string[] = [];
for (const pass of GAUNTLET) {
  const { status, evidence } = statusFor(pass.id, pass.consumers);
  if (status.startsWith('✅ implemented + scene')) counts.scene++;
  else if (status.startsWith('✅')) counts.implemented++;
  else if (status.startsWith('🟡')) counts.specified++;
  else counts.gap++;
  const ev = evidence.slice(0, 3).map((e) => `\`${e}\``).join(', ');
  rows.push(`| ${pass.id.replace('pass.', '')} | ${pass.name} | ${status} | ${ev} |`);
}

const md = `# Universal Genesis Production Gauntlet — Audit

> Machine-generated by \`bun run scripts/gauntlet-audit.ts\`. Run BEFORE and AFTER
> every scene production change; the diff is the production ledger.
> Generated: ${new Date().toISOString()}

**Summary:** ${GAUNTLET.length} passes — ✅ ${counts.implemented} implemented · 🟡 ${counts.specified} specified · ✅+scene ${counts.scene} with scene evidence · ⬜ ${counts.gap} gaps.

| # | Pass | Status | Evidence |
|---|------|--------|----------|
${rows.join('\n')}

## Legend
- **✅ implemented** — runtime consumer exists in the repo.
- **✅ implemented + scene** — runtime consumer AND the scene artifact for this pass exists (set blueprint, factory, director script, player, sound, interactions...).
- **🟡 specified** — bound only to spec documents/directives (the pass is designed but not yet runtime).
- **⬜ GAP** — no consumer bound; blocks production (the Genesis gate fails the build if this happens).
`;

writeFileSync(join(process.cwd(), 'docs', 'gauntlet-audit.md'), md, 'utf8');
console.log(`docs/gauntlet-audit.md written: ${GAUNTLET.length} passes (${counts.scene} with scene evidence, ${counts.specified} specified)`);
