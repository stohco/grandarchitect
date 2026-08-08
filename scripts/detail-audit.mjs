#!/usr/bin/env bun
/**
 * scripts/detail-audit.mjs — the vision department's dailies review.
 *
 * The FASTEST free vision tier available runs the exhaustive gemma-4-style
 * inspection prompt (Gemma-4 technical-report technique): not scores, but
 * facts — content inventory, layout/clipping detection, silhouette quality,
 * light behavior per object, atmosphere layering, and concrete defects.
 * Primary: gemini-3-flash-preview (free tier, ~9s/frame with the full audit
 * prompt). Fallbacks: gemma-4-31b-it, then gemma-4-26b-a4b-it (last resort;
 * frequently 503s on images).
 *
 * Usage: bun run scripts/detail-audit.mjs [frame.png ...]
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'evidence', 'detail-audit');
const DEFAULTS = ['shot.1B', 'shot.1D', 'shot.1G', 'shot.1N'];

const AUDIT_PROMPT = `You are the director's assistant reviewing DAILIES for a 3D xianxia donghua game. Inspect the attached frame in exhaustive detail and report FACTS:

1. CONTENT INVENTORY: enumerate every category of visible object (buildings, roofs, trees, paths, wells, shrines, fences, animals, people, water, mountains) — approximately how many of each, and WHERE in the frame (left/center/right, foreground/midground/background).
2. LAYOUT / CLIPPING: are any structures intersecting, overlapping, or touching each other improperly? Do any objects clip through roofs, walls, or the ground? Are any objects floating above the ground? Be specific about which objects and where.
3. SILHOUETTES: describe the building silhouettes (roof shapes, eaves, proportions). Do they read as Chinese/traditional architecture? Are they chunky and readable or blob-like?
4. LIGHTING: for the MAIN structures, is there a clear light direction? Which faces are lit, which are in shadow? Is there warm/cool contrast? Rim light on any objects?
5. ATMOSPHERE: is there fog/haze layering between foreground and background? Depth cues?
6. TEXTURE/SURFACE: can you see any material detail (thatch, wood grain, moss)? Do surfaces look flat or textured?
7. DEFECTS: list every visual defect you can find, most visible first (e.g. "the roof of the right house intersects the wall", "empty flat area at bottom left", "tree trunks are plain brown boxes").

Be exhaustive and specific with positions. Do not give scores. Do not praise. Only facts and defects.`;

async function audit(key, b64) {
  const body = {
    contents: [{ parts: [
      { text: AUDIT_PROMPT },
      { inline_data: { mime_type: 'image/png', data: b64 } },
    ] }],
    generationConfig: { temperature: 0.15, maxOutputTokens: 1600 },
  };
  // gemini-3-flash-preview first: fastest free vision tier; runs the SAME
  // exhaustive gemma-style inspection prompt (verified to produce detailed
  // factual audits, ~9s/frame vs gemma-4-31b-it's ~30s+). Fallbacks: gemma
  // 4 31B dense, then gemma 4 26B A4B (503s on images — kept as last resort).
  for (const model of ['gemini-3-flash-preview', 'gemma-4-31b-it', 'gemma-4-26b-a4b-it']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!r.ok) { const e = await r.json().catch(() => null); console.log(`  [${model} HTTP ${r.status}: ${e?.error?.message ?? ''}]`); continue; }
      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n');
      if (text) return { model, text };
    } catch { /* next */ }
  }
  return { model: 'none', text: 'auditor unreachable' };
}

async function main() {
  const args = process.argv.slice(2);
  const frames = args.length > 0 ? args : DEFAULTS;
  mkdirSync(OUT, { recursive: true });

  let googleKey = process.env.GOOGLE_API_KEY;
  try {
    const auth = JSON.parse(readFileSync(join(process.env.USERPROFILE ?? '', '.local/share/opencode/auth.json'), 'utf8'));
    googleKey = googleKey ?? auth.google?.key;
  } catch { /* env-only */ }
  if (!googleKey) { console.error('no google key'); process.exit(1); }

  const base = join(process.cwd(), 'evidence', 'style-gauntlet');
  const report = [];
  for (const f of frames) {
    const png = f.endsWith('.png') ? f : `${f}.png`;
    const path = join(base, png);
    let b64;
    try {
      b64 = readFileSync(path).toString('base64');
    } catch {
      console.log(`  SKIP ${f}: no frame at ${path}`);
      continue;
    }
    console.log(`=== AUDIT ${f} ===`);
    const { text } = await audit(googleKey, b64);
    writeFileSync(join(OUT, `${f}.audit.txt`), text);
    console.log(text.slice(0, 2200));
    console.log('');
    report.push({ frame: f, audit: text });
  }
  writeFileSync(join(OUT, 'audit-report.json'), JSON.stringify(report, null, 2));
  console.log(`wrote ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
