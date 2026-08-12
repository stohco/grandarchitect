/**
 * game/planet/material-families.ts — the terrain material law (Image
 * Directives §3, posters I5/I2).
 *
 * SLOPE BANDS (binding): 0-35° walkable, 35-50° steep caution, 50+
 * non-walkable. MATERIAL FAMILIES: every ground patch carries Hardness /
 * Fracture / Qi Affinity, and the terrain-edit brush RESPECTS hardness —
 * soft ground gives under the brush; sacred stone refuses.
 *
 * The table extends MATERIAL_COLORS (chunk-mesh.ts, ids 0-4) into the
 * poster's eleven families; ids 0-4 keep their art-bible colors, ids 5-10
 * continue the same linear palette style.
 */

/** The poster's slope bands, in degrees. */
export const SLOPE_WALKABLE = 35;    // 0-35° walkable
export const SLOPE_STEEP = 50;       // 35-50° steep caution; 50+ non-walkable
export const SLOPE_NONWALKABLE = 50; // 50+ non-walkable

export interface MaterialFamily {
  id: number;
  name: string;
  /** 0 soft .. 1 adamant — destruction and tools respect this. */
  hardness: number;
  /** 0 monolithic .. 1 crumbles — how the material breaks. */
  fracture: number;
  /** 0 inert .. 1 spirit-rich — qi affinity. */
  qi: number;
  color: [number, number, number];
}

/** The poster's eleven material families. Ids 0-4 extend MATERIAL_COLORS
 *  (soil, rock, sand, snow, deep stone → soil, granite, riverbed, snow,
 *  cave stone); ids 5-10 are the remaining poster families. */
export const MATERIAL_FAMILIES: Record<number, MaterialFamily> = {
  0: { id: 0, name: 'soil', hardness: 0.2, fracture: 0.3, qi: 0.2, color: [0.115, 0.15, 0.088] },
  1: { id: 1, name: 'granite', hardness: 0.9, fracture: 0.15, qi: 0.1, color: [0.153, 0.144, 0.127] },
  2: { id: 2, name: 'riverbed', hardness: 0.3, fracture: 0.6, qi: 0.25, color: [0.53, 0.42, 0.23] },
  3: { id: 3, name: 'snow', hardness: 0.05, fracture: 0.95, qi: 0.15, color: [0.807, 0.839, 0.888] },
  4: { id: 4, name: 'cave stone', hardness: 0.85, fracture: 0.25, qi: 0.2, color: [0.106, 0.096, 0.082] },
  5: { id: 5, name: 'packed earth', hardness: 0.5, fracture: 0.25, qi: 0.15, color: [0.36, 0.28, 0.17] },
  6: { id: 6, name: 'sacred stone', hardness: 0.95, fracture: 0.05, qi: 0.95, color: [0.82, 0.81, 0.72] },
  7: { id: 7, name: 'mossy rock', hardness: 0.6, fracture: 0.4, qi: 0.35, color: [0.16, 0.24, 0.12] },
  8: { id: 8, name: 'cliff sediment', hardness: 0.45, fracture: 0.7, qi: 0.1, color: [0.35, 0.3, 0.22] },
  9: { id: 9, name: 'wet rock', hardness: 0.75, fracture: 0.35, qi: 0.3, color: [0.09, 0.11, 0.12] },
  10: { id: 10, name: 'spirit crystal ground', hardness: 0.8, fracture: 0.8, qi: 1.0, color: [0.5, 0.75, 0.85] },
};

/** The brush multiplier for a material: softer materials yield MORE
 *  (1.4 - hardness·0.8, clamped to [0.4, 1.4]). Soft gives, hard refuses. */
export function hardnessFactor(id: number): number {
  const fam = MATERIAL_FAMILIES[id] ?? MATERIAL_FAMILIES[0];
  return Math.min(1.4, Math.max(0.4, 1.4 - fam.hardness * 0.8));
}
