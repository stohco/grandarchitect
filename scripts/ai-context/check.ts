#!/usr/bin/env bun
/**
 * scripts/ai-context/check.ts
 *
 * `bun run ai:check`
 *
 * Gate. Exits 0 if the repository's AI context is consistent; exits 1 if any
 * drift is detected. Run before claiming a task complete.
 *
 * Checks performed:
 *   1. README-referenced `bun run <x>` commands exist in package.json.
 *   2. .ai/project.manifest.json exists and is valid JSON.
 *   3. .ai/authority-map.json exists and has 7 precedence ranks.
 *   4. .ai/context-profiles.json exists and has core/ui/engine/authorial profiles.
 *   5. Manifest provenance.commit matches current git HEAD (else: stale).
 *   6. Manifest commands marked verified:true have a non-null `command`.
 *   7. Manifest entrypoints refer to paths that exist on disk.
 *   8. Manifest currentHandoff.path refers to a directory that exists.
 *   9. Tool shims (CLAUDE.md, GEMINI.md, .github/copilot-instructions.md)
 *      are byte-identical except for the first two lines (title + tagline).
 *  10. .ai/schemas/ contains the required schema files.
 *  11. Hierarchical AGENTS.md files exist where expected
 *      (src/engine/, src/components/editor/, src/app/api/).
 *  12. .gitignore excludes the required runtime paths
 *      (dev.log, .next/, data/, backups/, tsconfig.tsbuildinfo, .env).
 *  13. handoffs/<task-id>/STATE.json exists for the manifest's currentHandoff.
 *  14. No tracked .png screenshots at repository root beyond documented
 *      fixtures (warns only — does not fail).
 *  15. The handoff STATE.json's currentCommit matches git HEAD (if handoff
 *      exists and is not marked complete).
 *  16. `bun run check:genesis` passes — every canon/derived concept with a
 *      required system must be bound to an existing consumer
 *      (unbound canonical concept = build failure).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'node:child_process';
import {
  getGitState,
  readPackageJson,
  readJson,
  fileExists,
  listFiles,
  extractBunRunScripts,
  shimsMatch,
  ok,
  fail,
  type CheckResult,
} from './lib';

const REPO_ROOT = process.cwd();

interface Manifest {
  provenance?: { commit?: string | null; branch?: string | null; dirty?: boolean };
  commands?: Record<string, { command?: string | null; verified?: boolean }>;
  entrypoints?: Array<{ id: string; path: string; kind: string }>;
  currentHandoff?: { taskId?: string; path?: string; status?: string };
  criticalBlockers?: Array<{ id: string; severity: string }>;
}

interface AuthorityMap {
  precedence?: Array<{ rank: number; kind: string }>;
}

interface ContextProfiles {
  profiles?: Record<string, { includes?: string[] }>;
}

interface HandoffState {
  taskId?: string;
  currentCommit?: string | null;
  status?: string;
}

function runChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const pkg = readPackageJson();
  const git = getGitState();

  // 1. README-referenced commands exist in package.json.
  const readmeCmds = extractBunRunScripts('README.md');
  const scriptNames = new Set(Object.keys(pkg.scripts));
  // `install` is implicit (no script needed).
  scriptNames.add('install');
  for (const cmd of readmeCmds) {
    if (scriptNames.has(cmd)) {
      results.push(ok(`README references \`bun run ${cmd}\` — exists in package.json`));
    } else {
      results.push(
        fail(
          `README references \`bun run ${cmd}\` but no such script exists in package.json`,
          'high',
          `README.md → bun run ${cmd}; package.json scripts: ${Object.keys(pkg.scripts).join(', ')}`,
        ),
      );
    }
  }

  // 2. .ai/project.manifest.json exists and is valid JSON.
  if (!fileExists('.ai/project.manifest.json')) {
    results.push(fail('.ai/project.manifest.json missing', 'critical'));
    return results; // can't continue without the manifest.
  }
  let manifest: Manifest;
  try {
    manifest = readJson<Manifest>('.ai/project.manifest.json');
    results.push(ok('.ai/project.manifest.json is valid JSON'));
  } catch (e) {
    results.push(fail(`.ai/project.manifest.json is not valid JSON: ${(e as Error).message}`, 'critical'));
    return results;
  }

  // 3. authority-map.json exists with 7 ranks.
  if (!fileExists('.ai/authority-map.json')) {
    results.push(fail('.ai/authority-map.json missing', 'high'));
  } else {
    try {
      const am = readJson<AuthorityMap>('.ai/authority-map.json');
      if (!am.precedence || am.precedence.length !== 7) {
        results.push(
          fail(
            `.ai/authority-map.json precedence must have exactly 7 ranks (found ${am.precedence?.length ?? 0})`,
            'high',
          ),
        );
      } else {
        results.push(ok('.ai/authority-map.json has 7 precedence ranks'));
      }
    } catch (e) {
      results.push(fail(`.ai/authority-map.json is not valid JSON: ${(e as Error).message}`, 'high'));
    }
  }

  // 4. context-profiles.json has core/ui/engine/authorial.
  if (!fileExists('.ai/context-profiles.json')) {
    results.push(fail('.ai/context-profiles.json missing', 'high'));
  } else {
    try {
      const cp = readJson<ContextProfiles>('.ai/context-profiles.json');
      const required = ['core', 'ui', 'engine', 'authorial'];
      const present = Object.keys(cp.profiles ?? {});
      const missing = required.filter((p) => !present.includes(p));
      if (missing.length > 0) {
        results.push(fail(`.ai/context-profiles.json missing required profiles: ${missing.join(', ')}`, 'high'));
      } else {
        results.push(ok('.ai/context-profiles.json has core/ui/engine/authorial profiles'));
      }
    } catch (e) {
      results.push(fail(`.ai/context-profiles.json is not valid JSON: ${(e as Error).message}`, 'high'));
    }
  }

  // 5. Manifest SHA matches git HEAD (stale check).
  const manifestCommit = manifest.provenance?.commit;
  if (manifestCommit && git.commit) {
    if (manifestCommit === git.commit) {
      results.push(ok('Manifest provenance.commit matches current git HEAD'));
    } else {
      results.push(
        fail(
          'Manifest is stale — provenance.commit does not match current git HEAD',
          'medium',
          `manifest: ${manifestCommit.slice(0, 12)}; git: ${git.commit.slice(0, 12)}; run \`bun run ai:build\``,
        ),
      );
    }
  } else {
    results.push(
      fail('Cannot verify manifest freshness — manifest or git commit is missing', 'low'),
    );
  }

  // 6. Manifest commands marked verified:true must have a non-null `command`.
  if (manifest.commands) {
    for (const [name, cmd] of Object.entries(manifest.commands)) {
      if (cmd.verified && !cmd.command) {
        results.push(
          fail(
            `Manifest command "${name}" is marked verified:true but command is null`,
            'high',
          ),
        );
      }
    }
    results.push(ok(`Manifest commands verified (checked ${Object.keys(manifest.commands).length} entries)`));
  }

  // 7. Entrypoints refer to existing paths.
  if (manifest.entrypoints) {
    for (const ep of manifest.entrypoints) {
      if (!fileExists(ep.path)) {
        results.push(
          fail(`Manifest entrypoint "${ep.id}" refers to missing path: ${ep.path}`, 'high'),
        );
      }
    }
    results.push(ok(`Manifest entrypoints verified (checked ${manifest.entrypoints.length} entries)`));
  }

  // 8. currentHandoff path exists.
  const handoff = manifest.currentHandoff;
  if (handoff?.path) {
    if (!fileExists(handoff.path)) {
      results.push(
        fail(
          `Manifest currentHandoff.path refers to missing directory: ${handoff.path}`,
          'medium',
        ),
      );
    } else {
      results.push(ok(`Manifest currentHandoff path exists: ${handoff.path}`));
    }
  }

  // 9. Tool shims are byte-identical except for the first two lines.
  const shimPaths = ['CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md'];
  const missingShims = shimPaths.filter((p) => !fileExists(p));
  if (missingShims.length > 0) {
    results.push(fail(`Tool shims missing: ${missingShims.join(', ')}`, 'high'));
  } else if (shimsMatch(shimPaths)) {
    results.push(ok('Tool shims (CLAUDE.md, GEMINI.md, copilot-instructions.md) are aligned'));
  } else {
    results.push(
      fail(
        'Tool shims have drifted — CLAUDE.md, GEMINI.md, and .github/copilot-instructions.md must be byte-identical except for the first two lines',
        'medium',
      ),
    );
  }

  // 10. Required schemas exist.
  const requiredSchemas = [
    '.ai/schemas/project-manifest.schema.json',
    '.ai/schemas/authority-map.schema.json',
    '.ai/schemas/context-profiles.schema.json',
    '.ai/schemas/handoff.schema.json',
    '.ai/schemas/handoff-evidence.schema.json',
  ];
  for (const schema of requiredSchemas) {
    if (!fileExists(schema)) {
      results.push(fail(`Required schema missing: ${schema}`, 'medium'));
    }
  }
  results.push(ok(`Schema files verified (checked ${requiredSchemas.length} schemas)`));

  // 11. Hierarchical AGENTS.md files exist.
  const requiredAgents = [
    'src/engine/AGENTS.md',
    'src/components/editor/AGENTS.md',
    'src/app/api/AGENTS.md',
  ];
  for (const path of requiredAgents) {
    if (!fileExists(path)) {
      results.push(fail(`Hierarchical AGENTS.md missing: ${path}`, 'medium'));
    }
  }
  results.push(ok(`Hierarchical AGENTS.md files verified (checked ${requiredAgents.length} files)`));

  // 12. .gitignore excludes required paths.
  const requiredIgnores = [
    'dev.log',
    '.next/',
    'data/',
    'backups/',
    'tsconfig.tsbuildinfo',
    '.env',
    'tool-results/',
    'agent-ctx/',
    'upload/',
  ];
  const gitignoreText = fileExists('.gitignore')
    ? readFileSync(join(REPO_ROOT, '.gitignore'), 'utf-8')
    : '';
  for (const pat of requiredIgnores) {
    if (!gitignoreText.includes(pat)) {
      results.push(fail(`.gitignore missing required pattern: ${pat}`, 'low'));
    }
  }
  results.push(ok(`.gitignore verified (checked ${requiredIgnores.length} patterns)`));

  // 13. Handoff STATE.json exists for currentHandoff.
  if (handoff?.path) {
    const statePath = `${handoff.path.replace(/\/$/, '')}/STATE.json`;
    if (!fileExists(statePath)) {
      results.push(fail(`Handoff STATE.json missing: ${statePath}`, 'medium'));
    } else {
      try {
        const state = readJson<HandoffState>(statePath);
        // 15. STATE.json currentCommit matches git HEAD (if not complete).
        if (state.status && state.status !== 'complete' && state.currentCommit && git.commit) {
          if (state.currentCommit === git.commit) {
            results.push(ok(`Handoff STATE.json currentCommit matches git HEAD`));
          } else {
            results.push(
              fail(
                `Handoff STATE.json currentCommit does not match git HEAD`,
                'medium',
                `handoff: ${state.currentCommit.slice(0, 12)}; git: ${git.commit.slice(0, 12)}`,
              ),
            );
          }
        }
        results.push(ok(`Handoff STATE.json valid: ${statePath}`));
      } catch (e) {
        results.push(fail(`Handoff STATE.json is not valid JSON: ${(e as Error).message}`, 'medium'));
      }
    }
  }

  // 14. Warn (not fail) about tracked root-level PNGs beyond documented fixtures.
  const rootPngs = listFiles('.').filter((p) => p.endsWith('.png') && !p.includes('/'));
  if (rootPngs.length > 0) {
    results.push({
      ok: true,
      message: `${rootPngs.length} tracked PNG(s) at repository root (warn only): ${rootPngs.slice(0, 5).join(', ')}${rootPngs.length > 5 ? '…' : ''}`,
      severity: 'low',
    });
  }

  // 16. Genesis coverage gate: unbound canonical concept = build failure.
  try {
    const g = execSync('bun run check:genesis', { encoding: 'utf8', cwd: REPO_ROOT });
    results.push(ok('check:genesis passes — all canonical concepts bound to consumers'));
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    results.push(
      fail(
        `check:genesis FAILED — unbound canonical concept or dead consumer (exit ${err.status ?? '?'})`,
        'high',
        `last line: ${(err.stdout ?? '').trim().split('\n').pop()?.slice(0, 160) ?? ''}`,
      ),
    );
  }

  return results;
}

function main() {
  const results = runChecks();
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log('ai:check — repository context consistency gate');
  console.log('='.repeat(60));

  for (const r of results) {
    const symbol = r.ok ? '✓' : '✗';
    const sev = r.severity ? `(${r.severity})` : '';
    console.log(`  ${symbol} ${sev} ${r.message}`);
    if (r.evidence) {
      console.log(`      evidence: ${r.evidence}`);
    }
  }

  console.log('='.repeat(60));
  console.log(`Passed: ${passed}   Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nai:check FAILED. Fix the issues above before claiming a task complete.');
    process.exit(1);
  } else {
    console.log('\nai:check PASSED. Repository context is consistent.');
    process.exit(0);
  }
}

main();
