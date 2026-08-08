/**
 * Genesis Coverage — the machine-audited coverage gate.
 *
 * Chain: Bible claim → Genesis concept → binding → consumer (file on disk)
 *        → validation rule (this gate).
 *
 * GENESIS COVERAGE FAILURE (build failure):
 *   - a required system has no binding,
 *   - a binding references a consumer that is not registered,
 *   - a registered consumer's path does not exist on disk,
 *   - a claim's text no longer appears in its source document.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  GenesisConcept,
  GenesisConsumer,
  GenesisCoverageReport,
  GenesisFailure,
  GenesisSystem,
  MatrixCell,
} from './genesis-types';
import { GENESIS_SYSTEMS } from './genesis-types';
import { consumerExists, getConsumer } from './consumer-registry';
import { GENESIS_CONCEPTS } from './concepts-registry';

/** Strip markdown markers for verbatim claim comparison (mirrors bible-compiler). */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^>\s*/gm, '')
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
}

/** True if the stripped claim text appears in the stripped source document. */
export function claimVerified(claim: { text: string; source: string }): boolean {
  try {
    const doc = readFileSync(resolve(process.cwd(), claim.source), 'utf8');
    return stripMarkdown(doc).includes(stripMarkdown(claim.text));
  } catch {
    return false;
  }
}

export function consumerFileExists(consumer: GenesisConsumer): boolean {
  return existsSync(resolve(process.cwd(), consumer.path));
}

function bindingsForSystem(concept: GenesisConcept, system: GenesisSystem) {
  return concept.bindings.filter((b) => b.system === system);
}

/**
 * Audit one concept. Returns failures (empty = covered).
 */
export function auditConcept(concept: GenesisConcept): GenesisFailure[] {
  const failures: GenesisFailure[] = [];

  // 1. Claims must still exist in their source documents.
  for (const claim of concept.claims) {
    if (!claimVerified(claim)) {
      failures.push({
        conceptId: concept.id,
        kind: 'claim-not-found',
        detail: `Claim not found in ${claim.source}: "${stripMarkdown(claim.text).slice(0, 90)}..."`,
      });
    }
  }

  // 2. Every binding must reference a registered consumer...
  const seen = new Set<string>();
  for (const binding of concept.bindings) {
    const key = `${binding.system}:${binding.consumerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!consumerExists(binding.consumerId)) {
      failures.push({
        conceptId: concept.id,
        kind: 'missing-consumer',
        system: binding.system,
        detail: `Binding references unregistered consumer "${binding.consumerId}"`,
      });
      continue;
    }
    const consumer = getConsumer(binding.consumerId)!;
    if (consumer.system !== binding.system) {
      failures.push({
        conceptId: concept.id,
        kind: 'missing-consumer',
        system: binding.system,
        detail: `Consumer "${binding.consumerId}" belongs to system "${consumer.system}", not "${binding.system}"`,
      });
    }
    // ...and the consumer's file must exist on disk.
    if (!consumerFileExists(consumer)) {
      failures.push({
        conceptId: concept.id,
        kind: 'consumer-not-found',
        system: binding.system,
        detail: `Consumer "${binding.consumerId}" path missing on disk: ${consumer.path}`,
      });
    }
  }

  // 3. Every required system must have at least one binding.
  for (const system of concept.requires) {
    const bound = bindingsForSystem(concept, system).some((b) => consumerExists(b.consumerId));
    if (!bound) {
      failures.push({
        conceptId: concept.id,
        kind: 'unbound',
        system,
        detail: `Required system "${system}" has no binding to a registered consumer`,
      });
    }
  }

  return failures;
}

/**
 * Run the coverage gate over a concept set. Deterministic — same input,
 * same report.
 */
export function runCoverage(concepts: GenesisConcept[] = GENESIS_CONCEPTS): GenesisCoverageReport {
  const failures: GenesisFailure[] = [];
  const matrix: GenesisCoverageReport['matrix'] = {};
  const fanOut: GenesisCoverageReport['fanOut'] = {};
  let boundPairs = 0;
  let requiredPairs = 0;

  for (const concept of concepts) {
    const cell: Record<GenesisSystem, MatrixCell> = {
      generation: 'not-required',
      simulation: 'not-required',
      motion: 'not-required',
      visual: 'not-required',
      audio: 'not-required',
      gameplay: 'not-required',
      persistence: 'not-required',
      validation: 'not-required',
    };

    const conceptFailures = auditConcept(concept);
    failures.push(...conceptFailures);
    const failedSystems = new Set(
      conceptFailures.filter((f) => f.system).map((f) => f.system as GenesisSystem),
    );

    let boundSystemCount = 0;
    for (const system of GENESIS_SYSTEMS) {
      const bound = bindingsForSystem(concept, system).some((b) => consumerExists(b.consumerId));
      const required = concept.requires.includes(system);
      if (bound) boundSystemCount++;
      if (required) {
        requiredPairs++;
        if (bound && !failedSystems.has(system)) {
          cell[system] = 'bound';
          boundPairs++;
          boundSystemCount++;
        } else {
          cell[system] = 'missing';
        }
      }
    }
    fanOut[concept.id] = boundSystemCount;

    matrix[concept.id] = cell;
  }

  return {
    concepts,
    failures,
    matrix,
    fanOut,
    conceptCount: concepts.length,
    boundPairs,
    requiredPairs,
    pass: failures.length === 0,
  };
}

/** Markdown rendering of the Universe Coverage Matrix. */
export function renderMarkdownMatrix(report: GenesisCoverageReport): string {
  const headers = ['Bible concept', ...GENESIS_SYSTEMS.map((s) => s.toUpperCase())];
  const rows: string[][] = [];
  for (const concept of report.concepts) {
    const cells = GENESIS_SYSTEMS.map((s) => {
      const cell = report.matrix[concept.id][s];
      return cell === 'bound' ? '✓' : cell === 'missing' ? '✗' : '—';
    });
    rows.push([concept.id, ...cells]);
  }

  const widths: number[] = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length)),
  );
  const fmt = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join(' | ');

  const lines: string[] = [
    '## Universe Coverage Matrix',
    '',
    '| ' + fmt(headers) + ' |',
    '| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |',
    ...rows.map((r) => '| ' + fmt(r) + ' |'),
    '',
    `Concepts: ${report.conceptCount} | Required system pairs: ${report.requiredPairs} | Bound pairs: ${report.boundPairs} | Failures: ${report.failures.length}`,
  ];
  return lines.join('\n');
}
