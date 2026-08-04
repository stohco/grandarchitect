/**
 * ga:renderer — Renderer Plugin
 *
 * Abstracts all rendering behind the RenderBackend interface.
 * Three.js is the rendering backend only, never authoritative world state.
 * The headless test backend provides a no-op implementation for conformance testing.
 *
 * Capabilities provided:
 *   - renderer.backend: The active RenderBackend instance.
 *   - renderer.materials: Material registry (register, get, list, resolveReference).
 *   - renderer.lighting: Lighting state management (sun, ambient, time-of-day).
 *   - renderer.post-stack: Post-processing pipeline control.
 *   - renderer.stats: Frame statistics and resource counts.
 *
 * Backend types: 'three-webgpu' | 'three-webgl2' | 'headless-test'
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { PluginManifest } from '../../kernel/types';

// ============================================================================
// Render Backend Types (from architecture docs 13, 14, 15)
// ============================================================================

export type BackendId = 'three-webgpu' | 'three-webgl2' | 'headless-test';
export type ApiType = 'webgpu' | 'webgl2' | 'none';

export interface BackendCapabilities {
  api: ApiType;
  maxTextureSize: number;
  maxUniformBufferBindingSize: number;
  maxStorageBufferBindingSize: number;
  maxComputeWorkgroupsPerDimension: number;
  supportsComputeParticles: boolean;
  supportsStorageBuffersInFragment: boolean;
  supportsInstancedMesh: boolean;
  supportsBatchedMesh: boolean;
  supportsShadowCascades: boolean;
  maxSamplesPerPixel: number;
  timestampQuery: boolean;
}

export interface FrameDescriptor {
  tick: number;
  dt: number;
  totalTime: number;
  viewMatrix: number[];      // 4x4 column-major
  projectionMatrix: number[]; // 4x4 column-major
  cameraPosition: [number, number, number];
  viewportWidth: number;
  viewportHeight: number;
}

export interface SubmittedScene {
  opaqueMeshes: RenderMesh[];
  transparentMeshes: RenderMesh[];
  lights: RenderLight[];
}

export interface RenderMesh {
  resourceId: bigint;
  transform: number[];    // 4x4 matrix
  materialId: string;
  visible: boolean;
}

export interface RenderLight {
  type: 'directional' | 'point' | 'spot' | 'hemisphere';
  position: [number, number, number];
  direction: [number, number, number];
  color: [number, number, number];
  intensity: number;
  range: number;
  castShadow: boolean;
}

export interface RenderPassNode {
  id: string;
  passType: string;
  inputs: string[];
  outputs: string[];
}

export interface RenderPassGraph {
  passes: RenderPassNode[];
}

export interface FrameStats {
  drawCalls: number;
  triangles: number;
  frameTimeMs: number;
  gpuTimeMs: number;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResourceDescriptor {
  type: 'mesh' | 'texture' | 'material' | 'sampler' | 'framebuffer';
  name: string;
  params: Record<string, unknown>;
}

export type ResourceHandle = bigint;

export interface RenderBackendConfig {
  canvas?: unknown;
  antialias?: boolean;
  pixelRatio?: number;
  shadowMapSize?: number;
}

export interface BackendInitResult {
  api: ApiType;
  rendererInfo: string;
}

// ============================================================================
// RenderBackend Interface
// ============================================================================

export interface RenderBackend {
  readonly id: BackendId;
  readonly api: ApiType;
  initialize(config: RenderBackendConfig): Promise<BackendInitResult>;
  capabilities(): BackendCapabilities;
  beginFrame(frame: FrameDescriptor): void;
  submitScene(scene: SubmittedScene): void;
  executePassGraph(graph: RenderPassGraph): void;
  endFrame(): FrameStats;
  createResource(desc: ResourceDescriptor): ResourceHandle;
  disposeResource(handle: ResourceHandle): void;
  readPixels(rect: PixelRect): Promise<Uint8Array>;
  readDepth(rect: PixelRect): Promise<Float32Array>;
  resize(width: number, height: number, dpr: number): void;
  onContextLost(handler: () => void): void;
  dispose(): void;
}

// ============================================================================
// Material System Types
// ============================================================================

export interface MaterialDef {
  id: string;
  label: string;
  type: 'pbr' | 'custom';
  params: Record<string, unknown>;
  tags?: string[];
}

export interface MaterialRegistry {
  register(def: MaterialDef): void;
  get(id: string): MaterialDef | undefined;
  list(filter?: { tag?: string; type?: string }): MaterialDef[];
  resolveReference(ref: string): MaterialDef | undefined;
  size(): number;
}

// ============================================================================
// Lighting System Types
// ============================================================================

export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';

export interface LightingState {
  sunDirection: [number, number, number];
  sunColor: [number, number, number];
  sunIntensity: number;
  ambientColor: [number, number, number];
  ambientIntensity: number;
  hemisphereSkyColor: [number, number, number];
  hemisphereGroundColor: [number, number, number];
  timeOfDay: TimeOfDay;
  shadowCascadeCount: number;
  shadowMapSize: number;
}

export interface LightingSystem {
  getState(): LightingState;
  setTimeOfDay(tod: TimeOfDay): void;
  setSunDirection(dir: [number, number, number]): void;
  setSunColor(color: [number, number, number]): void;
  setSunIntensity(intensity: number): void;
  setAmbientColor(color: [number, number, number]): void;
  setAmbientIntensity(intensity: number): void;
  setShadowCascades(count: number, mapSize: number): void;
}

// ============================================================================
// Post-Processing Stack Types
// ============================================================================

export type PostEffectType = 'bloom' | 'tonemap' | 'fog' | 'dof' | 'outline' | 'vignette' | 'ssao';

export interface PostEffect {
  type: PostEffectType;
  enabled: boolean;
  params: Record<string, unknown>;
}

export interface PostStack {
  addEffect(effect: PostEffect): void;
  removeEffect(type: PostEffectType): void;
  getEffect(type: PostEffectType): PostEffect | undefined;
  setEnabled(type: PostEffectType, enabled: boolean): void;
  setParam(type: PostEffectType, key: string, value: unknown): void;
  listEffects(): PostEffect[];
  size(): number;
}

// ============================================================================
// Headless Test Backend (no-op implementation for conformance testing)
// ============================================================================

function createHeadlessBackend(): RenderBackend {
  let handleCounter = 0n;
  let currentFrame: FrameDescriptor | null = null;
  let contextLostHandler: (() => void) | null = null;
  let width = 1280;
  let height = 720;
  let dpr = 1;

  const headlessCaps: BackendCapabilities = {
    api: 'none',
    maxTextureSize: 0,
    maxUniformBufferBindingSize: 0,
    maxStorageBufferBindingSize: 0,
    maxComputeWorkgroupsPerDimension: 0,
    supportsComputeParticles: false,
    supportsStorageBuffersInFragment: false,
    supportsInstancedMesh: false,
    supportsBatchedMesh: false,
    supportsShadowCascades: false,
    maxSamplesPerPixel: 1,
    timestampQuery: false,
  };

  return {
    id: 'headless-test',
    api: 'none',

    async initialize(_config: RenderBackendConfig): Promise<BackendInitResult> {
      return { api: 'none', rendererInfo: 'headless-test-0.1.0' };
    },

    capabilities(): BackendCapabilities {
      return headlessCaps;
    },

    beginFrame(frame: FrameDescriptor): void {
      currentFrame = frame;
    },

    submitScene(_scene: SubmittedScene): void {
      // no-op in headless
    },

    executePassGraph(_graph: RenderPassGraph): void {
      // no-op in headless
    },

    endFrame(): FrameStats {
      return {
        drawCalls: 0,
        triangles: 0,
        frameTimeMs: 0,
        gpuTimeMs: 0,
      };
    },

    createResource(_desc: ResourceDescriptor): ResourceHandle {
      return ++handleCounter;
    },

    disposeResource(_handle: ResourceHandle): void {
      // no-op in headless
    },

    async readPixels(rect: PixelRect): Promise<Uint8Array> {
      return new Uint8Array(rect.width * rect.height * 4);
    },

    async readDepth(rect: PixelRect): Promise<Float32Array> {
      return new Float32Array(rect.width * rect.height);
    },

    resize(w: number, h: number, d: number): void {
      width = w;
      height = h;
      dpr = d;
    },

    onContextLost(handler: () => void): void {
      contextLostHandler = handler;
    },

    dispose(): void {
      currentFrame = null;
      contextLostHandler = null;
    },
  };
}

// ============================================================================
// Material Registry Implementation
// ============================================================================

function createMaterialRegistry(): MaterialRegistry {
  const materials = new Map<string, MaterialDef>();

  return {
    register(def: MaterialDef): void {
      materials.set(def.id, def);
    },
    get(id: string): MaterialDef | undefined {
      return materials.get(id);
    },
    list(filter?: { tag?: string; type?: string }): MaterialDef[] {
      let results = Array.from(materials.values());
      if (filter?.type) {
        results = results.filter(m => m.type === filter.type);
      }
      if (filter?.tag) {
        results = results.filter(m => m.tags?.includes(filter.tag!));
      }
      return results;
    },
    resolveReference(ref: string): MaterialDef | undefined {
      return materials.get(ref);
    },
    size(): number {
      return materials.size;
    },
  };
}

// ============================================================================
// Lighting System Implementation
// ============================================================================

function createLightingSystem(): LightingSystem {
  const state: LightingState = {
    sunDirection: [0.5, 1.0, 0.3],
    sunColor: [1.0, 0.95, 0.85],
    sunIntensity: 1.0,
    ambientColor: [0.4, 0.45, 0.5],
    ambientIntensity: 0.5,
    hemisphereSkyColor: [0.5, 0.7, 1.0],
    hemisphereGroundColor: [0.2, 0.15, 0.1],
    timeOfDay: 'noon',
    shadowCascadeCount: 3,
    shadowMapSize: 2048,
  };

  return {
    getState(): LightingState {
      return { ...state };
    },
    setTimeOfDay(tod: TimeOfDay): void {
      state.timeOfDay = tod;
    },
    setSunDirection(dir: [number, number, number]): void {
      state.sunDirection = [...dir];
    },
    setSunColor(color: [number, number, number]): void {
      state.sunColor = [...color];
    },
    setSunIntensity(intensity: number): void {
      state.sunIntensity = intensity;
    },
    setAmbientColor(color: [number, number, number]): void {
      state.ambientColor = [...color];
    },
    setAmbientIntensity(intensity: number): void {
      state.ambientIntensity = intensity;
    },
    setShadowCascades(count: number, mapSize: number): void {
      state.shadowCascadeCount = count;
      state.shadowMapSize = mapSize;
    },
  };
}

// ============================================================================
// Post-Processing Stack Implementation
// ============================================================================

function createPostStack(): PostStack {
  const effects = new Map<PostEffectType, PostEffect>();

  return {
    addEffect(effect: PostEffect): void {
      effects.set(effect.type, effect);
    },
    removeEffect(type: PostEffectType): void {
      effects.delete(type);
    },
    getEffect(type: PostEffectType): PostEffect | undefined {
      return effects.get(type);
    },
    setEnabled(type: PostEffectType, enabled: boolean): void {
      const e = effects.get(type);
      if (e) e.enabled = enabled;
    },
    setParam(type: PostEffectType, key: string, value: unknown): void {
      const e = effects.get(type);
      if (e) e.params[key] = value;
    },
    listEffects(): PostEffect[] {
      return Array.from(effects.values());
    },
    size(): number {
      return effects.size;
    },
  };
}

// ============================================================================
// Renderer Stats Service
// ============================================================================

export interface RendererStats {
  getBackendId(): BackendId;
  getApiType(): ApiType;
  getResourceCount(): number;
  getLastFrameStats(): FrameStats | null;
  isInitialized(): boolean;
}

// ============================================================================
// The Plugin
// ============================================================================

function createRendererPlugin(): Plugin & {
  backend: RenderBackend;
  materials: MaterialRegistry;
  lighting: LightingSystem;
  postStack: PostStack;
  stats: RendererStats;
} {
  const backend = createHeadlessBackend();
  const materials = createMaterialRegistry();
  const lighting = createLightingSystem();
  const postStack = createPostStack();
  let initialized = false;
  let resourceCount = 0;
  let lastFrameStats: FrameStats | null = null;

  // Wrap backend to track stats
  const trackedBackend: RenderBackend = {
    ...backend,

    async initialize(config: RenderBackendConfig): Promise<BackendInitResult> {
      const result = await backend.initialize(config);
      initialized = true;
      return result;
    },

    beginFrame(frame: FrameDescriptor): void {
      backend.beginFrame(frame);
    },

    endFrame(): FrameStats {
      const stats = backend.endFrame();
      lastFrameStats = stats;
      return stats;
    },

    createResource(desc: ResourceDescriptor): ResourceHandle {
      resourceCount++;
      return backend.createResource(desc);
    },

    disposeResource(handle: ResourceHandle): void {
      resourceCount--;
      backend.disposeResource(handle);
    },
  };

  const stats: RendererStats = {
    getBackendId: () => trackedBackend.id,
    getApiType: () => trackedBackend.api,
    getResourceCount: () => resourceCount,
    getLastFrameStats: () => lastFrameStats,
    isInitialized: () => initialized,
  };

  const plugin: Plugin & {
    backend: RenderBackend;
    materials: MaterialRegistry;
    lighting: LightingSystem;
    postStack: PostStack;
    stats: RendererStats;
  } = {
    id: 'ga:renderer',
    version: '0.1.0',
    dependencies: [],

    init(h) {
      h.capabilities.register({ capability: 'renderer.backend', provider: 'ga:renderer', version: '0.1.0', instance: trackedBackend });
      h.capabilities.register({ capability: 'renderer.materials', provider: 'ga:renderer', version: '0.1.0', instance: materials });
      h.capabilities.register({ capability: 'renderer.lighting', provider: 'ga:renderer', version: '0.1.0', instance: lighting });
      h.capabilities.register({ capability: 'renderer.post-stack', provider: 'ga:renderer', version: '0.1.0', instance: postStack });
      h.capabilities.register({ capability: 'renderer.stats', provider: 'ga:renderer', version: '0.1.0', instance: stats });

      h.setState('ga:renderer', {
        backendId: trackedBackend.id,
        api: trackedBackend.api,
        initialized: false,
      });

      console.log('[ga:renderer] Initialized — 5 capabilities registered (headless-test backend)');
    },

    destroy(_h) {
      trackedBackend.dispose();
      console.log('[ga:renderer] Destroyed');
    },

    backend: trackedBackend,
    materials,
    lighting,
    postStack,
    stats,
  };

  return plugin;
}

export const RendererPlugin = createRendererPlugin();

export const RendererPluginManifest: PluginManifest = {
  id: 'ga:renderer',
  version: '0.1.0',
  engineVersionRange: '>=0.1.0',
  dependencies: [],
  optionalDependencies: [],
  provides: ['renderer.backend', 'renderer.materials', 'renderer.lighting', 'renderer.post-stack', 'renderer.stats'],
  requires: [],
  permissions: ['render', 'shader'],
  deterministicMode: 'unsupported',
  workerCompatible: true,
};
