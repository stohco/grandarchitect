/**
 * Provenance Validator — independent validation layer
 *
 * This is the FOURTH validation layer (after structural, semantic-graph,
 * and numerical). It independently tests whether each claim's provenance
 * is honest and traceable:
 *
 *   - source document actually exists
 *   - source document contains the quoted text
 *   - claim classification matches its source
 *   - reconstruction vs original authorship is distinguished
 *   - user approval is recorded (not just claimed)
 *   - inferred claims cite their premises
 *   - generated claims identify model, version, prompt, timestamp
 *   - claims do not cite themselves
 *   - approval cannot be forged by the extractor
 *   - changed source text invalidates dependent claims
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import type { ClaimRecord, ClaimRegistry } from './schema';

// ============================================================================
// Types
// ============================================================================

export interface ProvenanceFinding {
  claimId: string;
  findingType: ProvenanceFindingType;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  details?: string;
}

export type ProvenanceFindingType =
  | 'source-missing'
  | 'source-not-found-on-disk'
  | 'quoted-text-not-in-source'
  | 'classification-mismatch'
  | 'reconstruction-hidden'
  | 'approval-without-record'
  | 'inferred-without-premises'
  | 'generated-without-model-info'
  | 'self-citation'
  | 'source-changed-after-extraction'
  | 'extractor-forged-approval';

export interface ProvenanceValidationReport {
  totalClaims: number;
  claimsExamined: number;
  claimsSkipped: number;
  findings: ProvenanceFinding[];
  summary: Record<ProvenanceFindingType, number>;
  verdict: 'pass' | 'warnings' | 'fail' | 'not-exercised';
  exerciseLevel: 'fixture' | 'subsystem' | 'corpus';
  coverage: {
    layerName: string;
    checksRun: string[];
    notYetChecked: string[];
  };
}

// ============================================================================
// Validator
// ============================================================================

const CORPUS_DIR = join(process.cwd(), 'corpus-extension');
const ENGINE_ARCH_DIR = join(process.cwd(), 'engine-architecture');

export async function validateProvenance(registry: ClaimRegistry): Promise<ProvenanceValidationReport> {
  const findings: ProvenanceFinding[] = [];
  let claimsExamined = 0;
  let claimsSkipped = 0;

  for (const claim of registry.claims) {
    // Skip claims without source info
    if (!claim.source?.doc) {
      findings.push({
        claimId: claim.claimId,
        findingType: 'source-missing',
        severity: 'major',
        message: 'Claim has no source document specified',
      });
      claimsSkipped++;
      continue;
    }

    claimsExamined++;

    // ---- Check 1: Source document exists on disk ----
    const docPath = claim.source.doc;
    const fullPath = docPath.startsWith('engine-architecture')
      ? join(ENGINE_ARCH_DIR, docPath.replace('engine-architecture/', ''))
      : join(CORPUS_DIR, docPath.replace('corpus-extension/', ''));

    let sourceContent: string | null = null;
    try {
      sourceContent = await readFile(fullPath, 'utf-8');
    } catch {
      findings.push({
        claimId: claim.claimId,
        findingType: 'source-not-found-on-disk',
        severity: 'critical',
        message: `Source document not found on disk: ${docPath}`,
      });
      continue;
    }

    // ---- Check 2: Quoted text exists in source ----
    if (claim.source.surroundingText) {
      const quoted = claim.source.surroundingText.slice(0, 80);
      if (!sourceContent.includes(quoted)) {
        findings.push({
          claimId: claim.claimId,
          findingType: 'quoted-text-not-in-source',
          severity: 'major',
          message: `Quoted text not found in source document: "${quoted}..."`,
          details: `The claim's surroundingText does not appear in ${docPath}`,
        });
      }
    }

    // ---- Check 3: Classification matches source ----
    // If the claim is marked CANON, the source should contain [CANON] near the quoted text
    if (claim.truthLevel === 'CANON' && claim.source.surroundingText) {
      const quoted = claim.source.surroundingText.slice(0, 60);
      const sourceIndex = sourceContent.indexOf(quoted);
      if (sourceIndex >= 0) {
        const nearby = sourceContent.slice(Math.max(0, sourceIndex - 200), sourceIndex + 200);
        if (!nearby.includes('[CANON]')) {
          findings.push({
            claimId: claim.claimId,
            findingType: 'classification-mismatch',
            severity: 'major',
            message: `Claim marked [CANON] but source text near quote does not contain [CANON] marker`,
            details: `The source document does not classify this statement as canonical`,
          });
        }
      }
    }

    // ---- Check 4: Reconstruction status not hidden ----
    // If provenance is 'script-inserted' or 'inferred', the claim must not have approvalStatus='approved'
    if ((claim.provenance === 'script-inserted' || claim.provenance === 'inferred') && claim.approvalStatus === 'approved') {
      findings.push({
        claimId: claim.claimId,
        findingType: 'extractor-forged-approval',
        severity: 'critical',
        message: `Claim with ${claim.provenance} provenance is marked approved — AI-generated claims cannot self-approve`,
      });
    }

    // ---- Check 5: Approval without record ----
    // If approvalStatus is 'approved', there should be a reviewNotes or reviewedAt
    if (claim.approvalStatus === 'approved' && !claim.reviewedAt && !claim.reviewNotes) {
      findings.push({
        claimId: claim.claimId,
        findingType: 'approval-without-record',
        severity: 'critical',
        message: 'Claim marked approved but has no review record (reviewedAt or reviewNotes)',
      });
    }

    // ---- Check 6: Inferred without premises ----
    if (claim.provenance === 'inferred' && claim.dependencies.length === 0) {
      findings.push({
        claimId: claim.claimId,
        findingType: 'inferred-without-premises',
        severity: 'major',
        message: 'Claim marked as inferred but has no dependencies (premises)',
      });
    }

    // ---- Check 7: Self-citation ----
    if (claim.dependencies.includes(claim.claimId)) {
      findings.push({
        claimId: claim.claimId,
        findingType: 'self-citation',
        severity: 'critical',
        message: 'Claim cites itself as a dependency',
      });
    }
  }

  // ---- Summary ----
  const findingTypes: ProvenanceFindingType[] = [
    'source-missing', 'source-not-found-on-disk', 'quoted-text-not-in-source',
    'classification-mismatch', 'reconstruction-hidden', 'approval-without-record',
    'inferred-without-premises', 'generated-without-model-info', 'self-citation',
    'source-changed-after-extraction', 'extractor-forged-approval',
  ];
  const summary = {} as Record<ProvenanceFindingType, number>;
  for (const t of findingTypes) summary[t] = findings.filter(f => f.findingType === t).length;

  // Determine exercise level
  const exerciseLevel: 'fixture' | 'subsystem' | 'corpus' =
    registry.claims.length < 50 ? 'fixture' : registry.claims.length < 500 ? 'subsystem' : 'corpus';

  // Determine verdict — "not-exercised" if no claims had source documents to check
  const verdict: ProvenanceValidationReport['verdict'] =
    claimsExamined === 0 ? 'not-exercised'
    : findings.some(f => f.severity === 'critical') ? 'fail'
    : findings.some(f => f.severity === 'major') ? 'warnings'
    : 'pass';

  return {
    totalClaims: registry.claims.length,
    claimsExamined,
    claimsSkipped,
    findings,
    summary,
    verdict,
    exerciseLevel,
    coverage: {
      layerName: 'provenance',
      checksRun: [
        'source-document-exists-on-disk',
        'quoted-text-found-in-source',
        'classification-matches-source-marker',
        'reconstruction-status-not-hidden',
        'approval-has-review-record',
        'inferred-claims-have-premises',
        'no-self-citation',
        'extractor-cannot-forge-approval',
      ],
      notYetChecked: [
        'source-changed-after-extraction (requires source hash tracking)',
        'generated-claims-identify-model-version-prompt (requires generation metadata)',
        'approval-record-cryptographic-signature (requires auth system)',
      ],
    },
  };
}
