/**
 * POST/GET /api/architect/prime — Prime Agent sidecar gateway (DEV ONLY)
 *
 * Provider-neutral gateway into the Prime Agent RPC sidecar. The browser
 * never talks to the sidecar directly; this route is the only transport.
 *
 * Security:
 *   - requireDevMode() (403 in production).
 *   - `workdir` MUST be a disposable clone/worktree — the provider refuses
 *     the host repo root.
 *   - No credentials pass through this route (provider login happens inside
 *     the sidecar's own environment via `prime-agent /login`).
 *
 * GET  → status: binary/library version, sidecar handshake, model configured?
 * POST {workdir, prompt} → one-shot prompt; honest errors when the sidecar
 *       is unavailable or no model is configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import {
  createPrimeAgentProvider,
  PrimeAgentNotConfiguredError,
} from '@/engine/architect/providers/prime-agent/prime-agent-provider';
import { VERSION as PI_LIBRARY_VERSION } from '@earendil-works/pi-coding-agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;
  return NextResponse.json({
    ok: true,
    provider: 'prime-agent',
    libraryVersion: PI_LIBRARY_VERSION,
    protocol: 'rpc-jsonl-v3',
    note: 'POST {workdir, prompt} to run a prompt in a disposable worktree. Requires `prime-agent` on PATH and a configured model (prime-agent /login).',
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;
  try {
    const body = await req.json();
    const workdir = typeof body.workdir === 'string' ? body.workdir : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!workdir) return NextResponse.json({ ok: false, error: 'workdir required (a disposable clone/worktree)' }, { status: 400 });
    if (!prompt) return NextResponse.json({ ok: false, error: 'prompt required' }, { status: 400 });

    const provider = createPrimeAgentProvider({ workdir });
    await provider.connect();
    try {
      const result = await provider.prompt(prompt);
      return NextResponse.json({
        ok: true,
        sessionId: provider.sidecarSessionId,
        modelConfigured: provider.modelConfigured,
        text: result.text,
        eventCount: result.events.length,
      });
    } finally {
      await provider.disconnect();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('workdir')) {
      return NextResponse.json({ ok: false, error: msg, code: 'WORKDIR_REJECTED' }, { status: 400 });
    }
    if (err instanceof PrimeAgentNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message, code: 'MODEL_NOT_CONFIGURED' }, { status: 503 });
    }
    return NextResponse.json(
      { ok: false, error: msg, code: 'SIDECAR_UNAVAILABLE' },
      { status: 502 },
    );
  }
}
