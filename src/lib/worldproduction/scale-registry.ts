/**
 * Scale Registry — canonical world scale and traversal speeds.
 *
 * Source of truth: the Scale/Streaming/Optimization reference board
 * (upload/image-captions/pasted_image_1785977810565.txt, gemma-4 caption)
 * and the World Fabric directive. Every set-dressing entry in the
 * production pipeline is checked against these ranges so scale and
 * relativity feel correct at every level, from a 1.8 m cultivator to a
 * 5,000 m landmark.
 */

export interface ScaleEntry {
  id: string;
  name: string;
  /** meters. min/max inclusive. */
  min: number;
  max: number;
  category: 'character' | 'architecture' | 'terrain' | 'vessel' | 'world';
  note: string;
}

export const SCALE_REGISTRY: ScaleEntry[] = [
  // characters
  { id: 'scale.cultivator', name: 'Cultivator (hero)', min: 1.8, max: 1.8, category: 'character', note: 'Hero standard height: 1.80 m (board §4).' },
  { id: 'scale.spirit_beast', name: 'Spirit Beast / Horse', min: 2, max: 3, category: 'character', note: '2-3 m at the shoulder (board §1).' },
  // architecture
  { id: 'scale.doorway', name: 'Doorway', min: 2.4, max: 2.4, category: 'architecture', note: 'Traditional doorway (board §1).' },
  { id: 'scale.room', name: 'Room', min: 6, max: 10, category: 'architecture', note: 'Interior room span (board §1).' },
  { id: 'scale.compound', name: 'Courtyard Compound', min: 12, max: 30, category: 'architecture', note: 'Family compound footprint (derived from room + courtyard assembly).' },
  { id: 'scale.shrine', name: 'Shrine / Altar', min: 2, max: 5, category: 'architecture', note: 'Village shrine footprint (dao-binding stele scale).' },
  { id: 'scale.well', name: 'Well', min: 2, max: 4, category: 'architecture', note: 'Communal well footprint.' },
  { id: 'scale.village_gate', name: 'Village Gate', min: 4, max: 8, category: 'architecture', note: 'Simple village gate — deliberately 1/5 the sect-gate scale (25-40 m).' },
  { id: 'scale.village_street', name: 'Village Street', min: 10, max: 20, category: 'architecture', note: 'Street width (board §1).' },
  { id: 'scale.bridge', name: 'Stone Bridge', min: 20, max: 40, category: 'architecture', note: 'Arched bridge span (board §1).' },
  { id: 'scale.sect_gate', name: 'Sect Gate', min: 25, max: 40, category: 'architecture', note: 'Grand entrance (board §1).' },
  { id: 'scale.pagoda', name: 'Pagoda', min: 30, max: 60, category: 'architecture', note: 'Multi-tiered tower (board §1).' },
  // terrain
  { id: 'scale.field', name: 'Field System', min: 50, max: 500, category: 'terrain', note: 'Terrace/paddy field system extent.' },
  { id: 'scale.cliff_ledge', name: 'Cliff Ledge', min: 50, max: 150, category: 'terrain', note: 'Sheer exposure (board §1).' },
  { id: 'scale.floating_fragment', name: 'Floating Mountain Fragment', min: 100, max: 500, category: 'terrain', note: 'Detached landmass (board §5).' },
  { id: 'scale.sacred_peak', name: 'Sacred Peak', min: 200, max: 800, category: 'terrain', note: 'Major landmark (board §1).' },
  { id: 'scale.landmark_readability', name: 'Landmark Readability', min: 10, max: 5000, category: 'world', note: 'Visible landmark distances 10 m to 5,000 m+ (board §2).' },
  // vessels
  { id: 'scale.spirit_vessel', name: 'Spirit Vessel (flying ship)', min: 100, max: 300, category: 'vessel', note: 'Flying vessel (board §1).' },
  { id: 'scale.cart', name: 'Wooden Cart', min: 3, max: 4, category: 'vessel', note: 'Cargo cart (board §1).' },
];

/** Traversal speeds, m/s. */
export interface TraversalSpeed {
  id: string;
  name: string;
  min: number;
  max: number;
  note: string;
}

export const TRAVERSAL_SPEEDS: TraversalSpeed[] = [
  { id: 'move.walk', name: 'Walk', min: 2, max: 3, note: 'Board §2: ~2-3 m/s.' },
  { id: 'move.sprint', name: 'Sprint', min: 5, max: 8, note: 'Mortal sprint (inferred from board range).' },
  { id: 'move.leap', name: 'Leap / Jump', min: 3, max: 6, note: 'Vertical clearance moments.' },
  { id: 'move.climb', name: 'Climb / Mantle', min: 1, max: 2, note: 'Slow vertical traversal.' },
  { id: 'move.sword_flight', name: 'Sword Flight', min: 80, max: 200, note: 'Board §2: ~80-200+ m/s.' },
  { id: 'move.free_flight', name: 'Free Flight', min: 60, max: 180, note: 'Higher-realm flight.' },
  { id: 'move.high_speed', name: 'High-Speed Traversal', min: 200, max: 1000, note: 'Board §2: extreme (realm-qualitative).' },
];

export const STREAMING_TIERS = [
  { tier: 0, name: 'Near Field', note: 'Full detail, full physics, full animation.' },
  { tier: 1, name: 'Mid Field', note: 'Reduced detail; schedules + relationships.' },
  { tier: 2, name: 'Far Field', note: 'Households, businesses, resource flows.' },
  { tier: 3, name: 'Landmark Tier', note: 'Population aggregates, faction summary.' },
  { tier: 4, name: 'Simulation Only', note: 'Aggregate truth, no rendering.' },
];

/** Check a set-dressing dimension against the registry. Returns verdict. */
export function checkScale(id: string, meters: number): { ok: boolean; entry?: ScaleEntry; verdict: string } {
  const entry = SCALE_REGISTRY.find((s) => s.id === id);
  if (!entry) return { ok: false, verdict: `Unknown scale id ${id}` };
  if (meters >= entry.min && meters <= entry.max) {
    return { ok: true, entry, verdict: `${entry.name} ${meters.toFixed(1)} m within [${entry.min}, ${entry.max}]` };
  }
  return { ok: false, entry, verdict: `${entry.name} ${meters.toFixed(1)} m OUTSIDE [${entry.min}, ${entry.max}]` };
}

export function scaleById(id: string): ScaleEntry | undefined {
  return SCALE_REGISTRY.find((s) => s.id === id);
}
