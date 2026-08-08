/**
 * Engine status snapshot — curated from the worklog and source.
 * This is the single source of truth for the dashboard's static content.
 * Test counts are verified by `bun run` on each conformance file.
 */

export interface PhaseInfo {
  id: number;
  name: string;
  status: 'done' | 'pending';
  exitCriteria: string;
  testCount: number;
  artifacts: string[];
}

export interface CapabilityInfo {
  capability: string;
  provider: string;
  version: string;
  category: 'kernel' | 'architect' | 'determinism' | 'reference' | 'simulation';
  description: string;
}

export interface ArchitectRoleInfo {
  role: string;
  autonomy: number;
  description: string;
  hardGatedActions: string[];
}

export interface PluginInfo {
  id: string;
  version: string;
  dependencies: string[];
  capabilities: string[];
  category: 'determinism' | 'reference' | 'simulation';
  lines: number;
}

export const PHASES: PhaseInfo[] = [
  {
    id: 0,
    name: 'Determinism Stack',
    status: 'done',
    exitCriteria: 'Cross-browser hash parity (7fde855...)',
    testCount: 0,
    artifacts: ['xoshiro256**', 'Cody-Waite transcendentals', 'Q32.32 fixed-point', 'CBOR', 'SHA-256 (hash-verified)'],
  },
  {
    id: 1,
    name: 'Kernel + Plugin SDK',
    status: 'done',
    exitCriteria: 'Two reference plugins pass conformance',
    testCount: 37,
    artifacts: ['types', 'capability-registry', 'event-bus', 'scheduler', 'plugin-host', 'ga:determinism'],
  },
  {
    id: 2,
    name: 'Grand Architect Control Plane',
    status: 'done',
    exitCriteria: 'Architect tools inspect engine state',
    testCount: 113,
    artifacts: ['gateway', 'tool-protocol', 'permissions', 'audit', 'capability-graph', 'decision-ledger', 'world-oracle', 'types'],
  },
  {
    id: 3,
    name: 'Reference Plugins',
    status: 'done',
    exitCriteria: 'Each passes acceptance tests',
    testCount: 252,
    artifacts: ['renderer', 'physics', 'terrain', 'animation', 'vfx', 'assets', 'persistence', 'content-schema'],
  },
  {
    id: 4,
    name: 'Simulation Systems',
    status: 'done',
    exitCriteria: 'Century-absence test passes',
    testCount: 247,
    artifacts: ['entity-manager', 'npc-simulator', 'ecology', 'economy', 'history'],
  },
  {
    id: 5,
    name: 'Game Systems',
    status: 'done',
    exitCriteria: 'First duel plays correctly',
    testCount: 629,
    artifacts: ['cultivation (203)', 'combat (202)', 'quest/dialogue (224)'],
  },
  {
    id: 6,
    name: 'Content Generation',
    status: 'pending',
    exitCriteria: 'Wang Family Bend generates from seed',
    testCount: 0,
    artifacts: [],
  },
  {
    id: 7,
    name: 'Vertical Slice',
    status: 'pending',
    exitCriteria: '"One Mortal Morning" feels real',
    testCount: 0,
    artifacts: [],
  },
];

export const TOTAL_TESTS = PHASES.reduce((sum, p) => sum + p.testCount, 0);

export const AUTONOMY_LEVELS = [
  { level: 0, name: 'Observe', description: 'Read-only inspection of engine state. No mutations.' },
  { level: 1, name: 'Diagnose', description: 'Run diagnostics, identify gaps, propose hypotheses.' },
  { level: 2, name: 'Sandbox', description: 'Execute mutations in an isolated worktree. No integration.' },
  { level: 3, name: 'Branch', description: 'Create feature branches with proposed changes.' },
  { level: 4, name: 'Integrate', description: 'Merge branches into main after adversarial review.' },
  { level: 5, name: 'Release', description: 'Tag releases, update roadmap, archive evidence packages.' },
  { level: 6, name: 'Architect', description: 'Full autonomy. Reserved for the Grand Architect itself.' },
];

export const ARCHITECT_ROLES: ArchitectRoleInfo[] = [
  {
    role: 'Observer',
    autonomy: 0,
    description: 'Read-only access to the world oracle and audit trail.',
    hardGatedActions: [],
  },
  {
    role: 'Diagnostician',
    autonomy: 1,
    description: 'Runs conformance tests, identifies capability gaps, writes ADRs.',
    hardGatedActions: [],
  },
  {
    role: 'Sandbox Engineer',
    autonomy: 2,
    description: 'Implements changes in an isolated git worktree. Cannot touch main.',
    hardGatedActions: ['merge_to_main', 'release_tag'],
  },
  {
    role: 'Branch Integrator',
    autonomy: 3,
    description: 'Creates and pushes feature branches with full test coverage.',
    hardGatedActions: ['release_tag', 'delete_protected_file'],
  },
  {
    role: 'Adversarial Reviewer',
    autonomy: 4,
    description: 'Reviews branches, runs adversarial tests, blocks unsafe merges.',
    hardGatedActions: ['release_tag'],
  },
  {
    role: 'Release Engineer',
    autonomy: 5,
    description: 'Merges reviewed branches, tags releases, archives evidence.',
    hardGatedActions: [],
  },
  {
    role: 'Grand Architect',
    autonomy: 6,
    description: 'Full autonomy. Can rewrite any system, including the kernel.',
    hardGatedActions: [],
  },
  {
    role: 'Auditor',
    autonomy: 0,
    description: 'Read-only access to the tamper-evident audit trail and decision ledger.',
    hardGatedActions: [],
  },
];

export const PLUGINS: PluginInfo[] = [
  {
    id: 'ga:determinism', version: '0.1.0', dependencies: [],
    capabilities: ['rng', 'transcendentals', 'fixed-point', 'hash', 'serialize', 'seed'],
    category: 'determinism', lines: 0,
  },
  {
    id: 'ga:persistence', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['persistence.save', 'persistence.load', 'persistence.checkpoint', 'persistence.slice', 'persistence.branch'],
    category: 'reference', lines: 0,
  },
  {
    id: 'ga:content-schema', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['content-schema.definitions', 'content-schema.templates', 'content-schema.rules'],
    category: 'reference', lines: 0,
  },
  {
    id: 'ga:renderer', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['renderer.backend', 'renderer.materials', 'renderer.lighting', 'renderer.postfx', 'renderer.stats'],
    category: 'reference', lines: 430,
  },
  {
    id: 'ga:physics', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['physics.bodies', 'physics.queries'],
    category: 'reference', lines: 340,
  },
  {
    id: 'ga:terrain', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['terrain.field', 'terrain.queries'],
    category: 'reference', lines: 250,
  },
  {
    id: 'ga:animation', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['animation.controller', 'animation.clips'],
    category: 'reference', lines: 300,
  },
  {
    id: 'ga:vfx', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['vfx.director', 'vfx.recipes'],
    category: 'reference', lines: 230,
  },
  {
    id: 'ga:assets', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['assets.stream', 'assets.registry'],
    category: 'reference', lines: 260,
  },
  {
    id: 'ga:npc-simulator', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['npc.cognition', 'npc.traits', 'npc.memory'],
    category: 'simulation', lines: 0,
  },
  {
    id: 'ga:ecology', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['ecology.populations', 'ecology.spirit-veins', 'ecology.demography'],
    category: 'simulation', lines: 0,
  },
  {
    id: 'ga:economy', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['economy.markets', 'economy.trade', 'economy.factions'],
    category: 'simulation', lines: 0,
  },
  {
    id: 'ga:history', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['history.events', 'history.chains', 'history.ruins'],
    category: 'simulation', lines: 0,
  },
  {
    id: 'ga:cultivation', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['cultivation.realm', 'cultivation.qi', 'cultivation.tribulation'],
    category: 'simulation', lines: 1669,
  },
  {
    id: 'ga:combat', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['combat.state', 'combat.execution'],
    category: 'simulation', lines: 1005,
  },
  {
    id: 'ga:quest', version: '0.1.0', dependencies: ['ga:determinism'],
    capabilities: ['quest.dialogue', 'quest.state', 'quest.narrative'],
    category: 'simulation', lines: 1660,
  },
];

export const SAFETY_RAILS = [
  'Exclusive lease — one architect session holds the worktree at a time.',
  'Isolated git worktree — sandbox changes never touch main directly.',
  'Machine-readable roadmap — every change traces to a roadmap entry.',
  'Adversarial review — a second agent must attempt to break every branch.',
  'Evidence package — every release includes hashes, logs, and test output.',
  'Three-strikes halt — three consecutive failures stop the architect.',
  'Protected files — kernel, determinism stack, and bible cannot be rewritten casually.',
  'Dependency research gate — new dependencies require a research ADR.',
  'Determinism firewall — simulation code cannot use Math.random/Date.now/etc.',
  'Tamper-evident audit — every tool dispatch is SHA-256 chained.',
];

export const CONFORMANCE_FILES: { name: string; path: string; expected: number }[] = [
  { name: 'Kernel', path: 'src/engine/conformance-test.ts', expected: 37 },
  { name: 'Architect', path: 'src/engine/architect/conformance-test.ts', expected: 113 },
  { name: 'Reference Plugins', path: 'src/engine/plugins/reference/conformance-test.ts', expected: 252 },
  { name: 'Simulation', path: 'src/engine/plugins/simulation/conformance-test.ts', expected: 247 },
  { name: 'Cultivation', path: 'src/engine/plugins/simulation/ga-cultivation-conformance.ts', expected: 203 },
  { name: 'Combat', path: 'src/engine/plugins/simulation/ga-combat-conformance.ts', expected: 202 },
  { name: 'Combat Arts', path: 'src/engine/plugins/simulation/ga-combat-arts-conformance.ts', expected: 249 },
  { name: 'Quest', path: 'src/engine/plugins/simulation/ga-quest-conformance.ts', expected: 224 },
  { name: 'Prime Agent', path: 'src/engine/architect/providers/prime-agent/conformance-test.ts', expected: 12 },
  { name: 'UI Actions', path: 'src/lib/studio-ui/conformance-test.ts', expected: 45 },
  { name: 'Determinism Primitives', path: 'src/lib/determinism/primitives-conformance.ts', expected: 13 },
  { name: 'Genesis Coverage', path: 'src/lib/genesis/genesis-conformance.ts', expected: 105 },
  { name: 'Definition Database', path: 'src/lib/engine/definitions-conformance.ts', expected: 25 },
  { name: 'World Production', path: 'src/lib/worldproduction/production-conformance.ts', expected: 108 },
  { name: 'Genesis Gauntlet', path: 'src/lib/genesis/gauntlet-conformance.ts', expected: 16 },
  { name: 'Assets Pipeline', path: 'src/engine/assets/conformance-test.ts', expected: 68 },
  { name: 'Terrain Viewport', path: 'src/engine/frontier/terrain-conformance-test.ts', expected: 56 },
  { name: 'Settlement Day', path: 'src/engine/simulation/settlement-day-conformance.ts', expected: 42 },
  { name: 'Matter Conservation', path: 'src/engine/world/matter/matter-conformance.ts', expected: 54 },
  { name: 'Law Interaction', path: 'src/engine/laws/laws-conformance.ts', expected: 98 },
  { name: 'Cosmology', path: 'src/engine/cosmos/cosmos-conformance.ts', expected: 108 },
];
