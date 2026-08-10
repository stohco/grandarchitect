#!/usr/bin/env bun
/**
 * scripts/ai-context/build.ts
 *
 * `bun run ai:build`
 *
 * Regenerates the machine-generated parts of `.ai/project.manifest.json`
 * from the actual codebase. The script preserves human-curated fields
 * (milestone text, blocker descriptions, ADRs, maturity map) and refreshes:
 *
 *   - provenance.commit, .branch, .dirty, .dirtyReason, .generatedAt
 *   - commands[*].verified (true iff script exists in package.json)
 *   - commands[*].expandsTo (from package.json scripts)
 *   - commands[*].lastRunExitCode for `lint` and `typecheck` (executes them)
 *
 * Other fields (project, toolchain, entrypoints, authoritativeSystems,
 * currentMilestone, criticalBlockers, ADRs, maturity map) are preserved
 * as-is — they are human-curated. The script does NOT auto-promote maturity
 * or auto-discover blockers. Per the directive: "Do not invent owners or
 * authoritative paths."
 */

import { execSync } from 'child_process';
import {
  getGitState,
  readPackageJson,
  readJson,
  fileExists,
  formatTimestamp,
  type PackageJson,
  type GitState,
} from './lib';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();

interface CommandEntry {
  command: string | null;
  verified: boolean;
  source?: string;
  expandsTo?: string;
  lastRunExitCode?: number | null;
  lastRunNotes?: string;
  blockedReason?: string;
  alternativeEntryPoints?: string[];
  notes?: string;
}

interface Manifest {
  $schema?: string;
  schemaVersion: string;
  project: { id: string; name: string; alternateNames?: string[]; kind: string; maturity: string; maturityReason?: string };
  provenance: {
    commit: string | null;
    commitShort?: string;
    branch: string | null;
    dirty: boolean;
    dirtyReason?: string;
    generatedAt: string;
    generatorVersion: string;
    generatedBy: string;
  };
  toolchain: Record<string, unknown>;
  commands: Record<string, CommandEntry>;
  entrypoints: Array<{ id: string; path: string; kind: string; description?: string }>;
  authoritativeSystems: Record<string, unknown>;
  currentMilestone: Record<string, unknown>;
  criticalBlockers: Array<{ id: string; severity: string; description: string; evidence?: string }>;
  requiredEnvironmentVariables?: unknown[];
  currentHandoff?: Record<string, unknown>;
  activeArchitectureDecisions?: unknown[];
  contextProfileLink?: Record<string, unknown>;
  honestMaturityBySubsystem?: Record<string, string>;
}

function runScriptExitCode(name: string, pkg: PackageJson): { code: number | null; notes: string } {
  const cmd = pkg.scripts[name];
  if (!cmd) return { code: null, notes: 'script not defined' };
  try {
    execSync(`bun run ${name}`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, notes: 'exit 0' };
  } catch (e: unknown) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    const code = typeof err.status === 'number' ? err.status : 1;
    const stderr = (err.stderr ?? '').toString();
    const last = stderr.split('\n').filter(Boolean).slice(-2).join(' | ');
    return { code, notes: last.slice(0, 200) || `exit ${code}` };
  }
}

function refreshCommands(
  existing: Record<string, CommandEntry> | undefined,
  pkg: PackageJson,
): Record<string, CommandEntry> {
  const out: Record<string, CommandEntry> = { ...(existing ?? {}) };

  // install (implicit, no script)
  out.install = {
    command: 'bun install --frozen-lockfile',
    verified: true,
    source: 'package.json (implicit; bun is the package manager)',
    notes: out.install?.notes ?? 'Use --frozen-lockfile for reproducible installs.',
  };

  // All package.json scripts
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    const prev = out[name] ?? {};
    out[name] = {
      command: `bun run ${name}`,
      verified: true,
      source: `package.json scripts.${name}`,
      expandsTo: cmd,
      lastRunExitCode: prev.lastRunExitCode ?? null,
      lastRunNotes: prev.lastRunNotes ?? '',
      notes: prev.notes ?? '',
    };
  }

  // test (canonical) — not in package.json currently
  if (!pkg.scripts.test) {
    out.test = {
      command: null,
      verified: false,
      blockedReason:
        'No canonical `test` script exists in package.json. Conformance tests are run as standalone TypeScript files.',
      alternativeEntryPoints: out.test?.alternativeEntryPoints ?? [
        'src/engine/conformance-test.ts',
        'src/engine/kernel/conformance-test.ts',
        'src/engine/architect/conformance-test.ts',
        'src/engine/frontier/maturity-conformance.ts',
        'src/engine/frontier/terrain-conformance-test.ts',
        'src/engine/plugins/reference/conformance-test.ts',
        'src/engine/plugins/simulation/conformance-test.ts',
      ],
    };
  }

  // Refresh lastRunExitCode for lint and typecheck (run them).
  console.log('[ai:build] running `bun run lint` to capture exit code…');
  const lintResult = runScriptExitCode('lint', pkg);
  if (out.lint) {
    out.lint.lastRunExitCode = lintResult.code;
    out.lint.lastRunNotes = lintResult.notes;
  }
  console.log(`[ai:build] lint exit=${lintResult.code}`);

  console.log('[ai:build] running `bun run typecheck` to capture exit code…');
  const tcResult = runScriptExitCode('typecheck', pkg);
  if (out.typecheck) {
    out.typecheck.lastRunExitCode = tcResult.code;
    out.typecheck.lastRunNotes = tcResult.notes;
  }
  console.log(`[ai:build] typecheck exit=${tcResult.code}`);

  return out;
}

function refreshProvenance(existing: Manifest['provenance'], git: GitState): Manifest['provenance'] {
  let dirtyReason = existing.dirtyReason ?? '';
  if (git.dirty) {
    // Build a useful dirty reason based on the actual files.
    const files = git.dirtyFiles;
    const isTsbuildinfoOnly = files.length === 1 && files[0] === 'tsconfig.tsbuildinfo';
    if (isTsbuildinfoOnly) {
      dirtyReason =
        'tsconfig.tsbuildinfo is tracked but should be gitignored; this is a known pre-existing drift that ai:check flags.';
    } else {
      dirtyReason = `Working tree has ${files.length} modified file(s): ${files.slice(0, 5).join(', ')}${files.length > 5 ? '…' : ''}`;
    }
  } else {
    dirtyReason = 'Working tree clean.';
  }
  return {
    commit: git.commit,
    commitShort: git.commitShort,
    branch: git.branch,
    dirty: git.dirty,
    dirtyReason,
    generatedAt: formatTimestamp(),
    generatorVersion: existing.generatorVersion ?? '1.0.0',
    generatedBy: 'scripts/ai-context/build.ts',
  };
}

function main() {
  const manifestPath = join(REPO_ROOT, '.ai/project.manifest.json');
  if (!fileExists('.ai/project.manifest.json')) {
    console.error('[ai:build] .ai/project.manifest.json does not exist. Create it first.');
    process.exit(1);
  }

  const existing = readJson<Manifest>('.ai/project.manifest.json');
  const pkg = readPackageJson();
  const git = getGitState();

  console.log(`[ai:build] git commit=${git.commitShort} branch=${git.branch} dirty=${git.dirty}`);

  const refreshed: Manifest = {
    ...existing,
    $schema: existing.$schema ?? './schemas/project-manifest.schema.json',
    provenance: refreshProvenance(existing.provenance, git),
    commands: refreshCommands(existing.commands, pkg),
  };

  // Validate that entrypoint paths still exist; mark missing ones.
  if (Array.isArray(refreshed.entrypoints)) {
    for (const ep of refreshed.entrypoints) {
      if (!fileExists(ep.path)) {
        console.warn(`[ai:build] entrypoint "${ep.id}" path missing: ${ep.path}`);
      }
    }
  }

  const content = JSON.stringify(refreshed, null, 2) + '\n';
  writeFileSync(manifestPath, content, 'utf-8');
  console.log(`[ai:build] wrote ${manifestPath}`);
  console.log(`[ai:build] commit=${refreshed.provenance.commitShort} generatedAt=${refreshed.provenance.generatedAt}`);
  console.log(`[ai:build] lint exit=${refreshed.commands.lint?.lastRunExitCode}, typecheck exit=${refreshed.commands.typecheck?.lastRunExitCode}`);
}

main();
