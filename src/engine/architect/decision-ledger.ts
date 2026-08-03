/**
 * Decision Ledger — versioned architectural decision records.
 *
 * Every important architectural choice creates a decision record
 * containing: problem, context, alternatives, selected approach,
 * reasons, disadvantages, affected capabilities, evidence,
 * reconsideration conditions.
 */

import type { DecisionRecord } from './types';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DECISIONS_DIR = join(process.cwd(), '.engine-decisions');

export interface DecisionLedger {
  record(decision: DecisionRecord): void;
  get(id: string): DecisionRecord | undefined;
  list(): DecisionRecord[];
  findByCapability(capabilityId: string): DecisionRecord[];
}

export function createDecisionLedger(): DecisionLedger {
  const records = new Map<string, DecisionRecord>();

  // Load existing decisions
  if (!existsSync(DECISIONS_DIR)) {
    mkdirSync(DECISIONS_DIR, { recursive: true });
  }

  // In a full implementation, this would load from .engine-decisions/*.json
  // For now, we keep it in-memory with persistence on record()

  return {
    record(decision) {
      records.set(decision.id, decision);
      // Persist
      const filepath = join(DECISIONS_DIR, `${decision.id}.json`);
      writeFileSync(filepath, JSON.stringify(decision, null, 2));
    },

    get(id) {
      if (records.has(id)) return records.get(id);
      // Try loading from disk
      const filepath = join(DECISIONS_DIR, `${id}.json`);
      if (existsSync(filepath)) {
        try {
          const decision: DecisionRecord = JSON.parse(readFileSync(filepath, 'utf-8'));
          records.set(id, decision);
          return decision;
        } catch {
          return undefined;
        }
      }
      return undefined;
    },

    list() {
      return Array.from(records.values());
    },

    findByCapability(capabilityId) {
      return Array.from(records.values()).filter(
        d => d.affectedCapabilities.includes(capabilityId)
      );
    },
  };
}
