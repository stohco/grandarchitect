/**
 * Claim Extractor
 *
 * Scans bible documents and extracts candidate claim records.
 *
 * IMPORTANT: Every extracted claim is marked:
 *   - approvalStatus: 'candidate'
 *   - provenance: 'script-inserted'
 *   - createdBy: 'extractor-script'
 *
 * These are NOT validated ground truth. They are candidate records
 * that must be human-reviewed before being marked 'approved'.
 *
 * The extractor uses pattern matching to identify claims:
 *   - Lines starting with "> [CANON]", "> [DERIVED]", etc.
 *   - Sentences with canonical language ("must", "cannot", "always")
 *   - Physical specifications (JSON blocks with dimensions)
 *   - Forbidden interpretations ("[FORBIDDEN] ...")
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import { readFile, readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import type {
  ClaimRecord,
  ClaimRegistry,
  ClaimDomain,
  TruthLevel,
  BlockType,
  BlockMarker,
} from './schema';
import { computeSummary } from './schema';

const CORPUS_DIR = join(process.cwd(), 'corpus-extension');
const OUTPUT_DIR = join(process.cwd(), 'data', 'claims');

// ============================================================================
// Domain classification by doc number
// ============================================================================

const DOC_DOMAIN: Record<string, ClaimDomain> = {
  '00': 'governance',
  '03': 'cultivation',
  '04': 'geography',
  '05': 'cultivation',
  '06': 'narrative',
  '07': 'engine',
  '09': 'governance',
  '11': 'engine',
  '12': 'culture',
  '13': 'combat',
  '14': 'ecology',
  '15': 'cultivation',
  '16': 'formation',
  '17': 'engine',
  '18': 'economy',
  '19': 'cosmology',
  '20': 'cosmology',
  '21': 'physics',
  '22': 'engine',
  '23': 'engine',
  '24': 'governance',
  '25': 'culture',
  '26': 'narrative',
  '27': 'cultivation',
  '28': 'geography',
  '30': 'cultivation',
  '31': 'culture',
  '32': 'combat',
  '33': 'ecology',
  '34': 'character',
  '35': 'material',
  '36': 'cosmology',
  '37': 'history',
  '38': 'cosmology',
  '39': 'cosmology',
  '40': 'cosmology',
  '41': 'ecology',
  '42': 'geography',
  '43': 'culture',
  '44': 'cosmology',
  '45': 'cultivation',
  '46': 'history',
  '47': 'economy',
  '48': 'cosmology',
  '49': 'engine',
  '50': 'governance',
  '51': 'engine',
  '52': 'measurement',
  '53': 'culture',
  '54': 'engine',
  '55': 'combat',
};

// ============================================================================
// Block-type marker extraction
// ============================================================================

/**
 * Extract block-type markers from a document.
 * Looks for explicit markers and structural patterns.
 */
export function extractBlocks(filename: string, content: string): BlockMarker[] {
  const blocks: BlockMarker[] = [];
  const lines = content.split('\n');
  const docBase = filename.replace(/\.md$/, '');

  let currentSection: string | undefined;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        blocks.push({
          blockType: 'machine_readable',
          text: line,
          source: { doc: filename, section: currentSection },
        });
      }
      continue;
    }

    // Track sections
    const sectionMatch = line.match(/^##+\s+(.+)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
    }

    // Detect truth-level markers
    const truthMatch = line.match(/^>\s*\[(CANON|DERIVED|ART|PROC|UNRESOLVED)\]\s*(.+)/);
    if (truthMatch) {
      const level = truthMatch[1];
      const text = truthMatch[2].trim();
      blocks.push({
        blockType: level === 'UNRESOLVED' ? 'unresolved_question' : 'normative_claim',
        text,
        source: { doc: filename, section: currentSection },
      });
    }

    // Detect forbidden interpretations
    const forbiddenMatch = line.match(/\[FORBIDDEN\]\s*(.+)/);
    if (forbiddenMatch) {
      blocks.push({
        blockType: 'normative_claim',
        text: `[FORBIDDEN] ${forbiddenMatch[1].trim()}`,
        source: { doc: filename, section: currentSection },
      });
    }

    // Detect invalid examples (in spec docs)
    if (parseInt(docBase) >= 50 && line.match(/example|forbidden.*pattern|do not/i)) {
      blocks.push({
        blockType: 'invalid_example',
        text: line.trim(),
        source: { doc: filename, section: currentSection },
      });
    }
  }

  return blocks;
}

// ============================================================================
// Claim extraction
// ============================================================================

export async function extractClaims(): Promise<ClaimRegistry> {
  let files: string[];
  try {
    files = (await readdir(CORPUS_DIR)).filter(f => f.endsWith('.md'));
  } catch {
    return { version: '0.1.0', generatedAt: new Date().toISOString(), claims: [], summary: computeSummary([]) };
  }

  const claims: ClaimRecord[] = [];
  let claimCounter = 0;

  for (const filename of files) {
    const docNum = filename.match(/^(\d+)_/)?.[1] ?? '00';
    const domain = DOC_DOMAIN[docNum] ?? 'other';
    const content = await readFile(join(CORPUS_DIR, filename), 'utf-8');
    const blocks = extractBlocks(filename, content);

    let currentSection: string | undefined;

    for (const block of blocks) {
      if (block.blockType !== 'normative_claim' && block.blockType !== 'unresolved_question') continue;

      const truthLevel = block.blockType === 'unresolved_question'
        ? 'UNRESOLVED' as TruthLevel
        : inferTruthLevel(block.text);

      const claimId = `claim-${domain}-${shortHash(filename + block.text + claimCounter)}`;
      claimCounter++;

      claims.push({
        claimId,
        statement: block.text,
        truthLevel,
        approvalStatus: 'candidate',
        provenance: 'script-inserted',
        source: {
          doc: filename,
          section: block.source.section,
          surroundingText: block.text.slice(0, 200),
        },
        dependencies: [],
        contradictions: [],
        applicableSystems: inferSystems(block.text, domain),
        domain,
        tags: inferTags(block.text, domain),
        createdAt: new Date().toISOString(),
        createdBy: 'extractor-script',
      });
    }
  }

  const summary = computeSummary(claims);

  return {
    version: '0.1.0',
    generatedAt: new Date().toISOString(),
    claims,
    summary,
  };
}

// ============================================================================
// Inference helpers
// ============================================================================

function inferTruthLevel(text: string): TruthLevel {
  // If the text starts with a truth-level marker, use it
  const m = text.match(/^\[(CANON|DERIVED|ART|PROC|UNRESOLVED)\]/);
  if (m) return m[1] as TruthLevel;

  // Heuristics (conservative — default to DERIVED, not CANON)
  if (/must|cannot|never|always|exactly/i.test(text)) return 'DERIVED';
  if (/should|prefer|typically|usually/i.test(text)) return 'ART';
  if (/range|varies|may|can/i.test(text)) return 'PROC';
  return 'DERIVED';
}

function inferSystems(text: string, domain: ClaimDomain): string[] {
  const systems: string[] = [];
  const lower = text.toLowerCase();

  if (lower.match(/cultiv|qi|realm|dantian|meridian/)) systems.push('cultivation');
  if (lower.match(/combat|technique|sword|palm|strike/)) systems.push('combat');
  if (lower.match(/spirit|vein|ecology|beast|flora/)) systems.push('ecology');
  if (lower.match(/economy|trade|market|wealth|rice/)) systems.push('economy');
  if (lower.match(/build|architect|hall|temple|shrine/)) systems.push('architecture');
  if (lower.match(/world|continent|mountain|river|terrain/)) systems.push('geography');
  if (lower.match(/formation|talisman|alchemy/)) systems.push('formation');
  if (lower.match(/npc|character|sect|faction/)) systems.push('character');
  if (lower.match(/render|mesh|lod|material|texture/)) systems.push('renderer');
  if (lower.match(/physics|collision|gravity|force/)) systems.push('physics');
  if (lower.match(/animation|motion|speed|velocity/)) systems.push('animation');
  if (lower.match(/determinism|seed|random|tick/)) systems.push('determinism');

  if (systems.length === 0) systems.push(domain);
  return systems;
}

function inferTags(text: string, domain: ClaimDomain): string[] {
  const tags = [domain];
  const lower = text.toLowerCase();

  if (lower.includes('forbidden')) tags.push('forbidden-interpretation');
  if (lower.includes('measurement') || lower.includes('meters') || lower.includes('kg')) tags.push('measurement');
  if (lower.includes('scale') || lower.includes('height') || lower.includes('width')) tags.push('scale');
  if (lower.includes('motion') || lower.includes('speed') || lower.includes('velocity')) tags.push('motion');
  if (lower.includes('supernatural') || lower.includes('formation') || lower.includes('qi')) tags.push('supernatural');
  if (lower.includes('style') || lower.includes('grammar') || lower.includes('motif')) tags.push('style-grammar');

  return tags;
}

function shortHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 8);
}

// ============================================================================
// Claim-level validation
// ============================================================================

export function validateClaims(registry: ClaimRegistry): import('./schema').ClaimValidationReport {
  const findings: import('./schema').ClaimValidationFinding[] = [];
  const claimIds = new Set(registry.claims.map(c => c.claimId));

  for (const claim of registry.claims) {
    // Check: unsupported CANON (script-inserted, not approved)
    if (claim.truthLevel === 'CANON' && claim.provenance === 'script-inserted' && claim.approvalStatus !== 'approved') {
      findings.push({
        claimId: claim.claimId,
        findingType: 'unsupported-canon',
        severity: 'critical',
        message: `CANON claim "${claim.statement.slice(0, 60)}..." has script-inserted provenance and is not user-approved`,
        details: `Source: ${claim.source.doc}. This claim was generated by a batch script and must be audited.`,
      });
    }

    // Check: missing source
    if (!claim.source.doc) {
      findings.push({
        claimId: claim.claimId,
        findingType: 'missing-source',
        severity: 'major',
        message: `Claim has no source document`,
      });
    }

    // Check: missing dependencies
    for (const dep of claim.dependencies) {
      if (!claimIds.has(dep)) {
        findings.push({
          claimId: claim.claimId,
          findingType: 'missing-dependency',
          severity: 'major',
          message: `Claim references non-existent dependency: ${dep}`,
        });
      }
    }
  }

  // Check: contradictory claims (claims that explicitly list each other in contradictions[])
  for (const claim of registry.claims) {
    for (const contraId of claim.contradictions) {
      if (claimIds.has(contraId)) {
        findings.push({
          claimId: claim.claimId,
          findingType: 'contradictory-claims',
          severity: 'critical',
          message: `Claim explicitly contradicts ${contraId}`,
        });
      }
    }
  }

  const highRiskUnreviewed = registry.claims.filter(
    c => c.truthLevel === 'CANON' && c.provenance === 'script-inserted' && c.approvalStatus !== 'approved',
  ).length;

  const contradictoryClaims = findings.filter(f => f.findingType === 'contradictory-claims').length;
  const unsupportedCanon = findings.filter(f => f.findingType === 'unsupported-canon').length;
  const missingDependencies = findings.filter(f => f.findingType === 'missing-dependency').length;

  const verdict = findings.some(f => f.severity === 'critical') ? 'fail'
    : findings.some(f => f.severity === 'major') ? 'warnings'
    : 'pass';

  return {
    totalClaims: registry.claims.length,
    claimsReviewed: registry.claims.length,
    findings,
    summary: {
      highRiskUnreviewed,
      contradictoryClaims,
      unsupportedCanon,
      missingDependencies,
      orphanClaims: 0, // not computed in this pass
    },
    verdict,
    coverage: {
      layersImplemented: ['claim-level-structural (provenance, source, dependencies)'],
      layersNotImplemented: [
        'semantic-graph (cross-claim relationship validation)',
        'numerical-constraint (measurement consistency)',
        'natural-language-semantic (AI contradiction review)',
        'runtime (generation/asset/animation compliance)',
      ],
    },
  };
}

// ============================================================================
// CLI entry point
// ============================================================================

async function main() {
  console.log('Extracting claims from bible...');
  const registry = await extractClaims();
  console.log(`Extracted ${registry.claims.length} candidate claims`);

  console.log('\nValidation:');
  const report = validateClaims(registry);
  console.log(`  Verdict: ${report.verdict}`);
  console.log(`  High-risk unreviewed: ${report.summary.highRiskUnreviewed}`);
  console.log(`  Unsupported canon: ${report.summary.unsupportedCanon}`);

  // Write registry to data/claims/registry.json
  const outputPath = join(OUTPUT_DIR, 'registry.json');
  await writeFile(outputPath, JSON.stringify(registry, null, 2));
  console.log(`\nRegistry written to ${outputPath}`);

  // Write validation report
  const reportPath = join(OUTPUT_DIR, 'validation-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`Validation report written to ${reportPath}`);
}

// Run if called directly
if (process.argv[1]?.endsWith('extractor.ts') || process.argv[1]?.endsWith('extractor.mjs')) {
  main().catch(console.error);
}
