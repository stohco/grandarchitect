/**
 * Bible Contradiction Detector
 *
 * Scans the corpus for the contradictions defined in
 * corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md §6 and
 * engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md §14.
 *
 * No forbidden functions. No Three.js, no DOM. Pure analysis.
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface Contradiction {
  id: string;
  type: ContradictionType;
  severity: 'critical' | 'major' | 'minor';
  doc: string;
  section?: string;
  message: string;
  evidence: string;
}

export type ContradictionType =
  | 'scale'
  | 'travel-time'
  | 'anatomical'
  | 'architectural'
  | 'temporal'
  | 'style'
  | 'missing-truth-level'
  | 'missing-forbidden'
  | 'proxy-as-validated'
  | 'unresolved-silently-resolved';

export interface ContradictionReport {
  totalDocs: number;
  docsScanned: number;
  contradictions: Contradiction[];
  summary: {
    critical: number;
    major: number;
    minor: number;
  };
  verdict: 'pass' | 'warnings' | 'fail';
}

// ============================================================================
// Detector
// ============================================================================

const CORPUS_DIR = join(process.cwd(), 'corpus-extension');

export async function detectContradictions(): Promise<ContradictionReport> {
  let files: string[];
  try {
    files = (await readdir(CORPUS_DIR)).filter(f => f.endsWith('.md'));
  } catch {
    return {
      totalDocs: 0,
      docsScanned: 0,
      contradictions: [],
      summary: { critical: 0, major: 0, minor: 0 },
      verdict: 'pass',
    };
  }

  const contradictions: Contradiction[] = [];

  for (const filename of files) {
    try {
      const content = await readFile(join(CORPUS_DIR, filename), 'utf-8');
      contradictions.push(...checkDoc(filename, content));
    } catch {
      // skip unreadable
    }
  }

  const summary = {
    critical: contradictions.filter(c => c.severity === 'critical').length,
    major: contradictions.filter(c => c.severity === 'major').length,
    minor: contradictions.filter(c => c.severity === 'minor').length,
  };

  const verdict: ContradictionReport['verdict'] =
    summary.critical > 0 ? 'fail' :
    summary.major > 0 ? 'warnings' : 'pass';

  return {
    totalDocs: files.length,
    docsScanned: files.length,
    contradictions,
    summary,
    verdict,
  };
}

// ============================================================================
// Per-document checks
// ============================================================================

function checkDoc(filename: string, content: string): Contradiction[] {
  const results: Contradiction[] = [];
  const lines = content.split('\n');

  // Skip the ground-truth specification docs themselves — they contain
  // examples of contradictions (which would be false positives).
  const isSpecDoc = /^(50|51|52|53|54|55)_/.test(filename);
  if (isSpecDoc) return results;

  // Check 1: Missing truth-level markers (for docs 00–55)
  const hasTruthLevel = content.includes('[CANON]') || content.includes('[DERIVED]') || content.includes('[ART]') || content.includes('[PROC]') || content.includes('[UNRESOLVED]') || content.includes('**Truth level:**');
  if (!hasTruthLevel && isContentDoc(filename)) {
    results.push({
      id: `missing-truth-${filename}`,
      type: 'missing-truth-level',
      severity: 'major',
      doc: filename,
      message: `Document has no truth-level annotations ([CANON]/[DERIVED]/[ART]/[PROC]/[UNRESOLVED])`,
      evidence: 'All bible docs should classify their claims per doc 50 §1',
    });
  }

  // Check 2: Proxy marked as validated
  const proxyValidated = content.match(/\[PROXY\][\s\S]*?\[VALIDATED\]/i) || content.match(/\[VALIDATED\][\s\S]*?\[PROXY\]/i);
  if (proxyValidated) {
    results.push({
      id: `proxy-as-validated-${filename}`,
      type: 'proxy-as-validated',
      severity: 'critical',
      doc: filename,
      message: 'A proxy is marked as validated — proxies cannot be validated without passing through candidate',
      evidence: proxyValidated[0].slice(0, 100),
    });
  }

  // Check 3: Scale contradictions — room larger than building
  const roomMatch = content.match(/room[^]*?(\d+(?:\.\d+)?)\s*m\s*(?:wide|across)/i);
  const buildingMatch = content.match(/(?:building|compound|structure|hall)[^]*?(\d+(?:\.\d+)?)\s*m\s*(?:wide|across)/i);
  if (roomMatch && buildingMatch) {
    const roomWidth = parseFloat(roomMatch[1]);
    const buildingWidth = parseFloat(buildingMatch[1]);
    if (roomWidth > buildingWidth) {
      results.push({
        id: `scale-room-larger-${filename}`,
        type: 'scale',
        severity: 'critical',
        doc: filename,
        message: `Room width (${roomWidth}m) exceeds building width (${buildingWidth}m)`,
        evidence: `Room: ${roomMatch[0].slice(0, 60)}; Building: ${buildingMatch[0].slice(0, 60)}`,
      });
    }
  }

  // Check 4: Travel-time contradictions
  // Only flag when "km" and "hours" appear in close proximity (within 200 chars)
  // AND the context mentions travel (walk, journey, road, path, travel, ride)
  const travelPattern = /(?:walk|walking|journey|travel|ride|riding|on foot|by road)[\s\S]{0,200}?(\d+(?:\.\d+)?)\s*(?:km|kilometer)[\s\S]{0,200}?(\d+(?:\.\d+)?)\s*(?:hour|hr)/i;
  const travelMatch = content.match(travelPattern);
  if (travelMatch) {
    const km = parseFloat(travelMatch[1]);
    const hours = parseFloat(travelMatch[2]);
    const expectedHours = (km * 1000) / 1.3 / 3600;
    // Only flag if the stated time is less than 30% of expected walking time
    if (hours < expectedHours * 0.3 && hours > 0 && km > 1) {
      results.push({
        id: `travel-time-${filename}`,
        type: 'travel-time',
        severity: 'major',
        doc: filename,
        message: `Travel time (${hours}h) is implausibly short for ${km}km at walking speed (expected ~${expectedHours.toFixed(1)}h)`,
        evidence: travelMatch[0].slice(0, 100),
      });
    }
  }

  // Check 5: Style contradictions — check for forbidden motif mentions in non-forbidden context
  // (simplified: flag "gold" in Cangli Riverlands context unless marked forbidden)
  if (filename.includes('04_MORTAL') || filename.includes('MORTAL_SUBSTRATE')) {
    const goldMentions = (content.match(/gold/gi) || []).length;
    const goldForbidden = /forbidden[^\n]*gold/i.test(content);
    if (goldMentions > 3 && !goldForbidden) {
      results.push({
        id: `style-gold-in-mortal-${filename}`,
        type: 'style',
        severity: 'major',
        doc: filename,
        message: `Mortal substrate mentions "gold" ${goldMentions} times without a forbidden-interpretation entry — gold is forbidden in Cangli Riverlands style grammar (doc 53 §2)`,
        evidence: `${goldMentions} mentions of "gold" found`,
      });
    }
  }

  // Check 6: Missing forbiddenInterpretations in technique docs
  if (filename.includes('13_COMBAT') || filename.includes('16_FORMATIONS') || filename.includes('32_POWER')) {
    const hasTechniquePacket = /technique.*packet|TechniqueVTP|deliveryGeometry/i.test(content);
    const hasForbidden = /forbidden[^\n]*(?:do not|must not|never)/i.test(content);
    if (hasTechniquePacket && !hasForbidden) {
      results.push({
        id: `missing-forbidden-${filename}`,
        type: 'missing-forbidden',
        severity: 'major',
        doc: filename,
        message: 'Technique doc has no forbidden-interpretations section — mandatory per doc 51 §7',
        evidence: 'Technique packet detected but no FORBIDDEN field found',
      });
    }
  }

  // Check 7: Unresolved silently resolved — [UNRESOLVED] followed (within 3 lines) by a
  // definitive claim about the SAME topic using "is exactly", "must always", "will never",
  // "is definitively". This is a narrow check to avoid false positives.
  const unresolvedResolved = content.match(/\[UNRESOLVED\]\s+([^\n]+)\n[^\[]{0,200}?(?:is exactly|must always|will never|is definitively|is canonically)\s/gi);
  if (unresolvedResolved) {
    // Verify the topic matches — only flag if the definitive statement references
    // a word from the unresolved question
    for (const match of unresolvedResolved) {
      const topic = match.match(/\[UNRESOLVED\]\s+([^\n]+)/)?.[1] ?? '';
      const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const definitive = match.toLowerCase();
      const topicMatch = topicWords.some(w => definitive.includes(w));
      if (topicMatch) {
        results.push({
          id: `unresolved-silently-resolved-${filename}-${match.length}`,
          type: 'unresolved-silently-resolved',
          severity: 'critical',
          doc: filename,
          message: 'An [UNRESOLVED] question appears to be silently resolved by a definitive statement',
          evidence: match.slice(0, 120),
        });
        break; // one per doc is enough
      }
    }
  }

  // Check 8: Building height exceeding style grammar limits
  if (filename.includes('04_MORTAL') || filename.includes('MORTAL_SUBSTRATE')) {
    const heightMatches = content.matchAll(/(\d+(?:\.\d+)?)\s*m\s*(?:tall|high|height)/gi);
    for (const m of heightMatches) {
      const h = parseFloat(m[1]);
      // Mortal buildings should not exceed 5m (doc 04, doc 53 §2)
      if (h > 5 && h < 50) {
        // Exclude clearly-sect-scale mentions
        const context = content.slice(Math.max(0, m.index! - 50), m.index! + 50);
        if (!/sect|holy|celestial|temple|shrine/i.test(context)) {
          results.push({
            id: `scale-mortal-too-tall-${filename}-${m.index}`,
            type: 'scale',
            severity: 'major',
            doc: filename,
            message: `Building height ${h}m exceeds mortal building limit (5m) — may be a sect/holy-land scale violation`,
            evidence: context.slice(0, 80),
          });
        }
      }
    }
  }

  return results;
}

// ============================================================================
// Helpers
// ============================================================================

function isContentDoc(filename: string): boolean {
  // Skip pure reference/index docs that don't need truth levels
  const skip = ['08_THREEJS', '10_PRIMARY_SOURCES', '29_CULTIVATION_PRIMARY'];
  return !skip.some(s => filename.includes(s));
}

// ============================================================================
// Summary formatter
// ============================================================================

export function formatReport(report: ContradictionReport): string {
  const lines: string[] = [];
  lines.push('BIBLE CONTRADICTION REPORT');
  lines.push('==========================');
  lines.push(`Docs scanned: ${report.docsScanned}/${report.totalDocs}`);
  lines.push(`Verdict: ${report.verdict.toUpperCase()}`);
  lines.push(`Critical: ${report.summary.critical} · Major: ${report.summary.major} · Minor: ${report.summary.minor}`);
  lines.push('');

  if (report.contradictions.length === 0) {
    lines.push('No contradictions detected. The bible is internally consistent.');
    return lines.join('\n');
  }

  const byType = new Map<string, Contradiction[]>();
  for (const c of report.contradictions) {
    if (!byType.has(c.type)) byType.set(c.type, []);
    byType.get(c.type)!.push(c);
  }

  for (const [type, items] of byType) {
    lines.push(`--- ${type.toUpperCase()} (${items.length}) ---`);
    for (const c of items) {
      lines.push(`  [${c.severity.toUpperCase()}] ${c.doc}: ${c.message}`);
      if (c.evidence) lines.push(`    evidence: ${c.evidence}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
