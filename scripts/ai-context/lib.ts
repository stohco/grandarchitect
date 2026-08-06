/**
 * scripts/ai-context/lib.ts
 *
 * Shared utilities for the ai:doctor, ai:check, and ai:build commands.
 * Pure Node/Bun — no external dependencies beyond zod (already in
 * package.json).
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

export const REPO_ROOT = process.cwd();

export interface GitState {
  commit: string | null;
  commitShort: string | null;
  branch: string | null;
  dirty: boolean;
  dirtyFiles: string[];
}

export function tryGit(command: string): string | null {
  try {
    return execSync(command, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

export function getGitState(): GitState {
  const commit = tryGit('git rev-parse HEAD');
  const branch = tryGit('git rev-parse --abbrev-ref HEAD');
  const status = tryGit('git status --porcelain') ?? '';
  const dirtyFiles = status
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[MARD?C!]+\s+/, ''));
  return {
    commit,
    commitShort: commit ? commit.slice(0, 12) : null,
    branch,
    dirty: dirtyFiles.length > 0,
    dirtyFiles,
  };
}

export interface PackageJson {
  name: string;
  version: string;
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function readPackageJson(): PackageJson {
  const pkgPath = join(REPO_ROOT, 'package.json');
  if (!existsSync(pkgPath)) {
    throw new Error(`package.json not found at ${pkgPath}`);
  }
  return JSON.parse(readFileSync(pkgPath, 'utf-8'));
}

export function readJson<T = unknown>(path: string): T {
  const full = join(REPO_ROOT, path);
  if (!existsSync(full)) {
    throw new Error(`File not found: ${path}`);
  }
  return JSON.parse(readFileSync(full, 'utf-8')) as T;
}

export function fileExists(path: string): boolean {
  return existsSync(join(REPO_ROOT, path));
}

export function listFiles(dir: string, pattern: RegExp = /.*/): string[] {
  const full = join(REPO_ROOT, dir);
  if (!existsSync(full)) return [];
  // Use a recursive walk that ignores node_modules and .git
  const out: string[] = [];
  const stack: string[] = [full];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: string[] = [];
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.git' || entry === '.next') continue;
      const entryPath = join(current, entry);
      try {
        const stat = statSync(entryPath);
        if (stat.isDirectory()) {
          stack.push(entryPath);
        } else if (pattern.test(entry)) {
          out.push(entryPath.replace(REPO_ROOT + '/', ''));
        }
      } catch {
        continue;
      }
    }
  }
  return out.sort();
}

export interface CheckResult {
  ok: boolean;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  evidence?: string;
}

export function ok(message: string): CheckResult {
  return { ok: true, message };
}

export function fail(
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  evidence?: string,
): CheckResult {
  return { ok: false, message, severity, evidence };
}

export function formatTimestamp(d: Date = new Date()): string {
  return d.toISOString();
}

/**
 * Extract `bun run <script>` references from a markdown file.
 * Returns the set of script names referenced.
 */
export function extractBunRunScripts(markdownPath: string): Set<string> {
  if (!existsSync(join(REPO_ROOT, markdownPath))) return new Set();
  const text = readFileSync(join(REPO_ROOT, markdownPath), 'utf-8');
  const out = new Set<string>();
  // Match `bun run <name>` or `bun run <name>` in code blocks
  const re = /bun\s+run\s+([a-zA-Z0-9:_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.add(m[1]);
  }
  return out;
}

/**
 * Compare tool shim files. The title (line 1) and the tagline blockquote
 * that follows may differ per tool (they name the tool). Everything from
 * the first `## ` heading onward must be byte-identical across all shims.
 *
 * Returns true if the bodies match.
 */
export function shimsMatch(paths: string[]): boolean {
  if (paths.length < 2) return true;
  const bodies: string[] = paths.map((p) => {
    const full = join(REPO_ROOT, p);
    if (!existsSync(full)) return '';
    const text = readFileSync(full, 'utf-8');
    // Find the first `## ` heading and compare from there.
    const match = text.match(/\n## /);
    if (!match || match.index === undefined) return '';
    return text.slice(match.index).trim();
  });
  return bodies.every((b) => b === bodies[0]);
}
