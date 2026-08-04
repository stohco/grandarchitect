/**
 * POST /api/architect/interpret
 *
 * Interpret a free-text request from the architect chat. When the
 * z-ai-web-dev-sdk is reachable we use it to draft a response; otherwise we
 * fall back to a deterministic canned reply so the editor UI never blocks.
 *
 * Body: { message: string, context?: { seed: string, tick: number, selectedEntityIds: number[] } }
 * Returns: { reply: string, toolsUsed: string[], intent: string }
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface InterpretBody {
  message: string;
  context?: { seed?: string; tick?: number; selectedEntityIds?: number[] };
}

// Lazy-load the SDK so the route still boots if the module is unavailable.
async function trySdkReply(message: string): Promise<string | null> {
  try {
    const mod = await import('z-ai-web-dev-sdk');
    // The SDK exposes a default export with a .create() method.
    const ZAI = (mod as { default?: { create: () => Promise<unknown> } }).default ?? (mod as unknown as { create: () => Promise<unknown> });
    if (!ZAI || typeof ZAI.create !== 'function') return null;
    const zai = await ZAI.create();
    const chat = (zai as { chat?: { completions?: { create: (p: unknown) => Promise<unknown> } } }).chat;
    if (!chat?.completions?.create) return null;
    const res = (await chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        { role: 'system', content: 'You are the Grand Architect, an ancient being guiding a xianxia world simulation. Reply in 2-3 calm, archaic sentences.' },
        { role: 'user', content: message },
      ],
    })) as { choices?: { message?: { content?: string } }[] };
    return res?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

const CANNED: { match: RegExp; reply: string; tools: string[]; intent: string }[] = [
  {
    match: /fork|branch|what.?if/i,
    reply: 'I have set aside a temporary fork of this bend. The main thread remains untouched while we explore this thread of possibility.',
    tools: ['world.fork'],
    intent: 'fork',
  },
  {
    match: /spawn|create|new (entity|household|shrine)/i,
    reply: 'A new structure has been woven into the bend. Its foundation stone is laid; the household spirits are not yet bound.',
    tools: ['entity.spawn'],
    intent: 'spawn',
  },
  {
    match: /move|translate|relocat/i,
    reply: 'The structure drifts to its new position. The earth remembers both where it was and where it now rests.',
    tools: ['entity.transform'],
    intent: 'transform',
  },
  {
    match: /step|advance|next tick/i,
    reply: 'The world clock advances one tick. The river does not notice; the ancestors notice everything.',
    tools: ['time.advance_tick'],
    intent: 'step',
  },
  {
    match: /weather|rain|storm|sun/i,
    reply: 'I have bent the sky above the bend. The paddies will drink deeply tonight.',
    tools: ['weather.set_pattern'],
    intent: 'weather',
  },
  {
    match: /hello|greet|who are you/i,
    reply: 'I am the Grand Architect. I shaped the mountains before the Wangs were a surname, and I will tidy this bend when the Wangs are a memory. Speak, and I will shape.',
    tools: [],
    intent: 'greet',
  },
];

function cannedReply(message: string): { reply: string; toolsUsed: string[]; intent: string } {
  const hit = CANNED.find((c) => c.match.test(message));
  if (hit) return { reply: hit.reply, toolsUsed: hit.tools, intent: hit.intent };
  return {
    reply: 'I have heard your request. The world is a patient pupil; I will instruct it accordingly. Tell me more, and I will shape more.',
    toolsUsed: ['world.query_state'],
    intent: 'unknown',
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as InterpretBody;
  const message = (body.message ?? '').toString().slice(0, 2000);

  const sdkReply = await trySdkReply(message);
  if (sdkReply) {
    const canned = cannedReply(message);
    return NextResponse.json({
      reply: sdkReply,
      toolsUsed: canned.toolsUsed,
      intent: canned.intent,
    });
  }
  const canned = cannedReply(message);
  return NextResponse.json(canned, { headers: { 'Cache-Control': 'no-store' } });
}
