/**
 * Recovery Profiles — how much of removed matter returns to the loot stream
 * =========================================================================
 *
 * Recovery efficiency is a function of the CAUSE of removal:
 *
 *   careful-harvest    0.95 - 1.00
 *   clean-cut          0.90 - 1.00
 *   smash              0.80 - 0.95
 *   shockwave          0.70 - 0.90
 *   explosion          0.60 - 0.90
 *   disintegration     0.20 - 0.45
 *   material-control   0.90 - 1.00   (cultivation technique, toward 100%)
 *
 * The realized efficiency is drawn deterministically within the range
 * (seeded), then clamped to [0, 1] after applying a cultivation/technique
 * recoveryBoost (toward 100%). Same seed → same efficiency, always.
 */

import { seedFromBigInt, nextDouble } from '../../../lib/determinism/rng';
import { stableHash64 } from './matter-hash';
import type { RemovalCauseType } from './matter-events';

export interface RecoveryRange {
  min: number;
  max: number;
}

export const RECOVERY_RANGES: Record<RemovalCauseType, RecoveryRange> = {
  'careful-harvest': { min: 0.95, max: 1.0 },
  'clean-cut': { min: 0.9, max: 1.0 },
  smash: { min: 0.8, max: 0.95 },
  shockwave: { min: 0.7, max: 0.9 },
  explosion: { min: 0.6, max: 0.9 },
  disintegration: { min: 0.2, max: 0.45 },
  'material-control': { min: 0.9, max: 1.0 },
};

export const RECOVERY_SEED_NAMESPACE = 'matter:recovery:v1:';

export interface RecoveryProfile {
  /** Resolve the realized efficiency for a cause, deterministically. */
  resolveEfficiency(cause: RemovalCauseType, seed: string, recoveryBoost?: number): number;
  /** The canonical range for a cause. */
  range(cause: RemovalCauseType): RecoveryRange;
}

export function createRecoveryProfile(): RecoveryProfile {
  return {
    range(cause) {
      return { ...RECOVERY_RANGES[cause] };
    },

    resolveEfficiency(cause, seed, recoveryBoost = 0) {
      const range = RECOVERY_RANGES[cause];
      if (!range) {
        throw new Error(`Unknown removal cause: ${cause}`);
      }
      const state = seedFromBigInt(stableHash64(`${RECOVERY_SEED_NAMESPACE}${cause}:${seed}`));
      const drawn = range.min + (range.max - range.min) * nextDouble(state);
      const boosted = drawn + recoveryBoost;
      const clamped = Math.max(0, Math.min(1, boosted));
      return Math.round(clamped * 10000) / 10000;
    },
  };
}
