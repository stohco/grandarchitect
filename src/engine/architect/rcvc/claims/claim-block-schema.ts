/**
 * Canonical Structured Claim-Block Schema
 *
 * The claim-block format that bible documents should use to define claims
 * deterministically. The extractor parses these blocks — it does NOT
 * invent claims from prose.
 *
 * Format (YAML front-matter style in markdown):
 *
 *   ```claim
 *   id: claim.architecture.mortal-house.max-height
 *   revision: 1
 *   truthLevel: derived
 *   statement: >
 *     Ordinary one-story mortal household structures in the Cangli
 *     Riverlands usually remain below five meters total height.
 *   domain: architecture
 *   scope:
 *     cultures: [cangli-riverlands]
 *     regions: [temperate-river-valleys]
 *     eras: [current-era]
 *     species: [ordinary-human]
 *   provenance:
 *     type: user-approved-design
 *     sourceDocument: 04_MORTAL_SUBSTRATE.md
 *     sourceSection: household-architecture
 *     sourceRange: [lineStart, lineEnd]
 *   confidence: 0.9
 *   approvalStatus: candidate
 *   dependencies:
 *     - claim.species.human.average-height
 *     - claim.architecture.floor-height.mortal
 *   contradictions: []
 *   exceptions:
 *     - ceremonial-buildings
 *     - fortified-manors
 *   numericalConstraints:
 *     - property: heightMeters
 *       operator: <=
 *       value: 5
 *       unit: m
 *   affectedCapabilities: [renderer, physics, navigation]
 *   validationEvidence: []
 *   ```
 *
 * No forbidden functions. No Three.js, no DOM.
 */

// ============================================================================
// Scope — claims are only valid within their scope
// ============================================================================

export interface ClaimScope {
  cultures?: string[];        // e.g. ['cangli-riverlands', 'northern-cloud']
  regions?: string[];         // e.g. ['temperate-river-valleys']
  eras?: string[];            // e.g. ['current-era', 'ancient-dynasty']
  species?: string[];         // e.g. ['ordinary-human', 'spirit-beast-minor']
  realms?: string[];          // cultivation realms: ['mortal', 'qi-condensation', ...]
  biomes?: string[];          // e.g. ['paddy', 'forest', 'mountain']
  contexts?: string[];        // free-form context tags
}

// ============================================================================
// Provenance — how the claim's truth was established
// ============================================================================

export interface ClaimProvenance {
  type: 'user-approved' | 'logically-derived' | 'art-directed' | 'procedural' | 'unresolved' | 'script-inserted' | 'inferred' | 'generated';
  sourceDocument?: string;
  sourceSection?: string;
  sourceRange?: [number, number];   // line range in source doc
  sourceHash?: string;              // hash of source text at extraction time
  extractedAt?: string;             // ISO timestamp
  extractorVersion?: string;
  // For generated claims:
  modelId?: string;
  modelVersion?: string;
  promptHash?: string;
  generatedAt?: string;
  // For inferred claims:
  inferenceRule?: string;
  premises?: string[];              // claim IDs this was inferred from
}

// ============================================================================
// Numerical constraint — sourced from the claim, not hardcoded
// ============================================================================

export interface NumericalConstraint {
  ruleId?: string;
  property: string;                 // e.g. 'heightMeters', 'speedMetersPerSecond'
  operator: '<=' | '<' | '>=' | '>' | '==' | '!=' | 'in-range';
  value?: number;
  minValue?: number;
  maxValue?: number;
  unit: string;                     // e.g. 'm', 'm/s', 'kg'
  sourceClaimId?: string;           // which claim established this constraint
  exceptions?: string[];            // named exceptions where this doesn't apply
}

// ============================================================================
// Claim relations — 12 edge types for the semantic graph
// ============================================================================

export type ClaimRelationType =
  | 'DEPENDS_ON'          // claim cannot be true without the related claim
  | 'DERIVED_FROM'        // claim logically follows from the related claim
  | 'SUPPORTS'            // related claim provides evidence for this claim
  | 'CONTRADICTS'         // claim and related claim cannot both be true in same scope
  | 'EXCEPTION_TO'        // claim is an exception to the related claim's rule
  | 'SUPERSEDES'          // claim replaces the related claim (versioning)
  | 'REFINES'             // claim is a more precise version of the related claim
  | 'APPLIES_WITHIN'      // claim is only valid within the related claim's scope
  | 'INVALID_OUTSIDE'     // claim is invalid outside the related claim's scope
  | 'REQUIRES_CAPABILITY' // claim requires an engine capability to be enforced
  | 'VALIDATED_BY'        // claim is validated by the related test/oracle
  | 'IMPLEMENTED_BY';     // claim is implemented by the related engine module

export interface ClaimRelation {
  type: ClaimRelationType;
  targetClaimId: string;
  scope?: ClaimScope;     // relation may be scope-specific
  note?: string;
}

// ============================================================================
// Approval record — human review workflow
// ============================================================================

export interface ClaimApproval {
  decision: 'approved' | 'rejected' | 'needs-revision';
  actorId: string;
  actorType: 'user' | 'authorized-reviewer';
  timestamp: string;
  claimRevisionHash: string;        // hash of claim text at approval time
  comment?: string;
  // If claim text changes after approval, approval becomes stale
}

// ============================================================================
// Canonical Claim Block — the full structured claim
// ============================================================================

export interface ClaimBlock {
  // Identity
  id: string;                       // stable, dotted: claim.domain.subject.property
  revision: number;                 // incremented on each change

  // Classification
  truthLevel: 'CANON' | 'DERIVED' | 'ART' | 'PROC' | 'UNRESOLVED';
  domain: string;
  statement: string;                // exact claim text

  // Scope — where does this claim apply?
  scope: ClaimScope;

  // Provenance — how was this established?
  provenance: ClaimProvenance;

  // Confidence
  confidence: number;               // 0..1

  // Approval
  approvalStatus: 'approved' | 'candidate' | 'rejected' | 'blocked';
  approvalRecord?: ClaimApproval;

  // Relations (12 types)
  relations: ClaimRelation[];

  // Numerical constraints sourced from this claim
  numericalConstraints: NumericalConstraint[];

  // Engine impact
  affectedCapabilities: string[];
  validationEvidence: string[];     // test/oracle IDs that validate this claim

  // Metadata
  createdAt: string;
  lastModified: string;
  claimHash: string;                // hash of statement+scope+constraints — changes invalidate approval
}

// ============================================================================
// Claim block parser — parses ```claim blocks from markdown
// ============================================================================

import { createHash } from 'crypto';

/**
 * Parse claim blocks from a markdown document.
 * Looks for ```claim ... ``` fenced code blocks containing YAML-like content.
 */
export function parseClaimBlocks(content: string, sourceDoc: string): ClaimBlock[] {
  const blocks: ClaimBlock[] = [];
  const claimBlockRegex = /```claim\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = claimBlockRegex.exec(content)) !== null) {
    const blockText = match[1];
    try {
      const parsed = parseSimpleYaml(blockText);
      const block = yamlToClaimBlock(parsed, sourceDoc);
      if (block) blocks.push(block);
    } catch {
      // Skip unparseable blocks
    }
  }

  return blocks;
}

/**
 * Simple YAML-ish parser (not a full YAML parser, but handles the claim-block format).
 * Parses key: value and key: [list] and nested objects.
 */
function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split('\n');
  let currentKey = '';
  let currentObj: Record<string, unknown> | null = null;
  let currentList: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // List item
    if (trimmed.startsWith('- ') && currentList) {
      currentList.push(trimmed.slice(2).trim());
      continue;
    }

    // Key: value
    const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value === '') {
        // Could be a nested object or list
        currentKey = key;
        currentObj = {};
        currentList = [];
        result[key] = currentObj;
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline list: [a, b, c]
        result[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
        currentList = null;
        currentObj = null;
      } else {
        // Scalar value
        result[key] = value.replace(/^['"]|['"]$/g, '');
        currentList = null;
        currentObj = null;
      }
    }
  }

  return result;
}

function yamlToClaimBlock(yaml: Record<string, unknown>, sourceDoc: string): ClaimBlock | null {
  const id = yaml.id as string;
  if (!id) return null;

  const statement = (yaml.statement as string || '').trim().replace(/^>\s*/, '');
  const truthLevel = (yaml.truthLevel as string || 'DERIVED') as ClaimBlock['truthLevel'];
  const domain = (yaml.domain as string || 'other');
  const confidence = parseFloat(yaml.confidence as string || '0.5');
  const approvalStatus = (yaml.approvalStatus as string || 'candidate') as ClaimBlock['approvalStatus'];
  const revision = parseInt(yaml.revision as string || '1', 10);

  const claimHash = createHash('sha256')
    .update(id + statement + JSON.stringify(yaml.scope || {}) + JSON.stringify(yaml.numericalConstraints || []))
    .digest('hex');

  return {
    id,
    revision,
    truthLevel,
    domain,
    statement,
    scope: (yaml.scope as ClaimScope) || {},
    provenance: {
      type: ((yaml.provenance as any)?.type || 'script-inserted') as ClaimProvenance['type'],
      sourceDocument: sourceDoc,
      sourceSection: (yaml.provenance as any)?.sourceSection,
    },
    confidence,
    approvalStatus,
    relations: [],
    numericalConstraints: [],
    affectedCapabilities: (yaml.affectedCapabilities as string[]) || [],
    validationEvidence: [],
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    claimHash,
  };
}

// ============================================================================
// Scope-aware contradiction check
// ============================================================================

/**
 * Two claims can both be correct if they apply in different scopes.
 * Example: "Northern Cloud doors average 3.4m" and "Cangli doors average 2.1m"
 * are NOT contradictory because they apply to different cultures.
 */
export function claimsAreScopeCompatible(a: ClaimScope, b: ClaimScope): boolean {
  // If both specify cultures and they don't overlap, they're compatible (different scope)
  if (a.cultures && b.cultures && a.cultures.length > 0 && b.cultures.length > 0) {
    const overlap = a.cultures.some(c => b.cultures!.includes(c));
    if (!overlap) return false; // different cultures = not in same scope = compatible
  }
  if (a.regions && b.regions && a.regions.length > 0 && b.regions.length > 0) {
    const overlap = a.regions.some(r => b.regions!.includes(r));
    if (!overlap) return false;
  }
  if (a.eras && b.eras && a.eras.length > 0 && b.eras.length > 0) {
    const overlap = a.eras.some(e => b.eras!.includes(e));
    if (!overlap) return false;
  }
  if (a.species && b.species && a.species.length > 0 && b.species.length > 0) {
    const overlap = a.species.some(s => b.species!.includes(s));
    if (!overlap) return false;
  }
  return true; // scopes overlap or one is unspecified
}
