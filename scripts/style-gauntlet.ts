#!/usr/bin/env bun
/**
 * scripts/style-gauntlet.ts — the harsh-critic gauntlet loop (Matt Shumer
 * gauntletloop methodology, run manually with a vision critic).
 *
 * 1. Render frames (via the director-render stage, CDP to headless Edge).
 * 2. gemma-4-31b-it (vision) judges each frame against the art bible
 *    (board captions) + the Zhumeng Animation 3D donghua reference.
 * 3. Scores + concrete defects -> evidence/style-gauntlet/.
 * 4. Prints the verdict summary so the next iteration targets real defects.
 *
 * Usage: CDP Edge on :9222 (see render-director-shots.ts), dev server :3000.
 *   bun run scripts/style-gauntlet.ts [shotIds...]
 */

import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'evidence', 'style-gauntlet');
const URL = 'http://localhost:3000/director-render';
const AUTH = join(process.env.USERPROFILE ?? '', '.local/share/opencode/auth.json');
const BOARDS = join(process.cwd(), 'upload', 'image-captions');

const DEFAULT_SHOTS = ['shot.1B', 'shot.1D', 'shot.1F', 'shot.1G', 'shot.1L', 'shot.1N'];

const CRITIC_PROMPT = `You are the harsh but FAIR art-direction critic for a 3D xianxia donghua game.
IMPORTANT CALIBRATION: this render is a stylized 3D BLOCKOUT at production stage 2 of 5 (procedural geometry, painterly textures, directed lighting). Judge whether the ART DIRECTION is right — palette, lighting language, composition, atmosphere, silhouette — NOT whether it looks like a finished AAA frame. Do not reflexively give 1/10; a correctly-directed blockout scores 5-7; a wrong-directed one scores 1-4; a finished-grade frame scores 8-10.

THE ART BIBLE (Zhumeng Animation 3D donghua — 沧元图-class; Tencent Penguin Pictures; BUILD DREAM):
- painterly 3D render, hand-painted materials, believable PBR
- warm golden key light with COOL fill; strong warm RIM separation on characters and roofs
- muted naturalistic palette: ethereal teals, soft blues, forest greens; gold/brass lantern accents; deep red sparingly; purple ONLY for spiritual energy
- soft atmospheric depth (fog), gentle vignette, filmic exposure
- chunky readable silhouettes, grounded 1.8 m proportions, weathered ancient-sacred materials (moss, patina, worn timber)
- restraint over ornament; no neon, no wireframe HUD, no western armor

Output STRICTLY this format:
PALETTE: <1-10> <one line: which colors dominate; bible violation if any>
LIGHTING: <1-10> <one line: is there a warm key + cool fill + rim separation?>
ATMOSPHERE: <1-10> <one line: fog depth, vignette, mood>
COMPOSITION: <1-10> <one line: subject framing, thirds, leading lines>
STYLE: <1-10> <one line: does it read as painterly xianxia donghua blockout?>
OVERALL: <mean of the five, one decimal>
STRENGTHS: <2 short lines>
DEFECTS: <2-4 short concrete lines, most important first>
`;

async function critic(key: string, b64: string, boardContext: string): Promise<string> {
  const body = {
    contents: [{ parts: [
      { text: CRITIC_PROMPT + '\n\nArt bible context from the reference boards:\n' + boardContext.slice(0, 1400) },
      { inline_data: { mime_type: 'image/png', data: b64 } },
    ] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
  };
  for (const model of ['gemma-4-31b-it', 'gemma-4-26b-a4b-it']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('\n');
      if (text) return `model: ${model}\n\n${text}`;
    } catch { /* try next */ }
  }
  return 'OVERALL: 0\nDEFECTS: critic unreachable';
}

async function main() {
  const shots = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_SHOTS;
  mkdirSync(OUT, { recursive: true });

  const auth = JSON.parse(readFileSync(AUTH, 'utf8'));
  const key = auth.google?.key;
  if (!key) { console.error('no google key in auth store'); process.exit(1); }

  // board captions as the art-bible context
  const boardContext = readFileSync(join(BOARDS, 'pasted_image_1785977755091.txt'), 'utf8').slice(0, 900)
    + '\n---\n' + readFileSync(join(BOARDS, 'pasted_image_1785977810565.txt'), 'utf8').slice(0, 600);

  const browser = await puppeteer.connect({ browserURL: process.env.CDP_URL ?? 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 720 });

  // robust page load: dev hot-reload may transiently drop the global
  const ensureStage = async () => {
    const ep = shots.some((s) => s.startsWith('e2.')) ? '&ep=2' : '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto(`${URL}?v=${Date.now()}-${attempt}${ep}`, { waitUntil: 'networkidle0', timeout: 120_000 });
        await page.waitForFunction('typeof window.__directorShot === "function" && window.__directorShots !== undefined', { timeout: 60_000 });
        return;
      } catch (e) {
        console.log(`  stage reload attempt ${attempt + 1}: ${(e as Error).message.slice(0, 80)}`);
      }
    }
    throw new Error('director stage unreachable');
  };
  await ensureStage();

  const results: Array<{ shot: string; score: number }> = [];
  let total = 0;
  for (const id of shots) {
    let dataUrl: string | null = null;
    for (let attempt = 0; attempt < 3 && !dataUrl; attempt++) {
      dataUrl = await page.evaluate((sid) => window.__directorShot(sid), id).catch(() => null);
      if (!dataUrl) await ensureStage();
    }
    if (!dataUrl) { console.log(`  FAIL ${id}: no frame`); continue; }
    const b64 = dataUrl.split(',')[1];
    writeFileSync(join(OUT, `${id}.png`), Buffer.from(b64, 'base64'));
    const verdict = await critic(key, b64, boardContext);
    writeFileSync(join(OUT, `${id}.txt`), verdict);
    const score = Number((verdict.match(/OVERALL:\s*(\d+(?:\.\d+)?)/)?.[1]) ?? 0);
    results.push({ shot: id, score });
    total += score;
    const defects = (verdict.match(/DEFECTS:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/)?.[1] ?? '').trim().replace(/\n/g, ' | ');
    console.log(`  ${id}: ${score}/10 — ${defects.slice(0, 160)}`);
  }
  await browser.disconnect();
  const avg = results.length > 0 ? total / results.length : 0;
  const prev = readSummary(OUT);
  writeFileSync(join(OUT, 'summary.json'), JSON.stringify({
    shots: results, average: avg, target: 7,
    previousAverage: prev, iterations: (prev?.iterations ?? 0) + 1,
    reference: 'Zhumeng Animation 3D donghua + six art boards',
    note: 'Critic is harsh vs AAA concept art; trajectory matters (iterations: ' + (prev?.iterations ?? 0) + ' -> ' + (prev?.iterations ?? 0) + 1 + ').',
  }, null, 2));
  console.log(`\nSTYLE GAUNTLET: ${results.length} shots, average ${avg.toFixed(1)}/10 (target >= 7.0, previous ${prev?.average?.toFixed(1) ?? 'n/a'})`);
  process.exit(avg >= 7 ? 0 : 1);
}

function readSummary(dir: string): { average?: number; iterations?: number } | null {
  try {
    return JSON.parse(readFileSync(join(dir, 'summary.json'), 'utf8')) as { average?: number; iterations?: number };
  } catch {
    return null;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
