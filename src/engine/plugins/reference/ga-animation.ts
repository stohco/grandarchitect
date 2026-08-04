/**
 * ga:animation — Animation Plugin
 *
 * Provides animation state machines, blend trees, and playback control.
 * The headless stub stores state and computes pose identities without
 * actual skeletal animation. Real implementation wraps Three.js AnimationMixer.
 *
 * Capabilities provided:
 *   - animation.controller: AnimationController — state machine, playback, blend trees.
 *   - animation.clips: ClipRegistry — register and query animation clip metadata.
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { PluginManifest } from '../../kernel/types';

// ============================================================================
// Animation Types (from architecture doc 17)
// ============================================================================

export type BodyMaskPart =
  | 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'leftHand' | 'rightHand' | 'leftFoot' | 'rightFoot';

export interface BodyMask {
  parts: Record<BodyMaskPart, boolean>;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface BoneTransform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export type Pose = Map<string, BoneTransform>;

export interface AnimationEvent {
  name: string;
  time: number;
  data?: unknown;
}

export interface TransitionLog {
  from: string;
  to: string;
  durationMs: number;
  elapsedMs: number;
}

export interface AnimationUpdateResult {
  pose: Pose;
  rootMotionDelta: { translation: Vec3; rotation: Quat };
  events: AnimationEvent[];
  transitions: TransitionLog[];
}

export interface TransitionOpts {
  durationMs?: number;
  interruptionAllowed?: boolean;
}

export interface IkTarget {
  jointName: string;
  targetPosition: Vec3;
  weight: number;
}

export interface ProceduralOverlay {
  jointName: string;
  type: string;
  params: Record<string, unknown>;
}

// ============================================================================
// State Graph Types
// ============================================================================

export type SkeletonProfile =
  | 'humanoid' | 'quadruped' | 'serpentine' | 'flying' | 'multi-armed' | 'giant' | 'custom';

export interface ClipMetadata {
  id: string;
  label: string;
  durationMs: number;
  frameCount: number;
  fps: number;
  skeletonProfile: SkeletonProfile;
  tags: string[];
  events: AnimationEvent[];
  loop: boolean;
}

export interface BlendTree1D {
  parameter: string;
  thresholds: number[];
  clipIds: string[];
}

export interface GraphState {
  id: string;
  clipId?: string;          // plays a clip directly
  blendTree?: BlendTree1D;   // or a 1D blend tree
  isDefault: boolean;
}

export interface GraphTransition {
  from: string;
  to: string;
  durationMs: number;
  canInterrupt: boolean;
  exitTime?: number;
  conditions: Record<string, unknown>;
}

export interface GraphParam {
  name: string;
  type: 'float' | 'int' | 'bool' | 'trigger';
  defaultValue: number | boolean;
}

export interface StateGraph {
  states: Map<string, GraphState>;
  transitions: GraphTransition[];
  params: Map<string, GraphParam>;
  defaultState: string;
}

// ============================================================================
// Animation Controller Interface
// ============================================================================

export interface AnimationController {
  setState(clipName: string, opts?: TransitionOpts): void;
  getState(): string;
  setParam(name: string, value: number | Vec3): number | Vec3;
  getParam(name: string): number | Vec3;
  playAdditive(layerName: string, clipName: string, weight: number, mask?: BodyMask): void;
  setAdditiveWeight(layerName: string, weight: number): void;
  removeAdditiveLayer(layerName: string): void;
  setIkTarget(name: string, target: IkTarget): void;
  removeIkTarget(name: string): void;
  setProceduralOverlay(name: string, overlay: ProceduralOverlay): void;
  removeProceduralOverlay(name: string): void;
  setRootMotionMode(mode: 'extract' | 'lock'): void;
  warpTo(target: Vec3, durationMs: number): void;
  update(dt: number): AnimationUpdateResult;
  loadGraph(graph: StateGraph): void;
  getCurrentGraph(): StateGraph | undefined;
}

// ============================================================================
// Clip Registry Interface
// ============================================================================

export interface ClipRegistry {
  register(clip: ClipMetadata): void;
  get(id: string): ClipMetadata | undefined;
  list(filter?: { skeletonProfile?: SkeletonProfile; tag?: string }): ClipMetadata[];
  size(): number;
  has(id: string): boolean;
}

// ============================================================================
// Identity Pose Helper
// ============================================================================

function identityPose(): Pose {
  // Empty pose — headless mode returns no bone transforms
  return new Map();
}

// ============================================================================
// Animation Controller Implementation (headless)
// ============================================================================

function createAnimationController(clipRegistry: ClipRegistry): AnimationController {
  let currentState = 'idle';
  let rootMotionMode: 'extract' | 'lock' = 'extract';
  const params = new Map<string, number | Vec3>();
  const additiveLayers = new Map<string, { clipName: string; weight: number; mask?: BodyMask }>();
  const ikTargets = new Map<string, IkTarget>();
  const proceduralOverlays = new Map<string, ProceduralOverlay>();
  let graph: StateGraph | undefined;
  let warpTarget: Vec3 | null = null;
  let warpDuration = 0;
  let warpElapsed = 0;

  return {
    setState(clipName: string, _opts?: TransitionOpts): void {
      currentState = clipName;
    },

    getState(): string {
      return currentState;
    },

    setParam(name: string, value: number | Vec3): number | Vec3 {
 const prev = params.get(name);
      params.set(name, value);
      return prev ?? (typeof value === 'number' ? 0 : { x: 0, y: 0, z: 0 });
    },

    getParam(name: string): number | Vec3 {
      const v = params.get(name);
      return v ?? 0;
    },

    playAdditive(layerName: string, clipName: string, weight: number, mask?: BodyMask): void {
      additiveLayers.set(layerName, { clipName, weight, mask });
    },

    setAdditiveWeight(layerName: string, weight: number): void {
      const layer = additiveLayers.get(layerName);
      if (layer) layer.weight = weight;
    },

    removeAdditiveLayer(layerName: string): void {
      additiveLayers.delete(layerName);
    },

    setIkTarget(name: string, target: IkTarget): void {
      ikTargets.set(name, target);
    },

    removeIkTarget(name: string): void {
      ikTargets.delete(name);
    },

    setProceduralOverlay(name: string, overlay: ProceduralOverlay): void {
      proceduralOverlays.set(name, overlay);
    },

    removeProceduralOverlay(name: string): void {
      proceduralOverlays.delete(name);
    },

    setRootMotionMode(mode: 'extract' | 'lock'): void {
      rootMotionMode = mode;
    },

    warpTo(target: Vec3, durationMs: number): void {
      warpTarget = { ...target };
      warpDuration = durationMs;
      warpElapsed = 0;
    },

    update(dt: number): AnimationUpdateResult {
      // Collect clip events if we have a registered clip for the current state
      const events: AnimationEvent[] = [];
      const clip = clipRegistry.get(currentState);
      if (clip) {
        events.push(...clip.events);
      }

      // Track warp progress
      if (warpTarget) {
        warpElapsed += dt * 1000;
        if (warpElapsed >= warpDuration) {
          warpTarget = null;
        }
      }

      return {
        pose: identityPose(),
        rootMotionDelta: {
          translation: rootMotionMode === 'extract' ? { x: 0, y: 0, z: 0 } : { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        events,
        transitions: [],
      };
    },

    loadGraph(g: StateGraph): void {
      graph = g;
      currentState = g.defaultState;
    },

    getCurrentGraph(): StateGraph | undefined {
      return graph;
    },
  };
}

// ============================================================================
// Clip Registry Implementation
// ============================================================================

function createClipRegistry(): ClipRegistry {
  const clips = new Map<string, ClipMetadata>();

  return {
    register(clip: ClipMetadata): void {
      clips.set(clip.id, clip);
    },

    get(id: string): ClipMetadata | undefined {
      return clips.get(id);
    },

    list(filter?: { skeletonProfile?: SkeletonProfile; tag?: string }): ClipMetadata[] {
      let results = Array.from(clips.values());
      if (filter?.skeletonProfile) {
        results = results.filter(c => c.skeletonProfile === filter.skeletonProfile);
      }
      if (filter?.tag) {
        results = results.filter(c => c.tags.includes(filter.tag!));
      }
      return results;
    },

    size(): number {
      return clips.size;
    },

    has(id: string): boolean {
      return clips.has(id);
    },
  };
}

// ============================================================================
// The Plugin
// ============================================================================

function createAnimationPlugin(): Plugin & {
  controller: AnimationController;
  clips: ClipRegistry;
} {
  const clips = createClipRegistry();
  const controller = createAnimationController(clips);

  const plugin: Plugin & {
    controller: AnimationController;
    clips: ClipRegistry;
  } = {
    id: 'ga:animation',
    version: '0.1.0',
    dependencies: [],

    init(h) {
      h.capabilities.register({ capability: 'animation.controller', provider: 'ga:animation', version: '0.1.0', instance: controller });
      h.capabilities.register({ capability: 'animation.clips', provider: 'ga:animation', version: '0.1.0', instance: clips });
      console.log('[ga:animation] Initialized — 2 capabilities registered (headless backend)');
    },

    destroy(_h) {
      console.log('[ga:animation] Destroyed');
    },

    controller,
    clips,
  };

  return plugin;
}

export const AnimationPlugin = createAnimationPlugin();

export const AnimationPluginManifest: PluginManifest = {
  id: 'ga:animation',
  version: '0.1.0',
  engineVersionRange: '>=0.1.0',
  dependencies: [],
  optionalDependencies: [],
  provides: ['animation.controller', 'animation.clips'],
  requires: [],
  permissions: ['render'],
  deterministicMode: 'supported',
  workerCompatible: true,
};
