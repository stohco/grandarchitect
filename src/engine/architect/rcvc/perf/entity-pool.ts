/**
 * Entity Pool — Ursus-beating object pooling
 *
 * Ursus engine benchmarks (to match or beat):
 *   - Spawn 10,000 entities:        10.0 ms
 *   - Disable 10,000 entities:       1.0 ms
 *   - Enable 10,000 entities:        0.5 ms
 *   - GetComponent × 10,000:         0.1 ms
 *
 * Our entity pool pre-allocates entities in typed arrays and uses a
 * free-list for O(1) spawn/recycle. Enable/disable is a bitmask flip.
 * GetComponent is a typed-array lookup.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

// ============================================================================
// Entity — a pooled entity with components stored in SoA arrays
// ============================================================================

export interface EntityPoolOptions {
  initialCapacity?: number;
  maxCapacity?: number;
}

export interface PooledEntity {
  id: number;
  active: boolean;
  generation: number;       // incremented on recycle to invalidate stale refs
}

export class EntityPool {
  /** Active flags — 1 bit per entity, packed into Uint8Array. */
  private active: Uint8Array;
  /** Generation counters — bumped on recycle. */
  private generation: Uint32Array;
  /** Component: position (SoA — Structure of Arrays). */
  private posX: Float32Array;
  private posY: Float32Array;
  private posZ: Float32Array;
  /** Component: rotation Y. */
  private rotY: Float32Array;
  /** Component: type tag. */
  private typeTag: Uint16Array;
  /** Component: faction. */
  private faction: Uint16Array;
  /** Free list — indices of inactive entities available for reuse. */
  private freeList: number[];
  private capacity: number;
  private maxCapacity: number;
  private activeCount: number;

  constructor(options: EntityPoolOptions = {}) {
    this.capacity = options.initialCapacity ?? 1024;
    this.maxCapacity = options.maxCapacity ?? 1_000_000;
    this.active = new Uint8Array(this.capacity);
    this.generation = new Uint32Array(this.capacity);
    this.posX = new Float32Array(this.capacity);
    this.posY = new Float32Array(this.capacity);
    this.posZ = new Float32Array(this.capacity);
    this.rotY = new Float32Array(this.capacity);
    this.typeTag = new Uint16Array(this.capacity);
    this.faction = new Uint16Array(this.capacity);
    this.freeList = [];
    for (let i = 0; i < this.capacity; i++) this.freeList.push(i);
    this.activeCount = 0;
  }

  /** Spawn a single entity. Returns its id. O(1). */
  spawn(x = 0, y = 0, z = 0, typeTag = 0, faction = 0): number {
    if (this.freeList.length === 0) this.grow();
    const idx = this.freeList.pop()!;
    this.active[idx] = 1;
    this.posX[idx] = x;
    this.posY[idx] = y;
    this.posZ[idx] = z;
    this.rotY[idx] = 0;
    this.typeTag[idx] = typeTag;
    this.faction[idx] = faction;
    this.activeCount++;
    return idx;
  }

  /** Spawn N entities in bulk. O(N) but cache-coherent. */
  spawnBulk(n: number, generator?: (i: number) => { x: number; y: number; z: number; typeTag?: number; faction?: number }): number[] {
    const ids: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const g = generator ? generator(i) : { x: 0, y: 0, z: 0 };
      ids[i] = this.spawn(g.x, g.y, g.z, g.typeTag ?? 0, g.faction ?? 0);
    }
    return ids;
  }

  /** Disable an entity (does not recycle — just marks inactive). O(1). */
  disable(id: number): void {
    if (id < 0 || id >= this.capacity) return;
    if (this.active[id]) {
      this.active[id] = 0;
      this.activeCount--;
    }
  }

  /** Disable N entities in bulk. O(N) — single bitmask write each. */
  disableBulk(ids: number[]): void {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id >= 0 && id < this.capacity && this.active[id]) {
        this.active[id] = 0;
        this.activeCount--;
      }
    }
  }

  /** Enable an entity. O(1). */
  enable(id: number): void {
    if (id < 0 || id >= this.capacity) return;
    if (!this.active[id]) {
      this.active[id] = 1;
      this.activeCount++;
    }
  }

  /** Enable N entities in bulk. */
  enableBulk(ids: number[]): void {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id >= 0 && id < this.capacity && !this.active[id]) {
        this.active[id] = 1;
        this.activeCount++;
      }
    }
  }

  /**
   * Enable N entities in bulk — FAST PATH (no bounds checking).
   * Caller MUST guarantee all ids are valid and currently inactive.
   * This is the Ursus-comparable path: pure bitmask writes, no branches.
   */
  enableAllUnchecked(ids: number[]): void {
    const active = this.active;
    for (let i = 0; i < ids.length; i++) {
      active[ids[i]] = 1;
    }
    this.activeCount += ids.length;
  }

  /**
   * Disable N entities in bulk — FAST PATH (no bounds checking).
   * Caller MUST guarantee all ids are valid and currently active.
   */
  disableAllUnchecked(ids: number[]): void {
    const active = this.active;
    for (let i = 0; i < ids.length; i++) {
      active[ids[i]] = 0;
    }
    this.activeCount -= ids.length;
  }

  /** Recycle an entity — return to free list and bump generation. */
  recycle(id: number): void {
    if (id < 0 || id >= this.capacity) return;
    if (this.active[id]) {
      this.active[id] = 0;
      this.activeCount--;
    }
    this.generation[id]++;
    this.freeList.push(id);
  }

  /** GetComponent — O(1) typed-array lookup. */
  getPosition(id: number): [number, number, number] {
    return [this.posX[id], this.posY[id], this.posZ[id]];
  }

  /**
   * GetComponent — ZERO-ALLOCATION fast path.
   * Reads directly from the SoA typed arrays without allocating a tuple.
   * This is the Ursus-comparable path.
   */
  readPositionX(id: number): number { return this.posX[id]; }
  readPositionY(id: number): number { return this.posY[id]; }
  readPositionZ(id: number): number { return this.posZ[id]; }

  /** Direct access to the position typed arrays (for batch iteration). */
  get posXArray(): Float32Array { return this.posX; }
  get posYArray(): Float32Array { return this.posY; }
  get posZArray(): Float32Array { return this.posZ; }
  get typeTagArray(): Uint16Array { return this.typeTag; }
  get factionArray(): Uint16Array { return this.faction; }
  get activeArray(): Uint8Array { return this.active; }

  getRotationY(id: number): number {
    return this.rotY[id];
  }

  getTypeTag(id: number): number {
    return this.typeTag[id];
  }

  getFaction(id: number): number {
    return this.faction[id];
  }

  isActive(id: number): boolean {
    return this.active[id] === 1;
  }

  getGeneration(id: number): number {
    return this.generation[id];
  }

  get activeCount_(): number { return this.activeCount; }
  get capacity_(): number { return this.capacity; }

  private grow(): void {
    if (this.capacity >= this.maxCapacity) {
      throw new Error(`EntityPool reached max capacity ${this.maxCapacity}`);
    }
    const newCapacity = Math.min(this.maxCapacity, this.capacity * 2);
    const newActive = new Uint8Array(newCapacity);
    const newGen = new Uint32Array(newCapacity);
    const newPosX = new Float32Array(newCapacity);
    const newPosY = new Float32Array(newCapacity);
    const newPosZ = new Float32Array(newCapacity);
    const newRotY = new Float32Array(newCapacity);
    const newType = new Uint16Array(newCapacity);
    const newFaction = new Uint16Array(newCapacity);

    newActive.set(this.active);
    newGen.set(this.generation);
    newPosX.set(this.posX);
    newPosY.set(this.posY);
    newPosZ.set(this.posZ);
    newRotY.set(this.rotY);
    newType.set(this.typeTag);
    newFaction.set(this.faction);

    for (let i = this.capacity; i < newCapacity; i++) this.freeList.push(i);

    this.active = newActive;
    this.generation = newGen;
    this.posX = newPosX;
    this.posY = newPosY;
    this.posZ = newPosZ;
    this.rotY = newRotY;
    this.typeTag = newType;
    this.faction = newFaction;
    this.capacity = newCapacity;
  }
}
