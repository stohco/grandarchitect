/**
 * Streaming & Optimization — Production Types
 * ============================================
 *
 * Implements the scale/streaming/optimization spec from the production bible
 * (Section 28A-28F). Interest-based streaming with 5 tiers, LOD/HLOD rules,
 * dirty-cell dependency tracking, and atomic bundle activation.
 *
 * Key requirements:
 *   - 5 streaming tiers (Tier 0 interaction → Tier 4 simulation only)
 *   - LOD0-LOD3 + HLOD/impostor for every asset family
 *   - Render LOD ≠ simulation LOD (can be visually absent but simulated)
 *   - Dirty-cell tracking with revision-consistent compilation
 *   - Atomic bundle activation (never show hole before collision changes)
 *   - Performance budgets: 60k-100k LOD0 player, stable 60 FPS target
 */

// ---------------------------------------------------------------------------
// World Scale (Section 28A)
// ---------------------------------------------------------------------------

export interface WorldScaleEntry {
  element: string;
  targetScale: string;
}

export const WORLD_SCALE: readonly WorldScaleEntry[] = [
  { element: 'Cultivator', targetScale: '1.72–1.82 m canonical bases' },
  { element: 'Ordinary doorway', targetScale: '1.0–1.2 m wide; 2.2–2.5 m high' },
  { element: 'Domestic room', targetScale: '3–8 m across; 2.7–3.4 m ceiling' },
  { element: 'Public hall', targetScale: '8–30 m across; 5–20 m ceremonial height' },
  { element: 'Foot path', targetScale: '2–3 m wide' },
  { element: 'Cart road', targetScale: '4–7 m wide' },
  { element: 'Sect processional road', targetScale: '8–16 m wide' },
  { element: 'Ordinary bridge', targetScale: '4–20 m span' },
  { element: 'Major sect bridge', targetScale: '20–80 m span' },
  { element: 'Village street', targetScale: '6–20 m wide' },
  { element: 'Sect gate', targetScale: '5–15 m high ordinary; 15–40 m monumental' },
  { element: 'Pagoda', targetScale: '20–80 m depending on hierarchy' },
  { element: 'Cliff ledge', targetScale: '2 m minimum walkable width' },
  { element: 'Regional cliff', targetScale: '20–300 m' },
  { element: 'Sacred peak', targetScale: '200 m–6 km relative relief' },
  { element: 'Floating fragment', targetScale: '50 m–several kilometres' },
  { element: 'Spirit vessel', targetScale: '3 m skiff to city-scale platform' },
] as const;

// ---------------------------------------------------------------------------
// Traversal Scale (Section 28B)
// ---------------------------------------------------------------------------

export interface TraversalMode {
  mode: string;
  speedRange: string; // m/s
  notes: string;
}

export const TRAVERSAL_MODES: readonly TraversalMode[] = [
  { mode: 'Walk', speedRange: '2–3 m/s', notes: 'Exploration pace' },
  { mode: 'Sprint', speedRange: '6–9 m/s', notes: 'Combat escape' },
  { mode: 'Cultivator leap', speedRange: '10–25 m/s', notes: 'Realm-dependent burst' },
  { mode: 'Climb and mantle', speedRange: 'slow, contact-rich', notes: 'Traversal' },
  { mode: 'Sword flight', speedRange: '20–60 m/s', notes: 'Early implementation' },
  { mode: 'Free flight', speedRange: '30–120 m/s', notes: 'Progression-dependent' },
  { mode: 'High-realm regional', speedRange: '120+ m/s', notes: 'Requires predictive streaming' },
] as const;

// ---------------------------------------------------------------------------
// Streaming Tiers (Section 28C)
// ---------------------------------------------------------------------------

export interface StreamingTier {
  tier: number;
  name: string;
  typicalRange: string;
  render: string;
  animation: string;
  collision: string;
  simulation: string;
}

export const STREAMING_TIERS: readonly StreamingTier[] = [
  { tier: 0, name: 'interaction', typicalRange: '0–50 m', render: 'LOD0, full materials', animation: 'full update', collision: 'accurate simple/compound', simulation: 'full local fidelity' },
  { tier: 1, name: 'near field', typicalRange: '50–250 m', render: 'LOD1', animation: 'reduced where safe', collision: 'simplified', simulation: 'high fidelity' },
  { tier: 2, name: 'mid/far field', typicalRange: '250–1,500 m', render: 'LOD2 / clusters', animation: 'sparse updates', collision: 'coarse or none unless needed', simulation: 'abstracted medium fidelity' },
  { tier: 3, name: 'landmarks', typicalRange: '1.5–10 km+', render: 'HLOD, impostor, macro terrain', animation: 'none/minimal', collision: 'none', simulation: 'low-frequency state' },
  { tier: 4, name: 'simulation only', typicalRange: 'outside rendered interest', render: 'not rendered', animation: 'none', collision: 'none', simulation: 'statistical/event-driven state' },
] as const;

// ---------------------------------------------------------------------------
// LOD Rules (Section 28D)
// ---------------------------------------------------------------------------

export type LODPreservationPriority =
  | 'silhouette'
  | 'proportion_and_scale_cue'
  | 'landmark_negative_space'
  | 'major_material_separation'
  | 'faction_or_biome_identity'
  | 'secondary_ornament';

export const LOD_PRESERVATION_ORDER: readonly LODPreservationPriority[] = [
  'silhouette',
  'proportion_and_scale_cue',
  'landmark_negative_space',
  'major_material_separation',
  'faction_or_biome_identity',
  'secondary_ornament',
] as const;

// ---------------------------------------------------------------------------
// Performance Budgets (Section 28F)
// ---------------------------------------------------------------------------

export interface PerformanceBudget {
  assetType: string;
  lod0Triangles: string;
  notes: string;
}

export const PERFORMANCE_BUDGETS: readonly PerformanceBudget[] = [
  { assetType: 'Player visible target', lod0Triangles: '60k–100k', notes: 'Including body, hair, outfit, visible equipment' },
  { assetType: 'Important NPC', lod0Triangles: '35k–75k', notes: 'Named NPCs' },
  { assetType: 'Generic NPC', lod0Triangles: '20k–45k', notes: 'Standard NPCs' },
  { assetType: 'Crowd NPC', lod0Triangles: '6k–15k', notes: 'Aggressive distance simplification' },
  { assetType: 'Normal creature', lod0Triangles: '18k–55k', notes: 'Standard creatures' },
  { assetType: 'Major boss', lod0Triangles: '60k–180k', notes: 'Depending on screen presence' },
  { assetType: 'Hero weapon', lod0Triangles: '6k–18k', notes: 'Player weapons' },
] as const;

export const FPS_TARGET = 60; // stable 60 FPS on target hardware class
export const SAFE_AREA_PX = 24; // at 1080p

// ---------------------------------------------------------------------------
// Naming Convention (Section 30)
// ---------------------------------------------------------------------------

export type AssetType = 'CHR' | 'EQP' | 'WPN' | 'CRE' | 'STR' | 'PROP' | 'TER' | 'VEG' | 'UI' | 'VFX' | 'ANM' | 'KIT' | 'BIO';

export interface NamingConvention {
  pattern: string; // [TYPE]_[FACTION/BIOME]_[CATEGORY]_[NAME]_[VARIANT]_[LOD]
  examples: string[];
}

export const NAMING_CONVENTION: NamingConvention = {
  pattern: '[TYPE]_[FACTION/BIOME]_[CATEGORY]_[NAME]_[VARIANT]_[LOD]',
  examples: [
    'CHR_PLAYER_BASE_M_01',
    'CHR_SECT_CLOUD_DISCIPLE_M_03',
    'EQP_SECT_CLOUD_OUTERROBE_WHITE_A',
    'WPN_SWORD_JADE_RAIN_01',
    'CRE_GHOST_MARSH_SERPENT_ELDER',
    'STR_SECT_CLOUD_GATE_GRAND_A',
    'PROP_ALCHEMY_FURNACE_BRONZE_02',
    'TER_CLOUDPEAK_CLIFF_GRANITE_A',
    'VEG_MORTALVALLEY_PINE_MATURE_B',
    'UI_HUD_TECHNIQUE_SLOT_ACTIVE',
    'VFX_TRIBULATION_LIGHTNING_TIER_03',
    'ANM_SWORD_LIGHT_COMBO_01',
  ],
};
