/**
 * Character Factory — the rigging & animation department.
 *
 * Procedural humanoid: skinned mesh over a shared bone rig (per the Modular
 * Character Factory board: one shared skeleton, humanoid hierarchy, cloth
 * bones), with modular robe meshes (outer robe with red lining reads as
 * costume family), and procedural animation clips (idle, walk, bow, weave)
 * generated deterministically. Profile from npc definitions: elder/farmer/
 * merchant/cultivator silhouettes (heights 1.6-1.8 m).
 *
 * Browser + Node safe. The director renderer uses this for village life.
 */

import * as THREE from 'three';

export interface HumanoidProfile {
  heightM: number;
  robeColor: number;
  robeTrim: number;
  hairColor: number;
  /** 'elder' | 'farmer' | 'merchant' | 'cultivator' | 'child' */
  role: string;
  gender: 'male' | 'female';
}

export interface Humanoid {
  group: THREE.Group;
  bones: Record<string, THREE.Bone>;
  clips: Record<string, THREE.AnimationClip>;
}

const ROBE_COLORS = {
  elder: 0x8a7a5c,
  farmer: 0x7a6a4a,
  merchant: 0x5c4a3a,
  cultivator: 0xe8e4dc, // white robe, red lining per hero target
  child: 0x9a8a6a,
};

function bone(name: string, x: number, y: number, z: number, parent: THREE.Bone): THREE.Bone {
  const b = new THREE.Bone();
  b.name = name;
  b.position.set(x, y, z);
  parent.add(b);
  return b;
}

/** Build a skinned humanoid with a shared skeleton (board §4 rules). */
export function buildHumanoid(profile: HumanoidProfile): Humanoid {
  const group = new THREE.Group();
  const root = new THREE.Bone();
  root.name = 'root';
  group.add(root);

  // skeleton: hips -> spine -> chest -> neck -> head; arms; legs
  const hips = bone('hips', 0, 0, 0, root);
  const spine = bone('spine', 0, 0.22, 0, hips);
  const chest = bone('chest', 0, 0.28, 0, spine);
  const neck = bone('neck', 0, 0.24, 0, chest);
  const head = bone('head', 0, 0.14, 0, neck);
  const shoulderL = bone('shoulder_l', -0.14, 0.22, 0, chest);
  const elbowL = bone('elbow_l', -0.26, 0, 0, shoulderL);
  const wristL = bone('wrist_l', -0.26, 0, 0, elbowL);
  const shoulderR = bone('shoulder_r', 0.14, 0.22, 0, chest);
  const elbowR = bone('elbow_r', 0.26, 0, 0, shoulderR);
  const wristR = bone('wrist_r', 0.26, 0, 0, elbowR);
  const hipL = bone('hip_l', -0.09, -0.12, 0, hips);
  const kneeL = bone('knee_l', 0, -0.38, 0, hipL);
  const ankleL = bone('ankle_l', 0, -0.38, 0, kneeL);
  const hipR = bone('hip_r', 0.09, -0.12, 0, hips);
  const kneeR = bone('knee_r', 0, -0.38, 0, hipR);
  const ankleR = bone('ankle_r', 0, -0.38, 0, kneeR);
  // cloth bones (board: cloth & hair use secondary bones)
  const clothBack = bone('cloth_back', 0, -0.1, -0.08, chest);
  const clothHem = bone('cloth_hem', 0, -0.28, 0.02, clothBack);

  const bones = {
    root, hips, spine, chest, neck, head,
    shoulderL, elbowL, wristL, shoulderR, elbowR, wristR,
    hipL, kneeL, ankleL, hipR, kneeR, ankleR, clothBack, clothHem,
  };
  const skeleton = new THREE.Skeleton(Object.values(bones));
  const boneIndex = (name: string) => Object.keys(bones).indexOf(name);

  // ---- skinned geometry (low-poly stylized; painterly materials) ----
  const scale = profile.heightM / 1.8;
  const robMat = new THREE.MeshStandardMaterial({ color: profile.robeColor, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: profile.robeTrim, roughness: 0.7 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8a878, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: profile.hairColor, roughness: 0.9 });

  const geo = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const skinned = (g: THREE.BufferGeometry, mat: THREE.Material, boneName: string): THREE.SkinnedMesh => {
    const n = g.attributes.position.count;
    const idx = boneIndex(boneName);
    const skinIndex = new Float32Array(n * 4).fill(idx);
    const skinWeight = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) skinWeight[i * 4] = 1;
    g.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.bind(skeleton);
    return mesh;
  };

  const headMesh = skinned(geo(0.22, 0.24, 0.22), skinMat, 'head');
  headMesh.position.y = 1.62 * scale;
  const hairMesh = skinned(geo(0.24, 0.16, 0.24), hairMat, 'head');
  hairMesh.position.y = 1.76 * scale;
  const bunMesh = skinned(geo(0.08, 0.08, 0.08), hairMat, 'head');
  bunMesh.position.y = 1.86 * scale;
  // flared robe silhouette (hero target: flowing robe, readable silhouette)
  const robeGeo = new THREE.CylinderGeometry(0.17, 0.3, 1.05, 8, 1, true);
  robeGeo.translate(0, 0, 0);
  const robeMesh = new THREE.SkinnedMesh(robeGeo, robMat);
  robeMesh.position.y = 0.98 * scale;
  robeMesh.castShadow = true;
  robeMesh.frustumCulled = false;
  const robeIdx = boneIndex('chest');
  const robeN = robeGeo.attributes.position.count;
  const robeSkin = new Float32Array(robeN * 4).fill(robeIdx);
  const robeWeight = new Float32Array(robeN * 4);
  for (let i = 0; i < robeN; i++) robeWeight[i * 4] = 1;
  robeGeo.setAttribute('skinIndex', new THREE.BufferAttribute(robeSkin, 4));
  robeGeo.setAttribute('skinWeight', new THREE.BufferAttribute(robeWeight, 4));
  robeMesh.bind(skeleton);
  const robeTrimMesh = skinned(geo(0.36, 0.14, 0.26), trimMat, 'chest'); // red lining hem
  robeTrimMesh.position.y = 0.42 * scale;
  // belt sash (dark, gold-accented per hero target)
  const beltMesh = skinned(geo(0.38, 0.08, 0.28), trimMat, 'chest');
  beltMesh.position.y = 0.72 * scale;
  const armLMesh = skinned(geo(0.11, 0.5, 0.11), robMat, 'shoulder_l');
  armLMesh.position.set(-0.2, 1.38 * scale, 0);
  const armRMesh = skinned(geo(0.11, 0.5, 0.11), robMat, 'shoulder_r');
  armRMesh.position.set(0.2, 1.38 * scale, 0);
  const legLMesh = skinned(geo(0.13, 0.72, 0.13), robMat, 'hip_l');
  legLMesh.position.set(-0.09, 0.36 * scale, 0);
  const legRMesh = skinned(geo(0.13, 0.72, 0.13), robMat, 'hip_r');
  legRMesh.position.set(0.09, 0.36 * scale, 0);

  for (const m of [headMesh, hairMesh, bunMesh, robeMesh, robeTrimMesh, beltMesh, armLMesh, armRMesh, legLMesh, legRMesh]) {
    m.castShadow = true;
    // dual-package hazard: three is bundled twice (ESM+CJS) in the browser,
    // which can break bounding-sphere computation for skinned meshes —
    // frustum culling off keeps stylized characters rendering reliably.
    m.frustumCulled = false;
    group.add(m);
  }

  // pose bones into T-pose defaults (bind pose = current local transforms)
  group.updateMatrixWorld(true);

  // ---- procedural clips (deterministic keyframes) ----
  const clips = {
    idle: buildIdleClip(bones),
    walk: buildWalkClip(bones),
    bow: buildBowClip(bones),
    weave: buildWeaveClip(bones),
  };

  return { group, bones, clips };
}

function track(bone: THREE.Bone, property: string, times: number[], values: number[]): THREE.KeyframeTrack {
  return new THREE.KeyframeTrack(`${bone.name}.${property}`, times, values);
}

function buildIdleClip(bones: Record<string, THREE.Bone>): THREE.AnimationClip {
  const times = [0, 1, 2];
  const breathY = [0, 0.015, 0];
  const sway = [0, 0.02, 0];
  return new THREE.AnimationClip('idle', 2, [
    track(bones.chest, 'position', times, [0, 0.02, 0, 0, 0.035, 0, 0, 0.02, 0]),
    track(bones.chest, 'rotation', times, [0, 0, 0, 0.01, 0, 0.02, 0, 0, 0]),
  ]);
}

function buildWalkClip(bones: Record<string, THREE.Bone>): THREE.AnimationClip {
  const times = [0, 0.25, 0.5, 0.75, 1];
  // arm swing L/R (rotation.z), leg swing L/R (rotation.x), bob
  return new THREE.AnimationClip('walk', 1, [
    track(bones.shoulderL, 'rotation', times, [0, 0.45, 0, -0.45, 0]),
    track(bones.shoulderR, 'rotation', times, [0, -0.45, 0, 0.45, 0]),
    track(bones.hipL, 'rotation', times, [0, 0.4, 0, -0.4, 0]),
    track(bones.hipR, 'rotation', times, [0, -0.4, 0, 0.4, 0]),
    track(bones.root, 'position', times, [0, 0, 0, 0, 0.03, 0, 0, 0, 0, 0, 0.03, 0, 0, 0, 0]),
  ]);
}

function buildBowClip(bones: Record<string, THREE.Bone>): THREE.AnimationClip {
  const times = [0, 0.5, 1, 1.5, 2];
  // formal bow: chest pitches forward, head lowers, arms fold
  return new THREE.AnimationClip('bow', 2, [
    track(bones.chest, 'rotation', times, [0, 0, 0, 0, 0, -0.7, 0, 0, -0.9, 0, 0, -0.7, 0, 0, 0]),
    track(bones.head, 'rotation', times, [0, 0, 0, 0, 0, -0.3, 0, 0, -0.4, 0, 0, -0.3, 0, 0, 0]),
    track(bones.shoulderL, 'rotation', times, [0, 0.9, 0, 0.9, 0]),
    track(bones.shoulderR, 'rotation', times, [0, -0.9, 0, -0.9, 0]),
  ]);
}

function buildWeaveClip(bones: Record<string, THREE.Bone>): THREE.AnimationClip {
  const times = [0, 0.3, 0.6, 0.9, 1.2];
  // loom: right arm forward/back, left hand shifts; slight rock
  return new THREE.AnimationClip('weave', 1.2, [
    track(bones.shoulderR, 'rotation', times, [0, 0.5, 0, -0.3, 0.5]),
    track(bones.elbowR, 'rotation', times, [0, -0.6, 0, -0.2, -0.6]),
    track(bones.shoulderL, 'rotation', times, [0, -0.2, 0, 0.3, -0.2]),
    track(bones.chest, 'rotation', times, [0, 0.02, 0, -0.02, 0.02]),
  ]);
}

/** NPC profiles from the definition database roles. */
export function profileForRole(role: string, seed: number): HumanoidProfile {
  const robe = (ROBE_COLORS as Record<string, number>)[role] ?? ROBE_COLORS.farmer;
  const elder = role === 'elder';
  return {
    heightM: elder ? 1.62 : role === 'child' ? 1.45 : 1.72,
    robeColor: robe,
    robeTrim: role === 'cultivator' ? 0x8a1f1f : 0x3a2f22,
    hairColor: elder ? 0x9a9a9a : 0x1a1410,
    role,
    gender: 'male',
  };
}
