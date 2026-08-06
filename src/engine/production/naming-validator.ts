/**
 * Naming Convention Validator
 * ============================
 *
 * Validates asset IDs against the production bible naming convention:
 *   [TYPE]_[FACTION/BIOME]_[CATEGORY]_[NAME]_[VARIANT]_[LOD]
 *
 * Examples:
 *   CHR_PLAYER_BASE_M_01           ✓
 *   CHR_SECT_CLOUD_DISCIPLE_M_03   ✓
 *   EQP_SECT_CLOUD_OUTERROBE_WHITE_A ✓
 *   WPN_SWORD_JADE_RAIN_01         ✓
 *   CRE_GHOST_MARSH_SERPENT_ELDER  ✓
 *   invalid_id                     ✗
 *   chr_player                      ✗ (lowercase)
 */

import type { AssetType } from './streaming-optimization';

const VALID_ASSET_TYPES: readonly AssetType[] = [
  'CHR', 'EQP', 'WPN', 'CRE', 'STR', 'PROP', 'TER', 'VEG', 'UI', 'VFX', 'ANM', 'KIT', 'BIO',
];

export interface NamingValidationResult {
  valid: boolean;
  assetId: string;
  parsed: {
    type?: string;
    factionBiome?: string;
    category?: string;
    name?: string;
    variant?: string;
    lod?: string;
  };
  errors: string[];
  warnings: string[];
}

export function validateAssetId(assetId: string): NamingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed: NamingValidationResult['parsed'] = {};

  if (!assetId) {
    errors.push('Asset ID is empty');
    return { valid: false, assetId, parsed, errors, warnings };
  }

  // Must be uppercase
  if (assetId !== assetId.toUpperCase()) {
    errors.push('Asset ID must be all uppercase');
  }

  // Must not contain spaces
  if (assetId.includes(' ')) {
    errors.push('Asset ID must not contain spaces');
  }

  // Split by underscore
  const parts = assetId.split('_');

  // Minimum 3 parts (TYPE_CATEGORY_NAME at least)
  if (parts.length < 3) {
    errors.push(`Asset ID must have at least 3 parts (TYPE_CATEGORY_NAME), got ${parts.length}`);
    return { valid: false, assetId, parsed, errors, warnings };
  }

  // Parse parts
  parsed.type = parts[0];

  // Validate type
  if (!VALID_ASSET_TYPES.includes(parts[0] as AssetType)) {
    errors.push(`Invalid asset type "${parts[0]}". Valid: ${VALID_ASSET_TYPES.join(', ')}`);
  }

  // The convention is flexible — faction/biome and category may be merged
  // depending on the asset type. We validate the minimum structure.
  if (parts.length >= 4) {
    parsed.factionBiome = parts[1];
    parsed.category = parts[2];
    parsed.name = parts.slice(3, -1).join('_') || parts[3];
    parsed.variant = parts[parts.length - 1];
  } else {
    parsed.category = parts[1];
    parsed.name = parts[2];
  }

  // Check for common issues
  if (assetId.length > 64) {
    warnings.push('Asset ID is longer than 64 characters — may cause issues in some systems');
  }

  // Variant should be alphanumeric
  if (parsed.variant && !/^[A-Z0-9]+$/.test(parsed.variant)) {
    warnings.push(`Variant "${parsed.variant}" should be alphanumeric uppercase`);
  }

  return {
    valid: errors.length === 0,
    assetId,
    parsed,
    errors,
    warnings,
  };
}

/**
 * Generate an asset ID from components.
 */
export function generateAssetId(
  type: AssetType,
  factionBiome: string,
  category: string,
  name: string,
  variant?: string,
): string {
  const parts = [type, factionBiome, category, name];
  if (variant) parts.push(variant);
  return parts.join('_').toUpperCase();
}

/**
 * Get the asset type from an asset ID.
 */
export function getAssetType(assetId: string): AssetType | null {
  const type = assetId.split('_')[0] as AssetType;
  return VALID_ASSET_TYPES.includes(type) ? type : null;
}
