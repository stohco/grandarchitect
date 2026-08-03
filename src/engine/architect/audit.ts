/**
 * Audit Trail — records every architect action.
 *
 * Every tool dispatch, permission denial, and state mutation
 * is recorded with who/what/when/why/what-changed/what-was-the-result.
 */

import type { AuditRecord } from './types';
import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

const AUDIT_DIR = join(process.cwd(), '.engine-audit');
const AUDIT_FILE = join(AUDIT_DIR, 'audit.log');

let initialized = false;

function ensureDir() {
  if (!initialized) {
    if (!existsSync(AUDIT_DIR)) {
      mkdirSync(AUDIT_DIR, { recursive: true });
    }
    initialized = true;
  }
}

export interface AuditLog {
  record(entry: AuditRecord): void;
  query(filter: Partial<AuditRecord>): AuditRecord[];
  count(): number;
  clear(): void;
}

export function createAuditLog(): AuditLog {
  const records: AuditRecord[] = [];

  // Load existing records
  ensureDir();
  if (existsSync(AUDIT_FILE)) {
    const content = readFileSync(AUDIT_FILE, 'utf-8');
    for (const line of content.split('\n')) {
      if (line.trim()) {
        try {
          records.push(JSON.parse(line));
        } catch {
          // Skip corrupt lines
        }
      }
    }
  }

  return {
    record(entry) {
      records.push(entry);
      ensureDir();
      appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n');
    },

    query(filter) {
      return records.filter(r => {
        for (const [key, value] of Object.entries(filter)) {
          if (r[key as keyof AuditRecord] !== value) return false;
        }
        return true;
      });
    },

    count() {
      return records.length;
    },

    clear() {
      records.length = 0;
      ensureDir();
      writeFileSync(AUDIT_FILE, '');
    },
  };
}
