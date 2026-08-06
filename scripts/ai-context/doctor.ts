#!/usr/bin/env bun
/**
 * scripts/ai-context/doctor.ts
 *
 * `bun run ai:doctor`
 *
 * Prints a concise repository-intelligence report:
 *   - exact SHA, branch, dirty state
 *   - product maturity and current milestone
 *   - verified commands (with ✓ / ✗)
 *   - authoritative paths
 *   - known critical blockers
 *   - manifest freshness
 *   - "read next" pointers
 *
 * Exit code is always 0 — this is a reporting tool, not a gate. Use
 * `bun run ai:check` for the gate.
 */

import {
  getGitState,
  readPackageJson,
  readJson,
  fileExists,
  type PackageJson,
  type GitState,
} from './lib';

interface Manifest {
  project?: { name?: string; maturity?: string };
  provenance?: { commit?: string | null; branch?: string | null; dirty?: boolean; generatedAt?: string };
  currentMilestone?: { id?: string; title?: string; status?: string };
  criticalBlockers?: Array<{ id: string; severity: string; description: string }>;
  authoritativeSystems?: Record<string, { status?: string; path?: string; reason?: string }>;
  commands?: Record<
    string,
    { command?: string | null; verified?: boolean; lastRunExitCode?: number | null; blockedReason?: string }
  >;
}

function line(s = '') {
  console.log(s);
}

function section(title: string) {
  line();
  console.log(`── ${title} ────────────────────────────────────────────`);
}

function main() {
  const git: GitState = getGitState();
  const pkg: PackageJson = readPackageJson();

  let manifest: Manifest = {};
  try {
    manifest = readJson<Manifest>('.ai/project.manifest.json');
  } catch (e) {
    line(`[!] Could not read .ai/project.manifest.json: ${(e as Error).message}`);
  }

  const projectName = manifest.project?.name ?? pkg.name;
  const maturity = manifest.project?.maturity ?? 'unknown';

  console.log(`Repository: ${projectName}`);
  console.log(`Commit:     ${git.commit ?? '<no git>'}`);
  console.log(`Branch:     ${git.branch ?? '<no git>'}`);
  console.log(`Dirty:      ${git.dirty ? `yes (${git.dirtyFiles.length} files)` : 'no'}`);
  if (git.dirty && git.dirtyFiles.length <= 10) {
    for (const f of git.dirtyFiles) console.log(`            - ${f}`);
  }

  section('Product');
  console.log(`Maturity:   ${maturity}`);
  if (manifest.currentMilestone) {
    console.log(`Milestone:  ${manifest.currentMilestone.title ?? manifest.currentMilestone.id}`);
    console.log(`            status: ${manifest.currentMilestone.status ?? 'unknown'}`);
  } else {
    console.log('Milestone:  <none declared in manifest>');
  }

  section('Verified commands');
  // Always show the canonical command list, even if manifest is missing.
  const builtinCommands: Array<[string, string | null]> = [
    ['install', 'bun install --frozen-lockfile'],
    ['dev', pkg.scripts.dev ?? null],
    ['build', pkg.scripts.build ?? null],
    ['lint', pkg.scripts.lint ?? null],
    ['typecheck', pkg.scripts.typecheck ?? null],
    ['test', pkg.scripts.test ?? null],
    ['ai:doctor', pkg.scripts['ai:doctor'] ?? null],
    ['ai:check', pkg.scripts['ai:check'] ?? null],
    ['ai:build', pkg.scripts['ai:build'] ?? null],
  ];
  for (const [name, cmd] of builtinCommands) {
    const verified = cmd !== null;
    const symbol = verified ? '✓' : '✗';
    const detail = verified ? cmd : 'script missing in package.json';
    console.log(`  ${symbol} ${name.padEnd(12)} ${detail}`);
  }
  // Surface manifest's lastRunExitCode if present
  if (manifest.commands) {
    const tc = manifest.commands.typecheck;
    if (tc?.lastRunExitCode !== undefined && tc.lastRunExitCode !== null) {
      console.log(`            typecheck last exit code: ${tc.lastRunExitCode}`);
    }
  }

  section('Authoritative paths');
  if (manifest.authoritativeSystems) {
    for (const [name, sys] of Object.entries(manifest.authoritativeSystems)) {
      const tag =
        sys.status === 'resolved' ? 'resolved ' : sys.status === 'partial' ? 'partial ' : 'unknown ';
      const where = sys.path ?? '<unresolved>';
      console.log(`  ${tag} ${name.padEnd(20)} ${where}`);
    }
  } else {
    console.log('  <no authoritativeSystems in manifest>');
  }

  section('Known critical blockers');
  const blockers = manifest.criticalBlockers ?? [];
  if (blockers.length === 0) {
    console.log('  <none declared>');
  } else {
    for (const b of blockers) {
      console.log(`  ${b.severity.padEnd(8)} ${b.id}`);
      console.log(`             ${b.description}`);
    }
  }

  section('Manifest freshness');
  const generatedAt = manifest.provenance?.generatedAt;
  const manifestCommit = manifest.provenance?.commit;
  if (generatedAt) {
    const ageMs = Date.now() - new Date(generatedAt).getTime();
    const ageHours = (ageMs / (1000 * 60 * 60)).toFixed(1);
    console.log(`  Generated:    ${generatedAt} (${ageHours} h ago)`);
  } else {
    console.log('  Generated:    <missing>');
  }
  if (manifestCommit && git.commit) {
    const stale = manifestCommit !== git.commit;
    console.log(`  Manifest SHA: ${manifestCommit.slice(0, 12)}`);
    console.log(`  Current  SHA: ${git.commit.slice(0, 12)}`);
    console.log(`  Fresh:        ${stale ? 'NO — run `bun run ai:build`' : 'yes'}`);
  } else {
    console.log('  Fresh:        <cannot determine — missing SHA in manifest or git>');
  }

  section('First command for new agents');
  console.log('  bun run ai:doctor     # you are here');
  console.log('  bun run ai:check      # gate; fails on drift');
  console.log('  bun run ai:build      # regenerate manifests');

  section('Read next');
  console.log('  AGENTS.md                              — root constitution');
  console.log('  .ai/START_HERE.md                      — 2-minute onboarding');
  console.log('  .ai/project.manifest.json              — verified front door');
  console.log('  .ai/authority-map.json                 — truth precedence');
  console.log('  src/engine/AGENTS.md                   — engine module rules');
  console.log('  src/components/editor/AGENTS.md        — editor UI rules');
  console.log('  src/app/api/AGENTS.md                  — API route rules');
  console.log('  handoffs/AI-REPO-SYSTEM/               — current active handoff');

  line();
}

main();
