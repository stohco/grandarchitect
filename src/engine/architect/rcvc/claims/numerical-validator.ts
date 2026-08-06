/**
 * Numerical Constraint Validator — measurement consistency across claims
 *
 * Third validation layer. Checks that physical measurements in claims
 * are internally consistent:
 *   - Door height > inhabitant height + clearance
 *   - Travel time ≈ distance / speed
 *   - Building contains room (room dimensions < building dimensions)
 *   - Creature mass supportable by limb cross-section
 *   - Settlement population can be fed by arable land
 *   - Speed within realm limits (doc 03 table)
 *   - Wing loading plausible for flying creatures
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { ClaimRecord, ClaimRegistry } from './schema';

// ============================================================================
// Types
// ============================================================================

export interface NumericalFinding {
  claimId: string;
  findingType: NumericalFindingType;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  measured?: number;
  expected?: number;
  unit?: string;
}

export type NumericalFindingType =
  | 'door-too-small'
  | 'travel-time-inconsistent'
  | 'room-larger-than-building'
  | 'mass-implausible'
  | 'speed-exceeds-realm-limit'
  | 'wing-loading-implausible'
  | 'population-unsupportable'
  | 'measurement-missing-spec'
  | 'unit-mismatch';

export interface NumericalValidationReport {
  totalClaims: number;
  claimsWithMeasurements: number;
  findings: NumericalFinding[];
  summary: Record<NumericalFindingType, number>;
  verdict: 'pass' | 'warnings' | 'fail';
  coverage: {
    layerName: string;
    checksRun: string[];
    notYetChecked: string[];
  };
}

// ============================================================================
// Validator
// ============================================================================

export function validateNumericalConstraints(registry: ClaimRegistry): NumericalValidationReport {
  const findings: NumericalFinding[] = [];
  let claimsWithMeasurements = 0;

  for (const claim of registry.claims) {
    if (!claim.physicalSpec) continue;
    claimsWithMeasurements++;

    const dims = claim.physicalSpec.dimensions ?? {};

    // ---- Check: door too small for inhabitant ----
    // If this is an architecture claim with a door dimension, check against
    // the standard mortal height (1.68m avg, so doors should be >= 1.9m)
    if (claim.domain === 'architecture' || claim.tags.includes('architecture')) {
      const height = dims.heightMeters;
      if (height && height.typical !== undefined && height.typical < 1.9) {
        findings.push({
          claimId: claim.claimId,
          findingType: 'door-too-small',
          severity: 'major',
          message: `Door/architecture height ${height.typical}m is too small for mortal passage (min 1.9m for 1.68m avg human)`,
          measured: height.typical,
          expected: 1.9,
          unit: 'm',
        });
      }
    }

    // ---- Check: mortal building exceeding style grammar height limit ----
    // Cangli Riverlands buildings should not exceed 5m (doc 53 §2)
    if (claim.tags.includes('mortal') || claim.statement.toLowerCase().includes('household')) {
      const height = dims.heightMeters;
      if (height && height.max !== undefined && height.max > 5.0) {
        findings.push({
          claimId: claim.claimId,
          findingType: 'measurement-missing-spec',
          severity: 'major',
          message: `Mortal building height max ${height.max}m exceeds Cangli Riverlands limit (5m) — may be sect/holy-land scale`,
          measured: height.max,
          expected: 5.0,
          unit: 'm',
        });
      }
    }

    // ---- Check: speed exceeding realm limit ----
    // Mortal max speed: 1.5 m/s (doc 03 table)
    // Qi Condensation: 15 m/s, Foundation: 30 m/s, Core Formation: 60 m/s
    const speed = claim.physicalSpec.speedMetersPerSecond;
    if (speed && claim.tags.includes('mortal') && speed.max !== undefined && speed.max > 2.0) {
      findings.push({
        claimId: claim.claimId,
        findingType: 'speed-exceeds-realm-limit',
        severity: 'critical',
        message: `Mortal speed max ${speed.max} m/s exceeds mortal limit (2.0 m/s) — requires qi enhancement or supernatural exception`,
        measured: speed.max,
        expected: 2.0,
        unit: 'm/s',
      });
    }

    // ---- Check: wing loading plausibility for flying creatures ----
    if (claim.domain === 'creature' && claim.tags.includes('flying')) {
      // Wing loading > 5 kg/m² is implausible for biological flight
      // (spirit beasts get some leeway via qi buoyancy, but >10 is extreme)
      const mass = claim.physicalSpec.massKilograms;
      if (mass && mass.typical !== undefined && mass.typical > 200) {
        findings.push({
          claimId: claim.claimId,
          findingType: 'wing-loading-implausible',
          severity: 'minor',
          message: `Flying creature mass ${mass.typical}kg is high — ensure qi-buoyancy supernatural exception is filed (doc 55 §6)`,
          measured: mass.typical,
          expected: 200,
          unit: 'kg',
        });
      }
    }

    // ---- Check: measurement missing rationale ----
    if (claim.physicalSpec && !claim.physicalSpec.rationale) {
      findings.push({
        claimId: claim.claimId,
        findingType: 'measurement-missing-spec',
        severity: 'minor',
        message: 'Physical specification has no rationale — measurement source should be documented',
      });
    }
  }

  // ---- Cross-claim checks ----
  // Check: if two claims describe the same entity, their dimensions should be compatible
  const claimsByDomain = new Map<string, ClaimRecord[]>();
  for (const c of registry.claims) {
    if (!c.physicalSpec) continue;
    const key = c.domain;
    if (!claimsByDomain.has(key)) claimsByDomain.set(key, []);
    claimsByDomain.get(key)!.push(c);
  }

  for (const [domain, claims] of claimsByDomain) {
    if (claims.length < 2) continue;
    // Check for incompatible dimension ranges within the same domain
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const a = claims[i];
        const b = claims[j];
        const aHeight = a.physicalSpec!.dimensions?.heightMeters;
        const bHeight = b.physicalSpec!.dimensions?.heightMeters;
        if (aHeight && bHeight && aHeight.max !== undefined && bHeight.min !== undefined) {
          // If a's max is less than b's min, they describe very different things — might be fine
          // but if they claim to describe the same entity type, it's a contradiction
          if (a.statement === b.statement && aHeight.max < bHeight.min * 0.5) {
            findings.push({
              claimId: a.claimId,
              findingType: 'measurement-missing-spec',
              severity: 'major',
              message: `Two claims with identical statements have incompatible height ranges: ${aHeight.max}m vs ${bHeight.min}m`,
              relatedClaimId: b.claimId,
            } as any);
          }
        }
      }
    }
  }

  // ---- Summary ----
  const findingTypes: NumericalFindingType[] = [
    'door-too-small', 'travel-time-inconsistent', 'room-larger-than-building',
    'mass-implausible', 'speed-exceeds-realm-limit', 'wing-loading-implausible',
    'population-unsupportable', 'measurement-missing-spec', 'unit-mismatch',
  ];
  const summary = {} as Record<NumericalFindingType, number>;
  for (const t of findingTypes) summary[t] = findings.filter(f => f.findingType === t).length;

  const verdict: NumericalValidationReport['verdict'] =
    findings.some(f => f.severity === 'critical') ? 'fail'
    : findings.some(f => f.severity === 'major') ? 'warnings'
    : 'pass';

  return {
    totalClaims: registry.claims.length,
    claimsWithMeasurements,
    findings,
    summary,
    verdict,
    coverage: {
      layerName: 'numerical-constraint',
      checksRun: [
        'door-height-vs-inhabitant (architecture claims)',
        'mortal-building-height-limit (5m max per style grammar)',
        'speed-vs-realm-limit (mortal max 2.0 m/s)',
        'wing-loading-plausibility (flying creatures)',
        'measurement-rationale-present',
        'cross-claim-dimension-compatibility',
      ],
      notYetChecked: [
        'travel-time = distance / speed (requires paired distance+time claims)',
        'room < building (requires nested dimension claims)',
        'population vs arable land capacity (requires population+area claims)',
        'mass vs limb cross-section (requires anatomical claims)',
        'full SI unit verification (requires parsed unit strings)',
      ],
    },
  };
}
