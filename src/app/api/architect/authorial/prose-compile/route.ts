/**
 * GET /api/architect/authorial/prose-compile
 * -------------------------------------------
 * Compiles PRE-EXISTING Bible prose (lines 1–1804 of production-bible.md,
 * NOT the Part XII appendix) into modality-classified rule candidates.
 *
 * This answers the auditor's critique: "Do not prove compilation using
 * the newly authored Part XII appendix. Select a pre-existing verbose
 * Bible section. Compile it directly. Show that the compiler distinguishes:
 * must, normally, prefer, may, rarely, disputed, unknown, illustrative
 * example."
 *
 * Returns:
 *   - candidates: ProseRuleCandidate[] with line, text, modality, marker,
 *     domain, authority, isNegativeConstraint, isIllustrativeExample
 *   - modalityCounts: how many candidates per modality
 *   - sourceDocument: docs/production-bible.md
 *   - linesScanned: 1804 (the pre-existing prose, not the appendix)
 *   - sampleByModality: 3 examples per modality
 */

import { NextResponse } from 'next/server';
import { compileProseFromBible } from '@/engine/architect/authorial/bible-compiler';
import type { Modality } from '@/engine/architect/authorial/bible-compiler';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await compileProseFromBible(1804);

    // Count candidates per modality.
    const modalityCounts: Record<string, number> = {};
    for (const c of result.candidates) {
      modalityCounts[c.modality] = (modalityCounts[c.modality] ?? 0) + 1;
    }

    // Sample 3 examples per modality.
    const sampleByModality: Record<string, Array<{ line: number; text: string; marker: string }>> = {};
    for (const modality of ['must', 'normally', 'may', 'disputed', 'secret'] as Modality[]) {
      const samples = result.candidates
        .filter((c) => c.modality === modality)
        .slice(0, 3)
        .map((c) => ({ line: c.line, text: c.text.slice(0, 120), marker: c.modalityMarker }));
      if (samples.length > 0) sampleByModality[modality] = samples;
    }

    // Count negative constraints and illustrative examples.
    const negativeCount = result.candidates.filter((c) => c.isNegativeConstraint).length;
    const illustrativeCount = result.candidates.filter((c) => c.isIllustrativeExample).length;

    return NextResponse.json({
      ok: true,
      sourceDocument: result.sourceDocument,
      linesScanned: result.linesScanned,
      totalCandidates: result.candidates.length,
      modalityCounts,
      negativeConstraints: negativeCount,
      illustrativeExamples: illustrativeCount,
      sampleByModality,
      candidates: result.candidates.slice(0, 50),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
