/**
 * frontier/terrain-conformance-test.ts — Terrain Viewport conformance
 *
 * Proves the milestone "smooth mountain → carve tunnel → matching collision
 * → walk through it" at the data level:
 *
 *   1. Determinism — same seed → identical field, mesh, heightmap; the
 *      derived artifacts are pure functions of the seed.
 *   2. Field sanity — the density field is a solid plain + a smooth mountain
 *      with an air tunnel through it (no voids, no NaN).
 *   3. Mesh validity — the marching-cubes surface is a well-formed indexed
 *      mesh (in-range indices, unit normals, no NaN, all three region
 *      materials present, bounded by the world box).
 *   4. Heightmap correctness — every heightmap vertex EXACTLY equals the
 *      mesh vertex at the same lattice column (render and collision derive
 *      from the same field with the same crossing formula, so they match by
 *      construction — maxDiff is 0).
 *   5. Walk-through proof — the spawn point has solid ground below and open
 *      air above; every tunnel checkpoint has a floor and open air; the
 *      deep-center checkpoint is fully enclosed (ceiling solid); the whole
 *      spline path is air.
 *   6. Runtime sanity — PhysicsRuntime.addTerrainHeightfield is exercised
 *      headlessly (bun + @dimforge/rapier3d-compat): the heightfield is
 *      created, the revision registers, a character spawned at the terrain
 *      surface rests on the collider (no fall-through), the run is
 *      bit-deterministic across two identical runs, and resetWorld removes
 *      the fixture.
 *
 * Run: bun run src/engine/frontier/terrain-conformance-test.ts
 */

import {
  TerrainPipeline,
  extractSurfaceMesh,
  sampleHeightmap,
  terrainSeedFromSettlementSeed,
  sampleDensity,
  DENSITY_SOLID_THRESHOLD,
  SURFACE_MATERIAL_EARTH,
  SURFACE_MATERIAL_MOUNTAIN,
  SURFACE_MATERIAL_TUNNEL,
  TERRAIN_GRID_SIZE,
  type DensityField,
  type SurfaceMesh,
} from './terrain-plugin';
import {
  getPhysicsRuntime,
  resetPhysicsRuntime,
} from '../runtime/physics-runtime';

// ---------------------------------------------------------------------------
// Test harness (repo style — self-contained, no framework)
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

/** Compare two Float32Arrays bit-for-bit. */
function arraysEqual(a: Float32Array, b: Float32Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Compare two Uint32Arrays element-wise. */
function uintsEqual(a: Uint32Array, b: Uint32Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Lattice column → mesh vertex indices (for render/collision matching). */
function meshVerticesByLatticeColumn(mesh: SurfaceMesh): Map<string, number[]> {
  const byXZ = new Map<string, number[]>();
  for (let v = 0; v < mesh.vertexCount; v++) {
    const key = `${Math.round(mesh.positions[v * 3])},${Math.round(mesh.positions[v * 3 + 2])}`;
    const arr = byXZ.get(key);
    if (arr) arr.push(v);
    else byXZ.set(key, [v]);
  }
  return byXZ;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function runTerrainTests(): void {
  console.log('\n=== 1. DETERMINISM ===');

  const a = new TerrainPipeline({ seed: 42 });
  a.generate();
  const b = new TerrainPipeline({ seed: 42 });
  b.generate();
  assert(a.hashDensityField() === b.hashDensityField(), 'Same seed → same density-field hash');

  const meshA = a.getSurfaceMesh();
  const meshB = b.getSurfaceMesh();
  assert(arraysEqual(meshA.positions, meshB.positions), 'Same seed → identical mesh positions');
  assert(uintsEqual(meshA.indices, meshB.indices), 'Same seed → identical mesh indices');

  const hmA = a.getHeightmap();
  const hmB = b.getHeightmap();
  assert(arraysEqual(hmA.heights, hmB.heights), 'Same seed → identical heightmap heights');
  assert(hmA.revision === hmB.revision, 'Same seed → identical heightmap revision');

  const c = new TerrainPipeline({ seed: 43 });
  c.generate();
  assert(c.hashDensityField() !== a.hashDensityField(), 'Different seed → different field hash');

  console.log('\n=== 2. FIELD SANITY ===');
  const field = a.getField();
  const validation = a.validateDensityField();
  assert(validation.ok, validation.reason ?? 'Density field validates (no NaN/Infinity)');

  let solid = 0;
  for (let i = 0; i < field.data.length; i++) {
    if (field.data[i] < DENSITY_SOLID_THRESHOLD) solid++;
  }
  const solidFraction = solid / field.data.length;
  assert(solidFraction > 0.005 && solidFraction < 0.6,
    `Solid fraction sane (${(100 * solidFraction).toFixed(1)}% — a thin world shell + mountain + tunnel)`);

  // Mountain: solid below the peak, air above.
  assert(sampleDensity(field, { x: 0, y: 10, z: 0 }) < 0, 'Mountain solid below peak (0,10,0)');
  assert(sampleDensity(field, { x: 0, y: 20, z: 0 }) > 0, 'Air above the peak (0,20,0)');
  // Plain: solid just under the surface, air above.
  assert(sampleDensity(field, { x: 30, y: 0.2, z: 0 }) < 0, 'Plain solid below surface (30,0.2,0)');
  assert(sampleDensity(field, { x: 30, y: 1.5, z: 0 }) > 0, 'Plain air above surface (30,1.5,0)');

  // Tunnel: air along the centerline, solid floor and ceiling around it.
  const mid = a.getSpline().sample(0.5);
  assert(sampleDensity(field, { x: mid.x, y: mid.y, z: mid.z }) > 0, 'Tunnel air at centerline');
  assert(sampleDensity(field, { x: mid.x, y: mid.y - 2.2, z: mid.z }) < 0, 'Tunnel floor solid below centerline');
  assert(sampleDensity(field, { x: mid.x, y: mid.y + 3.2, z: mid.z }) < 0, 'Tunnel ceiling solid above centerline');

  console.log('\n=== 3. MESH VALIDITY ===');
  const mesh = a.getSurfaceMesh();
  assert(mesh.triangleCount > 5000, `Mesh has a healthy triangle count (${mesh.triangleCount})`);
  assert(mesh.indices.length % 3 === 0, 'Index count is a multiple of 3');
  {
    let ok = true;
    for (let i = 0; i < mesh.indices.length; i++) {
      if (mesh.indices[i] >= mesh.vertexCount) { ok = false; break; }
    }
    assert(ok, 'All indices in range');
  }
  {
    let ok = true;
    for (let i = 0; i < mesh.positions.length; i++) {
      if (!Number.isFinite(mesh.positions[i])) { ok = false; break; }
    }
    assert(ok, 'No NaN/Infinity in positions');
  }
  {
    let ok = true;
    for (let i = 0; i < mesh.normals.length; i++) {
      if (!Number.isFinite(mesh.normals[i])) { ok = false; break; }
    }
    assert(ok, 'No NaN/Infinity in normals');
  }
  {
    let ok = true;
    for (let v = 0; v < mesh.vertexCount; v++) {
      const nx = mesh.normals[v * 3], ny = mesh.normals[v * 3 + 1], nz = mesh.normals[v * 3 + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (Math.abs(len - 1) > 1e-3) { ok = false; break; }
    }
    assert(ok, 'Normals are unit length');
  }
  {
    let ok = true;
    for (const m of mesh.materialIds) {
      if (m !== SURFACE_MATERIAL_EARTH && m !== SURFACE_MATERIAL_MOUNTAIN && m !== SURFACE_MATERIAL_TUNNEL) { ok = false; break; }
    }
    assert(ok, 'Material ids within {earth, mountain, tunnel}');
  }
  {
    const mats = new Set(mesh.materialIds);
    assert(mats.has(SURFACE_MATERIAL_EARTH) && mats.has(SURFACE_MATERIAL_MOUNTAIN) && mats.has(SURFACE_MATERIAL_TUNNEL),
      'All three region materials present');
  }
  {
    let ok = true;
    const half = field.worldSize / 2;
    for (let v = 0; v < mesh.vertexCount; v++) {
      const x = mesh.positions[v * 3], y = mesh.positions[v * 3 + 1], z = mesh.positions[v * 3 + 2];
      if (x < -half || x > half || y < 0 || y > field.worldSize || z < -half || z > half) { ok = false; break; }
    }
    assert(ok, 'Mesh bounded by the world box');
  }

  console.log('\n=== 4. HEIGHTMAP CORRECTNESS ===');
  const hm = a.getHeightmap();
  assert(hm.heights.length === (hm.nrows + 1) * (hm.ncols + 1),
    `Heights matrix is (nrows+1)×(ncols+1) = ${hm.heights.length} (Rapier contract)`);
  assert(hm.nrows === TERRAIN_GRID_SIZE && hm.ncols === TERRAIN_GRID_SIZE, 'Heightmap resolution matches the grid (64)');
  {
    let ok = true;
    for (const h of hm.heights) {
      if (!Number.isFinite(h)) { ok = false; break; }
    }
    assert(ok, 'No NaN/Infinity in heights');
  }
  assert(hm.minHeight >= -1 && hm.maxHeight <= 17,
    `Height range sane ([${hm.minHeight.toFixed(2)}, ${hm.maxHeight.toFixed(2)}] — plain ~0.5, peak ~14.5)`);
  {
    const a2 = new TerrainPipeline({ seed: 99 });
    a2.generate();
    assert(a2.getHeightmap().revision !== hm.revision, 'Different seed → different revision');
  }

  // Render/collision match: every heightmap vertex equals a mesh vertex at
  // the same lattice column (both are isosurface crossings of the SAME field
  // with the SAME formula → bit-exact).
  {
    const byXZ = meshVerticesByLatticeColumn(mesh);
    const W = hm.nrows + 1;
    let worst = 0;
    let missing = 0;
    for (let i = 0; i < W; i++) {
      for (let j = 0; j < W; j++) {
        const key = `${-32 + j},${-32 + i}`;
        const verts = byXZ.get(key);
        if (!verts) { missing++; continue; }
        const h = hm.heights[j * W + i];
        let best = Number.POSITIVE_INFINITY;
        for (const v of verts) {
          const dy = Math.abs(mesh.positions[v * 3 + 1] - h);
          if (dy < best) best = dy;
        }
        if (best > worst) worst = best;
      }
    }
    assert(missing === 0 && worst < 1e-6,
      `Every heightmap vertex matches a mesh vertex at its column (missing=${missing}, maxDiff=${worst.toExponential(2)})`);
  }
  {
    const hAtVertex = sampleHeightmap(hm, -22, -22);
    assert(Math.abs(hAtVertex - hm.heights[10 * 65 + 10]) < 1e-9,
      'sampleHeightmap at a lattice vertex returns the vertex height exactly');
  }

  console.log('\n=== 5. WALK-THROUGH PROOF (data level) ===');
  const spawn = a.getSpawnPoint();
  assert(sampleDensity(field, { x: spawn.x, y: spawn.y - 1.3, z: spawn.z }) < 0,
    'Spawn has solid ground below');
  assert(sampleDensity(field, { x: spawn.x, y: spawn.y + 0.5, z: spawn.z }) >= 0,
    'Spawn has open air above');
  {
    const closest = a.getSpline().closestPointTo(spawn);
    assert(closest.distance < 4, `Spawn sits on the tunnel path (${closest.distance.toFixed(2)}m from spline)`);
  }
  {
    let ok = true;
    for (const cp of a.getCheckpoints()) {
      const dFloor = sampleDensity(field, { x: cp.position.x, y: cp.position.y - 1.5, z: cp.position.z });
      const dMid = sampleDensity(field, { x: cp.position.x, y: cp.position.y + 0.5, z: cp.position.z });
      if (!(dFloor < 0 && dMid >= 0)) { ok = false; break; }
    }
    assert(ok, 'Every tunnel checkpoint has a floor below and open air at height');
  }
  {
    const center = a.getCheckpoints().find((c) => Math.abs(c.t - 0.5) < 0.01)!;
    const dCeil = sampleDensity(field, { x: center.position.x, y: center.position.y + 3.6, z: center.position.z });
    assert(dCeil < 0, 'Deep-center checkpoint is enclosed (ceiling solid)');
  }
  {
    let ok = true;
    for (let s = 0; s <= 20; s++) {
      const pt = a.getSpline().sample(s / 20);
      if (sampleDensity(field, { x: pt.x, y: pt.y, z: pt.z }) < 0) { ok = false; break; }
    }
    assert(ok, 'The entire spline path is air (walk-through unobstructed)');
  }
}

async function runRuntimeTests(): Promise<void> {
  console.log('\n=== 6. RUNTIME HEIGHTFIELD SANITY (headless Rapier) ===');

  const pipeline = new TerrainPipeline({ seed: 42 });
  pipeline.generate();
  const hm = pipeline.getHeightmap();

  const spawn = pipeline.getSpawnPoint();
  const snappedX = Math.floor(spawn.x + 32) + 0.5 - 32;
  const snappedZ = Math.floor(spawn.z + 32) + 0.5 - 32;
  const surface = sampleHeightmap(hm, snappedX, snappedZ);
  const spawnY = surface + 1.2;

  // Run the identical scenario twice and compare final Y bit-for-bit.
  const results: number[] = [];
  for (let run = 0; run < 2; run++) {
    resetPhysicsRuntime();
    const runtime = getPhysicsRuntime();
    try {
      await runtime.initialize();
    } catch (err) {
      console.error('  ⚠ Rapier failed to initialize headlessly:',
        err instanceof Error ? err.message : err);
      // Honest skip: report the section as failed so the count stays true.
      assert(false, 'PhysicsRuntime initializes headlessly (bun + rapier3d-compat)');
      assert(false, 'addTerrainHeightfield creates the collider headlessly');
      assert(false, 'Terrain revision registers in diagnostics');
      assert(false, 'Character spawns on the terrain surface');
      assert(false, 'Character rests on the heightfield (no fall-through)');
      assert(false, 'resetWorld removes the heightfield fixture');
      return;
    }
    assert(true, 'PhysicsRuntime initializes headlessly (bun + rapier3d-compat)');

    const id = runtime.addTerrainHeightfield(hm.heights, { x: hm.scaleX, z: hm.scaleZ }, hm.revision);
    assert(id !== null, 'addTerrainHeightfield creates the collider headlessly');

    const diag = runtime.getDiagnostics();
    assert(diag.terrainRevision === hm.revision, 'Terrain revision registers in diagnostics');

    const intent = { moveX: 0, moveZ: 0, cameraYaw: 0, sprint: false, jump: false };
    runtime.createCharacter({ x: snappedX, y: spawnY, z: snappedZ });

    runtime.start();
    // The interpolated snapshot is null until the first step.
    runtime.step(1 / 60, intent);
    const snap0 = runtime.getCharacterSnapshot();
    assert(snap0 !== null && Math.abs(snap0.position.y - spawnY) < 0.5,
      'Character spawns on the terrain surface');

    let finalY = spawnY;
    for (let i = 0; i < 240; i++) {
      runtime.step(1 / 60, intent);
      const s = runtime.getCharacterSnapshot();
      if (s) finalY = s.position.y;
    }
    // Capsule center rests at surface + 1.3 (half-height 0.9 + radius 0.4).
    assert(finalY > surface - 0.5 && finalY < surface + 2.0 && finalY > 0,
      `Character rests on the heightfield (y=${finalY.toFixed(3)}, surface=${surface.toFixed(3)} — no fall-through)`);

    runtime.resetWorld();
    const diag2 = runtime.getDiagnostics();
    assert(diag2.colliderCount === 0 && diag2.terrainRevision === 0,
      'resetWorld removes the heightfield fixture');

    results.push(finalY);
  }
  assert(results.length === 2 && results[0] === results[1],
    `Rest height is bit-deterministic across runs (${results.map((y) => y.toFixed(6)).join(' vs ')})`);
}

async function runAll(): Promise<void> {
  console.log('=== TERRAIN VIEWPORT CONFORMANCE ===');

  // Seed derivation is the single shared entry point for render + collision.
  assert(terrainSeedFromSettlementSeed('wang-family-bend-1108') === terrainSeedFromSettlementSeed('wang-family-bend-1108'),
    'Settlement seed → terrain seed is deterministic');
  assert(terrainSeedFromSettlementSeed('wang-family-bend-1108') !== terrainSeedFromSettlementSeed('other-seed'),
    'Different settlement seeds → different terrain seeds');

  // Analytic winding check on a synthetic flat field: solid below y=2, so
  // top-surface normals must point +Y (marching-cubes table orientation).
  {
    const flat: DensityField = { size: 8, worldSize: 8, data: new Float32Array(8 * 8 * 8), seaLevel: 0 };
    for (let iy = 0; iy < 8; iy++) {
      for (let iz = 0; iz < 8; iz++) {
        for (let ix = 0; ix < 8; ix++) {
          flat.data[iy * 64 + iz * 8 + ix] = 2 - iy;
        }
      }
    }
    const flatMesh = extractSurfaceMesh(flat);
    let up = 0;
    let down = 0;
    for (let v = 0; v < flatMesh.vertexCount; v++) {
      if (flatMesh.normals[v * 3 + 1] > 0.5) up++;
      if (flatMesh.normals[v * 3 + 1] < -0.5) down++;
    }
    assert(up > down, `Marching-cubes winding: top normals point up (up=${up}, down=${down})`);
  }

  // Mesh at a reduced grid is also valid (configurable resolution).
  {
    const p = new TerrainPipeline({ seed: 42 });
    p.generate();
    const coarse = extractSurfaceMesh(p.getField(), { gridSize: 24 });
    assert(coarse.gridSize === 24, 'extractSurfaceMesh honours the requested grid size');
    assert(coarse.triangleCount > 500, `Reduced-grid mesh is still valid (${coarse.triangleCount} tris)`);
    // The 24-grid lattice is NOT a subset of the 64-grid lattice (spacing
    // 2.67m vs 1m), so exact column matching does not apply here. Instead:
    // every reduced-grid vertex must sit near the SAME isosurface — the
    // density at a vertex is within one coarse cell (the 64-grid trilinear
    // is piecewise-linear, so a 24-edge crossing can deviate by the cell
    // slope-change over half a coarse cell).
    {
      let ok = true;
      let worst = 0;
      for (let v = 0; v < coarse.vertexCount; v++) {
        const d = Math.abs(sampleDensity(p.getField(), {
          x: coarse.positions[v * 3],
          y: coarse.positions[v * 3 + 1],
          z: coarse.positions[v * 3 + 2],
        }));
        if (d > worst) worst = d;
        // 4.0 = a coarse cell (2.67m) plus slack for the tunnel wall
        // curvature sampled over a coarse cell.
        if (d > 4.0) { ok = false; break; }
      }
      assert(ok, `Reduced-grid vertices sit within a coarse cell of the isosurface (worst |density|=${worst.toFixed(2)})`);
    }
  }

  runTerrainTests();
  await runRuntimeTests();

  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : `\n❌ ${failed} TESTS FAILED`);
}

runAll().then(() => {
  process.exit(failed === 0 ? 0 : 1);
}).catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
