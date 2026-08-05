import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { BUILD_MANIFEST, type BuildManifest } from '@/generated/build-manifest';

/**
 * GET /api/build-info
 *
 * Returns TWO sections:
 *
 * 1. artifact — the immutable build manifest generated at build time.
 *    This proves which source produced the loaded JavaScript.
 *
 * 2. workspace — the current git state of the running server's working tree.
 *    This lets the client detect "workspace changed after build" by
 *    comparing artifact.sourceTreeHash to workspace.sourceTreeHash.
 *
 * In production, the workspace section is omitted (no git access expected).
 */

interface WorkspaceInfo {
  commitSha: string | null;
  commitShort: string | null;
  branch: string | null;
  dirty: boolean;
  sourceTreeHash: string | null;
}

function tryGit(command: string): string | null {
  if (process.env.NODE_ENV === 'production') return null;
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

interface BuildInfoResponse {
  artifact: BuildManifest;
  workspace: WorkspaceInfo | null;
  /** True if the workspace has changed since the artifact was built. */
  workspaceChanged: boolean;
  /** API request time (for diagnostics only — NOT the build time). */
  requestTime: string;
}

export async function GET() {
  const artifact = BUILD_MANIFEST;

  // In development, also report current workspace state so the status bar
  // can warn "workspace changed after build — reload required".
  let workspace: WorkspaceInfo | null = null;
  let workspaceChanged = false;

  if (process.env.NODE_ENV !== 'production') {
    const commitSha = tryGit('git rev-parse HEAD');
    const branch = tryGit('git rev-parse --abbrev-ref HEAD');
    const status = tryGit('git status --porcelain');
    const dirty = status !== null && status.length > 0;

    // Compute current source tree hash for comparison
    let currentTreeHash: string | null = null;
    if (commitSha) {
      const diff = tryGit('git diff HEAD') ?? '';
      const { createHash } = await import('crypto');
      const h = createHash('sha256');
      h.update(commitSha);
      h.update(diff);
      currentTreeHash = h.digest('hex').slice(0, 16);
    }

    workspace = {
      commitSha,
      commitShort: commitSha ? commitSha.slice(0, 12) : null,
      branch,
      dirty,
      sourceTreeHash: currentTreeHash,
    };

    workspaceChanged =
      artifact.sourceTreeHash !== null &&
      currentTreeHash !== null &&
      artifact.sourceTreeHash !== currentTreeHash;
  }

  const response: BuildInfoResponse = {
    artifact,
    workspace,
    workspaceChanged,
    requestTime: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
