/**
 * Planetary Streaming — 3DTilesRendererJS Adapter
 * ==================================================
 *
 * Per FRONTIER_TECHNOLOGY_MATRIX.md, 3DTilesRendererJS is the S-tier
 * candidate for distant planetary streaming in Three.js/R3F.
 *
 * It supports:
 *   - 3D Tiles hierarchy (planet → continent → region → local)
 *   - Metadata and plugin systems
 *   - Three.js, R3F, Babylon.js integration
 *   - Mars, lunar, globe, geospatial rendering
 *
 * This adapter wraps the library for use in the Grand Architect viewport.
 * Bake-off 5: stand on surface → fly → cross atmosphere → orbital frame
 * → travel globe → descend.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Adapter Status
// ---------------------------------------------------------------------------

let available = false;
let reason: string | undefined;

async function ensureInitialized(): Promise<void> {
  if (available) return;
  try {
    await import('3d-tiles-renderer');
    available = true;
    reason = '3DTilesRendererJS installed and importable';
  } catch (err) {
    available = false;
    reason = `3DTilesRendererJS not available: ${(err as Error).message}`;
  }
}

// ---------------------------------------------------------------------------
// Planetary Tile Set
// ---------------------------------------------------------------------------

export interface PlanetaryTileSet {
  tilesetId: string;
  url: string;
  name: string;
  /** The tile hierarchy: planet → continents → regions → local cells. */
  hierarchy: string[];
}

/** Sample tile sets for bake-off 5 testing. */
export const SAMPLE_TILE_SETS: PlanetaryTileSet[] = [
  {
    tilesetId: 'mars-sample',
    url: 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesRendererJS/master/example/data/tileset.json',
    name: 'Mars Sample (NASA)',
    hierarchy: ['planet', 'hemisphere', 'quadrant', 'region', 'cell'],
  },
  {
    tilesetId: 'lunar-sample',
    url: 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesRendererJS/master/example/data/lunar/tileset.json',
    name: 'Lunar Surface (NASA)',
    hierarchy: ['planet', 'hemisphere', 'quadrant', 'region', 'cell'],
  },
];

// ---------------------------------------------------------------------------
// Planetary Streaming Adapter
// ---------------------------------------------------------------------------

class PlanetaryStreamingAdapter {
  async getStatus(): Promise<{
    available: boolean;
    reason: string;
    tileSets: PlanetaryTileSet[];
    bakeOff: string;
  }> {
    await ensureInitialized();
    return {
      available,
      reason: reason ?? '',
      tileSets: SAMPLE_TILE_SETS,
      bakeOff: 'Bake-off 5: stand on surface → fly upward → cross atmosphere → observe curvature → enter orbital frame → travel globe → descend',
    };
  }

  /**
   * Create a TilesRenderer for a given tile set URL.
   * This is the entry point for planetary streaming in the viewport.
   */
  async createTilesRenderer(url: string): Promise<unknown> {
    await ensureInitialized();
    if (!available) {
      throw new Error('3DTilesRendererJS not available');
    }
    const { TilesRenderer } = await import('3d-tiles-renderer');
    const renderer = new TilesRenderer(url);
    return renderer;
  }

  /**
   * The coordinate frame stack for planetary traversal.
   * Per the directive, the repository does not solve gameplay coordinate
   * frames — we need:
   *   - local tangent frame
   *   - planet-centered frame
   *   - orbital frame
   *   - star-system frame
   *   - starry-realm frame
   *   - realm-topology frame
   */
  getCoordinateFrames(): Array<{ name: string; description: string }> {
    return [
      { name: 'local-tangent', description: 'Ground-level gameplay (meters from origin)' },
      { name: 'planet-centered', description: 'Planet center origin (kilometers)' },
      { name: 'orbital', description: 'Orbital mechanics frame (kilometers from planet center)' },
      { name: 'star-system', description: 'Interplanetary travel (AU)' },
      { name: 'starry-realm', description: 'Cultivation realm topology (realm units)' },
      { name: 'realm-topology', description: 'Realm transition boundaries' },
    ];
  }
}

// Singleton
let adapter: PlanetaryStreamingAdapter | null = null;

export function getPlanetaryStreamingAdapter(): PlanetaryStreamingAdapter {
  if (!adapter) {
    adapter = new PlanetaryStreamingAdapter();
  }
  return adapter;
}
