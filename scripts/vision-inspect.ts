#!/usr/bin/env bun
/**
 * scripts/vision-inspect.ts — the Perceptual Evidence Examiner harness.
 *
 * Drives the two-stage vision inspection per the Vision Inspection Contract:
 *   Stage A — BLIND PLAYER READ (no implementation claims, no entity names)
 *   Stage B — FULL INSPECTION with the applicable-pass manifest from the
 *             Genesis gauntlet + the Scene Universe Slice for the location.
 *
 * Usage:
 *   bun run scripts/vision-inspect.ts [frame.png ...]
 *   FRAME shot.1B bun run scripts/vision-inspect.ts   # supply shotId as arg
 *
 * Writes evidence/vision-verdict/<frame>.verdict.txt
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildInspectionManifest } from '../src/lib/worldproduction/vision-contract';
import { compileSceneSlice } from '../src/lib/worldproduction/scene-universe-slice';
import { EPISODE_1, TOUR_SHOTS, EPISODE_2, EPISODE_3 } from '../src/lib/worldproduction/director-script';

const OUT = join(process.cwd(), 'evidence', 'vision-verdict');
const CONTRACT = readFileSync(join(process.cwd(), 'docs/vision-inspection-contract.md'), 'utf8');

const ALL_SHOTS = [...EPISODE_1.shots, ...TOUR_SHOTS, ...EPISODE_2.shots, ...EPISODE_3.shots];
const shotFor = (frame: string): { shotId?: string; locationId?: string } => {
  const stem = frame.replace(/\.png$/i, '');
  const shot = ALL_SHOTS.find((s) => s.id === stem);
  if (!shot) return {};
  const slice = compileSceneSlice(shot.structureId ?? '');
  return { shotId: shot.id, locationId: shot.structureId, slice };
};

const BLIND_PROMPT = `You are the Perceptual Evidence Examiner, Stage A — BLIND PLAYER READ.

You are shown ONE rendered frame and told NOTHING about the intended content.
No entity names. No developer explanation. No "this is supposed to be X".

Report:
- What does the frame actually show, honestly? (setting, objects, scale, density)
- What would a player genuinely think they are looking at?
- Apparent art style and production quality.
- Apparent level of completion: FINISHED_WORLD / PRODUCTION_CANDIDATE /
  STYLIZED_PROTOTYPE / BLOCKOUT / PRIMITIVE_PLACEHOLDER.
- Obvious defects, distractions, empty zones.
- Where does the image stop rewarding closer inspection?

Be brutally accurate. No praise. Facts and defects only.`;

async function callVision(b64: string, text: string): Promise<string | null> {
  const auth = JSON.parse(readFileSync(join(process.env.USERPROFILE ?? '', '.local/share/opencode/auth.json'), 'utf8'));
  const key = auth.google?.key;
  if (!key) return null;
  for (const model of ['gemini-3-flash-preview', 'gemma-4-31b-it', 'gemma-4-26b-a4b-it']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text },
            { inline_data: { mime_type: 'image/png', data: b64 } },
          ] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2600 },
        }),
      });
      if (!r.ok) { const e = await r.json().catch(() => null); console.log(`  [${model} HTTP ${r.status}: ${e?.error?.message ?? ''}]`); continue; }
      const j = await r.json();
      const textOut = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('\n');
      if (textOut) return textOut;
    } catch { /* next */ }
  }
  return null;
}

async function inspectFrame(frame: string): Promise<void> {
  const png = frame.endsWith('.png') ? frame : `${frame}.png`;
  const path = join(process.cwd(), 'evidence', 'director', png);
  let b64: string;
  try {
    b64 = readFileSync(path).toString('base64');
  } catch {
    console.log(`  SKIP ${frame}: no frame at ${path}`);
    return;
  }

  const { shotId, locationId, slice } = shotFor(frame);
  const manifest = buildInspectionManifest({
    inspectionId: `inspection.${frame.replace(/\.png$/i, '')}`,
    worldRevision: 8137,
    timestamp: 0,
    locationId,
    shotId,
  });

  // Stage A — blind read
  console.log(`=== STAGE A (blind) ${frame} ===`);
  const blind = await callVision(b64, BLIND_PROMPT);
  if (!blind) { console.log('  vision unreachable'); return; }
  console.log(blind.slice(0, 900));
  console.log('');

  // Stage B — full contract + manifest
  console.log(`=== STAGE B (contract) ${frame} ===`);
  const sliceText = slice
    ? slice.sections.map((s) => `[${s.name}] ${s.entries.slice(0, 4).join(' | ')}`).join('\n')
    : '(no location slice)';
  const stageB = `You are the Perceptual Evidence Examiner, Stage B — FULL INSPECTION.

STAGE A (your own blind read, pasted below for continuity):
${blind.slice(0, 1200)}

THE INSPECTION CONTRACT:
${CONTRACT.slice(0, 6000)}

SCENE UNIVERSE SLICE for the inspected location:
${sliceText}

APPLICABLE GENESIS PASS MANIFEST:
${JSON.stringify(manifest.applicablePasses, null, 2)}

INSTRUCTIONS:
1. Run PHASES B-X from the contract on the SAME frame.
2. For every applicable pass in the manifest: PASS / PARTIAL / FAIL /
   NOT_EVALUABLE with observed + missing evidence (PHASE X).
3. Tiled 3x3 forensic sweep (contract section 3).
4. Output the FULL contract output format (section 6): VISION VERDICT,
   TOP FAILURES with edit-scope diagnosis, GENESIS PASS COVERAGE,
   WORLD DENSITY, TECHNICAL DEFECTS, NOT EVALUABLE, NEXT INSPECTION.
5. End with the AAA COMPLETENESS QUESTION (section 8).
6. Anti-self-deception rules (section 7) apply throughout.`;
  const full = await callVision(b64, stageB);
  if (!full) { console.log('  vision unreachable'); return; }

  mkdirSync(OUT, { recursive: true });
  const verdictPath = join(OUT, `${frame.replace(/\.png$/i, '')}.verdict.txt`);
  writeFileSync(verdictPath, `# VISION INSPECTION — ${frame}\n\n## STAGE A (blind)\n${blind}\n\n## STAGE B (contract)\n${full}\n`);
  console.log(`wrote ${verdictPath}`);
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const frames = args.length > 0 ? args : ['shot.1B', 'ep3.mount', 'ep3.02'];
  for (const f of frames) await inspectFrame(f);
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
