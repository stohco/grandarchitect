/**
 * Decision Ledgers + Narrative World Graph
 * ========================================
 *
 * Durable memory for accepted authorial decisions.
 * When the user accepts an artistic decision, it is converted into
 * machine-readable scoped constraints that future generation inherits
 * automatically.
 *
 * Ledgers:
 *   - Canon Decision Ledger
 *   - Art Direction Ledger
 *   - Narrative Decision Ledger
 *   - Technical Decision Ledger
 *   - Exception/Retcon Ledger
 *
 * Narrative World Graph:
 *   - Historical events with causal dependencies
 *   - Active conflicts and faction agendas
 *   - Character arcs and relationships
 *   - Narrative promises (seeded → developing → payoff → fulfilled)
 *   - Thematic motifs
 *   - Unresolved consequences
 */

import type { CanonScope, StyleScope, BibleReference } from './canon-style';

// ---------------------------------------------------------------------------
// Decision Ledgers
// ---------------------------------------------------------------------------

export type LedgerType =
  | 'canon' | 'art-direction' | 'narrative' | 'technical' | 'exception-retcon';

export interface DecisionEntry {
  entryId: string;
  ledgerType: LedgerType;
  timestamp: string;

  /** What was decided. */
  decision: string;
  /** Why it was decided (original user/architect statement). */
  reasoning: string;

  /** Scope where this decision applies. */
  scope: CanonScope & StyleScope;

  /** Machine-readable constraints derived from this decision. */
  constraints: DecisionConstraint[];

  /** Who made the decision. */
  decidedBy: 'user' | 'architect' | 'system';

  /** Source transaction that recorded this decision. */
  sourceTransactionId?: string;

  /** Whether this decision is active. */
  active: boolean;

  /** If this decision supersedes a prior one. */
  supersedes?: string;

  provenance: BibleReference[];
}

export interface DecisionConstraint {
  constraintId: string;
  type: 'require' | 'forbid' | 'prefer' | 'limit';
  category: string;
  description: string;
  value?: string | number | boolean;
}

// ---------------------------------------------------------------------------
// Narrative World Graph
// ---------------------------------------------------------------------------

export interface NarrativeWorldState {
  historicalEvents: HistoricalEventNode[];
  activeConflicts: ConflictThread[];
  factionAgendas: FactionAgenda[];
  characterArcs: CharacterArc[];
  unresolvedMysteries: MysteryThread[];
  narrativePromises: NarrativePromiseNode[];
  thematicMotifs: ThematicMotif[];
  economicPressures: EconomicPressure[];
  ecologicalPressures: EcologicalPressure[];
  socialObligations: SocialObligation[];
}

export interface HistoricalEventNode {
  eventId: string;
  description: string;
  era: string;
  year: number;
  /** Events that caused this one. */
  causedBy: string[];
  /** Events that resulted from this one. */
  consequences: string[];
  /** Factions involved. */
  factions: string[];
  /** Whether this is visible to the player. */
  visibility: 'public' | 'faction-known' | 'character-known' | 'hidden';
}

export interface ConflictThread {
  conflictId: string;
  description: string;
  parties: string[];
  status: 'simmering' | 'active' | 'escalating' | 'resolving' | 'resolved';
  stakes: string;
  startedAt: string;
}

export interface FactionAgenda {
  agendaId: string;
  factionId: string;
  factionName: string;
  goal: string;
  motivation: string;
  resources: string[];
  obstacles: string[];
  timeline: string;
  priority: number;
}

export interface CharacterArc {
  arcId: string;
  characterId: string;
  characterName: string;
  arcType: 'growth' | 'fall' | 'redemption' | 'discovery' | 'transformation';
  currentStage: string;
  desiredEnd: string;
  unresolvedTensions: string[];
}

export interface MysteryThread {
  mysteryId: string;
  description: string;
  truth: string; // Authorial truth — NPCs don't know this
  knownTo: string[]; // Who knows fragments
  clues: string[];
  status: 'planted' | 'hinted' | 'investigated' | 'revealed' | 'misdirected';
}

export interface NarrativePromiseNode {
  promiseId: string;
  description: string;
  status: 'seeded' | 'developing' | 'payoff-ready' | 'fulfilled' | 'abandoned';
  introducedAt: string;
  possiblePayoffs: string[];
  /** What narrative promises this depends on. */
  dependsOn?: string[];
}

export interface ThematicMotif {
  motifId: string;
  motif: string;
  description: string;
  occurrences: string[]; // Where it has appeared
  intendedResonance: string;
}

export interface EconomicPressure {
  pressureId: string;
  description: string;
  affectedRegion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  causes: string[];
}

export interface EcologicalPressure {
  pressureId: string;
  description: string;
  affectedRegion: string;
  species: string[];
  causes: string[];
}

export interface SocialObligation {
  obligationId: string;
  description: string;
  parties: string[];
  type: 'debt' | 'oath' | 'duty' | 'favor' | 'blood-feud' | 'marriage' | 'apprenticeship';
  status: 'active' | 'fulfilled' | 'broken' | 'forgotten';
}

// ---------------------------------------------------------------------------
// Ledger Manager
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Durable Ledger Manager
// ---------------------------------------------------------------------------
//
// All decisions are persisted to data/authorial/ledgers.json.
// Append-only by default: record() adds and persists; supersede() marks an
// old entry inactive (active=false) and records a new one referencing the old.
// This is required so the auditor can verify a decision survived restart.

import { durableStore, replaceJson, type AuthorialStoreKey } from './durable-store';

const LEDGER_FILE = 'ledgers' as AuthorialStoreKey;
const MAX_ENTRIES_PER_LEDGER = 500;

interface PersistedLedgerState {
  ledgers: Record<LedgerType, DecisionEntry[]>;
  narrative: Record<string, NarrativeWorldState>;
}

class DecisionLedgerManager {
  private ledgers = new Map<LedgerType, DecisionEntry[]>();
  private narrative = new Map<string, NarrativeWorldState>();
  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const persisted = await durableStore.read<PersistedLedgerState>(LEDGER_FILE, {
      ledgers: { canon: [], 'art-direction': [], narrative: [], technical: [], 'exception-retcon': [] },
      narrative: {},
    });
    for (const [type, entries] of Object.entries(persisted.ledgers)) {
      this.ledgers.set(type as LedgerType, entries);
    }
    for (const [worldId, state] of Object.entries(persisted.narrative)) {
      this.narrative.set(worldId, state);
    }
  }

  private async persist(): Promise<void> {
    const state: PersistedLedgerState = {
      ledgers: {
        canon: this.trim('canon'),
        'art-direction': this.trim('art-direction'),
        narrative: this.trim('narrative'),
        technical: this.trim('technical'),
        'exception-retcon': this.trim('exception-retcon'),
      },
      narrative: Object.fromEntries(this.narrative),
    };
    await replaceJson(LEDGER_FILE, state);
  }

  private trim(type: LedgerType): DecisionEntry[] {
    const entries = this.ledgers.get(type) ?? [];
    // Keep newest MAX_ENTRIES_PER_LEDGER entries.
    return entries.slice(-MAX_ENTRIES_PER_LEDGER);
  }

  async record(entry: Omit<DecisionEntry, 'entryId' | 'timestamp'>): Promise<DecisionEntry> {
    await this.ensureLoaded();
    const full: DecisionEntry = {
      ...entry,
      entryId: `decision-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    const ledger = this.ledgers.get(full.ledgerType) ?? [];
    // Append-only: if this entry supersedes a prior, mark the prior inactive.
    if (full.supersedes) {
      const prior = ledger.find((e) => e.entryId === full.supersedes);
      if (prior) prior.active = false;
    }
    ledger.push(full);
    this.ledgers.set(full.ledgerType, ledger);
    await this.persist();
    return full;
  }

  async query(ledgerType: LedgerType, scope?: CanonScope & StyleScope): Promise<DecisionEntry[]> {
    await this.ensureLoaded();
    const entries = this.ledgers.get(ledgerType) ?? [];
    if (!scope) return entries.filter((e) => e.active);

    return entries.filter((e) => {
      if (!e.active) return false;
      if (scope.realm && e.scope.realm && e.scope.realm !== scope.realm) return false;
      if (scope.region && e.scope.region && e.scope.region !== scope.region) return false;
      if (scope.faction && e.scope.faction && e.scope.faction !== scope.faction) return false;
      return true;
    });
  }

  async getApplicableConstraints(scope: CanonScope & StyleScope): Promise<DecisionConstraint[]> {
    await this.ensureLoaded();
    const allEntries = Array.from(this.ledgers.values()).flat();
    return allEntries
      .filter((e) => e.active && this.scopeMatches(e.scope, scope))
      .flatMap((e) => e.constraints);
  }

  async getAll(): Promise<DecisionEntry[]> {
    await this.ensureLoaded();
    return Array.from(this.ledgers.values()).flat().sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
  }

  private scopeMatches(entryScope: CanonScope & StyleScope, requestScope: CanonScope & StyleScope): boolean {
    if (entryScope.realm && requestScope.realm && entryScope.realm !== requestScope.realm) return false;
    if (entryScope.region && requestScope.region && entryScope.region !== requestScope.region) return false;
    if (entryScope.faction && requestScope.faction && entryScope.faction !== requestScope.faction) return false;
    if (entryScope.culture && requestScope.culture && entryScope.culture !== requestScope.culture) return false;
    return true;
  }

  async getNarrative(worldId: string): Promise<NarrativeWorldState> {
    await this.ensureLoaded();
    return this.narrative.get(worldId) ?? {
      historicalEvents: [],
      activeConflicts: [],
      factionAgendas: [],
      characterArcs: [],
      unresolvedMysteries: [],
      narrativePromises: [],
      thematicMotifs: [],
      economicPressures: [],
      ecologicalPressures: [],
      socialObligations: [],
    };
  }

  async setNarrative(worldId: string, state: NarrativeWorldState): Promise<void> {
    await this.ensureLoaded();
    this.narrative.set(worldId, state);
    await this.persist();
  }

  async getStats(): Promise<Record<LedgerType, number>> {
    await this.ensureLoaded();
    const stats: Record<string, number> = {};
    for (const [type, entries] of this.ledgers) {
      stats[type] = entries.filter((e) => e.active).length;
    }
    return stats as Record<LedgerType, number>;
  }

  /**
   * Returns all entries that targeted a specific entity. Used to verify
   * that a decision actually references a real Studio object.
   */
  async getEntriesForEntity(entityId: number): Promise<DecisionEntry[]> {
    await this.ensureLoaded();
    const all = await this.getAll();
    return all.filter((e) =>
      e.constraints.some((c) => c.value === `entity:${entityId}` || c.description.includes(`entity ${entityId}`)),
    );
  }
}

// Singleton
let ledgerManager: DecisionLedgerManager | null = null;

export function getDecisionLedgers(): DecisionLedgerManager {
  if (!ledgerManager) {
    ledgerManager = new DecisionLedgerManager();
  }
  return ledgerManager;
}

/**
 * Test-only: reset singleton.
 */
export function __resetDecisionLedgerSingleton(): void {
  ledgerManager = null;
}
