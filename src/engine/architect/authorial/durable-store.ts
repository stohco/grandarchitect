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

const cache = new Map<AuthorialStoreKey, { mtime: number; data: unknown }>();

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
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
    const parsed = JSON.parse(raw) as T;
    cache.set(key, { mtime: stat.mtimeMs, data: parsed });
    return parsed;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: AuthorialStoreKey, data: T): Promise<void> {
  await ensureDir();
  const filePath = FILES[key];
  const tmp = `${filePath}.tmp`;
  const raw = JSON.stringify(data, null, 2);
  await fs.writeFile(tmp, raw, 'utf8');
  await fs.rename(tmp, filePath);
  const stat = await fs.stat(filePath);
  cache.set(key, { mtime: stat.mtimeMs, data });
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
