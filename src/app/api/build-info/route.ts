import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * GET /api/build-info
 *
 * Returns build provenance: commit SHA, branch, dirty status, build timestamp.
 * This lets the Studio display exactly which source commit produced the
 * preview the user is looking at — addressing the audit finding that the
 * repository cannot currently answer "which source commit produced the
 * preview I am using?"
 */

interface BuildInfo {
  commitSha: string | null;
  commitShort: string | null;
  branch: string | null;
  dirty: boolean;
  buildTimestamp: string;
  packageVersion: string;
  nodeEnv: string;
}

function tryGit(command: string): string | null {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

export async function GET() {
  const commitSha = tryGit('git rev-parse HEAD');
  const branch = tryGit('git rev-parse --abbrev-ref HEAD');
  const status = tryGit('git status --porcelain');
  const dirty = status !== null && status.length > 0;

  let packageVersion = 'unknown';
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    packageVersion = pkg.version ?? 'unknown';
  } catch {
    // ignore
  }

  const info: BuildInfo = {
    commitSha,
    commitShort: commitSha ? commitSha.slice(0, 12) : null,
    branch,
    dirty,
    buildTimestamp: new Date().toISOString(),
    packageVersion,
    nodeEnv: process.env.NODE_ENV ?? 'development',
  };

  return NextResponse.json(info, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
