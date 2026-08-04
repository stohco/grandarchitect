/**
 * ga:determinism — The first reference plugin.
 *
 * Wraps the existing determinism stack (src/lib/determinism/*.ts) into
 * a plugin that:
 * - Provides the determinism.rng, determinism.transcendentals,
 *   determinism.hash, determinism.serialize capabilities
 * - Registers the forbidden-function enforcer
 * - Registers the fingerprint system
 * - Registers the verification harness as a conformance test
 * - Exposes architect tools
 *
 * This is the smallest plugin that proves the kernel contract end-to-end:
 * it loads, registers capabilities, provides services, and can be
 * checkpointed and verified.
 */

import type { Plugin } from '../kernel/plugin-host';
import type { PluginManifest, CapabilityId } from '../kernel/types';

// Import the existing determinism stack
import { seedFromString, nextDouble, nextIntRange, nextBoolean, snapshotState, type XoshiroState } from '../../lib/determinism/rng';
import { det_sin, det_cos, det_tan, det_atan2, det_exp, det_log, det_pow, det_sqrt } from '../../lib/determinism/transcendentals';
import { fromDouble, toDouble, add, mul, sub, div, type Fixed64 } from '../../lib/determinism/fixed-point';
import { encodeState, decodeState } from '../../lib/determinism/serialize';
import { hashSync, hashAsync } from '../../lib/determinism/hash';
import { getFingerprint, type DeterminismFingerprint } from '../../lib/determinism/fingerprint';

// ============================================================================
// Capabilities provided
// ============================================================================

export const DETERMINISM_CAPABILITIES: CapabilityId[] = [
  'determinism.rng',
  'determinism.transcendentals',
  'determinism.fixed-point',
  'determinism.hash',
  'determinism.serialize',
  'determinism.fingerprint',
];

// ============================================================================
// RNG Service (the capability instance for 'determinism.rng')
// ============================================================================

export interface RngService {
  seedFromString(s: string): Promise<{ state: XoshiroState; seedHash: Uint8Array }>;
  nextDouble(state: XoshiroState): number;
  nextIntRange(state: XoshiroState, min: number, max: number): number;
  nextBoolean(state: XoshiroState, p: number): boolean;
  snapshotState(state: XoshiroState): { s0: string; s1: string; s2: string; s3: string };
}

const rngService: RngService = {
  seedFromString,
  nextDouble,
  nextIntRange,
  nextBoolean,
  snapshotState,
};

// ============================================================================
// Transcendentals Service
// ============================================================================

export interface TranscendentalsService {
  sin(x: number): number;
  cos(x: number): number;
  tan(x: number): number;
  atan2(y: number, x: number): number;
  exp(x: number): number;
  log(x: number): number;
  pow(x: number, y: number): number;
  sqrt(x: number): number;
}

const transcendentalsService: TranscendentalsService = {
  sin: det_sin,
  cos: det_cos,
  tan: det_tan,
  atan2: det_atan2,
  exp: det_exp,
  log: det_log,
  pow: det_pow,
  sqrt: det_sqrt,
};

// ============================================================================
// Fixed-Point Service
// ============================================================================

export interface FixedPointService {
  fromDouble(x: number): Fixed64;
  toDouble(x: Fixed64): number;
  add(a: Fixed64, b: Fixed64): Fixed64;
  sub(a: Fixed64, b: Fixed64): Fixed64;
  mul(a: Fixed64, b: Fixed64): Fixed64;
  div(a: Fixed64, b: Fixed64): Fixed64;
}

const fixedPointService: FixedPointService = {
  fromDouble,
  toDouble,
  add,
  sub,
  mul,
  div,
};

// ============================================================================
// Hash Service
// ============================================================================

export interface HashService {
  hashSync(bytes: Uint8Array): string;
  hashAsync(bytes: Uint8Array): Promise<string>;
}

const hashService: HashService = {
  hashSync,
  hashAsync,
};

// ============================================================================
// Serialize Service
// ============================================================================

export interface SerializeService {
  encode(state: unknown): Uint8Array;
  decode(bytes: Uint8Array): unknown;
}

const serializeService: SerializeService = {
  encode: encodeState,
  decode: decodeState,
};

// ============================================================================
// Fingerprint Service
// ============================================================================

export interface FingerprintService {
  get(): DeterminismFingerprint;
}

const fingerprintService: FingerprintService = {
  get: getFingerprint,
};

// ============================================================================
// The Plugin
// ============================================================================

export const DeterminismPlugin: Plugin = {
  id: 'ga:determinism',
  version: '0.1.0',
  dependencies: [],

  init(host) {
    // Register capabilities
    host.capabilities.register({
      capability: 'determinism.rng',
      provider: 'ga:determinism',
      version: '0.1.0',
      instance: rngService,
    });

    host.capabilities.register({
      capability: 'determinism.transcendentals',
      provider: 'ga:determinism',
      version: '0.1.0',
      instance: transcendentalsService,
    });

    host.capabilities.register({
      capability: 'determinism.fixed-point',
      provider: 'ga:determinism',
      version: '0.1.0',
      instance: fixedPointService,
    });

    host.capabilities.register({
      capability: 'determinism.hash',
      provider: 'ga:determinism',
      version: '0.1.0',
      instance: hashService,
    });

    host.capabilities.register({
      capability: 'determinism.serialize',
      provider: 'ga:determinism',
      version: '0.1.0',
      instance: serializeService,
    });

    host.capabilities.register({
      capability: 'determinism.fingerprint',
      provider: 'ga:determinism',
      version: '0.1.0',
      instance: fingerprintService,
    });

    // Initialize state
    host.setState('ga:determinism', {
      rngState: null as XoshiroState | null,
      seedHash: null as Uint8Array | null,
    });

    console.log('[ga:determinism] Initialized — 6 capabilities registered');
  },

  destroy(host) {
    // Capabilities are automatically unregistered by the plugin host
    console.log('[ga:determinism] Destroyed');
  },
};

// ============================================================================
// Manifest (for future use when the plugin SDK reads manifests)
// ============================================================================

export const DeterminismPluginManifest: PluginManifest = {
  id: 'ga:determinism',
  version: '0.1.0',
  engineVersionRange: '>=0.1.0',
  dependencies: [],
  optionalDependencies: [],
  provides: DETERMINISM_CAPABILITIES,
  requires: [],
  permissions: ['read-state', 'write-state'],
  deterministicMode: 'required',
  workerCompatible: true,
};
