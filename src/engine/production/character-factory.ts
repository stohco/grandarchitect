/**
 * Character Asset Factory — Production Types
 * ===========================================
 *
 * Implements the modular character system from the production bible
 * (Section 3-10). Characters are NOT fused outfits — they are modular
 * bodies wearing independently swappable equipment.
 *
 * Key requirements:
 *   - Complete base underwear model (male + female)
 *   - 22 body-hide zones (reversible masking, never permanent vertex deletion)
 *   - 10 equipment layers with occlusion priority
 *   - 8+ accessory/artifact slots
 *   - Shared humanoid retarget skeleton
 *   - 17 weapon/equipment sockets
 *   - Triangle budgets per LOD (60k-100k LOD0 full visible player)
 *   - 7 material channels (BaseColor, Normal, ORM, Emissive, DyeMask, etc.)
 */

// ---------------------------------------------------------------------------
// Canonical Scale (Section 3)
// ---------------------------------------------------------------------------

export interface CharacterScale {
  heightM: number;
  headCount: number;
  shoulderWidthM: number;
  hipWidthM: number;
  handLengthM: number;
  footLengthM: number;
  eyeLineM: number;
}

export const MALE_BASE_SCALE: CharacterScale = {
  heightM: 1.82,
  headCount: 7.75,
  shoulderWidthM: 0.46,
  hipWidthM: 0.34,
  handLengthM: 0.19,
  footLengthM: 0.27,
  eyeLineM: 1.70,
};

export const FEMALE_BASE_SCALE: CharacterScale = {
  heightM: 1.72,
  headCount: 7.5,
  shoulderWidthM: 0.40,
  hipWidthM: 0.36,
  handLengthM: 0.175,
  footLengthM: 0.245,
  eyeLineM: 1.61,
};

// ---------------------------------------------------------------------------
// Body Hide Zones (Section 4) — reversible masking
// ---------------------------------------------------------------------------

export type BodyHideZone =
  | 'HEAD_SCALP' | 'NECK'
  | 'CHEST_UPPER' | 'CHEST_LOWER' | 'BACK_UPPER' | 'BACK_LOWER'
  | 'SHOULDER_L' | 'SHOULDER_R'
  | 'UPPER_ARM_L' | 'UPPER_ARM_R' | 'FOREARM_L' | 'FOREARM_R'
  | 'HAND_L' | 'HAND_R'
  | 'PELVIS' | 'GLUTE'
  | 'THIGH_L' | 'THIGH_R' | 'CALF_L' | 'CALF_R'
  | 'FOOT_L' | 'FOOT_R';

export const ALL_BODY_HIDE_ZONES: readonly BodyHideZone[] = [
  'HEAD_SCALP', 'NECK',
  'CHEST_UPPER', 'CHEST_LOWER', 'BACK_UPPER', 'BACK_LOWER',
  'SHOULDER_L', 'SHOULDER_R',
  'UPPER_ARM_L', 'UPPER_ARM_R', 'FOREARM_L', 'FOREARM_R',
  'HAND_L', 'HAND_R',
  'PELVIS', 'GLUTE',
  'THIGH_L', 'THIGH_R', 'CALF_L', 'CALF_R',
  'FOOT_L', 'FOOT_R',
] as const;

// ---------------------------------------------------------------------------
// Equipment Slots (Section 5) — 10 layers with occlusion priority
// ---------------------------------------------------------------------------

export type EquipmentSlotId =
  | 'BODY_BASE'
  | 'INNER_TORSO' | 'INNER_LEGS'
  | 'FEET_INNER' | 'HANDS_INNER'
  | 'TORSO_ARMOR' | 'LEGS_ARMOR'
  | 'BOOTS' | 'GLOVES'
  | 'OUTER_ROBE' | 'WAIST'
  | 'SHOULDERS' | 'CAPE_BACK'
  | 'HEADGEAR' | 'HAIR' | 'FACE'
  | 'ACCESSORY_01' | 'ACCESSORY_02' | 'ACCESSORY_03' | 'ACCESSORY_04'
  | 'ACCESSORY_05' | 'ACCESSORY_06' | 'ACCESSORY_07' | 'ACCESSORY_08'
  | 'WEAPON_MAIN' | 'WEAPON_OFF'
  | 'WEAPON_BACK_01' | 'WEAPON_BACK_02' | 'WEAPON_BACK_03' | 'WEAPON_BACK_04';

export interface EquipmentSlot {
  slotId: EquipmentSlotId;
  layer: number;
  occlusionPriority: number;
  /** Body zones this slot hides when equipped. */
  hidesZones: BodyHideZone[];
  /** Whether this slot is visible in combat/cutscenes. */
  visibleInCombat: boolean;
}

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  { slotId: 'BODY_BASE', layer: 0, occlusionPriority: 0, hidesZones: [], visibleInCombat: true },
  { slotId: 'INNER_TORSO', layer: 1, occlusionPriority: 10, hidesZones: ['CHEST_UPPER', 'CHEST_LOWER', 'BACK_UPPER', 'BACK_LOWER'], visibleInCombat: true },
  { slotId: 'INNER_LEGS', layer: 1, occlusionPriority: 10, hidesZones: ['PELVIS', 'GLUTE', 'THIGH_L', 'THIGH_R'], visibleInCombat: true },
  { slotId: 'FEET_INNER', layer: 2, occlusionPriority: 20, hidesZones: ['FOOT_L', 'FOOT_R'], visibleInCombat: true },
  { slotId: 'HANDS_INNER', layer: 2, occlusionPriority: 20, hidesZones: ['HAND_L', 'HAND_R'], visibleInCombat: true },
  { slotId: 'TORSO_ARMOR', layer: 3, occlusionPriority: 30, hidesZones: ['CHEST_UPPER', 'CHEST_LOWER', 'BACK_UPPER', 'BACK_LOWER', 'SHOULDER_L', 'SHOULDER_R'], visibleInCombat: true },
  { slotId: 'LEGS_ARMOR', layer: 3, occlusionPriority: 30, hidesZones: ['THIGH_L', 'THIGH_R'], visibleInCombat: true },
  { slotId: 'BOOTS', layer: 4, occlusionPriority: 40, hidesZones: ['FOOT_L', 'FOOT_R', 'CALF_L', 'CALF_R'], visibleInCombat: true },
  { slotId: 'GLOVES', layer: 4, occlusionPriority: 40, hidesZones: ['HAND_L', 'HAND_R', 'FOREARM_L', 'FOREARM_R'], visibleInCombat: true },
  { slotId: 'OUTER_ROBE', layer: 5, occlusionPriority: 50, hidesZones: ['CHEST_UPPER', 'CHEST_LOWER', 'BACK_UPPER', 'BACK_LOWER', 'PELVIS', 'THIGH_L', 'THIGH_R'], visibleInCombat: true },
  { slotId: 'WAIST', layer: 5, occlusionPriority: 55, hidesZones: [], visibleInCombat: true },
  { slotId: 'SHOULDERS', layer: 6, occlusionPriority: 60, hidesZones: ['SHOULDER_L', 'SHOULDER_R'], visibleInCombat: true },
  { slotId: 'CAPE_BACK', layer: 6, occlusionPriority: 60, hidesZones: ['BACK_UPPER', 'BACK_LOWER'], visibleInCombat: true },
  { slotId: 'HEADGEAR', layer: 7, occlusionPriority: 70, hidesZones: ['HEAD_SCALP'], visibleInCombat: true },
  { slotId: 'HAIR', layer: 7, occlusionPriority: 70, hidesZones: ['HEAD_SCALP'], visibleInCombat: true },
  { slotId: 'FACE', layer: 8, occlusionPriority: 80, hidesZones: [], visibleInCombat: true },
  ...Array.from({ length: 8 }, (_, i) => ({
    slotId: `ACCESSORY_0${i + 1}` as EquipmentSlotId,
    layer: 9,
    occlusionPriority: 90,
    hidesZones: [],
    visibleInCombat: true,
  })),
  { slotId: 'WEAPON_MAIN', layer: 10, occlusionPriority: 100, hidesZones: [], visibleInCombat: true },
  { slotId: 'WEAPON_OFF', layer: 10, occlusionPriority: 100, hidesZones: [], visibleInCombat: true },
  ...Array.from({ length: 4 }, (_, i) => ({
    slotId: `WEAPON_BACK_0${i + 1}` as EquipmentSlotId,
    layer: 10,
    occlusionPriority: 100,
    hidesZones: [],
    visibleInCombat: false,
  })),
] as const;

// ---------------------------------------------------------------------------
// Skeleton and Sockets (Section 9)
// ---------------------------------------------------------------------------

export type SkeletonSocketId =
  | 'SOCKET_HAND_R' | 'SOCKET_HAND_L'
  | 'SOCKET_BACK_CENTER' | 'SOCKET_BACK_L' | 'SOCKET_BACK_R'
  | 'SOCKET_WAIST_L' | 'SOCKET_WAIST_R'
  | 'SOCKET_HEAD_TOP' | 'SOCKET_FACE' | 'SOCKET_CHEST'
  | 'SOCKET_SHOULDER_L' | 'SOCKET_SHOULDER_R'
  | 'SOCKET_FX_PALM_L' | 'SOCKET_FX_PALM_R'
  | 'SOCKET_FX_CHEST' | 'SOCKET_FX_FEET' | 'SOCKET_FX_WEAPON';

export const ALL_SOCKETS: readonly SkeletonSocketId[] = [
  'SOCKET_HAND_R', 'SOCKET_HAND_L',
  'SOCKET_BACK_CENTER', 'SOCKET_BACK_L', 'SOCKET_BACK_R',
  'SOCKET_WAIST_L', 'SOCKET_WAIST_R',
  'SOCKET_HEAD_TOP', 'SOCKET_FACE', 'SOCKET_CHEST',
  'SOCKET_SHOULDER_L', 'SOCKET_SHOULDER_R',
  'SOCKET_FX_PALM_L', 'SOCKET_FX_PALM_R',
  'SOCKET_FX_CHEST', 'SOCKET_FX_FEET', 'SOCKET_FX_WEAPON',
] as const;

// ---------------------------------------------------------------------------
// Triangle Budgets (Section 7)
// ---------------------------------------------------------------------------

export interface TriangleBudget {
  lod0: [number, number];
  lod1: [number, number];
  lod2: [number, number];
  lod3: [number, number];
}

export const TRIANGLE_BUDGETS = {
  playerBaseBody: { lod0: [28000, 42000], lod1: [16000, 24000], lod2: [7000, 12000], lod3: [2000, 4000] },
  playerHair: { lod0: [8000, 16000], lod1: [4000, 8000], lod2: [1500, 3000], lod3: [0, 0] },
  fullPlayerOutfit: { lod0: [24000, 55000], lod1: [12000, 28000], lod2: [5000, 12000], lod3: [1500, 4000] },
  fullVisiblePlayer: { lod0: [60000, 100000], lod1: [30000, 55000], lod2: [12000, 25000], lod3: [4000, 8000] },
  importantNpc: { lod0: [35000, 75000], lod1: [18000, 38000], lod2: [8000, 16000], lod3: [3000, 6000] },
  genericNpc: { lod0: [20000, 45000], lod1: [10000, 24000], lod2: [4000, 10000], lod3: [1500, 4000] },
  crowdNpc: { lod0: [6000, 15000], lod1: [3000, 7000], lod2: [1000, 3000], lod3: [0, 0] },
  normalCreature: { lod0: [18000, 55000], lod1: [9000, 28000], lod2: [4000, 12000], lod3: [1500, 4000] },
  majorBoss: { lod0: [60000, 180000], lod1: [30000, 90000], lod2: [12000, 40000], lod3: [4000, 12000] },
  heroWeapon: { lod0: [6000, 18000], lod1: [3000, 9000], lod2: [1000, 4000], lod3: [300, 1000] },
} as const;

// ---------------------------------------------------------------------------
// Material Channels (Section 8)
// ---------------------------------------------------------------------------

export type MaterialChannel =
  | 'BaseColor' | 'Normal' | 'ORM' | 'Emissive' | 'DyeMask'
  | 'DetailMask' | 'SubsurfaceMask' | 'DamageMask';

export type MaterialType =
  | 'cotton_linen' | 'silk' | 'leather' | 'lacquered_wood'
  | 'iron_steel' | 'bronze' | 'jade' | 'spirit_crystal'
  | 'skin' | 'hair';

export interface MaterialSpec {
  type: MaterialType;
  roughnessRange: [number, number];
  notes: string;
}

export const MATERIAL_SPECS: Record<MaterialType, MaterialSpec> = {
  cotton_linen: { type: 'cotton_linen', roughnessRange: [0.65, 0.88], notes: 'Broad soft highlights, visible woven breakup' },
  silk: { type: 'silk', roughnessRange: [0.32, 0.55], notes: 'Directional sheen, never mirror-like' },
  leather: { type: 'leather', roughnessRange: [0.45, 0.72], notes: 'Edge wear, compressed creases' },
  lacquered_wood: { type: 'lacquered_wood', roughnessRange: [0.30, 0.55], notes: 'Painted grain beneath varnish' },
  iron_steel: { type: 'iron_steel', roughnessRange: [0.18, 0.42], notes: 'Controlled wear; avoid chrome' },
  bronze: { type: 'bronze', roughnessRange: [0.24, 0.48], notes: 'Warm metal with selective patina' },
  jade: { type: 'jade', roughnessRange: [0.20, 0.42], notes: 'Slight depth/transmission, soft internal color variation' },
  spirit_crystal: { type: 'spirit_crystal', roughnessRange: [0.08, 0.30], notes: 'Refractive/emissive accents, restrained bloom' },
  skin: { type: 'skin', roughnessRange: [0.42, 0.62], notes: 'Subtle subsurface response; do not look waxy' },
  hair: { type: 'hair', roughnessRange: [0.30, 0.55], notes: 'Anisotropic highlight or authored strand response' },
};

// ---------------------------------------------------------------------------
// Character Manifest (Section 32)
// ---------------------------------------------------------------------------

export interface CharacterManifest {
  assetId: string;
  assetType: 'character_base' | 'character_npc' | 'character_creature';
  heightM: number;
  styleProfile: string;
  bindPose: 'A_POSE' | 'T_POSE';
  skeleton: string;
  lodTriangles: [number, number, number, number];
  materials: string[];
  bodyHideZones: BodyHideZone[];
  qa: {
    extremePoseTest: boolean;
    equipmentSwapTest: boolean;
    clothCollisionTest: boolean;
    lodPopTest: boolean;
  };
}
