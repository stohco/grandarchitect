/**
 * Exclusive Project Lease
 *
 * Prevents concurrent modifying iterations. Every cron invocation must
 * acquire this lease before doing any work, and release it when done.
 *
 * Stale-lock recovery: if the heartbeat is older than maxDuration,
 * the lock is considered stale and can be stolen.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

const LEASE_FILE = join(process.cwd(), '.engine-lease');
const MAX_DURATION_MS = 14 * 60 * 1000; // 14 minutes (must be < cron interval)
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds

export interface LeaseInfo {
  pid: number;
  taskId: string;
  startTime: number;
  lastHeartbeat: number;
}

export interface LeaseResult {
  acquired: boolean;
  reason?: string;
  existingLease?: LeaseInfo;
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function acquireLease(taskId: string): LeaseResult {
  if (existsSync(LEASE_FILE)) {
    const content = readFileSync(LEASE_FILE, 'utf-8');
    try {
      const existing: LeaseInfo = JSON.parse(content);
      const now = Date.now();
      const age = now - existing.lastHeartbeat;

      if (age < MAX_DURATION_MS) {
        // Lease is still active
        return {
          acquired: false,
          reason: `Lease held by PID ${existing.pid} for task ${existing.taskId} (heartbeat ${Math.round(age / 1000)}s ago)`,
          existingLease: existing,
        };
      }

      // Lease is stale — steal it
      console.log(`[lease] Stale lock detected (age: ${Math.round(age / 1000)}s), stealing`);
    } catch {
      // Corrupt lease file — steal it
      console.log('[lease] Corrupt lease file, stealing');
    }
  }

  const lease: LeaseInfo = {
    pid: process.pid,
    taskId,
    startTime: Date.now(),
    lastHeartbeat: Date.now(),
  };

  writeFileSync(LEASE_FILE, JSON.stringify(lease, null, 2));

  // Start heartbeat
  heartbeatTimer = setInterval(() => {
    updateHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);

  return { acquired: true };
}

export function updateHeartbeat(): void {
  if (!existsSync(LEASE_FILE)) return;
  try {
    const content = readFileSync(LEASE_FILE, 'utf-8');
    const lease: LeaseInfo = JSON.parse(content);
    if (lease.pid !== process.pid) return; // Not our lease
    lease.lastHeartbeat = Date.now();
    writeFileSync(LEASE_FILE, JSON.stringify(lease, null, 2));
  } catch {
    // Ignore heartbeat errors
  }
}

export function releaseLease(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (!existsSync(LEASE_FILE)) return;

  try {
    const content = readFileSync(LEASE_FILE, 'utf-8');
    const lease: LeaseInfo = JSON.parse(content);
    if (lease.pid === process.pid) {
      unlinkSync(LEASE_FILE);
      console.log('[lease] Released');
    }
  } catch {
    // Ignore errors during release
  }
}

export function getLeaseInfo(): LeaseInfo | null {
  if (!existsSync(LEASE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(LEASE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

// Auto-release on process exit
process.on('exit', releaseLease);
process.on('SIGINT', () => {
  releaseLease();
  process.exit(0);
});
process.on('SIGTERM', () => {
  releaseLease();
  process.exit(0);
});
