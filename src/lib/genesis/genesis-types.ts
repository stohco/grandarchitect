/**
 * Genesis Types — Universe Genesis Compiler coverage types.
 *
 * A Genesis concept is a Bible-backed concept ([CANON] or [DERIVED] claim
 * from the corpus). Genesis bindings connect a concept to the consumer
 * systems it affects (generation, simulation, motion, visual, audio,
 * gameplay, persistence, validation).
 *
 * Machine-audited coverage rule (Universe Genesis Compiler §41-42):
 *   A concept whose REQUIRED system has no binding to an existing consumer
 *   is a GENESIS COVERAGE FAILURE — a build failure, not a warning.
 */

/** The eight consumer-system columns of the Universe Coverage Matrix. */
export type GenesisSystem =
  | 'generation'
  | 'simulation'
  | 'motion'
  | 'visual'
  | 'audio'
  | 'gameplay'
  | 'persistence'
  | 'validation';

export const GENESIS_SYSTEMS: GenesisSystem[] = [
  'generation',
  'simulation',
  'motion',
  'visual',
  'audio',
  'gameplay',
  'persistence',
  'validation',
];

/** A real, on-disk consumer of Genesis bindings (runtime module or spec doc). */
export type ConsumerKind = 'runtime' | 'spec';

export interface GenesisConsumer {
  id: string;
  system: GenesisSystem;
  kind: ConsumerKind;
  /** Repo-root-relative path. The coverage gate verifies it exists on disk. */
  path: string;
  description: string;
}

/** A Bible claim, machine-audited against its source document. */
export interface GenesisClaim {
  /** Verbatim text that must appear in the source document. */
  text: string;
  /** Repo-root-relative source document path. */
  source: string;
}

export interface GenesisBinding {
  system: GenesisSystem;
  consumerId: string;
  note?: string;
}

export type GenesisCanonLevel = 'canon' | 'derived' | 'design' | 'unresolved';

export const GENESIS_CANON_LEVELS: GenesisCanonLevel[] = ['canon', 'derived', 'design', 'unresolved'];

export interface GenesisConcept {
  id: string;
  name: string;
  canonLevel: GenesisCanonLevel;
  claims: GenesisClaim[];
  /** Systems that MUST have at least one bound consumer. */
  requires: GenesisSystem[];
  bindings: GenesisBinding[];
}

export type FailureKind =
  | 'unbound'            // required system has no binding
  | 'missing-consumer'   // binding references a consumer not in the registry
  | 'consumer-not-found' // consumer registered but its path does not exist
  | 'claim-not-found';   // claim text does not appear in its source document

export interface GenesisFailure {
  conceptId: string;
  kind: FailureKind;
  detail: string;
  system?: GenesisSystem;
}

export type MatrixCell = 'bound' | 'missing' | 'not-required';

export interface GenesisCoverageReport {
  concepts: GenesisConcept[];
  failures: GenesisFailure[];
  /** conceptId -> system -> cell. */
  matrix: Record<string, Record<GenesisSystem, MatrixCell>>;
  /** Causal fan-out per concept (bound systems count). */
  fanOut: Record<string, number>;
  conceptCount: number;
  boundPairs: number;
  requiredPairs: number;
  pass: boolean;
}

export const SYSTEM_LABELS: Record<GenesisSystem, string> = {
  generation: 'Generation',
  simulation: 'Simulation',
  motion: 'Motion',
  visual: 'Visual',
  audio: 'Audio',
  gameplay: 'Gameplay',
  persistence: 'Persistence',
  validation: 'Validation',
};
