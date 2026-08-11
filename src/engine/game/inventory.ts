/**
 * game/inventory.ts — the player's carrying: item ids → counts.
 *
 * Phase 2b scope: favors and rewards. Items are ids with names; the ring
 * (storage) expands this later. Deterministic — no Math.random.
 */

export interface ItemDef {
  id: string;
  name: string;
  hanzi: string;
}

export const ITEMS: Record<string, ItemDef> = {
  wolf_fang: { id: 'wolf_fang', name: 'Wolf Fang', hanzi: '狼牙' },
  moonflower: { id: 'moonflower', name: 'Moonflower', hanzi: '月华花' },
  iron_ore: { id: 'iron_ore', name: 'Iron Ore', hanzi: '铁矿' },
  health_pill: { id: 'health_pill', name: 'Healing Pill', hanzi: '疗伤丹' },
  qi_pill: { id: 'qi_pill', name: 'Qi Gathering Pill', hanzi: '聚气丹' },
  iron_sword: { id: 'iron_sword', name: 'Iron Sword', hanzi: '铁剑' },
};

export class Inventory {
  private counts = new Map<string, number>();

  add(id: string, n = 1): void {
    this.counts.set(id, (this.counts.get(id) ?? 0) + n);
  }

  count(id: string): number {
    return this.counts.get(id) ?? 0;
  }

  take(id: string, n = 1): boolean {
    const have = this.counts.get(id) ?? 0;
    if (have < n) return false;
    this.counts.set(id, have - n);
    return true;
  }

  has(id: string, n = 1): boolean {
    return (this.counts.get(id) ?? 0) >= n;
  }

  /** Deterministic serialization for saves/evidence. */
  serialize(): Record<string, number> {
    return Object.fromEntries([...this.counts.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }
}
