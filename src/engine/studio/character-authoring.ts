/**
 * Character Authoring System
 * ===========================
 *
 * Dedicated tools for character creation — not a blank general-purpose modeler.
 * Generates base bodies, garment shells, assigns hide zones, sockets, and
 * skin weights. The underwear model is the canonical source body; equipment
 * is separately generated and fitted around it.
 */

import type { MeshKernel } from './mesh-kernel';
import { createMeshKernel, addVertex, addFace, addRegion, addSocket } from './mesh-kernel';
import type { CharacterScale, BodyHideZone, EquipmentSlotId } from '../production/character-factory';
import { MALE_BASE_SCALE, FEMALE_BASE_SCALE } from '../production/character-factory';
import { projectUVs, transferSkinWeights } from './mesh-operations';

// ---------------------------------------------------------------------------
// Base Body Generator
// ---------------------------------------------------------------------------

export interface BodyGeneratorParams {
  gender: 'male' | 'female';
  assetId: string;
  /** Number of horizontal segments around the body. */
  radialSegments: number;
  /** Number of vertical segments along the body. */
  heightSegments: number;
}

export function generateBaseBody(params: BodyGeneratorParams): MeshKernel {
  const scale = params.gender === 'male' ? MALE_BASE_SCALE : FEMALE_BASE_SCALE;
  const kernel = createMeshKernel(params.assetId, `Base Body (${params.gender})`);
  const { radialSegments: seg, heightSegments: hSeg } = params;

  const h = scale.heightM;
  const shoulderR = scale.shoulderWidthM / 2;
  const hipR = scale.hipWidthM / 2;
  const waistR = (shoulderR + hipR) / 2 * 0.85; // Tapered waist

  // Body profile: array of [heightFraction, radius] defining the silhouette
  const profile: Array<[number, number]> = [
    [0.0, hipR * 0.9],          // Feet
    [0.05, hipR * 0.95],        // Ankles
    [0.15, hipR],               // Hips
    [0.25, hipR * 0.95],        // Upper thigh → lower torso
    [0.40, waistR],             // Waist (narrowest)
    [0.50, waistR * 1.05],      // Lower chest
    [0.55, shoulderR * 0.9],    // Chest
    [0.60, shoulderR * 0.95],   // Shoulders
    [0.62, shoulderR * 0.5],    // Neck base
    [0.66, 0.06],               // Neck
    [0.72, 0.08],               // Chin
    [0.78, 0.10],               // Head bottom
    [0.88, 0.11],               // Head mid
    [0.93, 0.10],               // Head top
    [0.97, 0.05],               // Crown
    [1.0, 0.0],                 // Top
  ];

  // Generate vertices in rings
  const rings: number[][] = [];
  for (let hi = 0; hi <= hSeg; hi++) {
    const t = hi / hSeg;
    // Find the profile segment containing t
    let segIdx = 0;
    for (let i = 0; i < profile.length - 1; i++) {
      if (t >= profile[i][0] && t <= profile[i + 1][0]) {
        segIdx = i;
        break;
      }
    }
    const t0 = profile[segIdx][0];
    const t1 = profile[segIdx + 1][0];
    const r0 = profile[segIdx][1];
    const r1 = profile[segIdx + 1][1];
    const localT = (t - t0) / (t1 - t0 || 1);
    const radius = r0 + (r1 - r0) * localT;
    const y = t * h;

    const ring: number[] = [];
    for (let si = 0; si < seg; si++) {
      const angle = (si / seg) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      ring.push(addVertex(kernel, [x, y, z]));
    }
    rings.push(ring);
  }

  // Generate faces between rings
  for (let hi = 0; hi < hSeg; hi++) {
    for (let si = 0; si < seg; si++) {
      const next = (si + 1) % seg;
      addFace(kernel, [
        rings[hi][si],
        rings[hi][next],
        rings[hi + 1][next],
        rings[hi + 1][si],
      ]);
    }
  }

  // --- Assign body-hide zones ---
  // Map height fraction to body zones
  const zoneMap: Array<{ zone: BodyHideZone; yMin: number; yMax: number }> = [
    { zone: 'FOOT_L', yMin: 0.0, yMax: 0.05 },
    { zone: 'FOOT_R', yMin: 0.0, yMax: 0.05 },
    { zone: 'CALF_L', yMin: 0.05, yMax: 0.25 },
    { zone: 'CALF_R', yMin: 0.05, yMax: 0.25 },
    { zone: 'THIGH_L', yMin: 0.15, yMax: 0.40 },
    { zone: 'THIGH_R', yMin: 0.15, yMax: 0.40 },
    { zone: 'PELVIS', yMin: 0.25, yMax: 0.40 },
    { zone: 'GLUTE', yMin: 0.25, yMax: 0.40 },
    { zone: 'BACK_LOWER', yMin: 0.40, yMax: 0.55 },
    { zone: 'BACK_UPPER', yMin: 0.55, yMax: 0.62 },
    { zone: 'CHEST_LOWER', yMin: 0.40, yMax: 0.50 },
    { zone: 'CHEST_UPPER', yMin: 0.50, yMax: 0.62 },
    { zone: 'SHOULDER_L', yMin: 0.55, yMax: 0.62 },
    { zone: 'SHOULDER_R', yMin: 0.55, yMax: 0.62 },
    { zone: 'NECK', yMin: 0.62, yMax: 0.66 },
    { zone: 'HEAD_SCALP', yMin: 0.72, yMax: 1.0 },
  ];

  for (const { zone, yMin, yMax } of zoneMap) {
    const verts: number[] = [];
    for (const [, v] of kernel.vertices) {
      const yFrac = v.position[1] / h;
      if (yFrac >= yMin && yFrac <= yMax) {
        // For left/right zones, check x sign
        if (zone.endsWith('_L') && v.position[0] > 0) continue;
        if (zone.endsWith('_R') && v.position[0] < 0) continue;
        verts.push(v.vertexId);
      }
    }
    if (verts.length > 0) {
      addRegion(kernel, zone, zone, verts);
    }
  }

  // --- Add sockets ---
  // Hand sockets at arm position (simplified: at shoulder height, outside)
  const handY = h * 0.55;
  addSocket(kernel, 'SOCKET_HAND_R', 'Right Hand',
    addVertex(kernel, [shoulderR + 0.05, handY, 0]),
    [0, 0, 0], [0, 0, 0, 1]);
  addSocket(kernel, 'SOCKET_HAND_L', 'Left Hand',
    addVertex(kernel, [-(shoulderR + 0.05), handY, 0]),
    [0, 0, 0], [0, 0, 0, 1]);

  // Back socket
  addSocket(kernel, 'SOCKET_BACK_CENTER', 'Back Center',
    addVertex(kernel, [0, h * 0.55, -shoulderR * 0.8]),
    [0, 0, 0], [0, 0, 0, 1]);

  // Head socket
  addSocket(kernel, 'SOCKET_HEAD_TOP', 'Head Top',
    addVertex(kernel, [0, h * 0.98, 0]),
    [0, 0, 0], [0, 0, 0, 1]);

  // Waist sockets
  addSocket(kernel, 'SOCKET_WAIST_L', 'Left Waist',
    addVertex(kernel, [-waistR - 0.02, h * 0.42, 0]),
    [0, 0, 0], [0, 0, 0, 1]);
  addSocket(kernel, 'SOCKET_WAIST_R', 'Right Waist',
    addVertex(kernel, [waistR + 0.02, h * 0.42, 0]),
    [0, 0, 0], [0, 0, 0, 1]);

  // FX sockets
  addSocket(kernel, 'SOCKET_FX_CHEST', 'FX Chest',
    addVertex(kernel, [0, h * 0.52, shoulderR * 0.5]),
    [0, 0, 0], [0, 0, 0, 1]);
  addSocket(kernel, 'SOCKET_FX_FEET', 'FX Feet',
    addVertex(kernel, [0, 0.01, 0]),
    [0, 0, 0], [0, 0, 0, 1]);

  // Tags
  kernel.tags.push({ tag: 'asset_type', value: 'character_base' });
  kernel.tags.push({ tag: 'gender', value: params.gender });
  kernel.tags.push({ tag: 'height_m', value: String(h) });
  kernel.tags.push({ tag: 'skeleton', value: 'SKEL_HUMANOID_XIANXIA_V1' });

  return kernel;
}

// ---------------------------------------------------------------------------
// Garment Shell Generator (fitted to body)
// ---------------------------------------------------------------------------

export interface GarmentShellParams {
  assetId: string;
  bodyMeshId: string;
  bodyScale: CharacterScale;
  /** Body region to cover (determines height range). */
  region: 'torso' | 'torso_to_ankle' | 'legs' | 'full_body' | 'shoulders' | 'head';
  /** Clearance from body surface in meters. */
  clearanceM: number;
  /** Radial segments. */
  radialSegments: number;
}

export function generateGarmentShell(params: GarmentShellParams): MeshKernel {
  const kernel = createMeshKernel(params.assetId, `Garment (${params.region})`);
  const { bodyScale: scale, clearanceM: clearance, radialSegments: seg } = params;

  // Determine height range based on region
  let yMin: number, yMax: number;
  switch (params.region) {
    case 'torso': yMin = scale.heightM * 0.40; yMax = scale.heightM * 0.62; break;
    case 'torso_to_ankle': yMin = scale.heightM * 0.05; yMax = scale.heightM * 0.62; break;
    case 'legs': yMin = scale.heightM * 0.05; yMax = scale.heightM * 0.40; break;
    case 'full_body': yMin = 0; yMax = scale.heightM * 0.62; break;
    case 'shoulders': yMin = scale.heightM * 0.55; yMax = scale.heightM * 0.62; break;
    case 'head': yMin = scale.heightM * 0.72; yMax = scale.heightM; break;
  }

  const shoulderR = scale.shoulderWidthM / 2 + clearance;
  const hipR = scale.hipWidthM / 2 + clearance;
  const waistR = (shoulderR + hipR) / 2 * 0.85 + clearance;

  // Height segments for garment
  const hSeg = Math.max(4, Math.floor((yMax - yMin) / 0.1));

  // Generate rings
  const rings: number[][] = [];
  for (let hi = 0; hi <= hSeg; hi++) {
    const t = hi / hSeg;
    const y = yMin + t * (yMax - yMin);
    const yFrac = y / scale.heightM;

    // Interpolate radius based on body profile
    let radius: number;
    if (yFrac < 0.25) {
      radius = hipR + clearance * 0.5;
    } else if (yFrac < 0.42) {
      const lt = (yFrac - 0.25) / 0.17;
      radius = hipR + (waistR - hipR) * lt;
    } else if (yFrac < 0.55) {
      radius = waistR + (shoulderR * 0.9 - waistR) * ((yFrac - 0.42) / 0.13);
    } else {
      radius = shoulderR * 0.9 + (shoulderR - shoulderR * 0.9) * ((yFrac - 0.55) / 0.07);
    }

    const ring: number[] = [];
    for (let si = 0; si < seg; si++) {
      const angle = (si / seg) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      ring.push(addVertex(kernel, [x, y, z]));
    }
    rings.push(ring);
  }

  // Faces between rings
  for (let hi = 0; hi < hSeg; hi++) {
    for (let si = 0; si < seg; si++) {
      const next = (si + 1) % seg;
      addFace(kernel, [
        rings[hi][si],
        rings[hi][next],
        rings[hi + 1][next],
        rings[hi + 1][si],
      ]);
    }
  }

  // Tags
  kernel.tags.push({ tag: 'asset_type', value: 'garment' });
  kernel.tags.push({ tag: 'body_reference', value: params.bodyMeshId });
  kernel.tags.push({ tag: 'region', value: params.region });
  kernel.tags.push({ tag: 'clearance_m', value: String(clearance) });

  return kernel;
}

// ---------------------------------------------------------------------------
// Character Assembly (body + equipment)
// ---------------------------------------------------------------------------

export interface CharacterAssemblyParams {
  assetId: string;
  bodyMesh: MeshKernel;
  equipment: Array<{ mesh: MeshKernel; slotId: EquipmentSlotId }>;
}

export interface CharacterAssemblyResult {
  assetId: string;
  totalVertices: number;
  totalFaces: number;
  equipmentCount: number;
  hideZonesActive: string[];
}

export function assembleCharacter(params: CharacterAssemblyParams): CharacterAssemblyResult {
  const { bodyMesh, equipment } = params;
  const hideZonesActive = new Set<string>();

  // Determine which body zones are hidden by equipped items
  for (const item of equipment) {
    // Each equipment slot hides specific zones
    for (const [, region] of bodyMesh.regions) {
      // Check if this region is covered by the equipment mesh bounds
      const eqBounds = item.mesh.bounds;
      const regVerts = Array.from(region.vertexIds).map((vId) => bodyMesh.vertices.get(vId)!).filter(Boolean);

      for (const v of regVerts) {
        if (
          v.position[1] >= eqBounds.min[1] - 0.05 &&
          v.position[1] <= eqBounds.max[1] + 0.05 &&
          v.position[0] >= eqBounds.min[0] - 0.05 &&
          v.position[0] <= eqBounds.max[0] + 0.05
        ) {
          hideZonesActive.add(region.regionId);
          break;
        }
      }
    }
  }

  // Count total vertices/faces
  let totalVertices = bodyMesh.vertices.size;
  let totalFaces = bodyMesh.faces.size;
  for (const eq of equipment) {
    totalVertices += eq.mesh.vertices.size;
    totalFaces += eq.mesh.faces.size;
  }

  return {
    assetId: params.assetId,
    totalVertices,
    totalFaces,
    equipmentCount: equipment.length,
    hideZonesActive: Array.from(hideZonesActive),
  };
}

// ---------------------------------------------------------------------------
// Convenience: generate a complete character with underwear + basic equipment
// ---------------------------------------------------------------------------

export function generateCompleteCharacter(
  assetId: string,
  gender: 'male' | 'female',
): { body: MeshKernel; innerTorso: MeshKernel; innerLegs: MeshKernel; boots: MeshKernel; assembly: CharacterAssemblyResult } {
  const scale = gender === 'male' ? MALE_BASE_SCALE : FEMALE_BASE_SCALE;

  // Generate base body
  const body = generateBaseBody({
    gender,
    assetId: assetId + '_BASE',
    radialSegments: 16,
    heightSegments: 32,
  });

  // Generate underwear (inner torso + inner legs)
  const innerTorso = generateGarmentShell({
    assetId: assetId + '_INNER_TORSO',
    bodyMeshId: body.meshId,
    bodyScale: scale,
    region: 'torso',
    clearanceM: 0.005,
    radialSegments: 16,
  });

  const innerLegs = generateGarmentShell({
    assetId: assetId + '_INNER_LEGS',
    bodyMeshId: body.meshId,
    bodyScale: scale,
    region: 'legs',
    clearanceM: 0.005,
    radialSegments: 16,
  });

  // Generate basic boots (foot covering)
  const boots = generateGarmentShell({
    assetId: assetId + '_BOOTS',
    bodyMeshId: body.meshId,
    bodyScale: scale,
    region: 'legs',
    clearanceM: 0.02,
    radialSegments: 12,
  });

  // Assemble
  const assembly = assembleCharacter({
    assetId,
    bodyMesh: body,
    equipment: [
      { mesh: innerTorso, slotId: 'INNER_TORSO' },
      { mesh: innerLegs, slotId: 'INNER_LEGS' },
      { mesh: boots, slotId: 'BOOTS' },
    ],
  });

  return { body, innerTorso, innerLegs, boots, assembly };
}
