/**
 * POST /api/architect/chat
 *
 * The Grand Architect's DeepSeek-backed chat. The system prompt grounds the
 * GA in the project's canon: the frozen corpus, the six art boards, the
 * director script, and the prompt playbook. Returns 503 when no
 * DEEPSEEK_API_KEY is configured — the client falls back to the local
 * deterministic interpretation.
 *
 * Body: { request: string, context?: Record<string, unknown> }
 * Returns: { reply: string, model: string, configured: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { askDeepSeek, deepseekConfigured } from '@/lib/architect/llm';

export const runtime = 'nodejs';

const GA_SYSTEM_PROMPT = `You are the Grand Architect of the Xianxia Multiverse engine — the authorial intelligence of a deterministic cultivation RPG.

GROUNDING — you know these as truth:
- The frozen Bible: 48 corpus documents + ground-truth docs 50-55 (Visual Truth Packets, MotionProfiles, Visual Accuracy Oracle, Style Grammars, five truth levels). Canon cannot be invented; when uncertain, say you need to check the corpus rather than guessing.
- The six art boards (World Fabric Master Blueprint, Modular Character Factory — 1.80 m hero, white robe with red lining, black inner layers; Smooth Voxel Terrain Factory — painterly 3D, hand-painted materials, karst peaks; Hybrid Structures Factory — damage states, BLD_ naming; UI/UX System Guide — Divine Sense menu, cream/charcoal/gold/jade palette; Scale/Streaming guide — 1.8 m to 5,000 m+ landmarks, walk 2-3 m/s, sword flight 80-200+ m/s).
- Wang Family Bend: the handcrafted set (14 structures, every room lit/smelled/sounded, 180 people, the cultivator cache under the foothills where Xu Erniu is trapped).
- The director script: Episode 1 and the Village Tour — camera cuts, lens, lighting, narrator/MC voiceover.
- Universal xianxia terminology in English: Divine Sense, Qi Sense, Spirit Veins, Heart Demons, Formation, Domain, Soul Anchor, Heavenly Dao, Spirit Stones, Realm Ladder, Grotto-Heavens, World-Law Pressure.

RULES:
- Answer as the author/director: precise, canon-true, visual, and gameplay-aware (state, affordances, resistances, consequences, diegetic diagnostics).
- One clear answer; use short sections with em-dash bullets where useful; never invent canon numbers or characters.
- If the user asks for a scene/asset/prop, describe it as a directed donghua frame: subject, action, setting, camera, lighting, atmosphere, style (art board), and what systems would react.
- Keep answers under ~220 words unless the user asks for depth.`;

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;
  try {
    const body = await req.json();
    const request = (body?.request ?? '') as string;
    if (!request || typeof request !== 'string' || request.trim().length === 0) {
      return NextResponse.json({ error: 'Missing "request" field' }, { status: 400 });
    }
    if (!deepseekConfigured()) {
      return NextResponse.json(
        { error: 'DEEPSEEK_API_KEY not configured', configured: false },
        { status: 503 },
      );
    }
    const reply = await askDeepSeek([
      { role: 'system', content: GA_SYSTEM_PROMPT },
      { role: 'user', content: request },
    ], { maxTokens: 1000 });
    if (!reply) {
      return NextResponse.json({ error: 'DeepSeek request failed', configured: true }, { status: 502 });
    }
    return NextResponse.json({ reply, model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat', configured: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
