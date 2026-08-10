#!/usr/bin/env bun
/**
 * frontier/sparse-volume.ts — the world-fabric sparse volume field (directive §11).
 *
 * Rejected: PLANET = VOXELS (dense 64³ everywhere) and PLANET = HEIGHTMAP.
 * Adopted: WORLD FABRIC = SURFACE MANIFOLD + SPARSE VOLUME FIELD.
 *
 * The volumetric side must NOT allocate cells for ordinary solid mountain
 * kilometers away. This is the VDB lesson adapted to the browser (we adapt the
 * idea, not its CUDA implementation):
 *
 *   sparse page table → active bricks → occupancy/material/SDF channels
 *   → dirty brick lists → hierarchical traversal
 *
 * A brick (e.g. 8³ cells) is ALLOCATED only where topology actually changes:
 * caves, tunnels, overhangs, destruction, protected cave abodes. Ordinary
 * solid mountain is represented by the surface manifold (a heightfield +
 * material band), which is effectively FREE compared to dense voxels.
 *
 * Compare: dense 64³ = 262,144 cells. A planet-sized field with this scheme
 * allocates only the bricks near carved/edited topology. That is the
 * directive's "surface truth + promoted sparse SDF/volume topology."
 *
 * Run: bun run src/engine/frontier/sparse-volume.ts
 */

export const BRICK_SIZE = 8; // 8³ cells per brick

export interface BrickChannels {
  /** SDF values: negative = solid, positive = air, ~0 = surface. */
  sdf: Float32Array;
  /** Material id per cell (for cut faces / loot / divine sense). */
  material: Uint8Array;
  /** Dirty flag: cells modified since last mesh/flush. */
  dirty: Uint8Array;
}

export interface Brick {
  /** Brick-local address. */
  bx: number;
  by: number;
  bz: number;
  channels: BrickChannels;
}

export class SparseVolumeField {
  /** page table: brickCoord → brick. Only populated where topology changed. */
  bricks: Map<string, Brick> = new Map();
  /** dirty brick list (directive §11). */
  dirtyBricks: string[] = [];
  /** Surface manifold: the cheap ground truth for untouched terrain. */
  surfaceHeight: (x: number, z: number) => number;
  surfaceMaterial: (x: number, z: number, y: number) => number;
  /** Counter for honest accounting (what dense voxels would have cost). */
  denseCellEquivalents = 0;

  constructor(
    surfaceHeight: (x: number, z: number) => number,
    surfaceMaterial: (x: number, z: number, y: number) => number,
  ) {
    this.surfaceHeight = surfaceHeight;
    this.surfaceMaterial = surfaceMaterial;
  }

  static brickKey(bx: number, by: number, bz: number): string {
    return `${bx},${by},${bz}`;
  }

  private static cellToBrick(c: number): number {
    return Math.floor(c / BRICK_SIZE);
  }

  /**
   * Allocate a brick at a world cell. This is what "promoted topology" means:
   * we only ever allocate bricks near real topology (cave, tunnel, destruction).
   */
  ensureBrick(wx: number, wy: number, wz: number): Brick {
    const bx = SparseVolumeField.cellToBrick(wx);
    const by = SparseVolumeField.cellToBrick(wy);
    const bz = SparseVolumeField.cellToBrick(wz);
    const key = SparseVolumeField.brickKey(bx, by, bz);
    let brick = this.bricks.get(key);
    if (!brick) {
      brick = {
        bx, by, bz,
        channels: {
          sdf: new Float32Array(BRICK_SIZE * BRICK_SIZE * BRICK_SIZE),
          material: new Uint8Array(BRICK_SIZE * BRICK_SIZE * BRICK_SIZE),
          dirty: new Uint8Array(BRICK_SIZE * BRICK_SIZE * BRICK_SIZE),
        },
      };
      this.bricks.set(key, brick);
      this.dirtyBricks.push(key);
      this.denseCellEquivalents += BRICK_SIZE * BRICK_SIZE * BRICK_SIZE;
      // initialize SDF + material from the surface manifold (cheap baseline)
      this.initializeBrickFromSurface(brick);
    }
    return brick;
  }

  private static cellInBrick(c: number): number {
    return ((c % BRICK_SIZE) + BRICK_SIZE) % BRICK_SIZE;
  }

  private static idx(ix: number, iy: number, iz: number): number {
    return (iy * BRICK_SIZE + iz) * BRICK_SIZE + ix;
  }

  /** Initialize a newly allocated brick's cells from the surface manifold. */
  private initializeBrickFromSurface(brick: Brick): void {
    for (let ix = 0; ix < BRICK_SIZE; ix++) {
      for (let iz = 0; iz < BRICK_SIZE; iz++) {
        const wx = brick.bx * BRICK_SIZE + ix;
        const wz = brick.bz * BRICK_SIZE + iz;
        const h = this.surfaceHeight(wx, wz);
        for (let iy = 0; iy < BRICK_SIZE; iy++) {
          const wy = brick.by * BRICK_SIZE + iy;
          const i = SparseVolumeField.idx(ix, iy, iz);
          // negative = solid below surface, positive = air above
          brick.channels.sdf[i] = wy < h ? -1 : 1;
          brick.channels.material[i] = this.surfaceMaterial(wx, wz, wy);
        }
      }
    }
  }

  /**
   * Carve a sphere at a world cell. Allocates the affected brick(s) and writes
   * air (positive SDF). Returns the brick keys dirtied.
   */
  carve(wx: number, wy: number, wz: number, radius: number): string[] {
    const touched: string[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > radius) continue;
          // cells at the exact boundary stay solid (falloff floor keeps them
          // as the surface transition, not air)
          const cx = wx + dx;
          const cy = wy + dy;
          const cz = wz + dz;
          const brick = this.ensureBrick(cx, cy, cz);
          const ix = SparseVolumeField.cellInBrick(cx);
          const iy = SparseVolumeField.cellInBrick(cy);
          const iz = SparseVolumeField.cellInBrick(cz);
          const i = SparseVolumeField.idx(ix, iy, iz);
          // smooth falloff: center becomes clearly air (sdf +1), the interior
          // becomes air, the exact boundary ring stays at its original value
          const falloff = 1 - dist / radius;
          if (falloff > 0.15) {
            brick.channels.sdf[i] = Math.max(brick.channels.sdf[i], falloff);
            brick.channels.dirty[i] = 1;
          }
          const key = SparseVolumeField.brickKey(brick.bx, brick.by, brick.bz);
          if (!touched.includes(key)) touched.push(key);
        }
      }
    }
    this.dirtyBricks = [...new Set([...this.dirtyBricks, ...touched])];
    return touched;
  }

  /** Is the world cell solid? (density query used by collision/physics.) */
  isSolid(wx: number, wy: number, wz: number): boolean {
    const bx = SparseVolumeField.cellToBrick(wx);
    const by = SparseVolumeField.cellToBrick(wy);
    const bz = SparseVolumeField.cellToBrick(wz);
    const brick = this.bricks.get(SparseVolumeField.brickKey(bx, by, bz));
    if (!brick) {
      // no brick → pure surface manifold answer (cheap, no allocation)
      return wy < this.surfaceHeight(wx, wz);
    }
    const i = SparseVolumeField.idx(
      SparseVolumeField.cellInBrick(wx),
      SparseVolumeField.cellInBrick(wy),
      SparseVolumeField.cellInBrick(wz),
    );
    return brick.channels.sdf[i] < 0;
  }

  /** Material at a world cell (for cut faces / divine sense). */
  materialAt(wx: number, wy: number, wz: number): number {
    const bx = SparseVolumeField.cellToBrick(wx);
    const by = SparseVolumeField.cellToBrick(wy);
    const bz = SparseVolumeField.cellToBrick(wz);
    const brick = this.bricks.get(SparseVolumeField.brickKey(bx, by, bz));
    if (!brick) return this.surfaceMaterial(wx, wz, wy);
    const i = SparseVolumeField.idx(
      SparseVolumeField.cellInBrick(wx),
      SparseVolumeField.cellInBrick(wy),
      SparseVolumeField.cellInBrick(wz),
    );
    return brick.channels.material[i];
  }

  /** Query the edited topology in a box (divine sense: caves, ores, tunnels). */
  queryBox(wx: number, wy: number, wz: number, r: number): { x: number; y: number; z: number }[] {
    const out: { x: number; y: number; z: number }[] = [];
    for (const [key, brick] of this.bricks) {
      void key;
      const baseX = brick.bx * BRICK_SIZE;
      const baseY = brick.by * BRICK_SIZE;
      const baseZ = brick.bz * BRICK_SIZE;
      for (let ix = 0; ix < BRICK_SIZE; ix++) {
        for (let iy = 0; iy < BRICK_SIZE; iy++) {
          for (let iz = 0; iz < BRICK_SIZE; iz++) {
            const x = baseX + ix;
            const y = baseY + iy;
            const z = baseZ + iz;
            if (Math.abs(x - wx) > r || Math.abs(y - wy) > r || Math.abs(z - wz) > r) continue;
            const i = SparseVolumeField.idx(ix, iy, iz);
            // report cells that differ from the surface manifold (real topology)
            const manifoldSolid = y < this.surfaceHeight(x, z);
            const actualSolid = brick.channels.sdf[i] < 0;
            if (manifoldSolid !== actualSolid) out.push({ x, y, z });
          }
        }
      }
    }
    return out;
  }

  /** Flush dirty bricks (mesh rebuild point). Returns cleared dirty list. */
  flushDirty(): string[] {
    const flushed = [...this.dirtyBricks];
    this.dirtyBricks = [];
    return flushed;
  }

  /** Honest accounting: what a dense 64³ field would cost vs what we allocated. */
  get allocatedCells(): number {
    return this.denseCellEquivalents;
  }
}

/* ---------------- conformance ---------------- */

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

const FLAT_SURFACE = 40;
const flatHeight = () => FLAT_SURFACE;
const flatMaterial = (x: number, z: number, y: number) => (y < FLAT_SURFACE - 8 ? 1 : y < FLAT_SURFACE ? 0 : 2);

function run() {
  console.log('=== Sparse Volume Field Conformance ===\n');

  // 1. untouched terrain = surface manifold, ZERO allocated bricks
  const field = new SparseVolumeField(flatHeight, flatMaterial);
  assert(field.bricks.size === 0, 'untouched planet allocates zero bricks');
  assert(field.isSolid(5, 30, 5) === true, 'solid below manifold surface');
  assert(field.isSolid(5, 50, 5) === false, 'air above manifold surface');

  // 2. carve one cave → only the affected brick(s) allocated, NOT the whole column
  field.carve(10, 36, 10, 3);
  assert(field.bricks.size > 0, 'carve allocates bricks');
  const alloc = field.allocatedCells;
  assert(alloc <= 3 * 512, `carve allocated ~${alloc} cells, not the whole column`);
  assert(field.isSolid(10, 36, 10) === false, 'cave center is air');
  assert(field.isSolid(10, 33, 10) === true, 'cave floor remains solid');
  assert(field.isSolid(100, 36, 100) === true, 'untouched far terrain still uses manifold (no brick)');

  // 3. dirty brick list: carved bricks appear, flush clears
  assert(field.dirtyBricks.length > 0, 'carved bricks are in the dirty list');
  const flushed = field.flushDirty();
  assert(flushed.length > 0 && field.dirtyBricks.length === 0, 'flush returns and clears dirty bricks');

  // 4. queryBox finds the topology delta (cave = air where manifold said solid)
  const edits = field.queryBox(10, 36, 10, 5);
  assert(edits.length > 0, 'divine sense finds the carved cave');
  assert(edits.every((e) => !field.isSolid(e.x, e.y, e.z)), 'reported edits are all air (cave)');

  // 5. material preserved on cut faces
  field.carve(20, 36, 20, 2);
  const mat = field.materialAt(20, 30, 20);
  assert(mat === 1 || mat === 0, `material preserved (got ${mat})`);

  // 6. the KEY directive claim: dense 64³ = 262k cells; this scheme uses a tiny fraction
  const DENSE_64 = 64 * 64 * 64;
  const ratio = field.allocatedCells / DENSE_64;
  assert(ratio < 0.05, `sparse allocation is ${(ratio * 100).toFixed(1)}% of dense 64³ (must be < 5%)`);

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.main) run();
