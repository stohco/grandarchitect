#!/usr/bin/env node
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { createHash } from 'crypto';

const PROJECT_ROOT = process.cwd();

const RECONSTRUCTED_FILES = new Set([
  'corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md',
  'corpus-extension/51_VISUAL_TRUTH_PACKET_SCHEMA.md',
  'corpus-extension/52_MEASUREMENT_AND_SCALE_SYSTEM.md',
  'corpus-extension/53_STYLE_GRAMMARS.md',
  'corpus-extension/54_VISUAL_ACCURACY_ORACLE.md',
  'corpus-extension/55_MOTION_AND_EFFECT_GRAMMAR.md',
  'engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md',
  'src/engine/architect/rcvc/types.ts',
  'src/engine/architect/rcvc/reasoning/scoring.ts',
  'src/engine/architect/rcvc/reasoning/target-resolver.ts',
  'src/engine/architect/rcvc/reasoning/hypothesis.ts',
  'src/engine/architect/rcvc/reasoning/clarification.ts',
  'src/engine/architect/rcvc/constraints/ir.ts',
  'src/engine/architect/rcvc/constraints/backtracking-solver.ts',
  'src/engine/architect/rcvc/constraints/procedural-solver.ts',
  'src/engine/architect/rcvc/constraints/proof.ts',
  'src/engine/architect/rcvc/constraints/service.ts',
  'src/engine/architect/rcvc/verification/model-checker.ts',
  'src/engine/architect/rcvc/verification/protocols.ts',
  'src/engine/architect/rcvc/verification/contradiction-detector.ts',
  'src/engine/architect/rcvc/observatory/sampler.ts',
  'src/engine/architect/rcvc/perf/entity-pool.ts',
  'src/engine/architect/rcvc/perf/benchmarks.ts',
  'src/engine/architect/rcvc/rewriting/e-graph.ts',
  'src/engine/architect/rcvc/index.ts',
  'src/components/editor/EditorLayout.tsx',
  'src/components/editor/ArchitectPresence.tsx',
  'src/components/editor/viewport/Viewport3D.tsx',
  'src/components/editor/viewport/ViewportOverlay.tsx',
  'src/components/editor/toolbar/EditorToolbar.tsx',
  'src/components/editor/toolbar/WorldGenBar.tsx',
  'src/components/editor/panels/OutlinerPanel.tsx',
  'src/components/editor/panels/InspectorPanel.tsx',
  'src/components/editor/panels/ConsolePanel.tsx',
  'src/components/editor/panels/ArchitectPanel.tsx',
  'src/components/editor/panels/AssetBrowserPanel.tsx',
  'src/components/editor/panels/SimulationPanel.tsx',
  'src/components/editor/panels/HistoryPanel.tsx',
  'src/components/editor/panels/ConformancePanel.tsx',
  'src/components/editor/panels/CapabilitiesPanel.tsx',
  'src/components/editor/panels/EnginePanel.tsx',
  'src/components/editor/panels/ReasoningPanel.tsx',
  'src/components/editor/panels/ConstraintsPanel.tsx',
  'src/components/editor/panels/ComplexityPanel.tsx',
  'src/components/editor/panels/BenchmarksPanel.tsx',
  'src/components/editor/panels/ClaimsPanel.tsx',
  'src/app/api/editor/world/route.ts',
  'src/app/api/editor/capabilities/route.ts',
  'src/app/api/editor/step/route.ts',
  'src/app/api/architect/interpret/route.ts',
  'src/app/api/architect/lore/route.ts',
  'src/app/api/architect/constraints/route.ts',
  'src/app/api/architect/verify/route.ts',
  'src/app/api/architect/complexity/route.ts',
  'src/app/api/architect/benchmark/route.ts',
  'src/app/api/architect/validate-bible/route.ts',
  'src/app/api/architect/claims/route.ts',
  'src/app/api/engine/run-tests/route.ts',
  'src/lib/editor/store.ts',
  'src/lib/editor/types.ts',
  'src/engine/architect/rcvc/claims/schema.ts',
  'src/engine/architect/rcvc/claims/extractor.ts',
  'src/engine/architect/rcvc/claims/semantic-validator.ts',
  'src/engine/architect/rcvc/claims/numerical-validator.ts',
]);

async function sha256(filePath) {
  try { const c = await readFile(filePath); return createHash('sha256').update(c).digest('hex'); } catch { return undefined; }
}

async function walkDir(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules','.next','.git','tool-results','agent-ctx'].includes(entry.name)) continue;
      await walkDir(full, files);
    } else { files.push(full); }
  }
  return files;
}

async function main() {
  const allFiles = await walkDir(PROJECT_ROOT);
  const records = [];
  for (const fullPath of allFiles) {
    const relPath = relative(PROJECT_ROOT, fullPath);
    const hash = await sha256(fullPath);
    if (!hash) continue;
    const content = await readFile(fullPath, 'utf-8').catch(() => '');
    const stats = await stat(fullPath).catch(() => null);
    let status = 'pre-existing';
    let evidence = ['git-tracked-before-reset'];
    if (RECONSTRUCTED_FILES.has(relPath)) { status = 'reconstructed-from-transcript'; evidence = ['conversation-transcript','subagent-rebuild']; }
    else if (relPath.startsWith('src/engine/architect/rcvc/claims/')) { status = 'new-replacement'; evidence = ['built-after-critique']; }
    else if (relPath.startsWith('data/claims/')) { status = 'new-replacement'; evidence = ['generated-by-extractor']; }
    else if (['worklog.md','recovery-manifest.json','retrofit-audit-report.md'].includes(relPath)) { status = 'new-replacement'; evidence = ['created-during-recovery']; }
    records.push({ filePath: relPath, recoveryStatus: status, evidenceSources: evidence, reconstructedHash: hash, independentlyReviewed: false, behaviorallyValidated: false, fileSize: stats?.size ?? content.length, lineCount: content.split('\n').length });
  }
  const summary = {
    totalFiles: records.length,
    byStatus: {
      'exact-source-recovered': records.filter(r => r.recoveryStatus === 'exact-source-recovered').length,
      'reconstructed-from-transcript': records.filter(r => r.recoveryStatus === 'reconstructed-from-transcript').length,
      'partially-reconstructed': records.filter(r => r.recoveryStatus === 'partially-reconstructed').length,
      'new-replacement': records.filter(r => r.recoveryStatus === 'new-replacement').length,
      'pre-existing': records.filter(r => r.recoveryStatus === 'pre-existing').length,
    },
    independentlyReviewed: records.filter(r => r.independentlyReviewed).length,
    behaviorallyValidated: records.filter(r => r.behaviorallyValidated).length,
  };
  const manifest = { generatedAt: new Date().toISOString(), generatorVersion: '0.1.0', projectRoot: PROJECT_ROOT, summary, records: records.sort((a, b) => a.filePath.localeCompare(b.filePath)) };
  await writeFile(join(PROJECT_ROOT, 'recovery-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Manifest: ${records.length} files`);
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(console.error);
