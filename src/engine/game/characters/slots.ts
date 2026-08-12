/**
 * game/characters/slots.ts — the poster's equipment slot map (IMAGE_DIRECTIVES
 * §2, CHARACTER RULES, I4).
 *
 * The base body is the CANONICAL EQUIP BASE: complete body preserved,
 * clothing added modularly, with a HIDE-MASK per slot. SLOT_MASKS binds each
 * poster slot ID to the body zone_ ids that slot's wearable hides when worn
 * (the bible §4 zone system — zoneParts() in the gym).
 */
export type SlotId =
  | 'HAIR'
  | 'HEADWEAR'
  | 'FACE'
  | 'NECKLACE'
  | 'INNER_GARMENT'
  | 'OUTER_ROBE'
  | 'SHOULDERS'
  | 'CAPE_MANTLE'
  | 'BRACERS'
  | 'GLOVES'
  | 'BELT'
  | 'WAIST_ART_L'
  | 'WAIST_ART_R'
  | 'RING_L'
  | 'RING_R'
  | 'MAIN_HAND'
  | 'OFF_HAND'
  | 'BACK_WEAPON'
  | 'BACK_ACC_L'
  | 'BACK_ACC_R'
  | 'LOWER_ROBE_BACK'
  | 'LOWER_ROBE_SIDES_L'
  | 'LOWER_ROBE_SIDES_R'
  | 'LOWER_ROBE_FRONT'
  | 'PANTS'
  | 'BOOTS';

/** Slot → the zone_ ids its wearable hides. Slots without a mask (rings,
 * weapons, held/back accessories) hide nothing. */
/** The full zone list (bible §4 IDs) — also the feature-word strip list
 * for node names like 'zone_THIGH_L.knee'. */
export const ALL_ZONES = [
  'zone_HEAD_SCALP', 'zone_NECK', 'zone_CHEST_UPPER', 'zone_CHEST_LOWER',
  'zone_BACK_UPPER', 'zone_BACK_LOWER', 'zone_SHOULDER_L', 'zone_SHOULDER_R',
  'zone_UPPER_ARM_L', 'zone_UPPER_ARM_R', 'zone_FOREARM_L', 'zone_FOREARM_R',
  'zone_HAND_L', 'zone_HAND_R', 'zone_PELVIS', 'zone_GLUTE',
  'zone_THIGH_L', 'zone_THIGH_R', 'zone_CALF_L', 'zone_CALF_R', 'zone_FOOT_L', 'zone_FOOT_R',
] as const;

/** Normalize any authored node name to its zone ID:
 * 'zone_THIGH_L', 'zone_THIGH_L.knee', 'zone_THIGH_L001',
 * 'zone_THIGH_Lknee' → 'zone_THIGH_L'. Feature suffixes strip; unknown
 * names pass through unchanged. */
export function zoneIdOf(name: string): string {
  if (!name.startsWith('zone_')) return name;
  let z = name.replace(/\.\d+$/, '').replace(/\d+$/, '');
  z = z.replace(/[.\-]?(knee|ankle|elbow|finger\d*|thumb|ear\d*|eye\d*|brow\d*|nose|mouth|hairline)$/i, '');
  return (ALL_ZONES as readonly string[]).includes(z) ? z : z.replace(/[.\-]?\d+$/, '');
}

/** Slot → the zone_ ids its wearable hides. Slots without a mask (rings,
 * weapons, held/back accessories) hide nothing. */
export const SLOT_MASKS: Partial<Record<SlotId, string[]>> = {
  HAIR: ['zone_HEAD_SCALP'],
  INNER_GARMENT: [
    'zone_CHEST_UPPER', 'zone_CHEST_LOWER', 'zone_BACK_UPPER', 'zone_BACK_LOWER',
    'zone_PELVIS', 'zone_GLUTE', 'zone_THIGH_L', 'zone_THIGH_R',
  ],
  OUTER_ROBE: [
    'zone_CHEST_UPPER', 'zone_CHEST_LOWER', 'zone_BACK_UPPER', 'zone_BACK_LOWER',
    'zone_UPPER_ARM_L', 'zone_UPPER_ARM_R', 'zone_FOREARM_L', 'zone_FOREARM_R',
    'zone_PELVIS', 'zone_GLUTE', 'zone_THIGH_L', 'zone_THIGH_R', 'zone_CALF_L', 'zone_CALF_R',
  ],
  PANTS: ['zone_PELVIS', 'zone_GLUTE', 'zone_THIGH_L', 'zone_THIGH_R', 'zone_CALF_L', 'zone_CALF_R'],
  BOOTS: ['zone_FOOT_L', 'zone_FOOT_R'],
  GLOVES: ['zone_HAND_L', 'zone_HAND_R'],
  BRACERS: ['zone_FOREARM_L', 'zone_FOREARM_R'],
  SHOULDERS: ['zone_SHOULDER_L', 'zone_SHOULDER_R'],
  BELT: ['zone_PELVIS'],
};
