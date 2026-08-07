/**
 * UI Action Registry Conformance Test
 * ===================================
 *
 * Proves the canonical action path is real for every visible control:
 *
 *   1. PARITY — the same action ID is reachable from:
 *        (a) the UI registry
 *        (b) the keyboard shortcut table
 *        (c) the command palette search
 *        (d) the Architect capability discovery matrix
 *      for 5 representative actions: world.generate, global.select,
 *      global.translateMode, global.undo, playtest.toggle.
 *
 *   2. INVOKE — invoke() returns a REAL result (store transition or engine
 *      call) or an honest blocked/failed reason — NEVER a silent no-op.
 *      Runs standalone in Node: local handlers drive the real engine/store
 *      code paths that the API routes wrap.
 *
 *   3. SWEEP — every registered action's invoke returns a well-formed
 *      UiActionResult (non-empty message, explicit status).
 *
 * Exit code 0 on pass, 1 on failure.
 */

import { getUiActionRegistry, buildCapabilityAccessMatrix } from './action-registry';
import type { UiActionResult } from './action-registry';
import '@/lib/studio-ui/action-registrations'; // side-effect: registers all actions
import { dispatchAction } from './action-dispatch';
import { useEditorStore } from '@/lib/editor/store';

// Test runner (no external framework — self-contained, repo convention)
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Representative actions under test
// ---------------------------------------------------------------------------

const REPRESENTATIVE_ACTIONS = [
  { id: 'world.generate', shortcut: 'Ctrl+G', paletteQuery: 'generate', capability: 'world.generate' },
  { id: 'global.select', shortcut: null, paletteQuery: 'select', capability: 'global.select' },
  { id: 'global.translateMode', shortcut: 'W', paletteQuery: 'translate', capability: 'global.translateMode' },
  { id: 'global.undo', shortcut: 'Ctrl+Z', paletteQuery: 'undo', capability: 'global.undo' },
  { id: 'playtest.toggle', shortcut: 'P', paletteQuery: 'playtest', capability: 'playtest.toggle' },
] as const;

async function runTests() {
  console.log('=== UI Action Registry Conformance Test ===\n');

  const registry = getUiActionRegistry();
  const shortcuts = registry.getShortcuts();

  // ============================================================
  // Test 1: Parity — same action ID on every surface
  // ============================================================
  console.log('Test 1: Parity — one action ID across all surfaces');

  const matrix = buildCapabilityAccessMatrix(registry);

  for (const rep of REPRESENTATIVE_ACTIONS) {
    // (a) UI registry
    assert(registry.get(rep.id) !== null, `(a) registry has action "${rep.id}"`);
    // (b) keyboard shortcut table (derived from the registry)
    if (rep.shortcut) {
      assert(
        shortcuts[rep.shortcut] === rep.id,
        `(b) shortcut ${rep.shortcut} → ${rep.id} (got ${shortcuts[rep.shortcut]})`,
      );
    } else {
      assert(
        Object.values(shortcuts).includes(rep.id) === false,
        `(b) action "${rep.id}" has no declared shortcut (absent from shortcut table — reachable via viewport click)`,
      );
    }
    // (c) command palette search
    assert(
      registry.search(rep.paletteQuery).some((a) => a.id === rep.id),
      `(c) palette search "${rep.paletteQuery}" finds "${rep.id}"`,
    );
    // (d) Architect capability discovery matrix
    assert(
      matrix.some((m) => m.capabilityId === rep.capability),
      `(d) Architect capability matrix exposes capability "${rep.capability}"`,
    );
    // (e) the /api/studio-ui GET contract lists it (same data source the palette fetches)
    assert(
      registry.list().some((a) => a.id === rep.id),
      `(e) /api/studio-ui action list (registry.list()) includes "${rep.id}"`,
    );
  }

  // Shortcut table integrity: every mapped shortcut resolves to a registered action.
  let tableIntegrity = true;
  for (const [key, id] of Object.entries(shortcuts)) {
    if (registry.get(id) === null) tableIntegrity = false;
    // The registered action must declare the same shortcut back.
    const def = registry.get(id);
    if (def && def.shortcut !== key) tableIntegrity = false;
  }
  assert(tableIntegrity, 'Shortcut table is bidirectional with the registry');

  // ============================================================
  // Test 2: invoke() — real results, no silent no-ops (standalone Node)
  // ============================================================
  console.log('\nTest 2: invoke() returns real results (local engine/store paths)');

  // --- world.generate: real settlement generation (same generator the API wraps) ---
  const gen = await dispatchAction('world.generate', { seed: 'conformance-seed-1' }, { quiet: true, context: { worldLoaded: true } });
  assert(gen.status === 'completed', `world.generate → completed (${gen.message})`);
  assert(gen.message.includes('structures'), `world.generate result carries stats ("${gen.message}")`);

  // --- global.select: real store transition ---
  const st0 = useEditorStore.getState();
  assert(st0.selectedEntityIds.length === 0, 'selection starts empty');
  const sel = await dispatchAction('global.select', { entityId: 42 }, { quiet: true });
  assert(sel.status === 'completed', `global.select → completed (${sel.message})`);
  assert(
    useEditorStore.getState().selectedEntityIds.includes(42),
    'global.select actually selected entity #42 in the store',
  );
  const desel = await dispatchAction('global.deselect', undefined, { quiet: true });
  assert(desel.status === 'completed' && useEditorStore.getState().selectedEntityIds.length === 0, 'global.deselect cleared the store selection');

  // --- global.translateMode: real store transition ---
  useEditorStore.getState().setTransformMode('scale');
  const tr = await dispatchAction('global.translateMode', undefined, { quiet: true });
  assert(tr.status === 'completed' && useEditorStore.getState().transformMode === 'translate', `global.translateMode → completed, store mode = ${useEditorStore.getState().transformMode}`);

  // --- global.undo: real undo of a seeded editor transaction ---
  const st1 = useEditorStore.getState();
  const txCountBefore = st1.transactions.length;
  st1.recordTransaction({
    requestedBy: 'user',
    originalRequest: 'conformance undo fixture',
    toolsUsed: ['conformance'],
    changedProperties: { fixture: true },
    affectedSystems: ['presentation'],
    diffs: [],
    permissionClass: 'presentation_only',
  });
  assert(useEditorStore.getState().transactions.length === txCountBefore + 1, 'seeded one editor transaction');
  const undo = await dispatchAction('global.undo', undefined, { quiet: true });
  assert(undo.status === 'completed', `global.undo → completed (${undo.message})`);
  assert(
    useEditorStore.getState().transactions.find((t) => t.originalRequest === 'conformance undo fixture')?.undone === true,
    'global.undo actually marked the seeded transaction undone',
  );

  // --- playtest.toggle: real store transition (world loaded context) ---
  const toggleOn = await dispatchAction('playtest.toggle', undefined, { quiet: true, context: { worldLoaded: true } });
  assert(toggleOn.status === 'completed' && useEditorStore.getState().playtestMode === true, 'playtest.toggle entered playtest mode');
  const toggleOff = await dispatchAction('playtest.toggle', undefined, { quiet: true, context: { worldLoaded: true } });
  assert(toggleOff.status === 'completed' && useEditorStore.getState().playtestMode === false, 'playtest.toggle exited playtest mode');

  // --- honest availability gating (no world loaded → blocked with reason) ---
  const gated = await dispatchAction('playtest.toggle', undefined, { quiet: true, context: { worldLoaded: false } });
  assert(
    gated.status === 'blocked' && gated.error?.code === 'UNAVAILABLE' && gated.message.includes('No world loaded'),
    'playtest.toggle without a world → blocked UNAVAILABLE with reason (not silent)',
  );

  // --- DISABLED_WITH_REASON: honest disable, never a silent no-op ---
  const redo = await dispatchAction('global.redo', undefined, { quiet: true });
  assert(
    redo.status === 'blocked' && redo.error?.code === 'DISABLED_WITH_REASON' && (redo.message?.length ?? 0) > 0,
    `global.redo → blocked DISABLED_WITH_REASON ("${redo.message?.slice(0, 60)}…")`,
  );

  // --- unknown action: explicit failure ---
  const unknown = await dispatchAction('no.such.action', undefined, { quiet: true });
  assert(unknown.status === 'failed' && unknown.error?.code === 'UNKNOWN_ACTION', 'unknown action → failed UNKNOWN_ACTION');

  // ============================================================
  // Test 3: sweep — every registered action returns a well-formed result
  // ============================================================
  console.log('\nTest 3: Sweep — every registered action resolves (no silent no-ops)');

  const all = registry.list();
  const REAL_STATUSES = new Set(['completed', 'failed', 'blocked', 'cancelled']);
  let silent = 0;
  let disabledCount = 0;

  for (const action of all) {
    const result: UiActionResult = await dispatchAction(action.id, undefined, {
      quiet: true,
      context: { worldLoaded: true, selectedEntityIds: [42] },
    });
    const hasStatus = REAL_STATUSES.has(result.status);
    const hasMessage = typeof result.message === 'string' && result.message.length > 0;
    if (!hasStatus || !hasMessage) {
      silent++;
      console.error(`  ❌ ${action.id} → ${JSON.stringify(result)}`);
    }
    if (result.error?.code === 'DISABLED_WITH_REASON') disabledCount++;
  }
  assert(silent === 0, `All ${all.length} registered actions returned a well-formed result (${silent} silent)`);
  assert(disabledCount >= 3, `At least 3 actions are honestly DISABLED_WITH_REASON (found ${disabledCount})`);

  // Registry stats sanity
  const stats = registry.getStats();
  assert(stats.totalActions >= 55, `Registry now has ${stats.totalActions} actions (was 46 + new surfaces)`);
  assert(stats.withShortcuts >= 10, `Shortcut table has ${stats.withShortcuts} entries`);

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : `\n❌ ${failed} TESTS FAILED`);

  return failed === 0;
}

runTests().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
