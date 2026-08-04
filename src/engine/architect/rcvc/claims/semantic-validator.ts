/**
 * Semantic Graph Validator — cross-claim relationship checking
 *
 * This is the second validation layer (after claim-level-structural).
 * It checks relationships BETWEEN claims:
 *   - dependency cycles (circular dependencies)
 *   - missing dependencies (referencing non-existent claim IDs)
 *   - domain compatibility (e.g. a combat claim shouldn't depend on an economy claim
 *     unless there's an explicit cross-domain link)
 *   - truth-level consistency (a [CANON] claim shouldn't depend on an [UNRESOLVED] claim)
 *   - contradiction detection (claims that explicitly list each other in contradictions[])
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { ClaimRecord, ClaimRegistry } from './schema';

// ============================================================================
// Types
// ============================================================================

export interface SemanticFinding {
  claimId: string;
  findingType: SemanticFindingType;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  relatedClaimId?: string;
}

export type SemanticFindingType =
  | 'circular-dependency'
  | 'missing-dependency'
  | 'truth-level-inconsistency'
  | 'explicit-contradiction'
  | 'orphan-claim'
  | 'domain-mismatch';

export interface SemanticValidationReport {
  totalClaims: number;
  findings: SemanticFinding[];
  summary: {
    circularDependencies: number;
    missingDependencies: number;
    truthLevelInconsistencies: number;
    explicitContradictions: number;
    orphanClaims: number;
    domainMismatches: number;
  };
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

const TRUTH_LEVEL_RANK: Record<string, number> = {
  CANON: 1,
  DERIVED: 2,
  ART: 3,
  PROC: 4,
  UNRESOLVED: 5,
};

export function validateSemanticGraph(registry: ClaimRegistry): SemanticValidationReport {
  const findings: SemanticFinding[] = [];
  const claimMap = new Map<string, ClaimRecord>();
  for (const c of registry.claims) claimMap.set(c.claimId, c);

  // ---- Check 1: Missing dependencies ----
  for (const claim of registry.claims) {
    for (const depId of claim.dependencies) {
      if (!claimMap.has(depId)) {
        findings.push({
          claimId: claim.claimId,
          findingType: 'missing-dependency',
          severity: 'major',
          message: `Claim references non-existent dependency: ${depId}`,
          relatedClaimId: depId,
        });
      }
    }
  }

  // ---- Check 2: Circular dependencies (DFS cycle detection) ----
  const cycles = detectCycles(registry.claims);
  for (const cycle of cycles) {
    findings.push({
      claimId: cycle[0],
      findingType: 'circular-dependency',
      severity: 'critical',
      message: `Circular dependency detected: ${cycle.join(' → ')} → ${cycle[0]}`,
    });
  }

  // ---- Check 3: Truth-level consistency ----
  // A [CANON] claim should not depend on an [UNRESOLVED] claim
  // (you can't derive a canonical invariant from an unresolved question)
  for (const claim of registry.claims) {
    if (claim.truthLevel === 'CANON') {
      for (const depId of claim.dependencies) {
        const dep = claimMap.get(depId);
        if (dep && dep.truthLevel === 'UNRESOLVED') {
          findings.push({
            claimId: claim.claimId,
            findingType: 'truth-level-inconsistency',
            severity: 'critical',
            message: `[CANON] claim depends on [UNRESOLVED] claim ${depId} — a canonical invariant cannot rest on an unresolved question`,
            relatedClaimId: depId,
          });
        }
        // Also flag CANON depending on ART (art direction is not canonical)
        if (dep && dep.truthLevel === 'ART') {
          findings.push({
            claimId: claim.claimId,
            findingType: 'truth-level-inconsistency',
            severity: 'major',
            message: `[CANON] claim depends on [ART] claim ${depId} — a canonical invariant should not depend on an art-direction decision`,
            relatedClaimId: depId,
          });
        }
      }
    }
  }

  // ---- Check 4: Explicit contradictions ----
  for (const claim of registry.claims) {
    for (const contraId of claim.contradictions) {
      const contra = claimMap.get(contraId);
      if (contra) {
        // Check if the contradiction is mutual
        const isMutual = contra.contradictions.includes(claim.claimId);
        findings.push({
          claimId: claim.claimId,
          findingType: 'explicit-contradiction',
          severity: isMutual ? 'critical' : 'major',
          message: isMutual
            ? `Mutual contradiction with ${contraId} — both claims explicitly list each other`
            : `One-way contradiction with ${contraId} — ${contraId} does not list ${claim.claimId} as a contradiction`,
          relatedClaimId: contraId,
        });
      }
    }
  }

  // ---- Check 5: Orphan claims (nothing depends on them) ----
  const dependedUpon = new Set<string>();
  for (const claim of registry.claims) {
    for (const depId of claim.dependencies) dependedUpon.add(depId);
  }
  for (const claim of registry.claims) {
    if (!dependedUpon.has(claim.claimId) && claim.dependencies.length === 0) {
      // Only flag as minor — orphan claims aren't necessarily wrong, just potentially unused
      findings.push({
        claimId: claim.claimId,
        findingType: 'orphan-claim',
        severity: 'minor',
        message: 'Claim has no dependencies and nothing depends on it — may be unused or needs linking',
      });
    }
  }

  // ---- Check 6: Domain mismatch (a claim depending on a claim from an incompatible domain) ----
  // This is a soft check — cross-domain dependencies are allowed but worth flagging
  for (const claim of registry.claims) {
    for (const depId of claim.dependencies) {
      const dep = claimMap.get(depId);
      if (dep && dep.domain !== claim.domain) {
        // Only flag if the domains are very different (e.g. cosmology → combat is fine, but cosmology → engine might be wrong)
        const incompatiblePairs: Array<[string, string]> = [
          ['cosmology', 'engine'],
          ['narrative', 'physics'],
          ['character', 'measurement'],
        ];
        const isPair = incompatiblePairs.some(
          ([a, b]) =>
            (claim.domain === a && dep.domain === b) ||
            (claim.domain === b && dep.domain === a),
        );
        if (isPair) {
          findings.push({
            claimId: claim.claimId,
            findingType: 'domain-mismatch',
            severity: 'minor',
            message: `Cross-domain dependency: ${claim.domain} claim depends on ${dep.domain} claim ${depId}`,
            relatedClaimId: depId,
          });
        }
      }
    }
  }

  // ---- Summary ----
  const summary = {
    circularDependencies: findings.filter(f => f.findingType === 'circular-dependency').length,
    missingDependencies: findings.filter(f => f.findingType === 'missing-dependency').length,
    truthLevelInconsistencies: findings.filter(f => f.findingType === 'truth-level-inconsistency').length,
    explicitContradictions: findings.filter(f => f.findingType === 'explicit-contradiction').length,
    orphanClaims: findings.filter(f => f.findingType === 'orphan-claim').length,
    domainMismatches: findings.filter(f => f.findingType === 'domain-mismatch').length,
  };

  const verdict: SemanticValidationReport['verdict'] =
    findings.some(f => f.severity === 'critical') ? 'fail'
    : findings.some(f => f.severity === 'major') ? 'warnings'
    : 'pass';

  return {
    totalClaims: registry.claims.length,
    findings,
    summary,
    verdict,
    coverage: {
      layerName: 'semantic-graph',
      checksRun: [
        'circular-dependency (DFS cycle detection)',
        'missing-dependency (referenced claim IDs exist)',
        'truth-level-inconsistency (CANON depends on UNRESOLVED/ART)',
        'explicit-contradiction (mutual and one-way)',
        'orphan-claim (no dependencies, nothing depends on it)',
        'domain-mismatch (incompatible cross-domain dependencies)',
      ],
      notYetChecked: [
        'natural-language semantic similarity (AI review of statement meaning)',
        'numerical constraint satisfaction (measurements agree across claims)',
        'provenance verification (was the claim actually user-approved?)',
        'runtime compliance (does the engine actually enforce the claim?)',
      ],
    },
  };
}

// ============================================================================
// Cycle detection (DFS with coloring)
// ============================================================================

function detectCycles(claims: ClaimRecord[]): string[][] {
  const adj = new Map<string, string[]>();
  for (const c of claims) adj.set(c.claimId, c.dependencies);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const c of claims) color.set(c.claimId, WHITE);

  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): boolean {
    color.set(node, GRAY);
    path.push(node);

    const neighbors = adj.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!color.has(neighbor)) continue; // missing dependency — handled elsewhere
      const c = color.get(neighbor)!;
      if (c === GRAY) {
        // Found a cycle — extract it from the path
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycles.push(cycle);
        return true;
      }
      if (c === WHITE) {
        if (dfs(neighbor, path)) return true;
      }
    }

    path.pop();
    color.set(node, BLACK);
    return false;
  }

  for (const c of claims) {
    if (color.get(c.claimId) === WHITE) {
      dfs(c.claimId, []);
    }
  }

  return cycles;
}
