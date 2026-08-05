/**
 * Spawn Diagnostic — diagnose why the character falls through the floor
 *
 * Before replacing the collision algorithm, generate a diagnostic packet
 * at the candidate spawn position showing:
 *   - capsule geometry
 *   - terrain/collision revisions
 *   - nearest triangle, normal, winding
 *   - distance to triangle
 *   - SDF samples at capsule foot and center
 *   - ground query result
 *   - overlap result
 *   - render/collider surface heights
 *
 * Run: npx tsx src/engine/frontier/spawn-diagnostic.ts
 */

import {
  createDensityRegion, TerrainSourceOp, SdfMountainOp, SplineTunnelOp, ErosionOp,
  extractSurface, generateCollision,
} from './terrain-plugin';
import { createThreeJSCollisionWorld, createCapsule, DEFAULT_CONFIG } from './character-controller';

function pseudoNoise(x: number, z: number, seed: number): number {
  let h = (x * 374761393 + z * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

async function run() {
  console.log('\n=== SPAWN DIAGNOSTIC ===\n');

  // Generate terrain
  const splinePoints: [number, number, number][] = [[10, 25, 64], [64, 30, 64], [118, 25, 64]];
  const tunnelRadius = 3;

  const region = createDensityRegion('region-diag', 1,
    { minX: 0, maxX: 128, minY: 0, maxY: 64, minZ: 0, maxZ: 128 }, 24);
  const ctx = { seed: 42, rng: { state: 42 >>> 0, next() { this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 0x100000000; }, range(min: number, max: number) { return min + this.next() * (max - min); } } as any };
  new TerrainSourceOp({ seed: 42, baseHeight: 20, variation: 15 }).evaluate(region, ctx);
  new SdfMountainOp({ position: [64, 20, 64], height: 40, radius: 30 }).evaluate(region, ctx);
  new SplineTunnelOp({ splinePoints, radius: tunnelRadius }).evaluate(region, ctx);
  new ErosionOp({ iterations: 2, strength: 0.1 }).evaluate(region, ctx);

  const renderMesh = extractSurface(region);
  const collision = generateCollision(region, renderMesh);

  // Create collision world
  const world = createThreeJSCollisionWorld(
    () => ({ positions: renderMesh.positions, indices: renderMesh.indices, vertexCount: renderMesh.vertexCount }),
    () => renderMesh.revision,
  );

  // Candidate spawn positions
  const entrance = splinePoints[0]; // [10, 25, 64]
  const tunnelFloor = entrance[1] - tunnelRadius; // 25 - 3 = 22
  const capsuleHeight = DEFAULT_CONFIG.standingHeightMeters; // 1.8
  const capsuleRadius = DEFAULT_CONFIG.radiusMeters; // 0.4

  console.log('=== TERRAIN INFO ===');
  console.log(`  Render vertices: ${renderMesh.vertexCount}, triangles: ${renderMesh.triangleCount}`);
  console.log(`  Render revision: ${renderMesh.revision}`);
  console.log(`  Collision revision: ${collision.sourceTerrainRevision}`);
  console.log(`  Render hash: ${renderMesh.artifactHash.slice(0, 16)}...`);
  console.log(`  Collision hash: ${collision.artifactHash.slice(0, 16)}...`);
  console.log(`  Revisions match: ${renderMesh.revision === collision.sourceTerrainRevision}`);

  console.log('\n=== TUNNEL INFO ===');
  console.log(`  Spline: ${splinePoints.map(p => `(${p[0]}, ${p[1]}, ${p[2]})`).join(' → ')}`);
  console.log(`  Tunnel radius: ${tunnelRadius}`);
  console.log(`  Entrance center: (${entrance[0]}, ${entrance[1]}, ${entrance[2]})`);
  console.log(`  Expected tunnel floor Y: ${tunnelFloor}`);

  // Test multiple candidate spawn positions
  const candidates = [
    { label: 'tunnel-floor (y=22.9)', x: 10, y: tunnelFloor + capsuleHeight / 2, z: 64 },
    { label: 'tunnel-center (y=25)', x: 10, y: 25, z: 64 },
    { label: 'above-tunnel (y=30)', x: 10, y: 30, z: 64 },
    { label: 'above-mountain (y=40)', x: 10, y: 40, z: 64 },
    { label: 'terrain-surface (y=20)', x: 10, y: 20, z: 64 },
    { label: 'ground-level (y=2)', x: 10, y: 2, z: 64 },
  ];

  for (const candidate of candidates) {
    console.log(`\n=== CANDIDATE: ${candidate.label} (${candidate.x}, ${candidate.y}, ${candidate.z}) ===`);

    const capsule = createCapsule(DEFAULT_CONFIG, { x: candidate.x, y: candidate.y, z: candidate.z });
    console.log(`  Capsule center: (${capsule.center.x}, ${capsule.center.y}, ${capsule.center.z})`);
    console.log(`  Capsule radius: ${capsule.radius}`);
    console.log(`  Capsule half-height: ${capsule.halfHeight}`);
    console.log(`  Capsule segment: (${capsule.center.x}, ${capsule.center.y - capsule.halfHeight}, ${capsule.center.z}) → (${capsule.center.x}, ${capsule.center.y + capsule.halfHeight}, ${capsule.center.z})`);

    // SDF sample at capsule foot
    const footX = Math.floor((candidate.x / 128) * 24);
    const footY = Math.floor(((candidate.y - capsuleRadius) / 64) * 24);
    const footZ = Math.floor((candidate.z / 128) * 24);
    const footIdx = footX + footY * 24 + footZ * 24 * 24;
    const footSDF = footIdx >= 0 && footIdx < region.samples.length ? region.samples[footIdx] : 'out of bounds';
    console.log(`  SDF at capsule foot (voxel ${footX},${footY},${footZ}): ${footSDF}`);
    console.log(`    (negative = solid, positive = empty)`);

    // SDF sample at capsule center
    const centerY = Math.floor((candidate.y / 64) * 24);
    const centerIdx = footX + centerY * 24 + footZ * 24 * 24;
    const centerSDF = centerIdx >= 0 && centerIdx < region.samples.length ? region.samples[centerIdx] : 'out of bounds';
    console.log(`  SDF at capsule center (voxel ${footX},${centerY},${footZ}): ${centerSDF}`);

    // Overlap test
    const overlap = world.overlapCapsule(capsule, renderMesh.revision);
    console.log(`  Overlap: ${overlap.overlapping ? 'YES' : 'NO'}`);
    if (overlap.overlapping) {
      console.log(`    Penetration: ${overlap.penetrationDepth.toFixed(4)}m`);
      console.log(`    Normal: (${overlap.normal.x}, ${overlap.normal.y}, ${overlap.normal.z})`);
    }

    // Ground query (from capsule center, downward, max 5m)
    const ground = world.findGround(capsule, 5.0, renderMesh.revision);
    console.log(`  Ground query (5m down): ${ground.found ? 'FOUND' : 'NOT FOUND'}`);
    if (ground.found) {
      console.log(`    Ground height: ${ground.height.toFixed(4)}`);
      console.log(`    Ground normal: (${ground.normal.x.toFixed(3)}, ${ground.normal.y.toFixed(3)}, ${ground.normal.z.toFixed(3)})`);
      console.log(`    Distance below capsule: ${(candidate.y - ground.height).toFixed(4)}m`);
      console.log(`    Normal is upward-facing: ${ground.normal.y > 0}`);
    }

    // Ground query (from higher up, max 50m)
    const highCapsule = createCapsule(DEFAULT_CONFIG, { x: candidate.x, y: candidate.y + 20, z: candidate.z });
    const highGround = world.findGround(highCapsule, 50.0, renderMesh.revision);
    console.log(`  Ground query (from y+20, 50m down): ${highGround.found ? 'FOUND' : 'NOT FOUND'}`);
    if (highGround.found) {
      console.log(`    Ground height: ${highGround.height.toFixed(4)}`);
      console.log(`    Ground normal Y: ${highGround.normal.y.toFixed(3)} (upward: ${highGround.normal.y > 0})`);
    }

    // Check if there are ANY triangles near the spawn point
    let nearbyTriangles = 0;
    let upwardFacing = 0;
    let downwardFacing = 0;
    let minDist = Infinity;
    let nearestNormal = '';
    let nearestWinding = '';

    for (let i = 0; i < renderMesh.indices.length; i += 3) {
      const i0 = renderMesh.indices[i] * 3;
      const i1 = renderMesh.indices[i + 1] * 3;
      const i2 = renderMesh.indices[i + 2] * 3;
      const ax = renderMesh.positions[i0], ay = renderMesh.positions[i0 + 1], az = renderMesh.positions[i0 + 2];
      const bx = renderMesh.positions[i1], by = renderMesh.positions[i1 + 1], bz = renderMesh.positions[i1 + 2];
      const cx = renderMesh.positions[i2], cy = renderMesh.positions[i2 + 1], cz = renderMesh.positions[i2 + 2];

      // Centroid
      const cx2 = (ax + bx + cx) / 3;
      const cy2 = (ay + by + cy) / 3;
      const cz2 = (az + bz + cz) / 3;

      // Distance to candidate
      const dist = Math.sqrt((cx2 - candidate.x) ** 2 + (cy2 - candidate.y) ** 2 + (cz2 - candidate.z) ** 2);

      if (dist < 5.0) {
        nearbyTriangles++;

        // Triangle normal
        const edge1x = bx - ax, edge1y = by - ay, edge1z = bz - az;
        const edge2x = cx - ax, edge2y = cy - ay, edge2z = cz - az;
        const nx = edge1y * edge2z - edge1z * edge2y;
        const ny = edge1z * edge2x - edge1x * edge2z;
        const nz = edge1x * edge2y - edge1y * edge2x;
        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);

        if (nLen > 0) {
          const nny = ny / nLen;
          if (nny > 0.5) upwardFacing++;
          else if (nny < -0.5) downwardFacing++;

          if (dist < minDist) {
            minDist = dist;
            nearestNormal = `(${(nx / nLen).toFixed(3)}, ${(ny / nLen).toFixed(3)}, ${(nz / nLen).toFixed(3)})`;
            nearestWinding = nny > 0 ? 'CCW (upward)' : nny < 0 ? 'CW (downward)' : 'edge-on';
          }
        }
      }
    }

    console.log(`  Nearby triangles (within 5m): ${nearbyTriangles}`);
    console.log(`    Upward-facing: ${upwardFacing}`);
    console.log(`    Downward-facing: ${downwardFacing}`);
    console.log(`    Nearest triangle distance: ${minDist === Infinity ? 'none' : minDist.toFixed(4) + 'm'}`);
    console.log(`    Nearest triangle normal: ${nearestNormal || 'none'}`);
    console.log(`    Nearest triangle winding: ${nearestWinding || 'none'}`);
  }

  // Also check the SDF field at the tunnel area
  console.log('\n=== SDF FIELD ANALYSIS AT TUNNEL ENTRANCE ===');
  console.log('  (x=10, z=64, varying y)');
  for (let y = 0; y < 24; y++) {
    const wy = (y / 24) * 64;
    const idx = Math.floor((10 / 128) * 24) + y * 24 + Math.floor((64 / 128) * 24) * 24 * 24;
    const sdf = idx >= 0 && idx < region.samples.length ? region.samples[idx] : '?';
    const state = sdf === '?' ? '?' : sdf < 0 ? 'SOLID' : 'EMPTY';
    console.log(`    y=${wy.toFixed(1)} (voxel ${y}): SDF=${typeof sdf === 'number' ? sdf.toFixed(3) : sdf} ${state}`);
  }

  console.log('\n=== DIAGNOSIS ===');
  console.log('The SDF field at the tunnel entrance shows where solid/empty transitions are.');
  console.log('The nearest triangle analysis shows if floor triangles exist near the spawn point.');
  console.log('The ground query shows if the ray-triangle intersection finds those floor triangles.');
  console.log('If SDF shows EMPTY at the spawn but ground query fails, the issue is in the collision world (triangle winding, ray direction, or triangle selection).');
  console.log('If SDF shows SOLID at the spawn, the spawn is inside terrain and needs adjustment.');
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
