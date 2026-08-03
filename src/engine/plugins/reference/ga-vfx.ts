/**
 * ga:vfx — VFX Plugin
 *
 * Manages visual effects: spawn, cancel, update. Gameplay-affecting effects
 * (damage, area, timing) are deterministic. Cosmetic presentation (particle
 * shapes, audio jitter, decal rotation) is non-deterministic.
 *
 * Capabilities provided:
 *   - vfx.director: VfxDirector — spawn, cancel, update presentations.
 *   - vfx.recipes: RecipeRegistry — register and query effect recipes.
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { PluginManifest } from '../../kernel/types';

// ============================================================================
// VFX Types (from architecture doc 18)
// ============================================================================

export type ScaleTier = 'tier-0' | 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4';
export type QualityTier = 'low' | 'medium' | 'high' | 'cinematic';

export type VfxComponentKind =
  | 'gpu-particles' | 'mesh-particles' | 'ribbon' | 'beam' | 'decal'
  | 'screen-space-effect' | 'material-override' | 'dissolve' | 'displacement'
  | 'distortion' | 'lightning-graph' | 'volumetric-shape' | 'procedural-glyph'
  | 'domain-field' | 'audio-oneshot' | 'audio-loop' | 'camera-shake' | 'camera-impulse';

export type UniformValue = number | number[] | string | boolean;

export interface VfxCost {
  budgetMs: number;
  estimatedParticles: number;
  passCount: number;
}

export interface VfxComponent {
  id: string;
  kind: VfxComponentKind;
  params: Record<string, UniformValue>;
  cost: VfxCost;
}

export interface RecipeStage {
  name: string;          // 'windup' | 'cast' | 'impact' | 'linger'
  startMs: number;
  endMs: number;
  components: VfxComponent[];
}

export interface TechniqueRecipe {
  id: string;
  techniqueId: string;
  scaleTier: ScaleTier;
  qualityTier: QualityTier;
  stages: RecipeStage[];
}

export interface TechniqueAnchor {
  techniqueId: string;
  casterEntity: number;
  targetEntity?: number;
  targetPosition?: [number, number, number];
  areaShape?: 'sphere' | 'box' | 'cone' | 'line';
  castStartTick: number;
  castTimeMs: number;
  releaseTimeMs: number;
  impactTimeMs: number;
  cosmeticSeed: number;   // non-canonical
}

export interface PresentationHandle {
  id: string;
  recipeId: string;
  active: boolean;
  startTime: number;
  elapsedMs: number;
}

export interface PresentationStats {
  activeCount: number;
  totalSpawned: number;
  totalCancelled: number;
}

// ============================================================================
// VfxDirector Interface
// ============================================================================

export interface VfxDirector {
  spawn(recipe: TechniqueRecipe, anchor: TechniqueAnchor): PresentationHandle;
  cancel(handle: PresentationHandle, fadeOutMs: number): void;
  update(dt: number): void;
  isActive(handle: PresentationHandle): boolean;
  getStats(): PresentationStats;
}

// ============================================================================
// Recipe Registry Interface
// ============================================================================

export interface RecipeRegistry {
  register(recipe: TechniqueRecipe): void;
  get(id: string): TechniqueRecipe | undefined;
  list(filter?: { techniqueId?: string; scaleTier?: ScaleTier; qualityTier?: QualityTier }): TechniqueRecipe[];
  size(): number;
  has(id: string): boolean;
}

// ============================================================================
// VfxDirector Implementation (headless)
// ============================================================================

function createVfxDirector(): VfxDirector {
  const presentations = new Map<string, {
    handle: PresentationHandle;
    recipe: TechniqueRecipe;
    anchor: TechniqueAnchor;
  }>();
  let presentationCounter = 0;
  let totalSpawned = 0;
  let totalCancelled = 0;

  return {
    spawn(recipe: TechniqueRecipe, anchor: TechniqueAnchor): PresentationHandle {
      presentationCounter++;
      totalSpawned++;
      const handle: PresentationHandle = {
        id: `vfx-${presentationCounter}`,
        recipeId: recipe.id,
        active: true,
        startTime: 0,
        elapsedMs: 0,
      };
      presentations.set(handle.id, { handle, recipe, anchor });
      return handle;
    },

    cancel(handle: PresentationHandle, _fadeOutMs: number): void {
      const p = presentations.get(handle.id);
      if (p) {
        p.handle.active = false;
        totalCancelled++;
      }
    },

    update(dt: number): void {
      for (const entry of presentations.values()) {
        if (entry.handle.active) {
          entry.handle.elapsedMs += dt * 1000;
          // Check if all stages complete
          const maxEnd = entry.recipe.stages.reduce((max, s) => Math.max(max, s.endMs), 0);
          if (entry.handle.elapsedMs >= maxEnd) {
            entry.handle.active = false;
          }
        }
      }
    },

    isActive(handle: PresentationHandle): boolean {
      return presentations.get(handle.id)?.handle.active ?? false;
    },

    getStats(): PresentationStats {
      let activeCount = 0;
      for (const entry of presentations.values()) {
        if (entry.handle.active) activeCount++;
      }
      return { activeCount, totalSpawned, totalCancelled };
    },
  };
}

// ============================================================================
// Recipe Registry Implementation
// ============================================================================

function createRecipeRegistry(): RecipeRegistry {
  const recipes = new Map<string, TechniqueRecipe>();

  return {
    register(recipe: TechniqueRecipe): void {
      recipes.set(recipe.id, recipe);
    },

    get(id: string): TechniqueRecipe | undefined {
      return recipes.get(id);
    },

    list(filter?: { techniqueId?: string; scaleTier?: ScaleTier; qualityTier?: QualityTier }): TechniqueRecipe[] {
      let results = Array.from(recipes.values());
      if (filter?.techniqueId) {
        results = results.filter(r => r.techniqueId === filter.techniqueId);
      }
      if (filter?.scaleTier) {
        results = results.filter(r => r.scaleTier === filter.scaleTier);
      }
      if (filter?.qualityTier) {
        results = results.filter(r => r.qualityTier === filter.qualityTier);
      }
      return results;
    },

    size(): number {
      return recipes.size;
    },

    has(id: string): boolean {
      return recipes.has(id);
    },
  };
}

// ============================================================================
// The Plugin
// ============================================================================

function createVfxPlugin(): Plugin & {
  director: VfxDirector;
  recipes: RecipeRegistry;
} {
  const director = createVfxDirector();
  const recipes = createRecipeRegistry();

  const plugin: Plugin & {
    director: VfxDirector;
    recipes: RecipeRegistry;
  } = {
    id: 'ga:vfx',
    version: '0.1.0',
    dependencies: [],

    init(h) {
      h.capabilities.register({ capability: 'vfx.director', provider: 'ga:vfx', version: '0.1.0', instance: director });
      h.capabilities.register({ capability: 'vfx.recipes', provider: 'ga:vfx', version: '0.1.0', instance: recipes });
      console.log('[ga:vfx] Initialized — 2 capabilities registered (headless backend)');
    },

    destroy(_h) {
      console.log('[ga:vfx] Destroyed');
    },

    director,
    recipes,
  };

  return plugin;
}

export const VfxPlugin = createVfxPlugin();

export const VfxPluginManifest: PluginManifest = {
  id: 'ga:vfx',
  version: '0.1.0',
  engineVersionRange: '>=0.1.0',
  dependencies: [],
  optionalDependencies: [],
  provides: ['vfx.director', 'vfx.recipes'],
  requires: [],
  permissions: ['render', 'shader'],
  deterministicMode: 'unsupported', // cosmetic presentation is non-deterministic
  workerCompatible: true,
};
