/** Entity Pool — SoA typed arrays for Ursus-beating performance. */
export class EntityPool {
  private active: Uint8Array;
  private generation: Uint32Array;
  private posX: Float32Array;
  private posY: Float32Array;
  private posZ: Float32Array;
  private rotY: Float32Array;
  private typeTag: Uint16Array;
  private faction: Uint16Array;
  private freeList: number[] = [];
  private capacity: number;
  private maxCapacity: number;
  private activeCount = 0;

  constructor(opts: { initialCapacity?: number; maxCapacity?: number } = {}) {
    this.capacity = opts.initialCapacity ?? 1024;
    this.maxCapacity = opts.maxCapacity ?? 1_000_000;
    this.active = new Uint8Array(this.capacity);
    this.generation = new Uint32Array(this.capacity);
    this.posX = new Float32Array(this.capacity);
    this.posY = new Float32Array(this.capacity);
    this.posZ = new Float32Array(this.capacity);
    this.rotY = new Float32Array(this.capacity);
    this.typeTag = new Uint16Array(this.capacity);
    this.faction = new Uint16Array(this.capacity);
    for (let i = 0; i < this.capacity; i++) this.freeList.push(i);
  }

  spawn(x = 0, y = 0, z = 0, typeTag = 0, faction = 0): number {
    if (this.freeList.length === 0) this.grow();
    const idx = this.freeList.pop()!;
    this.active[idx] = 1; this.posX[idx] = x; this.posY[idx] = y; this.posZ[idx] = z;
    this.rotY[idx] = 0; this.typeTag[idx] = typeTag; this.faction[idx] = faction;
    this.activeCount++; return idx;
  }

  spawnBulk(n: number, gen?: (i: number) => { x: number; y: number; z: number; typeTag?: number; faction?: number }): number[] {
    const ids: number[] = new Array(n);
    for (let i = 0; i < n; i++) { const g = gen ? gen(i) : { x: 0, y: 0, z: 0 }; ids[i] = this.spawn(g.x, g.y, g.z, g.typeTag ?? 0, g.faction ?? 0); }
    return ids;
  }

  disableAllUnchecked(ids: number[]): void { const a = this.active; for (let i = 0; i < ids.length; i++) a[ids[i]] = 0; this.activeCount -= ids.length; }
  enableAllUnchecked(ids: number[]): void { const a = this.active; for (let i = 0; i < ids.length; i++) a[ids[i]] = 1; this.activeCount += ids.length; }

  get posXArray(): Float32Array { return this.posX; }
  get posZArray(): Float32Array { return this.posZ; }
  get typeTagArray(): Uint16Array { return this.typeTag; }
  get activeArray(): Uint8Array { return this.active; }
  get capacity_(): number { return this.capacity; }

  private grow(): void {
    if (this.capacity >= this.maxCapacity) throw new Error('EntityPool max capacity reached');
    const nc = Math.min(this.maxCapacity, this.capacity * 2);
    const na = new Uint8Array(nc); const ng = new Uint32Array(nc);
    const nx = new Float32Array(nc); const ny = new Float32Array(nc); const nz = new Float32Array(nc);
    const nr = new Float32Array(nc); const nt = new Uint16Array(nc); const nf = new Uint16Array(nc);
    na.set(this.active); ng.set(this.generation); nx.set(this.posX); ny.set(this.posY); nz.set(this.posZ);
    nr.set(this.rotY); nt.set(this.typeTag); nf.set(this.faction);
    for (let i = this.capacity; i < nc; i++) this.freeList.push(i);
    this.active = na; this.generation = ng; this.posX = nx; this.posY = ny; this.posZ = nz;
    this.rotY = nr; this.typeTag = nt; this.faction = nf; this.capacity = nc;
  }
}
