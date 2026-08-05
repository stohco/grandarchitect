import { NextResponse } from 'next/server';

/**
 * Guards mutation API routes so they only work in development.
 * In production, these routes return 403 Forbidden.
 *
 * This addresses the audit finding that several public API routes are unsafe:
 * - POST /api/engine/run-tests spawns server-side processes
 * - POST /api/frontier/world-store writes files to disk
 * - POST /api/frontier/operation-graph mutates server state
 * - POST /api/editor/crash-report persists arbitrary JSON to disk
 * - POST /api/architect/* does analysis without auth/quota
 *
 * Usage at the top of any POST handler:
 *   const guard = requireDevMode();
 *   if (guard) return guard;
 */

export function requireDevMode() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        error: 'This mutation route is development-only and disabled in production.',
        route: 'mutation-disabled',
      },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Rate limiter for crash-report endpoint — prevents disk fill from
 * unauthenticated submissions. Uses a simple in-memory counter per IP.
 */

const crashReportTimestamps = new Map<string, number[]>();
const CRASH_RATE_WINDOW_MS = 60_000; // 1 minute
const CRASH_RATE_MAX = 20; // 20 reports per minute per IP

export function checkCrashReportRate(ip: string): boolean {
  const now = Date.now();
  const timestamps = crashReportTimestamps.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < CRASH_RATE_WINDOW_MS);
  if (recent.length >= CRASH_RATE_MAX) {
    return false; // rate limited
  }
  recent.push(now);
  crashReportTimestamps.set(ip, recent);
  return true; // allowed
}

/**
 * Body size cap for crash-report submissions — prevents oversized payloads.
 */
export const CRASH_REPORT_MAX_BYTES = 512 * 1024; // 512 KB
