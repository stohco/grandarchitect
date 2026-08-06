/**
 * Animation Studio
 * ================
 *
 * In-engine animation authoring environment. Three.js can play back
 * animations, but it cannot author them. This provides:
 *
 *   - Timeline with keyframe tracks
 *   - Dope sheet (keyframe overview)
 *   - Curve editor (interpolation control)
 *   - Pose library
 *   - Retargeting (apply animation to different skeleton)
 *   - IK/FK controls
 *   - Root motion policies
 *   - Animation events (hit frames, combo windows, cancel windows)
 *   - Cloth/hair preview
 *   - Blend tree preview
 *   - State machine preview
 *   - Technique VFX sockets
 */

// ---------------------------------------------------------------------------
// Keyframe Types
// ---------------------------------------------------------------------------

export type InterpolationMode = 'linear' | 'step' | 'bezier' | 'smooth';

export interface Keyframe<T = number> {
  /** Time in seconds. */
  time: number;
  /** Value at this keyframe. */
  value: T;
  /** Interpolation mode to the NEXT keyframe. */
  interpolation: InterpolationMode;
  /** Bezier tangent in (for bezier mode). */
  tangentIn?: [number, number];
  /** Bezier tangent out (for bezier mode). */
  tangentOut?: [number, number];
}

// ---------------------------------------------------------------------------
// Animation Track
// ---------------------------------------------------------------------------

export type TrackTargetType = 'position' | 'rotation' | 'scale' | 'morph' | 'property';

export interface AnimationTrack {
  trackId: string;
  /** Bone/object name this track targets. */
  targetBone: string;
  /** What property this track animates. */
  targetType: TrackTargetType;
  /** Axis (for position/rotation/scale: 'x', 'y', 'z', or 'w' for quaternion). */
  axis?: 'x' | 'y' | 'z' | 'w';
  /** Keyframes sorted by time. */
  keyframes: Keyframe[];
  /** Whether this track is enabled. */
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Animation Clip
// ---------------------------------------------------------------------------

export interface AnimationClip {
  clipId: string;
  name: string;
  /** Duration in seconds. */
  duration: number;
  /** Frames per second (for display). */
  fps: number;
  /** Whether this is a looping animation. */
  loop: boolean;
  /** All tracks in this clip. */
  tracks: AnimationTrack[];
  /** Animation events (hit frames, combo windows, etc.). */
  events: AnimationEvent[];
  /** Root motion policy. */
  rootMotion: RootMotionPolicy;
  /** Tags for categorization. */
  tags: string[];
}

export interface AnimationEvent {
  eventId: string;
  /** Time in seconds. */
  time: number;
  /** Event type. */
  type: 'hit_frame' | 'combo_window' | 'cancel_window' | 'vfx_trigger' | 'sound_trigger' | 'footstep' | 'custom';
  /** Payload for this event. */
  payload: Record<string, unknown>;
}

export interface RootMotionPolicy {
  /** Whether root motion is enabled. */
  enabled: boolean;
  /** Which bone drives root motion. */
  rootBone: string;
  /** Axes that transfer to the character (vs staying in-place). */
  transferAxes: ('x' | 'y' | 'z')[];
}

// ---------------------------------------------------------------------------
// Pose Library
// ---------------------------------------------------------------------------

export interface Pose {
  poseId: string;
  name: string;
  /** Bone → transform mapping. */
  boneTransforms: Map<string, BoneTransform>;
  /** Whether this is a mirrored pose. */
  mirrored: boolean;
}

export interface BoneTransform {
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion
  scale: [number, number, number];
}

// ---------------------------------------------------------------------------
// Blend Tree
// ---------------------------------------------------------------------------

export type BlendNodeType = 'clip' | 'blend_1d' | 'blend_2d' | 'additive';

export interface BlendNode {
  nodeId: string;
  type: BlendNodeType;
  /** Child nodes (for blend nodes). */
  children: BlendNode[];
  /** Input parameter name (for blend nodes). */
  inputParam?: string;
  /** Clip reference (for clip nodes). */
  clipId?: string;
  /** Blend threshold (for 1D blend). */
  threshold?: number;
  /** 2D position (for 2D blend). */
  position2D?: [number, number];
}

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------

export interface AnimationState {
  stateId: string;
  name: string;
  /** Blend node that plays in this state. */
  blendNodeId: string;
  /** Whether this state loops. */
  loop: boolean;
  /** Speed multiplier. */
  speed: number;
}

export interface StateTransition {
  transitionId: string;
  fromState: string;
  toState: string;
  /** Condition parameter name. */
  conditionParam: string;
  /** Condition threshold. */
  conditionThreshold: number;
  /** Comparison operator. */
  conditionOp: '>' | '<' | '==' | '>=' | '<=';
  /** Transition duration in seconds. */
  duration: number;
  /** Whether the transition can be interrupted. */
  canInterrupt: boolean;
}

export interface AnimationStateMachine {
  machineId: string;
  name: string;
  states: AnimationState[];
  transitions: StateTransition[];
  /** Initial state. */
  initialState: string;
  /** Parameters (name → value). */
  parameters: Map<string, number>;
}

// ---------------------------------------------------------------------------
// Retargeting
// ---------------------------------------------------------------------------

export interface RetargetMapping {
  sourceBone: string;
  targetBone: string;
  /** Scale offset for this bone. */
  scaleOffset?: number;
}

export interface RetargetResult {
  success: boolean;
  clipsRetargeted: number;
  unmappedBones: string[];
  warnings: string[];
}

export function retargetAnimation(
  clip: AnimationClip,
  mappings: RetargetMapping[],
): { retargetedClip: AnimationClip; result: RetargetResult } {
  const boneMap = new Map<string, string>();
  const unmapped: string[] = [];

  for (const mapping of mappings) {
    boneMap.set(mapping.sourceBone, mapping.targetBone);
  }

  // Check all track bones have mappings
  for (const track of clip.tracks) {
    if (!boneMap.has(track.targetBone)) {
      unmapped.push(track.targetBone);
    }
  }

  // Create retargeted clip
  const retargetedClip: AnimationClip = {
    ...clip,
    clipId: clip.clipId + '_retargeted',
    name: clip.name + ' (retargeted)',
    tracks: clip.tracks.map((track) => ({
      ...track,
      targetBone: boneMap.get(track.targetBone) ?? track.targetBone,
    })),
  };

  return {
    retargetedClip,
    result: {
      success: unmapped.length === 0,
      clipsRetargeted: 1,
      unmappedBones: unmapped,
      warnings: unmapped.length > 0 ? `${unmapped.length} bones had no mapping` : [],
    },
  };
}

// ---------------------------------------------------------------------------
// Animation Evaluation
// ---------------------------------------------------------------------------

export function evaluateClipAtTime(clip: AnimationClip, time: number): Map<string, BoneTransform> {
  const result = new Map<string, BoneTransform>();

  // Group tracks by bone
  const boneTracks = new Map<string, AnimationTrack[]>();
  for (const track of clip.tracks) {
    if (!track.enabled) continue;
    const tracks = boneTracks.get(track.targetBone) ?? [];
    tracks.push(track);
    boneTracks.set(track.targetBone, tracks);
  }

  for (const [bone, tracks] of boneTracks) {
    const transform: BoneTransform = {
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    };

    for (const track of tracks) {
      const value = evaluateTrackAtTime(track, time);
      if (track.targetType === 'position' && track.axis) {
        const idx = track.axis === 'x' ? 0 : track.axis === 'y' ? 1 : 2;
        transform.position[idx] = value;
      } else if (track.targetType === 'rotation' && track.axis) {
        const idx = track.axis === 'x' ? 0 : track.axis === 'y' ? 1 : track.axis === 'z' ? 2 : 3;
        transform.rotation[idx] = value;
      } else if (track.targetType === 'scale' && track.axis) {
        const idx = track.axis === 'x' ? 0 : track.axis === 'y' ? 1 : 2;
        transform.scale[idx] = value;
      }
    }

    result.set(bone, transform);
  }

  return result;
}

function evaluateTrackAtTime(track: AnimationTrack, time: number): number {
  const keys = track.keyframes;
  if (keys.length === 0) return 0;
  if (time <= keys[0].time) return keys[0].value;
  if (time >= keys[keys.length - 1].time) return keys[keys.length - 1].value;

  // Find surrounding keyframes
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].time < time) i++;

  const k0 = keys[i];
  const k1 = keys[i + 1];
  if (!k1) return k0.value;

  const t = (time - k0.time) / (k1.time - k0.time || 1);

  switch (k0.interpolation) {
    case 'step':
      return k0.value;
    case 'linear':
      return k0.value + (k1.value - k0.value) * t;
    case 'smooth':
      // Smoothstep
      const s = t * t * (3 - 2 * t);
      return k0.value + (k1.value - k0.value) * s;
    case 'bezier':
      // Simplified bezier — use tangent out of k0 and tangent in of k1
      if (k0.tangentOut && k1.tangentIn) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;
        return mt2 * mt * k0.value +
          3 * mt2 * t * (k0.value + k0.tangentOut[1]) +
          3 * mt * t2 * (k1.value + k1.tangentIn[1]) +
          t2 * t * k1.value;
      }
      return k0.value + (k1.value - k0.value) * t;
    default:
      return k0.value + (k1.value - k0.value) * t;
  }
}

// ---------------------------------------------------------------------------
// Animation Set (from production bible Section 10)
// ---------------------------------------------------------------------------

export interface CharacterAnimationSet {
  characterId: string;
  locomotion: AnimationClip[];
  traversal: AnimationClip[];
  social: AnimationClip[];
  combat: AnimationClip[];
  defense: AnimationClip[];
  techniques: AnimationClip[];
  state: AnimationClip[];
  death: AnimationClip[];
}

export function createEmptyAnimationSet(characterId: string): CharacterAnimationSet {
  return {
    characterId,
    locomotion: [],
    traversal: [],
    social: [],
    combat: [],
    defense: [],
    techniques: [],
    state: [],
    death: [],
  };
}

export function getAnimationSetStats(set: CharacterAnimationSet): {
  totalClips: number;
  totalDuration: number;
  totalKeyframes: number;
  totalEvents: number;
} {
  const all = [...set.locomotion, ...set.traversal, ...set.social, ...set.combat, ...set.defense, ...set.techniques, ...set.state, ...set.death];
  return {
    totalClips: all.length,
    totalDuration: all.reduce((s, c) => s + c.duration, 0),
    totalKeyframes: all.reduce((s, c) => s + c.tracks.reduce((s2, t) => s2 + t.keyframes.length, 0), 0),
    totalEvents: all.reduce((s, c) => s + c.events.length, 0),
  };
}

// ---------------------------------------------------------------------------
// Helper: create a simple walk cycle
// ---------------------------------------------------------------------------

export function createWalkCycle(clipId: string, duration: number, fps: number): AnimationClip {
  const clip: AnimationClip = {
    clipId,
    name: 'Walk',
    duration,
    fps,
    loop: true,
    tracks: [],
    events: [],
    rootMotion: { enabled: true, rootBone: 'pelvis', transferAxes: ['x', 'z'] },
    tags: ['locomotion', 'walk'],
  };

  // Pelvis vertical bob (2 bobs per cycle)
  const pelvisBob: Keyframe[] = [];
  const steps = Math.floor(duration * fps);
  for (let i = 0; i <= steps; i++) {
    const t = i / fps;
    const phase = (t / duration) * Math.PI * 4; // 2 cycles
    pelvisBob.push({
      time: t,
      value: Math.sin(phase) * 0.03,
      interpolation: 'smooth',
    });
  }
  clip.tracks.push({
    trackId: 'pelvis_pos_y',
    targetBone: 'pelvis',
    targetType: 'position',
    axis: 'y',
    keyframes: pelvisBob,
    enabled: true,
  });

  // Left leg swing
  const leftLegSwing: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / fps;
    const phase = (t / duration) * Math.PI * 2;
    leftLegSwing.push({
      time: t,
      value: Math.sin(phase) * 0.3,
      interpolation: 'smooth',
    });
  }
  clip.tracks.push({
    trackId: 'thigh_L_rot_x',
    targetBone: 'thigh_L',
    targetType: 'rotation',
    axis: 'x',
    keyframes: leftLegSwing,
    enabled: true,
  });

  // Right leg swing (opposite phase)
  const rightLegSwing: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / fps;
    const phase = (t / duration) * Math.PI * 2 + Math.PI;
    rightLegSwing.push({
      time: t,
      value: Math.sin(phase) * 0.3,
      interpolation: 'smooth',
    });
  }
  clip.tracks.push({
    trackId: 'thigh_R_rot_x',
    targetBone: 'thigh_R',
    targetType: 'rotation',
    axis: 'x',
    keyframes: rightLegSwing,
    enabled: true,
  });

  // Footstep events at heel strike
  for (let cycle = 0; cycle < 2; cycle++) {
    clip.events.push({
      eventId: `footstep_L_${cycle}`,
      time: cycle * duration / 2,
      type: 'footstep',
      payload: { foot: 'left' },
    });
    clip.events.push({
      eventId: `footstep_R_${cycle}`,
      time: cycle * duration / 2 + duration / 4,
      type: 'footstep',
      payload: { foot: 'right' },
    });
  }

  return clip;
}
