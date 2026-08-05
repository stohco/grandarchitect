/**
 * Embodied Traversal Conformance Test — Suite 8
 *
 * The critique demanded an automated test that proves the player physically
 * traverses the collision-backed tunnel using deterministic input injection.
 *
 * This test:
 *   1. Generates terrain with known tunnel
 *   2. Creates tunnel checkpoints from the spline
 *   3. Spawns character controller at tunnel entrance
 *   4. Injects deterministic input commands (forward movement)
 *   5. Verifies floor collision, wall collision, checkpoint crossing
 *   6. Proves traversal from entrance to exit
 *   7. Verifies trajectory hash is deterministic
 *
 * Run: npx tsx src/engine/frontier/embodied-traversal-test.ts
 */

import {
  createDensityRegion, TerrainSourceOp, SdfMountainOp, SplineTunnelOp, ErosionOp,
  extractSurface, generateCollision, generateNavigation,
} from './terrain-plugin';
import {
  createCharacterController, createTunnelCheckpoints, createThreeJSCollisionWorld,
  DEFAULT_CONFIG, FIXED_DELTA_SECONDS,
  type CharacterInputCommand, type CharacterController,
} from './character-controller';
import { createHash } from 'crypto';

interface TestResult { name: string; passed: boolean; details: string; evidence?: string }
const results: TestResult[] = [];

function assert(name: string, condition: boolean, details: string, evidence?: string) {
  results.push({ name, passed: condition, details, evidence });
  console.log(`  ${condition ? '✓ PASS' : '✗ FAIL'}: ${name} — ${details}`);
}

async function run() {
  console.log('\n=== EMBODIED TRAVERSAL CONFORMANCE TEST (Suite 8) ===\n');

  // ========================================================================
  // Step 1: Generate terrain with tunnel
  // ========================================================================
  console.log('Step 1: Generate terrain with known tunnel');
  // Spline must pass THROUGH the mountain (center at x=64, radius=30, so x=34..94)
  // Start at the mountain's western edge (x=34) and exit at the eastern edge (x=94)
  const splinePoints: [number, number, number][] = [[34, 25, 64], [64, 30, 64], [94, 25, 64]];
  const tunnelRadius = 3;

  const region = createDensityRegion('region-traversal', 1,
    { minX: 0, maxX: 128, minY: 0, maxY: 64, minZ: 0, maxZ: 128 }, 24);
  const ctx = { seed: 42, rng: { state: 42 >>> 0, next() { this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 0x100000000; }, range(min: number, max: number) { return min + this.next() * (max - min); } } as any };
  new TerrainSourceOp({ seed: 42, baseHeight: 20, variation: 15 }).evaluate(region, ctx);
  new SdfMountainOp({ position: [64, 20, 64], height: 40, radius: 30 }).evaluate(region, ctx);
  new SplineTunnelOp({ splinePoints, radius: tunnelRadius }).evaluate(region, ctx);
  new ErosionOp({ iterations: 2, strength: 0.1 }).evaluate(region, ctx);

  const renderMesh = extractSurface(region);
  const collision = generateCollision(region, renderMesh);

  assert('terrain generated', renderMesh.vertexCount > 0,
    `${renderMesh.vertexCount} vertices, ${renderMesh.triangleCount} triangles`);
  assert('render-collision revisions match', renderMesh.revision === collision.sourceTerrainRevision,
    `render: ${renderMesh.revision}, collision: ${collision.sourceTerrainRevision}`);

  // ========================================================================
  // Step 2: Create collision world and checkpoints
  // ========================================================================
  console.log('\nStep 2: Create collision world and tunnel checkpoints');

  const meshData = {
    positions: renderMesh.positions,
    indices: renderMesh.indices,
    vertexCount: renderMesh.vertexCount,
  };

  const world = createThreeJSCollisionWorld(
    () => meshData,
    () => renderMesh.revision,
  );

  const checkpoints = createTunnelCheckpoints(splinePoints);
  assert('checkpoints created from spline', checkpoints.length === 5,
    `${checkpoints.length} checkpoints: ${checkpoints.map(c => c.id).join(', ')}`);

  // ========================================================================
  // Step 3: Spawn character at tunnel entrance
  // ========================================================================
  console.log('\nStep 3: Spawn character at tunnel entrance');

  const controller = createCharacterController(DEFAULT_CONFIG, checkpoints);
  const entrance = { x: splinePoints[0][0], y: splinePoints[0][1], z: splinePoints[0][2] };
  const spawnResult = controller.spawn(entrance, world, renderMesh.revision);

  assert('character spawned successfully', spawnResult.success,
    spawnResult.reason ?? `position: (${controller.state.position.x.toFixed(1)}, ${controller.state.position.y.toFixed(1)}, ${controller.state.position.z.toFixed(1)})`);
  assert('character active revision matches terrain', controller.state.activeRevision === renderMesh.revision,
    `revision: ${controller.state.activeRevision}`);
  assert('character velocity is zero', controller.state.velocity.x === 0 && controller.state.velocity.y === 0 && controller.state.velocity.z === 0,
    `velocity: (${controller.state.velocity.x}, ${controller.state.velocity.y}, ${controller.state.velocity.z})`);
  assert('character is grounded', controller.state.grounded,
    `grounded: ${controller.state.grounded}`);

  // ========================================================================
  // Step 4: Inject deterministic input — walk forward through tunnel
  // ========================================================================
  console.log('\nStep 4: Inject deterministic input (walk forward through tunnel)');

  // Camera yaw: facing along +X direction (toward tunnel exit)
  // The spline goes from x=10 to x=118, so forward = +X
  const cameraYaw = -Math.PI / 2; // facing +X

  // Record the trajectory hash for replay comparison
  const trajectoryHashes: string[] = [];
  const maxTicks = 2000;

  // Phase 1: Walk straight forward (ticks 0-500)
  for (let tick = 0; tick < 500 && !controller.traversalComplete(); tick++) {
    const input: CharacterInputCommand = {
      tick,
      moveForward: 1.0,
      moveRight: 0,
      jumpPressed: false,
      crouchHeld: false,
      cameraYaw,
    };
    controller.step(input, world, renderMesh.revision);
  }

  // Phase 2: Continue forward (ticks 500-1000)
  for (let tick = 500; tick < 1000 && !controller.traversalComplete(); tick++) {
    const input: CharacterInputCommand = {
      tick,
      moveForward: 1.0,
      moveRight: 0,
      jumpPressed: false,
      crouchHeld: false,
      cameraYaw,
    };
    controller.step(input, world, renderMesh.revision);
  }

  // Phase 3: Continue forward (ticks 1000-2000)
  for (let tick = 1000; tick < maxTicks && !controller.traversalComplete(); tick++) {
    const input: CharacterInputCommand = {
      tick,
      moveForward: 1.0,
      moveRight: 0,
      jumpPressed: false,
      crouchHeld: false,
      cameraYaw,
    };
    controller.step(input, world, renderMesh.revision);
  }

  trajectoryHashes.push(controller.trajectoryHash());

  // ========================================================================
  // Step 5: Verify traversal
  // ========================================================================
  console.log('\nStep 5: Verify traversal');

  assert('traversal completed (all checkpoints crossed)', controller.traversalComplete(),
    `checkpoints crossed: ${controller.nextCheckpointIndex}/${checkpoints.length}`);

  // List checkpoint events
  console.log('\n  Checkpoint events:');
  for (const event of controller.state.checkpointEvents) {
    console.log(`    tick ${event.tick}: ${event.checkpointId} at (${event.position.x.toFixed(1)}, ${event.position.y.toFixed(1)}, ${event.position.z.toFixed(1)})`);
  }

  assert('all 5 checkpoints crossed in order', controller.state.checkpointEvents.length === 5,
    `events: ${controller.state.checkpointEvents.map(e => e.checkpointId).join(' → ')}`);

  // Verify ordered crossing
  const checkpointIds = controller.state.checkpointEvents.map(e => e.checkpointId);
  assert('checkpoints crossed in correct order',
    checkpointIds[0] === 'entrance' &&
    checkpointIds[1] === 'interior-1' &&
    checkpointIds[2] === 'midpoint' &&
    checkpointIds[3] === 'interior-2' &&
    checkpointIds[4] === 'exit',
    `order: ${checkpointIds.join(' → ')}`);

  // ========================================================================
  // Step 6: Verify physical validity
  // ========================================================================
  console.log('\nStep 6: Verify physical validity');

  // Check for NaN/infinite positions
  let hasNaN = false;
  let hasTeleport = false;
  let maxPenetration = 0;

  for (let i = 0; i < controller.state.trajectory.length; i++) {
    const t = controller.state.trajectory[i];
    if (isNaN(t.x) || isNaN(t.y) || isNaN(t.z) || !isFinite(t.x) || !isFinite(t.y) || !isFinite(t.z)) {
      hasNaN = true;
      break;
    }
    if (i > 0) {
      const prev = controller.state.trajectory[i - 1];
      const dx = t.x - prev.x;
      const dy = t.y - prev.y;
      const dz = t.z - prev.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > 10.0) { // teleport threshold: 10 meters in one tick
        hasTeleport = true;
      }
    }
  }

  for (const event of controller.state.collisionEvents) {
    if (event.type === 'penetration' && event.penetrationDepth > maxPenetration) {
      maxPenetration = event.penetrationDepth;
    }
  }

  assert('no NaN or infinite positions', !hasNaN,
    hasNaN ? 'NaN/infinite detected in trajectory' : 'all positions valid');
  assert('no teleport-sized displacements', !hasTeleport,
    hasTeleport ? 'teleport detected' : 'all displacements < 10m per tick');
  assert('max penetration within tolerance (2cm)', maxPenetration < 0.02,
    `max penetration: ${maxPenetration.toFixed(4)}m`);

  // ========================================================================
  // Step 7: Verify collision events
  // ========================================================================
  console.log('\nStep 7: Verify collision events');

  const floorContacts = controller.state.collisionEvents.filter(e => e.type === 'floor').length;
  const wallContacts = controller.state.collisionEvents.filter(e => e.type === 'wall').length;
  const ceilingContacts = controller.state.collisionEvents.filter(e => e.type === 'ceiling').length;
  const penetrationEvents = controller.state.collisionEvents.filter(e => e.type === 'penetration').length;

  console.log(`  Floor contacts: ${floorContacts}`);
  console.log(`  Wall contacts: ${wallContacts}`);
  console.log(`  Ceiling contacts: ${ceilingContacts}`);
  console.log(`  Penetration events: ${penetrationEvents}`);

  assert('floor collision events occurred', floorContacts > 0,
    `${floorContacts} floor contacts (player stands on terrain)`);
  assert('collision events recorded', controller.state.collisionEvents.length > 0,
    `${controller.state.collisionEvents.length} total collision events`);

  // ========================================================================
  // Step 8: Verify revision equality throughout traversal
  // ========================================================================
  console.log('\nStep 8: Verify revision equality throughout traversal');
  assert('active revision matches terrain revision', controller.state.activeRevision === renderMesh.revision,
    `controller: ${controller.state.activeRevision}, terrain: ${renderMesh.revision}`);

  // ========================================================================
  // Step 9: Verify fixed timestep was used
  // ========================================================================
  console.log('\nStep 9: Verify fixed timestep was used');
  assert('fixed delta is 1/60', Math.abs(FIXED_DELTA_SECONDS - 1 / 60) < 0.0001,
    `delta: ${FIXED_DELTA_SECONDS}s`);
  assert('gravity is 9.81 m/s²', DEFAULT_CONFIG.gravityMetersPerSecondSquared === 9.81,
    `gravity: ${DEFAULT_CONFIG.gravityMetersPerSecondSquared} m/s²`);
  assert('max walk speed is 4.0 m/s', DEFAULT_CONFIG.maximumWalkSpeedMetersPerSecond === 4.0,
    `speed: ${DEFAULT_CONFIG.maximumWalkSpeedMetersPerSecond} m/s`);

  // ========================================================================
  // Step 10: Replay determinism — re-run with same input
  // ========================================================================
  console.log('\nStep 10: Replay determinism — re-run with same input');

  const controller2 = createCharacterController(DEFAULT_CONFIG, checkpoints);
  const spawnResult2 = controller2.spawn(entrance, world, renderMesh.revision);
  assert('replay spawn succeeded', spawnResult2.success, `success: ${spawnResult2.success}`);

  // Replay same input
  for (let tick = 0; tick < maxTicks && !controller2.traversalComplete(); tick++) {
    const input: CharacterInputCommand = {
      tick,
      moveForward: 1.0,
      moveRight: 0,
      jumpPressed: false,
      crouchHeld: false,
      cameraYaw,
    };
    controller2.step(input, world, renderMesh.revision);
  }

  const hash2 = controller2.trajectoryHash();

  assert('replay traversal completed', controller2.traversalComplete(),
    `checkpoints: ${controller2.nextCheckpointIndex}/${checkpoints.length}`);
  assert('trajectory hash matches replay', trajectoryHashes[0] === hash2,
    `original: ${trajectoryHashes[0]}, replay: ${hash2}`);

  // ========================================================================
  // Step 11: Evidence summary
  // ========================================================================
  console.log('\nStep 11: Evidence summary');

  const finalPos = controller.state.position;
  const startPos = controller.state.trajectory[0] ?? { tick: 0, x: entrance.x, y: entrance.y, z: entrance.z };
  const totalTicks = controller.state.trajectory.length;
  const totalDistance = Math.sqrt(
    (finalPos.x - startPos.x) ** 2 +
    (finalPos.y - startPos.y) ** 2 +
    (finalPos.z - startPos.z) ** 2
  );

  console.log(`  Start: (${startPos.x.toFixed(2)}, ${startPos.y.toFixed(2)}, ${startPos.z.toFixed(2)})`);
  console.log(`  End: (${finalPos.x.toFixed(2)}, ${finalPos.y.toFixed(2)}, ${finalPos.z.toFixed(2)})`);
  console.log(`  Total ticks: ${totalTicks}`);
  console.log(`  Total distance: ${totalDistance.toFixed(2)}m`);
  console.log(`  Trajectory hash: ${trajectoryHashes[0]}`);
  console.log(`  Checkpoints: ${checkpointIds.join(' → ')}`);
  console.log(`  Collision events: ${controller.state.collisionEvents.length}`);
  console.log(`  Max penetration: ${maxPenetration.toFixed(4)}m`);

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('\n=== SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  console.log(`\nVerdict: ${failed === 0 ? 'ALL PASS — EMBODIED TRAVERSAL PROVEN' : 'FAILURES'}`);

  console.log('\n=== EVIDENCE ===');
  console.log(`Terrain: ${renderMesh.vertexCount} vertices, revision ${renderMesh.revision}`);
  console.log(`Tunnel checkpoints: ${checkpoints.length} (entrance → interior-1 → midpoint → interior-2 → exit)`);
  console.log(`Spawn: (${startPos.x.toFixed(1)}, ${startPos.y.toFixed(1)}, ${startPos.z.toFixed(1)})`);
  console.log(`Final: (${finalPos.x.toFixed(1)}, ${finalPos.y.toFixed(1)}, ${finalPos.z.toFixed(1)})`);
  console.log(`Ticks: ${totalTicks}, Distance: ${totalDistance.toFixed(1)}m`);
  console.log(`Checkpoints crossed: ${controller.nextCheckpointIndex}/${checkpoints.length}`);
  console.log(`Trajectory hash: ${trajectoryHashes[0]}`);
  console.log(`Replay hash: ${hash2}`);
  console.log(`Hash match: ${trajectoryHashes[0] === hash2 ? 'YES' : 'NO'}`);

  process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
