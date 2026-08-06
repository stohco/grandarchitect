/**
 * Durable Store — Authorial Persistence Layer
 * =============================================
 *
 * Persists authorial state to disk so decisions survive process restarts.
 * Required for the auditor's "restart persistence proof" milestone.
 *
 * Storage: JSON files under data/authorial/
 *  - ledgers.json         — all 5 decision ledgers + narrative world graph
 *  - canon-rules.json     — compiled Bible canon rules
 *  - style-constraints.json — compiled style constraints
 *  - loops.json           — UnboundLoop states (active + recent completed)
 *  - vertical-slices.json — full traces of executed vertical slices
 *
 * All writes are atomic (write to temp, rename).
 * Reads are lazy and cached — if the file changes, the cache is invalidated
 * by mtime check.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data', 'authorial');

const FILES = {
  ledgers: path.join(DATA_DIR, 'ledgers.json'),
  canon: path.join(DATA_DIR, 'canon-rules.json'),
  style: path.join(DATA_DIR, 'style-constraints.json'),
  loops: path.join(DATA_DIR, 'loops.json'),
  slices: path.join(DATA_DIR, 'vertical-slices.json'),
} as const;

export type AuthorialStoreKey = keyof typeof FILES;

// ---------------------------------------------------------------------------
// Schema versioning — every persisted file is wrapped in an envelope with
// a schema version and checksum. This enables migration and corruption
// detection (auditor's requirements).
// ---------------------------------------------------------------------------

export const SCHEMA_VERSION = 1;

export interface PersistedEnvelope<T> {
  schemaVersion: number;
  checksum: string;
  writtenAt: string;
  data: T;
}

const cache = new Map<AuthorialStoreKey, { mtime: number; data: unknown }>();

// Write lock — prevents concurrent writers from corrupting files.
// Each key has its own lock promise chain.
const writeLocks = new Map<AuthorialStoreKey, Promise<void>>();

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/**
 * Compute a deterministic checksum (FNV-1a) for the data payload.
 * Used for corruption detection — if the file is edited outside the
 * store, the checksum won't match and the read will fail.
 */
function computeChecksum(data: unknown): string {
  const content = JSON.stringify(data);
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < content.length; i++) {
    const c = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return `fnv-${h1.toString(16).padStart(8, '0')}-${h2.toString(16).padStart(8, '0')}`;
}

async function readJson<T>(key: AuthorialStoreKey, fallback: T): Promise<T> {
  try {
    const filePath = FILES[key];
    const stat = await fs.stat(filePath);
    const cached = cache.get(key);
    if (cached && cached.mtime === stat.mtimeMs) {
      return cached.data as T;
    }
    const raw = await fs.readFile(filePath, 'utf8');

    // Try to parse as envelope (new format with schema version + checksum).
    try {
      const envelope = JSON.parse(raw) as PersistedEnvelope<T>;
      if (envelope && typeof envelope.schemaVersion === 'number' && typeof envelope.checksum === 'string') {
        // Verify checksum — corruption detection.
        const expectedChecksum = computeChecksum(envelope.data);
        if (envelope.checksum !== expectedChecksum) {
          console.warn(`[durable-store] Checksum mismatch for ${key}: expected ${expectedChecksum}, got ${envelope.checksum}. File may be corrupted. Falling back.`);
          return fallback;
        }
        // Verify schema version — migration hook.
        if (envelope.schemaVersion > SCHEMA_VERSION) {
          console.warn(`[durable-store] Future schema version ${envelope.schemaVersion} for ${key} (current: ${SCHEMA_VERSION}). Attempting to read anyway.`);
        }
        cache.set(key, { mtime: stat.mtimeMs, data: envelope.data });
        return envelope.data;
      }
    } catch {
      // Not an envelope — fall through to legacy parsing.
    }

    // Legacy format (no envelope) — parse directly for backward compatibility.
    const parsed = JSON.parse(raw) as T;
    cache.set(key, { mtime: stat.mtimeMs, data: parsed });
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * Write data atomically with schema version + checksum.
 *
 * Atomic write strategy:
 *   1. Write to ${filePath}.tmp
 *   2. Rename tmp → filePath (atomic on POSIX)
 *   3. If the process is killed during step 1, the .tmp file is orphaned
 *      but the original file is intact.
 *   4. If the process is killed during step 2 (extremely unlikely), the
 *      rename is atomic — either it happened or it didn't.
 *
 * Write locking prevents concurrent writers from creating overlapping
 * .tmp files.
 */
async function writeJson<T>(key: AuthorialStoreKey, data: T): Promise<void> {
  // Acquire write lock — chain after any in-progress write.
  const prevLock = writeLocks.get(key) ?? Promise.resolve();
  const newLock = prevLock.then(async () => {
    await ensureDir();
    const filePath = FILES[key];
    const tmp = `${filePath}.tmp`;
    const envelope: PersistedEnvelope<T> = {
      schemaVersion: SCHEMA_VERSION,
      checksum: computeChecksum(data),
      writtenAt: new Date().toISOString(),
      data,
    };
    const raw = JSON.stringify(envelope, null, 2);
    await fs.writeFile(tmp, raw, 'utf8');
    await fs.rename(tmp, filePath);
    const stat = await fs.stat(filePath);
    cache.set(key, { mtime: stat.mtimeMs, data });

    // Clean up any orphaned .tmp files from prior crashes.
    try {
      await fs.access(tmp);
      await fs.unlink(tmp);
    } catch {
      // .tmp doesn't exist — good.
    }
  }).catch((err) => {
    console.error(`[durable-store] Write failed for ${key}:`, err);
    throw err;
  });
  writeLocks.set(key, newLock);
  await newLock;
}

export const durableStore = {
  read: readJson,
  write: writeJson,
  files: FILES,
  dataDir: DATA_DIR,
};

/**
 * Convenience: append an item to a JSON array file.
 */
export async function appendToJsonArray<T>(
  key: AuthorialStoreKey,
  item: T,
  maxItems = 200,
): Promise<T[]> {
  const current = await readJson<T[]>(key, []);
  current.push(item);
  // Trim oldest entries beyond maxItems.
  if (current.length > maxItems) {
    current.splice(0, current.length - maxItems);
  }
  await writeJson(key, current);
  return current;
}

/**
 * Convenience: replace the entire contents of a JSON file.
 */
export async function replaceJson<T>(
  key: AuthorialStoreKey,
  data: T,
): Promise<void> {
  await writeJson(key, data);
}
