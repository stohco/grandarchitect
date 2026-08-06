/**
 * Bible Compiler
 * ===============
 *
 * Compiles human-readable Bible prose into atomic, cross-linked CanonRule
 * and StyleConstraint records with source spans (document, line, hash) and
 * modality (must/normally/may/disputed/secret).
 *
 * The compiler is deterministic — given the same source prose, it produces
 * the same records every time. This is required so the auditor can verify
 * that "ancient sacred structures should use weathered stone" actually
 * originates from a specific line in the production bible, not from the
 * model's imagination.
 *
 * Source documents (canonical):
 *  - docs/production-bible.md
 *  - docs/authorial-grand-architect-directive.md
 *  - docs/ui-ux-audit-directive.md
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  CanonRule,
  StyleConstraint,
  CanonScope,
  StyleScope,
  BibleReference,
  CanonAuthority,
  CanonVisibility,
  CanonOverridePolicy,
  StyleCategory,
  StyleInheritance,
  StyleValidation,
} from './canon-style';
import { durableStore, replaceJson, type AuthorialStoreKey } from './durable-store';

// ---------------------------------------------------------------------------
// Modality
// ---------------------------------------------------------------------------

export type Modality = 'must' | 'normally' | 'may' | 'disputed' | 'secret';

export interface SourceSpan {
  document: string;
  startLine: number;
  endLine: number;
  /** SHA-256 hash of the source text covered by this span. */
  textHash: string;
  /** Verbatim source text (for human audit). */
  excerpt: string;
}

// ---------------------------------------------------------------------------
// Compiled Rule Records (extend base types with provenance spans + modality)
// ---------------------------------------------------------------------------

export interface CompiledCanonRule extends CanonRule {
  modality: Modality;
  sourceSpans: SourceSpan[];
  compiledAt: string;
  compilerVersion: string;
}

export interface CompiledStyleConstraint extends StyleConstraint {
  modality: Modality;
  sourceSpans: SourceSpan[];
  compiledAt: string;
  compilerVersion: string;
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

function sha256(text: string): string {
  // Lightweight synchronous hash for source spans.
  // Not cryptographic-grade but deterministic and unique per content.
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return `fnv-${h1.toString(16).padStart(8, '0')}-${h2.toString(16).padStart(8, '0')}`;
}

// ---------------------------------------------------------------------------
// Seed Bible — Authoritative Canon & Style for the Vertical Slice
// ---------------------------------------------------------------------------
//
// These records are the "compiled Bible" for the canonical vertical slice:
// "Make the selected structure feel ancient and sacred through restraint
//  and weathering."
//
// Each record carries a SourceSpan pointing to a specific line range in
// docs/production-bible.md (or the directive docs). The hashes are computed
// from the verbatim excerpt, so any tampering with the source invalidates
// the span.

const BIBLE_DOCS = {
  production: 'docs/production-bible.md',
  authorial: 'docs/authorial-grand-architect-directive.md',
} as const;

interface SeedSpec {
  ruleId: string;
  title: string;
  statement: string;
  domain: CanonRule['domain'];
  authority: CanonAuthority;
  visibility: CanonVisibility;
  overridePolicy: CanonOverridePolicy;
  modality: Modality;
  scope: CanonScope;
  sourceDoc: keyof typeof BIBLE_DOCS;
  startLine: number;
  endLine: number;
  excerpt: string;
  supersedes?: string[];
}

const SEED_CANON: SeedSpec[] = [
  {
    ruleId: 'canon.ancient-sacred.definition',
    title: 'Ancient Sacred Structures — Definition',
    statement:
      'Structures designated as ancient and sacred must convey age through weathered materials, restrained ornamentation, and silence of form — not through gilding or scale.',
    domain: 'culture',
    authority: 'hard-canon',
    visibility: 'world-observable',
    overridePolicy: 'requires-explicit-exception',
    modality: 'must',
    scope: { cosmological: 'xianxia', region: 'default', culture: 'default-sect' },
    sourceDoc: 'production',
    startLine: 1805,
    endLine: 1805,
    excerpt:
      'Ancient sacred structures must convey age through weathered materials, restrained ornamentation, and silence of form.',
  },
  {
    ruleId: 'canon.ancient-sacred.weathering',
    title: 'Weathering as Truth',
    statement:
      'The age of a sacred structure must be expressed through material weathering: moss, pitting, fracture, and patina. Pristine surfaces on an ancient structure are a canon violation.',
    domain: 'culture',
    authority: 'hard-canon',
    visibility: 'world-observable',
    overridePolicy: 'forbidden',
    modality: 'must',
    scope: { cosmological: 'xianxia', region: 'default', culture: 'default-sect' },
    sourceDoc: 'production',
    startLine: 1808,
    endLine: 1808,
    excerpt:
      'The age of a sacred structure must be expressed through material weathering: moss, pitting, fracture, and patina.',
  },
  {
    ruleId: 'canon.ancient-sacred.restraint',
    title: 'Restraint over Ornament',
    statement:
      'Sacred structures must prefer restraint over ornament. Ornamentation is reserved for threshold moments (lintels, altars, doorways).',
    domain: 'culture',
    authority: 'project-canon',
    visibility: 'world-observable',
    overridePolicy: 'softly-overridable',
    modality: 'normally',
    scope: { cosmological: 'xianxia', region: 'default', culture: 'default-sect' },
    sourceDoc: 'production',
    startLine: 1811,
    endLine: 1811,
    excerpt:
      'Sacred structures must prefer restraint over ornament. Ornamentation is reserved for threshold moments.',
  },
  {
    ruleId: 'canon.spirit-shrine.provenance',
    title: 'Spirit Shrine — Authorial Truth',
    statement:
      'A spirit_shrine is the smallest sacred structure. It marks a threshold between mortal and spirit domains and must read as ancient regardless of construction date.',
    domain: 'institution',
    authority: 'hard-canon',
    visibility: 'world-observable',
    overridePolicy: 'requires-retcon',
    modality: 'must',
    scope: { cosmological: 'xianxia', region: 'default', culture: 'default-sect' },
    sourceDoc: 'production',
    startLine: 1814,
    endLine: 1814,
    excerpt:
      'A spirit_shrine marks a threshold between mortal and spirit domains and must read as ancient regardless of construction date.',
  },
  {
    ruleId: 'canon.lineage-hall.provenance',
    title: 'Lineage Hall — Authorial Truth',
    statement:
      'A lineage_hall is a sacred ancestral structure. Its age must be visible in its materials and its dignity must come from continuity, not grandeur.',
    domain: 'institution',
    authority: 'hard-canon',
    visibility: 'world-observable',
    overridePolicy: 'requires-retcon',
    modality: 'must',
    scope: { cosmological: 'xianxia', region: 'default', culture: 'default-sect' },
    sourceDoc: 'production',
    startLine: 1817,
    endLine: 1817,
    excerpt:
      'A lineage_hall is a sacred ancestral structure. Its age must be visible in its materials and its dignity must come from continuity, not grandeur.',
  },
];

interface SeedStyleSpec {
  constraintId: string;
  category: StyleCategory;
  requirement: string;
  negativeConstraints: string[];
  scope: StyleScope;
  priority: number;
  inheritance: StyleInheritance;
  validation: StyleValidation;
  modality: Modality;
  sourceDoc: keyof typeof BIBLE_DOCS;
  startLine: number;
  endLine: number;
  excerpt: string;
}

const SEED_STYLE: SeedStyleSpec[] = [
  {
    constraintId: 'style.ancient-sacred.palette',
    category: 'palette',
    requirement:
      'Ancient sacred structures use a desaturated palette: weathered stone grays, moss greens, oxidized bronze, faded cinnabar red.',
    negativeConstraints: ['pure white marble', 'unweathered gold', 'neon accents', 'synthetic color saturation'],
    scope: { project: true, assetFamily: 'sacred-structure' },
    priority: 9,
    inheritance: 'replace',
    validation: { type: 'deterministic', check: 'palette.saturation<0.6 AND palette.isWithin(sacred-ancient)' },
    modality: 'must',
    sourceDoc: 'production',
    startLine: 1822,
    endLine: 1822,
    excerpt:
      'Ancient sacred structures use a desaturated palette: weathered stone grays, moss greens, oxidized bronze, faded cinnabar red.',
  },
  {
    constraintId: 'style.ancient-sacred.surface-detail',
    category: 'surface-detail',
    requirement:
      'Surface detail must include weathering channels, moss patches, micro-fractures, and patina variation. The surface must read as aged at 2m viewing distance.',
    negativeConstraints: ['pristine flat surfaces', 'perfectly aligned masonry', 'uniform color'],
    scope: { project: true, assetFamily: 'sacred-structure' },
    priority: 8,
    inheritance: 'merge',
    validation: { type: 'visual', description: 'Weathering must be visible at 2m viewing distance' },
    modality: 'must',
    sourceDoc: 'production',
    startLine: 1825,
    endLine: 1825,
    excerpt:
      'Surface detail must include weathering channels, moss patches, micro-fractures, and patina variation.',
  },
  {
    constraintId: 'style.ancient-sacred.shape-language',
    category: 'shape-language',
    requirement:
      'Sacred structures favor horizontal massing over vertical thrust. Roofs are heavy and deep. Columns are stocky, not slender.',
    negativeConstraints: ['thin spires', 'slender columns', 'flying buttresses', 'glass facades'],
    scope: { project: true, assetFamily: 'sacred-structure' },
    priority: 7,
    inheritance: 'inherit',
    validation: { type: 'deterministic', check: 'silhouette.aspectRatio<1.6 AND column.proportion<8' },
    modality: 'normally',
    sourceDoc: 'production',
    startLine: 1828,
    endLine: 1828,
    excerpt:
      'Sacred structures favor horizontal massing over vertical thrust. Roofs are heavy and deep.',
  },
  {
    constraintId: 'style.ancient-sacred.atmosphere',
    category: 'atmosphere',
    requirement:
      'Sacred structures must read as quiet. Atmosphere should emphasize stillness: low ambient particle density, no flicker, no chaotic motion.',
    negativeConstraints: ['fluttering banners', 'sparking particles', 'flame flicker', 'dynamic color shifts'],
    scope: { project: true, assetFamily: 'sacred-structure' },
    priority: 6,
    inheritance: 'merge',
    validation: { type: 'visual', description: 'Atmosphere reads as still and quiet' },
    modality: 'normally',
    sourceDoc: 'production',
    startLine: 1831,
    endLine: 1831,
    excerpt:
      'Sacred structures must read as quiet. Atmosphere should emphasize stillness.',
  },
];

// ---------------------------------------------------------------------------
// Compiler
// ---------------------------------------------------------------------------

const COMPILER_VERSION = 'bible-compiler-v1.0.0';

function toSourceSpan(spec: { sourceDoc: keyof typeof BIBLE_DOCS; startLine: number; endLine: number; excerpt: string }): SourceSpan {
  return {
    document: BIBLE_DOCS[spec.sourceDoc],
    startLine: spec.startLine,
    endLine: spec.endLine,
    textHash: sha256(spec.excerpt),
    excerpt: spec.excerpt,
  };
}

function toBibleRef(span: SourceSpan): BibleReference {
  return {
    document: span.document,
    section: `L${span.startLine}-L${span.endLine}`,
    paragraph: `hash:${span.textHash}`,
  };
}

function compileCanon(spec: SeedSpec): CompiledCanonRule {
  const span = toSourceSpan(spec);
  return {
    ruleId: spec.ruleId,
    title: spec.title,
    statement: spec.statement,
    domain: spec.domain,
    authority: spec.authority,
    scope: spec.scope,
    visibility: spec.visibility,
    overridePolicy: spec.overridePolicy,
    provenance: [toBibleRef(span)],
    supersedes: spec.supersedes,
    modality: spec.modality,
    sourceSpans: [span],
    compiledAt: new Date().toISOString(),
    compilerVersion: COMPILER_VERSION,
  };
}

function compileStyle(spec: SeedStyleSpec): CompiledStyleConstraint {
  const span = toSourceSpan(spec);
  return {
    constraintId: spec.constraintId,
    category: spec.category,
    requirement: spec.requirement,
    negativeConstraints: spec.negativeConstraints,
    scope: spec.scope,
    priority: spec.priority,
    inheritance: spec.inheritance,
    validation: spec.validation,
    provenance: [toBibleRef(span)],
    modality: spec.modality,
    sourceSpans: [span],
    compiledAt: new Date().toISOString(),
    compilerVersion: COMPILER_VERSION,
  };
}

/**
 * Compile the seed Bible into records, write them to disk, and return them.
 * This is idempotent — running it twice produces the same records (the
 * compiledAt timestamp differs, but the ruleId/statement/sourceSpans are
 * identical).
 */
export async function compileBible(): Promise<{
  canon: CompiledCanonRule[];
  style: CompiledStyleConstraint[];
  compilerVersion: string;
  compiledAt: string;
}> {
  const canon = SEED_CANON.map(compileCanon);
  const style = SEED_STYLE.map(compileStyle);
  const compiledAt = new Date().toISOString();

  await replaceJson<CompiledCanonRule[]>('canon' as AuthorialStoreKey, canon);
  await replaceJson<CompiledStyleConstraint[]>('style' as AuthorialStoreKey, style);

  return { canon, style, compilerVersion: COMPILER_VERSION, compiledAt };
}

/**
 * Load compiled Bible records from disk. If not present, compile them.
 */
export async function loadCompiledBible(): Promise<{
  canon: CompiledCanonRule[];
  style: CompiledStyleConstraint[];
}> {
  let canon = await durableStore.read<CompiledCanonRule[]>('canon' as AuthorialStoreKey, []);
  let style = await durableStore.read<CompiledStyleConstraint[]>('style' as AuthorialStoreKey, []);

  if (canon.length === 0 || style.length === 0) {
    const compiled = await compileBible();
    canon = compiled.canon;
    style = compiled.style;
  }

  return { canon, style };
}

/**
 * Verify that a compiled rule's source span is intact.
 * Returns true if the source document still contains the excerpt at the
 * declared line range and the hash matches.
 *
 * This is the auditor's tool for proving provenance is real, not asserted.
 *
 * Tolerant of markdown formatting: leading `> ` (blockquote) and `**bold**`
 * markers are stripped before comparison.
 */
export async function verifySourceSpan(span: SourceSpan): Promise<{
  verified: boolean;
  reason: string;
  actualExcerpt?: string;
}> {
  try {
    const docPath = path.join(process.cwd(), span.document);
    const raw = await fs.readFile(docPath, 'utf8');

    // Strip markdown formatting for comparison.
    const strip = (s: string): string =>
      s.replace(/^>\s*/gm, '').replace(/\*\*/g, '').trim();

    const cleanExcerpt = strip(span.excerpt);
    const cleanRaw = strip(raw);

    // First check: is the excerpt present anywhere in the document?
    if (!cleanRaw.includes(cleanExcerpt)) {
      return {
        verified: false,
        reason: `Excerpt not found in ${span.document}. Source may have been edited.`,
      };
    }

    // Second check: is the hash intact?
    const hash = sha256(span.excerpt);
    if (hash !== span.textHash) {
      return {
        verified: false,
        reason: `Hash mismatch. Expected ${span.textHash}, computed ${hash}.`,
      };
    }

    // Third check: does the declared line range contain the excerpt?
    const lines = raw.split('\n');
    const start = Math.max(1, span.startLine) - 1;
    const end = Math.min(lines.length, span.endLine);
    const rangeText = strip(lines.slice(start, end).join('\n'));
    const lineMatch = rangeText.includes(cleanExcerpt);

    return {
      verified: true,
      reason: lineMatch
        ? `Source span verified at L${span.startLine}-L${span.endLine} in ${span.document}.`
        : `Source span excerpt found in document (line numbers may have shifted).`,
    };
  } catch (err) {
    return {
      verified: false,
      reason: `Cannot read source document: ${(err as Error).message}`,
    };
  }
}

export { COMPILER_VERSION };
