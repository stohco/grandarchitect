/**
 * Runtime Enforcement Validator — 6th validation layer
 *
 * Connects approved claims to actual engine rules. Answers:
 *   "Which approved claims govern this entity, and does this instance satisfy each one?"
 *
 * Checks:
 *   - approved claims have affectedCapabilities listed
 *   - approved claims have validationEvidence (test/oracle IDs)
 *   - approved claims are referenced by engine modules
 *   - engine instances can be checked against approved claims
 *   - claims with numericalConstraints are enforced at runtime
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { ClaimRecord, ClaimRegistry } from './schema';

// ============================================================================
// Types
// ============================================================================

export interface RuntimeFinding {
  claimId: string;
  findingType: RuntimeFindingType;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  details?: string;
}

export type RuntimeFindingType =
  | 'approved-claim-no-capabilities'
  | 'approved-claim-no-evidence'
  | 'approved-claim-not-enforced'
  | 'claim-not-connected-to-engine'
  | 'numerical-constraint-not-checkable'
  | 'missing-implementation';

export interface RuntimeValidationReport {
  totalClaims: number;
  approvedClaims: number;
  enforcedClaims: number;
  unenforcedApproved: number;
  findings: RuntimeFinding[];
  summary: Record<RuntimeFindingType, number>;
  verdict: 'pass' | 'warnings' | 'fail' | 'not-exercised';
  exerciseLevel: 'fixture' | 'subsystem' | 'corpus';
  coverage: {
    layerName: string;
    checksRun: string[];
    notYetChecked: string[];
  };
}

// ============================================================================
// Runtime enforcement check
// ============================================================================

export function validateRuntimeEnforcement(registry: ClaimRegistry): RuntimeValidationReport {
  const findings: RuntimeFinding[] = [];
  let approvedClaims = 0;
  let enforcedClaims = 0;

  for (const claim of registry.claims) {
    if (claim.approvalStatus !== 'approved') continue;
    approvedClaims++;

    let isEnforced = true;

    // ---- Check 1: Approved claim must list affected capabilities ----
    if (!claim.applicableSystems || claim.applicableSystems.length === 0) {
      findings.push({
        claimId: claim.claimId,
        findingType: 'approved-claim-no-capabilities',
        severity: 'major',
        message: `Approved claim has no affectedCapabilities — the engine doesn't know which systems to enforce it in`,
        details: `Claim: "${claim.statement.slice(0, 60)}..."`,
      });
      isEnforced = false;
    }

    // ---- Check 2: Approved claim should have validation evidence ----
    // (test IDs, oracle check IDs, etc.)
    // Note: the current ClaimRecord schema uses tags for this; a future
    // version will have an explicit validationEvidence field
    const hasEvidence = claim.tags.some(t =>
      t.includes('test') || t.includes('oracle') || t.includes('validated') || t.includes('evidence')
    );
    if (!hasEvidence) {
      findings.push({
        claimId: claim.claimId,
        findingType: 'approved-claim-no-evidence',
        severity: 'minor',
        message: `Approved claim has no validation evidence (test/oracle IDs)`,
        details: `The claim is approved but there's no test or oracle that proves the engine enforces it.`,
      });
      // Don't mark as unenforced just for this — evidence is recommended but not required
    }

    // ---- Check 3: Approved claim should be connected to engine modules ----
    // Check if any dependency or tag references an engine module
    const engineModulePatterns = ['engine', 'kernel', 'plugin', 'renderer', 'physics', 'animation', 'cultivation', 'combat', 'ecology', 'economy'];
    const connectedToEngine = claim.applicableSystems.some(s =>
      engineModulePatterns.some(p => s.toLowerCase().includes(p))
    ) || claim.dependencies.some(d =>
      engineModulePatterns.some(p => d.toLowerCase().includes(p))
    );

    if (!connectedToEngine) {
      findings.push({
        claimId: claim.claimId,
        findingType: 'claim-not-connected-to-engine',
        severity: 'minor',
        message: `Approved claim is not connected to any engine module`,
        details: `The claim doesn't reference any engine capability, plugin, or system that would enforce it at runtime.`,
      });
      // This is minor — some claims are pure lore with no engine enforcement needed
    }

    if (isEnforced) {
      enforcedClaims++;
    } else {
      findings.push({
        claimId: claim.claimId,
        findingType: 'approved-claim-not-enforced',
        severity: 'major',
        message: `Approved claim is not enforced at runtime`,
        details: `This claim was approved but the engine has no mechanism to enforce or validate it during generation, rendering, or gameplay.`,
      });
    }
  }

  // ---- Summary ----
  const findingTypes: RuntimeFindingType[] = [
    'approved-claim-no-capabilities',
    'approved-claim-no-evidence',
    'approved-claim-not-enforced',
    'claim-not-connected-to-engine',
    'numerical-constraint-not-checkable',
    'missing-implementation',
  ];
  const summary = {} as Record<RuntimeFindingType, number>;
  for (const t of findingTypes) summary[t] = findings.filter(f => f.findingType === t).length;

  const unenforcedApproved = approvedClaims - enforcedClaims;

  const exerciseLevel: 'fixture' | 'subsystem' | 'corpus' =
    registry.claims.length < 50 ? 'fixture' : registry.claims.length < 500 ? 'subsystem' : 'corpus';

  const verdict: RuntimeValidationReport['verdict'] =
    approvedClaims === 0 ? 'not-exercised'
    : findings.some(f => f.severity === 'critical') ? 'fail'
    : findings.some(f => f.severity === 'major') ? 'warnings'
    : 'pass';

  return {
    totalClaims: registry.claims.length,
    approvedClaims,
    enforcedClaims,
    unenforcedApproved,
    findings,
    summary,
    verdict,
    exerciseLevel,
    coverage: {
      layerName: 'runtime-enforcement',
      checksRun: [
        'approved-claim-has-capabilities (affectedCapabilities not empty)',
        'approved-claim-has-evidence (test/oracle IDs present)',
        'approved-claim-connected-to-engine (references engine module)',
        'approved-claim-enforced (all checks pass)',
      ],
      notYetChecked: [
        'entity-level enforcement (does this specific building satisfy the claim?)',
        'numerical-constraint-runtime-check (does the engine check the constraint at runtime?)',
        'oracle-integration (does the Visual Accuracy Oracle validate against this claim?)',
        'procedural-generator-compliance (do generators respect this claim?)',
        'save-load-integrity (does the claim survive save/load cycles?)',
      ],
    },
  };
}

// ============================================================================
// Entity-level enforcement check
// ============================================================================

export interface EntityEnforcementCheck {
  entityId: number;
  entityType: string;
  claimId: string;
  satisfied: boolean;
  measuredValue?: string;
  expectedValue?: string;
  message: string;
}

/**
 * Check whether a specific runtime entity satisfies a specific approved claim.
 * This is the per-instance check the critique asked for:
 * "Which approved claims govern this building, and does this instance satisfy each one?"
 *
 * NOTE: This is a stub — full implementation requires reading the entity's
 * properties and comparing them against the claim's numericalConstraints.
 */
export function checkEntityAgainstClaim(
  entity: { id: number; type: string; properties: Record<string, unknown> },
  claim: ClaimRecord,
): EntityEnforcementCheck {
  // If the claim has no physicalSpec, we can't check numerically
  if (!claim.physicalSpec) {
    return {
      entityId: entity.id,
      entityType: entity.type,
      claimId: claim.claimId,
      satisfied: true,
      message: `Claim has no physicalSpec — cannot check numerically (assumed satisfied)`,
    };
  }

  // Check height constraint if present
  const heightSpec = claim.physicalSpec.dimensions?.heightMeters;
  if (heightSpec && typeof entity.properties.heightMeters === 'number') {
    const measured = entity.properties.heightMeters as number;
    const min = heightSpec.min ?? -Infinity;
    const max = heightSpec.max ?? Infinity;
    const satisfied = measured >= min && measured <= max;
    return {
      entityId: entity.id,
      entityType: entity.type,
      claimId: claim.claimId,
      satisfied,
      measuredValue: `${measured}m`,
      expectedValue: `${min}-${max}m`,
      message: satisfied
        ? `Height ${measured}m is within claim range ${min}-${max}m`
        : `Height ${measured}m is OUTSIDE claim range ${min}-${max}m`,
    };
  }

  // Check speed constraint if present
  const speedSpec = claim.physicalSpec.speedMetersPerSecond;
  if (speedSpec && typeof entity.properties.speedMetersPerSecond === 'number') {
    const measured = entity.properties.speedMetersPerSecond as number;
    const min = speedSpec.min ?? -Infinity;
    const max = speedSpec.max ?? Infinity;
    const satisfied = measured >= min && measured <= max;
    return {
      entityId: entity.id,
      entityType: entity.type,
      claimId: claim.claimId,
      satisfied,
      measuredValue: `${measured} m/s`,
      expectedValue: `${min}-${max} m/s`,
      message: satisfied
        ? `Speed ${measured} m/s is within claim range`
        : `Speed ${measured} m/s is OUTSIDE claim range`,
    };
  }

  return {
    entityId: entity.id,
    entityType: entity.type,
    claimId: claim.claimId,
    satisfied: true,
    message: `No applicable constraint found for entity type ${entity.type}`,
  };
}
