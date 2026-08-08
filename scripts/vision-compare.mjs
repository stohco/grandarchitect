#!/usr/bin/env bun
/**
 * scripts/vision-compare.mjs — head-to-head vision comparison.
 *
 * Runs the SAME probes (calibration facts + harsh style critic) through
 * gemma-4-31b-it (Google) and the OpenAI vision model (default
 * "gpt-5.6-luna-max", override with OPENAI_VISION_MODEL) on the same
 * frames, and writes both outputs to evidence/vision-compare/.
 *
 * Keys: Google from opencode auth store (or GOOGLE_API_KEY env);
 * OpenAI from opencode auth store access token (or OPENAI_API_KEY env).
 * If the OpenAI token is expired, that side reports and the gemma side
 * still runs.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'evidence', 'vision-compare');
const FRAME = process.argv[2] ?? join(process.cwd(), 'evidence', 'style-gauntlet', 'shot.1G.png');
const OPENAI_MODEL = process.env.OPENAI_VISION_MODEL ?? 'gpt-5.6-luna-max';

const PROBE = `You are a machine-vision calibration probe. Report ONLY the truth about the attached image:
1. DOMINANT COLORS: 3 dominant color families with approximate percentages, as hue buckets, and whether warm or cool dominates.
2. SCENE CONTENT: what objects are visible, one line.
3. LIGHTING: is there visible light direction (shadow sides)? One line.
4. ATMOSPHERE: fog/haze visible? One line.
Do NOT judge quality.`;

const CRITIC = `You are the harsh but FAIR art-direction critic for a 3D xianxia donghua game.
CALIBRATION: this render is a stylized 3D BLOCKOUT (production stage 2 of 5). Judge whether the ART DIRECTION is right — palette, lighting language, composition, atmosphere — NOT finished AAA fidelity.
ART BIBLE (Zhumeng Animation 3D donghua): painterly 3D, hand-painted materials; warm golden key with COOL fill and warm RIM; muted naturalistic palette (ethereal teals, soft blues, forest greens, gold lantern accents, red sparingly, purple only for spiritual energy); soft fog depth, gentle vignette, filmic exposure; chunky silhouettes, 1.8 m proportions, weathered materials.
Output STRICTLY:
PALETTE: <1-10> <one line>
LIGHTING: <1-10> <one line>
ATMOSPHERE: <1-10> <one line>
COMPOSITION: <1-10> <one line>
STYLE: <1-10> <one line>
OVERALL: <mean>
DEFECTS: <2-4 short lines>`;

async function gemma(key, b64, prompt) {
  const body = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/png', data: b64 } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 900 } };
  for (const model of ['gemini-3-flash-preview', 'gemma-4-31b-it', 'gemma-4-26b-a4b-it']) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n');
      if (text) return text;
    } catch { /* next */ }
  }
  return 'ERROR: gemma unreachable';
}

async function openai(key, b64, prompt) {
  const body = { model: OPENAI_MODEL, messages: [
    { role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
    ] },
  ], max_tokens: 900, temperature: 0.1 };
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) return `ERROR: ${j?.error?.message ?? r.status}`;
    return j?.choices?.[0]?.message?.content ?? 'ERROR: empty';
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const b64 = readFileSync(FRAME).toString('base64');
  let googleKey = process.env.GOOGLE_API_KEY;
  let openaiKey = process.env.OPENAI_API_KEY;
  try {
    const auth = JSON.parse(readFileSync(join(process.env.USERPROFILE ?? '', '.local/share/opencode/auth.json'), 'utf8'));
    googleKey = googleKey ?? auth.google?.key;
    openaiKey = openaiKey ?? auth.openai?.access;
  } catch { /* env-only */ }

  const name = FRAME.split(/[\\/]/).pop().replace('.png', '');
  const results = { frame: name, model: OPENAI_MODEL, timestamp: new Date().toISOString() };

  console.log(`=== PROBE (facts) on ${name} ===`);
  const gProbe = await gemma(googleKey, b64, PROBE);
  writeFileSync(join(OUT, `${name}.gemma.probe.txt`), gProbe);
  console.log('--- gemma-4-31b-it ---\n' + gProbe.split('\n').slice(0, 8).join('\n'));
  const oProbe = await openai(openaiKey, b64, PROBE);
  writeFileSync(join(OUT, `${name}.openai.probe.txt`), oProbe);
  console.log(`--- ${OPENAI_MODEL} ---\n` + oProbe.split('\n').slice(0, 8).join('\n'));

  console.log(`\n=== CRITIC (art bible) on ${name} ===`);
  const gCrit = await gemma(googleKey, b64, CRITIC);
  writeFileSync(join(OUT, `${name}.gemma.critic.txt`), gCrit);
  console.log('--- gemma-4-31b-it ---\n' + gCrit.split('\n').slice(0, 8).join('\n'));
  const oCrit = await openai(openaiKey, b64, CRITIC);
  writeFileSync(join(OUT, `${name}.openai.critic.txt`), oCrit);
  console.log(`--- ${OPENAI_MODEL} ---\n` + oCrit.split('\n').slice(0, 8).join('\n'));

  results.gemmaCritic = gCrit.split('\n').slice(0, 12).join('\n');
  results.openaiCritic = oCrit.split('\n').slice(0, 12).join('\n');
  writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log('\nwrote ' + OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
