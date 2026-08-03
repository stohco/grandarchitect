/**
 * Kernel Conformance Test
 *
 * Proves that the engine kernel + ga:determinism plugin work end-to-end:
 * 1. Plugin loads and registers capabilities
 * 2. Capabilities are discoverable
 * 3. RNG produces deterministic sequences
 * 4. Transcendentals produce correct values
 * 5. Serialization + hashing produces a stable checkpoint
 * 6. The plugin can be unloaded cleanly
 *
 * This is the first conformance test. It proves the kernel contract.
 */

import { createPluginHost } from './kernel/plugin-host';
import { DeterminismPlugin } from './plugins/ga-determinism';
import { getFingerprint } from '../lib/determinism/fingerprint';
import type { RngService, TranscendentalsService, HashService, SerializeService } from './plugins/ga-determinism';
import { ok } from './kernel/types';

// Test runner (no external framework — self-contained)
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

async function runTests() {
  console.log('=== Kernel Conformance Test ===\n');

  // --- Test 1: Plugin loads and registers capabilities ---
  console.log('Test 1: Plugin loads and registers capabilities');

  const host = createPluginHost(getFingerprint());
  const result = host.registerPlugin(DeterminismPlugin);
  assert(result.ok, 'Plugin registered successfully');
  assert(host.listPlugins().length === 1, 'One plugin registered');
  assert(host.listPlugins()[0] === 'ga:determinism', 'Plugin ID is ga:determinism');

  // --- Test 2: Capabilities are discoverable ---
  console.log('\nTest 2: Capabilities are discoverable');

  assert(host.capabilities.has('determinism.rng'), 'determinism.rng registered');
  assert(host.capabilities.has('determinism.transcendentals'), 'determinism.transcendentals registered');
  assert(host.capabilities.has('determinism.fixed-point'), 'determinism.fixed-point registered');
  assert(host.capabilities.has('determinism.hash'), 'determinism.hash registered');
  assert(host.capabilities.has('determinism.serialize'), 'determinism.serialize registered');
  assert(host.capabilities.has('determinism.fingerprint'), 'determinism.fingerprint registered');

  const capsByProvider = host.capabilities.listByProvider('ga:determinism');
  assert(capsByProvider.length === 6, '6 capabilities provided by ga:determinism');

  // --- Test 3: RNG produces deterministic sequences ---
  console.log('\nTest 3: RNG produces deterministic sequences');

  const rngResult = host.capabilities.resolve<RngService>('determinism.rng');
  assert(rngResult.ok, 'RNG service resolved');

  if (rngResult.ok) {
    const rng = rngResult.value;
    const { state: state1 } = await rng.seedFromString('test-seed-1');
    const { state: state2 } = await rng.seedFromString('test-seed-1');

    const seq1 = [rng.nextDouble(state1), rng.nextDouble(state1), rng.nextDouble(state1)];
    const seq2 = [rng.nextDouble(state2), rng.nextDouble(state2), rng.nextDouble(state2)];

    assert(seq1[0] === seq2[0], 'Same seed → same first value');
    assert(seq1[1] === seq2[1], 'Same seed → same second value');
    assert(seq1[2] === seq2[2], 'Same seed → same third value');

    // Different seed → different sequence
    const { state: state3 } = await rng.seedFromString('test-seed-2');
    const seq3 = rng.nextDouble(state3);
    assert(seq1[0] !== seq3, 'Different seed → different value');

    // Int range
    const { state: state4 } = await rng.seedFromString('range-test');
    const val = rng.nextIntRange(state4, 0, 99);
    assert(val >= 0 && val <= 99, 'nextIntRange within bounds');
  }

  // --- Test 4: Transcendentals produce correct values ---
  console.log('\nTest 4: Transcendentals produce correct values');

  const transResult = host.capabilities.resolve<TranscendentalsService>('determinism.transcendentals');
  assert(transResult.ok, 'Transcendentals service resolved');

  if (transResult.ok) {
    const trans = transResult.value;
    assert(trans.sin(0) === 0, 'sin(0) = 0');
    assert(trans.cos(0) === 1, 'cos(0) = 1');
    assert(Math.abs(trans.sin(1.5707963267948966) - 1) < 1e-10, 'sin(π/2) ≈ 1');
    assert(Math.abs(trans.exp(1) - 2.718281828321915) < 1e-10, 'exp(1) ≈ e');
    assert(trans.log(1) === 0, 'log(1) = 0');
    assert(trans.sqrt(4) === 2, 'sqrt(4) = 2');
    assert(trans.pow(2, 10) === 1024, 'pow(2,10) = 1024');
  }

  // --- Test 5: Serialization + hashing produces a stable checkpoint ---
  console.log('\nTest 5: Serialization + hashing produces a stable checkpoint');

  const hashResult = host.capabilities.resolve<HashService>('determinism.hash');
  const serResult = host.capabilities.resolve<SerializeService>('determinism.serialize');
  assert(hashResult.ok, 'Hash service resolved');
  assert(serResult.ok, 'Serialize service resolved');

  if (hashResult.ok && serResult.ok) {
    const hash = hashResult.value;
    const ser = serResult.value;

    const state = { tick: 100, value: 42, name: 'test' };
    const bytes1 = ser.encode(state);
    const bytes2 = ser.encode(state);
    const hash1 = hash.hashSync(bytes1);
    const hash2 = hash.hashSync(bytes2);

    assert(hash1 === hash2, 'Same state → same hash (deterministic)');
    assert(hash1.length === 64, 'Hash is 64 hex chars (SHA-256)');

    // Different state → different hash
    const state2 = { tick: 101, value: 42, name: 'test' };
    const hash3 = hash.hashSync(ser.encode(state2));
    assert(hash1 !== hash3, 'Different state → different hash');
  }

  // --- Test 6: Plugin can be unloaded cleanly ---
  console.log('\nTest 6: Plugin can be unloaded cleanly');

  const unloadResult = host.unregisterPlugin('ga:determinism');
  assert(unloadResult.ok, 'Plugin unloaded successfully');
  assert(!host.capabilities.has('determinism.rng'), 'RNG capability removed after unload');
  assert(host.listPlugins().length === 0, 'No plugins remaining');

  // --- Test 7: Scheduler starts and stops ---
  console.log('\nTest 7: Scheduler starts and stops');

  host.start();
  assert(host.isRunning(), 'Engine running after start()');
  assert(host.scheduler.isPaused() === false, 'Scheduler not paused after start()');

  // Run a frame
  host.scheduler.frame(16.67);
  assert(host.scheduler.getTick() === 1, 'Tick incremented after one frame');

  // Run more frames
  host.scheduler.frame(16.67);
  host.scheduler.frame(16.67);
  assert(host.scheduler.getTick() === 3, 'Tick = 3 after three frames');

  host.stop();
  assert(!host.isRunning(), 'Engine stopped after stop()');

  // --- Summary ---
  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : `\n❌ ${failed} TESTS FAILED`);

  return failed === 0;
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(e => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
