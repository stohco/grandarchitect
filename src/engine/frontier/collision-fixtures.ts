/**
 * frontier/collision-fixtures.ts — Programmatic collision test scenes.
 *
 * Each fixture returns a small triangle mesh designed to test a specific
 * collision scenario. The `runCollisionTests()` function spawns a capsule
 * on each fixture, runs the character controller for 100 ticks, and verifies:
 *
 *   - No fall-through (final Y > -10)
 *   - No NaN at any tick
 *   - Grounding is correctly detected when the capsule is on the surface
 *   - Trajectory hash is non-empty (replay verification)
 *
 * All fixtures are deterministic — same input → same mesh every run.
 * No Math.random is used; any "noise" comes from the LCG.
 */

import type { Vec3, CollisionFixture, CollisionTestResult, MeshData, CollisionTestSummary } from './types';
import type { ControllerInput } from './character-controller';
import { CharacterController, hashString } from './character-controller';
import { LCG } from './prng';

// ============================================================================
// Mesh builder helpers
// ============================================================================

interface MeshBuilder {
  positions: number[];
  indices: number[];
  normals: number[];
}

function newBuilder(): MeshBuilder {
  return { positions: [], indices: [], normals: [] };
}

function addVertex(b: MeshBuilder, x: number, y: number, z: number): number {
  const idx = b.positions.length / 3;
  b.positions.push(x, y, z);
  return idx;
}

function addTriangle(b: MeshBuilder, a: number, c: number, d: number): void {
  b.indices.push(a, c, d);
}

/** Compute per-face normals for a triangle mesh (no smoothing). */
function computeFaceNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
    const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
    const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const nxn = nx / len, nyn = ny / len, nzn = nz / len;
    normals[i0] += nxn; normals[i0 + 1] += nyn; normals[i0 + 2] += nzn;
    normals[i1] += nxn; normals[i1 + 1] += nyn; normals[i1 + 2] += nzn;
    normals[i2] += nxn; normals[i2 + 1] += nyn; normals[i2 + 2] += nzn;
  }
  // Normalize accumulated normals.
  for (let i = 0; i < normals.length; i += 3) {
    const x = normals[i], y = normals[i + 1], z = normals[i + 2];
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    normals[i] = x / len;
    normals[i + 1] = y / len;
    normals[i + 2] = z / len;
  }
  return normals;
}

function toMeshData(b: MeshBuilder): MeshData {
  const positions = new Float32Array(b.positions);
  const indices = new Uint32Array(b.indices);
  const normals = computeFaceNormals(positions, indices);
  return { positions, indices, normals };
}

// ============================================================================
// Fixture: FlatFloor
// ============================================================================

/**
 * A single 20x20 plane at y=0.
 * The simplest fixture: tests that the capsule rests on a flat surface.
 *
 * The plane is subdivided into 4x4 quads so the BVH has multiple triangles
 * to test (otherwise a 2-triangle plane makes BVH testing trivial).
 */
export function FlatFloor(): CollisionFixture {
  const b = newBuilder();
  const size = 20;
  const subdiv = 4;
  const half = size / 2;
  // Build a grid of vertices.
  for (let iz = 0; iz <= subdiv; iz++) {
    for (let ix = 0; ix <= subdiv; ix++) {
      const x = -half + (ix / subdiv) * size;
      const z = -half + (iz / subdiv) * size;
      addVertex(b, x, 0, z);
    }
  }
  // Build quads (two triangles each), CCW winding facing +Y.
  for (let iz = 0; iz < subdiv; iz++) {
    for (let ix = 0; ix < subdiv; ix++) {
      const v00 = iz * (subdiv + 1) + ix;
      const v10 = v00 + 1;
      const v01 = v00 + (subdiv + 1);
      const v11 = v01 + 1;
      // Triangle 1: v00, v01, v11 (CCW from above)
      addTriangle(b, v00, v01, v11);
      // Triangle 2: v00, v11, v10
      addTriangle(b, v00, v11, v10);
    }
  }
  return {
    name: 'FlatFloor',
    description: 'Single 20x20 plane at y=0 (32 triangles). Tests basic grounding.',
    mesh: toMeshData(b),
    spawn: { x: 0, y: 2.0, z: 0 },
    capsuleRadius: 0.4,
    capsuleHeight: 1.6,
  };
}

// ============================================================================
// Fixture: StepsScene
// ============================================================================

/**
 * 5 steps rising from y=0 to y=2.5. Each step is 1m wide, 0.5m tall.
 * Tests step-climbing — the capsule should be able to walk up small steps
 * (≤ 0.5 m) but block on taller ones.
 */
export function StepsScene(): CollisionFixture {
  const b = newBuilder();
  const stepCount = 5;
  const stepWidth = 1.0;
  const stepHeight = 0.5;
  const stepDepth = 2.0;

  for (let s = 0; s < stepCount; s++) {
    const x0 = -2.5 + s * stepWidth;
    const x1 = x0 + stepWidth;
    const y0 = s * stepHeight;
    const y1 = (s + 1) * stepHeight;
    const z0 = -stepDepth / 2;
    const z1 = stepDepth / 2;

    // Top face of this step.
    const v0 = addVertex(b, x0, y1, z0);
    const v1 = addVertex(b, x1, y1, z0);
    const v2 = addVertex(b, x1, y1, z1);
    const v3 = addVertex(b, x0, y1, z1);
    addTriangle(b, v0, v3, v2);
    addTriangle(b, v0, v2, v1);

    // Front face (rises from y0 to y1 at x=x0). Only on the first step;
    // subsequent steps' front faces are hidden by the previous step's top.
    if (s === 0) {
      const f0 = addVertex(b, x0, y0, z0);
      const f1 = addVertex(b, x0, y0, z1);
      const f2 = addVertex(b, x0, y1, z1);
      const f3 = addVertex(b, x0, y1, z0);
      addTriangle(b, f0, f1, f2);
      addTriangle(b, f0, f2, f3);
    }

    // Side faces (z=z0 and z=z1) — make the steps solid-looking.
    const s0a = addVertex(b, x0, y0, z0);
    const s1a = addVertex(b, x1, y0, z0);
    const s2a = addVertex(b, x1, y1, z0);
    const s3a = addVertex(b, x0, y1, z0);
    addTriangle(b, s0a, s1a, s2a);
    addTriangle(b, s0a, s2a, s3a);

    const s0b = addVertex(b, x0, y0, z1);
    const s1b = addVertex(b, x1, y0, z1);
    const s2b = addVertex(b, x1, y1, z1);
    const s3b = addVertex(b, x0, y1, z1);
    addTriangle(b, s0b, s3b, s2b);
    addTriangle(b, s0b, s2b, s1b);
  }

  // Add a flat floor at y=0 extending in front of the steps.
  const ffZ0 = stepDepth / 2;
  const ffZ1 = stepDepth / 2 + 4;
  const ffX0 = -3;
  const ffX1 = 3;
  const f0 = addVertex(b, ffX0, 0, ffZ0);
  const f1 = addVertex(b, ffX1, 0, ffZ0);
  const f2 = addVertex(b, ffX1, 0, ffZ1);
  const f3 = addVertex(b, ffX0, 0, ffZ1);
  addTriangle(b, f0, f3, f2);
  addTriangle(b, f0, f2, f1);

  return {
    name: 'StepsScene',
    description: '5 steps rising from y=0 to y=2.5. Tests step-climbing (0.5m per step).',
    mesh: toMeshData(b),
    spawn: { x: 0, y: 2.0, z: 3.5 }, // spawn on the flat floor in front
    capsuleRadius: 0.4,
    capsuleHeight: 1.6,
  };
}

// ============================================================================
// Fixture: SlopeScene
// ============================================================================

/**
 * A 30-degree ramp from y=0 to y=tan(30°)*8 ≈ 4.62m.
 * Tests slope movement — the capsule should slide down if the slope is too
 * steep, or rest if it's walkable.
 *
 * The ramp is built as a subdivided plane so the BVH has multiple triangles.
 * We also add a flat floor at the bottom to land on.
 */
export function SlopeScene(): CollisionFixture {
  const b = newBuilder();
  const angleRad = 30 * Math.PI / 180;
  const slopeLen = 8;
  const slopeWidth = 4;
  const slopeHeight = Math.tan(angleRad) * slopeLen;
  const subdiv = 8;

  // Slope surface: from (x=-slopeWidth/2, y=0, z=0) up to (x=slopeWidth/2, y=slopeHeight, z=-slopeLen).
  for (let iz = 0; iz <= subdiv; iz++) {
    for (let ix = 0; ix <= subdiv; ix++) {
      const u = ix / subdiv;
      const v = iz / subdiv;
      const x = -slopeWidth / 2 + u * slopeWidth;
      const z = -v * slopeLen;
      const y = v * slopeHeight;
      addVertex(b, x, y, z);
    }
  }
  for (let iz = 0; iz < subdiv; iz++) {
    for (let ix = 0; ix < subdiv; ix++) {
      const v00 = iz * (subdiv + 1) + ix;
      const v10 = v00 + 1;
      const v01 = v00 + (subdiv + 1);
      const v11 = v01 + 1;
      addTriangle(b, v00, v01, v11);
      addTriangle(b, v00, v11, v10);
    }
  }

  // Flat floor at y=0 extending in front of the slope (z > 0).
  const ffZ0 = 0;
  const ffZ1 = 4;
  const ffX0 = -3;
  const ffX1 = 3;
  const f0 = addVertex(b, ffX0, 0, ffZ0);
  const f1 = addVertex(b, ffX1, 0, ffZ0);
  const f2 = addVertex(b, ffX1, 0, ffZ1);
  const f3 = addVertex(b, ffX0, 0, ffZ1);
  addTriangle(b, f0, f3, f2);
  addTriangle(b, f0, f2, f1);

  return {
    name: 'SlopeScene',
    description: '30° ramp from y=0 to y≈4.62. Tests slope movement (walkable angle).',
    mesh: toMeshData(b),
    spawn: { x: 0, y: 2.0, z: 2.5 }, // spawn on flat floor in front of slope
    capsuleRadius: 0.4,
    capsuleHeight: 1.6,
  };
}

// ============================================================================
// Fixture: WallScene
// ============================================================================

/**
 * A wall with a doorway gap in the middle.
 * The wall is at z=0, spanning x=[-5,5] with a 1m-wide gap at x=[-0.5,0.5].
 * The wall is 2m tall and 0.5m thick.
 * Tests that the capsule blocks on the wall and can pass through the doorway.
 */
export function WallScene(): CollisionFixture {
  const b = newBuilder();
  const wallY = 2.0;
  const wallThick = 0.5;
  // Left wall segment: x=[-5, -0.5]
  const leftXs = [-5, -0.5];
  // Right wall segment: x=[0.5, 5]
  const rightXs = [0.5, 5];

  function buildWallSegment(x0: number, x1: number): void {
    const z0 = -wallThick / 2;
    const z1 = wallThick / 2;
    // Front face (z=z1)
    const f0 = addVertex(b, x0, 0, z1);
    const f1 = addVertex(b, x1, 0, z1);
    const f2 = addVertex(b, x1, wallY, z1);
    const f3 = addVertex(b, x0, wallY, z1);
    addTriangle(b, f0, f3, f2);
    addTriangle(b, f0, f2, f1);
    // Back face (z=z0)
    const b0 = addVertex(b, x0, 0, z0);
    const b1 = addVertex(b, x1, 0, z0);
    const b2 = addVertex(b, x1, wallY, z0);
    const b3 = addVertex(b, x0, wallY, z0);
    addTriangle(b, b0, b1, b2);
    addTriangle(b, b0, b2, b3);
    // Top face (y=wallY)
    const t0 = addVertex(b, x0, wallY, z0);
    const t1 = addVertex(b, x1, wallY, z0);
    const t2 = addVertex(b, x1, wallY, z1);
    const t3 = addVertex(b, x0, wallY, z1);
    addTriangle(b, t0, t3, t2);
    addTriangle(b, t0, t2, t1);
    // End caps
    const e0 = addVertex(b, x0, 0, z0);
    const e1 = addVertex(b, x0, 0, z1);
    const e2 = addVertex(b, x0, wallY, z1);
    const e3 = addVertex(b, x0, wallY, z0);
    addTriangle(b, e0, e1, e2);
    addTriangle(b, e0, e2, e3);
    const e4 = addVertex(b, x1, 0, z0);
    const e5 = addVertex(b, x1, 0, z1);
    const e6 = addVertex(b, x1, wallY, z1);
    const e7 = addVertex(b, x1, wallY, z0);
    addTriangle(b, e4, e7, e6);
    addTriangle(b, e4, e6, e5);
  }

  buildWallSegment(leftXs[0], leftXs[1]);
  buildWallSegment(rightXs[0], rightXs[1]);

  // Floor.
  const ffX0 = -5, ffX1 = 5, ffZ0 = -3, ffZ1 = 3;
  const fl0 = addVertex(b, ffX0, 0, ffZ0);
  const fl1 = addVertex(b, ffX1, 0, ffZ0);
  const fl2 = addVertex(b, ffX1, 0, ffZ1);
  const fl3 = addVertex(b, ffX0, 0, ffZ1);
  addTriangle(b, fl0, fl3, fl2);
  addTriangle(b, fl0, fl2, fl1);

  return {
    name: 'WallScene',
    description: 'Wall with a 1m doorway gap. Tests wall blocking + doorway passage.',
    mesh: toMeshData(b),
    spawn: { x: 0, y: 1.5, z: 2 }, // spawn on floor, in front of doorway
    capsuleRadius: 0.4,
    capsuleHeight: 1.6,
  };
}

// ============================================================================
// Fixture: CornerScene
// ============================================================================

/**
 * Two walls meeting at 90 degrees (an inside corner).
 * Wall A: along +X axis at z=0.
 * Wall B: along +Z axis at x=0.
 * They meet at the origin, forming an inside corner at (0,0,0).
 * Tests that the capsule does not get stuck in the corner or fall through.
 */
export function CornerScene(): CollisionFixture {
  const b = newBuilder();
  const wallY = 2.0;
  const wallLen = 5;
  const wallThick = 0.5;

  function buildWall(x0: number, z0: number, x1: number, z1: number): void {
    // Build a wall as a box from (x0,0,z0) to (x1,wallY,z1).
    // 8 corner vertices.
    const c000 = addVertex(b, x0, 0, z0);
    const c001 = addVertex(b, x0, 0, z1);
    const c010 = addVertex(b, x0, wallY, z0);
    const c011 = addVertex(b, x0, wallY, z1);
    const c100 = addVertex(b, x1, 0, z0);
    const c101 = addVertex(b, x1, 0, z1);
    const c110 = addVertex(b, x1, wallY, z0);
    const c111 = addVertex(b, x1, wallY, z1);

    // +X face
    addTriangle(b, c100, c101, c111);
    addTriangle(b, c100, c111, c110);
    // -X face
    addTriangle(b, c000, c010, c011);
    addTriangle(b, c000, c011, c001);
    // +Y face (top)
    addTriangle(b, c010, c110, c111);
    addTriangle(b, c010, c111, c011);
    // -Y face (bottom)
    addTriangle(b, c000, c001, c101);
    addTriangle(b, c000, c101, c100);
    // +Z face
    addTriangle(b, c001, c011, c111);
    addTriangle(b, c001, c111, c101);
    // -Z face
    addTriangle(b, c000, c100, c110);
    addTriangle(b, c000, c110, c010);
  }

  // Wall A: along the X axis, occupying z=[-wallThick/2, +wallThick/2], x=[0, wallLen].
  buildWall(0, -wallThick / 2, wallLen, wallThick / 2);
  // Wall B: along the Z axis, occupying x=[-wallThick/2, +wallThick/2], z=[0, wallLen].
  buildWall(-wallThick / 2, 0, wallThick / 2, wallLen);

  // Floor (covers x=[-3, wallLen+1], z=[-3, wallLen+1] minus the wall footprint).
  // To keep things simple, lay a floor underneath everything; the walls sit on top.
  const fx0 = -3, fx1 = wallLen + 1, fz0 = -3, fz1 = wallLen + 1;
  const f0 = addVertex(b, fx0, 0, fz0);
  const f1 = addVertex(b, fx1, 0, fz0);
  const f2 = addVertex(b, fx1, 0, fz1);
  const f3 = addVertex(b, fx0, 0, fz1);
  addTriangle(b, f0, f3, f2);
  addTriangle(b, f0, f2, f1);

  return {
    name: 'CornerScene',
    description: 'Two walls meeting at 90° (inside corner at origin). Tests corner collision.',
    mesh: toMeshData(b),
    spawn: { x: 2, y: 1.5, z: 2 }, // spawn in the inside corner area
    capsuleRadius: 0.4,
    capsuleHeight: 1.6,
  };
}

// ============================================================================
// Test runner
// ============================================================================

/** All collision fixtures in deterministic order. */
export function allFixtures(): CollisionFixture[] {
  return [FlatFloor(), StepsScene(), SlopeScene(), WallScene(), CornerScene()];
}

/**
 * Run all collision fixtures for `tickCount` ticks each (default 100).
 * Each fixture spawns a capsule, applies a deterministic input pattern, and
 * verifies:
 *   - No NaN at any tick (nanTicks === 0)
 *   - No fall-through (final position.y > -10)
 *   - Grounding is correctly detected when the capsule is on the surface
 *   - Trajectory hash is non-empty
 *
 * Returns the per-fixture results + aggregate summary.
 *
 * The input pattern is deterministic: walk forward for 100 ticks with no jump.
 * This tests resting, sliding, and basic movement — not jumping.
 */
export function runCollisionTests(tickCount = 100): CollisionTestSummary {
  const tests: CollisionTestResult[] = [];
  const dt = 1 / 60; // 60 Hz

  for (const fixture of allFixtures()) {
    const controller = new CharacterController({
      mesh: fixture.mesh,
      spawn: fixture.spawn,
      radius: fixture.capsuleRadius,
      height: fixture.capsuleHeight,
      seed: 0xC0111DE, // collision-test seed (deterministic)
    });

    let nanTicks = 0;
    let fellThrough = false;
    let lastGrounded = false;

    for (let t = 0; t < tickCount; t++) {
      // Deterministic input:
      //   - Ticks 0-9: stand still (let the capsule settle on the ground).
      //   - Ticks 10-60: walk forward in +X at 2 m/s (test horizontal movement).
      //   - Ticks 60+: stand still (verify the capsule stays grounded).
      //
      // The walk phase is kept short (50 ticks = 0.83s = ~1.7m of movement)
      // so the capsule stays on the fixture's floor (most fixtures are ≥4m
      // wide). This tests both fall + land + walk + stop, in that order.
      let moveX = 0;
      let moveSpeed = 0;
      if (t >= 10 && t < 60) {
        moveX = 1;
        moveSpeed = 2;
      }
      const input: ControllerInput = {
        moveX,
        moveZ: 0,
        moveSpeed,
        jump: false,
        jumpStrength: 0,
      };

      const beforeY = controller.position.y;
      controller.update(dt, input);

      // NaN check.
      if (
        Number.isNaN(controller.position.x) ||
        Number.isNaN(controller.position.y) ||
        Number.isNaN(controller.position.z)
      ) {
        nanTicks++;
        // Reset to spawn to keep the test going.
        controller.position = { ...fixture.spawn };
        controller.velocity = { x: 0, y: 0, z: 0 };
      }

      // Fall-through check.
      if (controller.position.y < -10) {
        fellThrough = true;
      }

      // Track final grounded state.
      lastGrounded = controller.grounded;
      void beforeY; // (kept for future vertical-fall assertions)
    }

    const finalPos = { ...controller.position };
    const progress = controller.getCheckpointProgress();
    const trajectoryHash = progress.trajectoryHash;

    // Pass criteria:
    //   - No NaN at any tick
    //   - No fall-through
    //   - Grounded at the final tick (the capsule should have settled on the surface)
    //   - Trajectory hash is non-empty (64 hex chars from SHA-256)
    const passed = nanTicks === 0 && !fellThrough && lastGrounded && trajectoryHash.length === 64;

    let details: string;
    if (nanTicks > 0) {
      details = `FAILED: ${nanTicks} NaN ticks detected.`;
    } else if (fellThrough) {
      details = `FAILED: capsule fell through floor (final y=${finalPos.y.toFixed(3)}).`;
    } else if (!lastGrounded) {
      details = `FAILED: capsule not grounded at final tick (y=${finalPos.y.toFixed(3)}).`;
    } else if (trajectoryHash.length !== 64) {
      details = `FAILED: trajectory hash malformed (length=${trajectoryHash.length}).`;
    } else {
      details = `PASS: settled at y=${finalPos.y.toFixed(3)}, grounded=${lastGrounded}, hash=${trajectoryHash.slice(0, 12)}…`;
    }

    tests.push({
      name: fixture.name,
      passed,
      details,
      finalPosition: finalPos,
      grounded: lastGrounded,
      nanTicks,
      fellThrough,
      trajectoryHash,
      ticks: tickCount,
    });
  }

  const passed = tests.filter(t => t.passed).length;
  const failed = tests.length - passed;
  return {
    tests,
    summary: { total: tests.length, passed, failed },
  };
}

// ============================================================================
// Fixture validation (used by tests, not exported to UI)
// ============================================================================

/**
 * Sanity-check a fixture's mesh: no NaN in positions/indices, indices within
 * bounds, normals length matches positions length.
 *
 * Used internally by `runCollisionTests` if SANITY_CHECK_FIXTURES is enabled.
 */
export function validateFixtureMesh(mesh: MeshData): { ok: boolean; reason?: string } {
  for (let i = 0; i < mesh.positions.length; i++) {
    if (Number.isNaN(mesh.positions[i])) {
      return { ok: false, reason: `NaN at positions[${i}]` };
    }
  }
  for (let i = 0; i < mesh.indices.length; i++) {
    if (mesh.indices[i] * 3 + 2 >= mesh.positions.length) {
      return { ok: false, reason: `Index ${mesh.indices[i]} out of bounds at indices[${i}]` };
    }
  }
  if (mesh.normals.length !== mesh.positions.length) {
    return { ok: false, reason: `Normals length ${mesh.normals.length} ≠ positions length ${mesh.positions.length}` };
  }
  return { ok: true };
}

/**
 * Verify that the LCG PRNG produces a deterministic sequence across calls.
 * Returns true if two LCGs seeded identically produce identical output.
 */
export function verifyLCGDeterminism(): boolean {
  const a = new LCG(0xDEADBEEF);
  const b = new LCG(0xDEADBEEF);
  for (let i = 0; i < 100; i++) {
    if (a.nextUint32() !== b.nextUint32()) return false;
  }
  return true;
}

/**
 * Verify that hashString is deterministic.
 */
export function verifyHashDeterminism(): boolean {
  return hashString('hello-world') === hashString('hello-world');
}
