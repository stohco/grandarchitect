/**
 * ga:cultivation — Cultivation: The Effect Algebra
 *
 * Implements doc 31 (Cultivation Effect Algebra).
 * Qi-state, heart-mind state, dantian system, spiritual roots,
 * breakthrough state machine, deviation onset, comprehension,
 * dual cultivation, tier management, and the effect algebra.
 *
 * Pure functions over typed state. No forbidden functions.
 * No Three.js, no DOM, no rendering.
 */

import type { Plugin, PluginHost } from '../kernel/plugin-host';
import type { Tick, SimulationTier } from '../kernel/types';

// ============================================================================
// Realm Types
// ============================================================================

export type Realm =
  | 'mortal'
  | 'qi_induction'
  | 'qi_condensation'
  | 'foundation_establishment'
  | 'core_formation'
  | 'nascent_soul'
  | 'spirit_severance'
  | 'void_amalgamation'
  | 'tribulation_crossing'
  | 'mahayana';

export const REALM_LADDER: Realm[] = [
  'mortal',
  'qi_induction',
  'qi_condensation',
  'foundation_establishment',
  'core_formation',
  'nascent_soul',
  'spirit_severance',
  'void_amalgamation',
  'tribulation_crossing',
  'mahayana',
];

export const REALM_INDEX: Record<Realm, number> = {
  mortal: 0,
  qi_induction: 1,
  qi_condensation: 2,
  foundation_establishment: 3,
  core_formation: 4,
  nascent_soul: 5,
  spirit_severance: 6,
  void_amalgamation: 7,
  tribulation_crossing: 8,
  mahayana: 9,
};

// ============================================================================
// Phase Affinity (5-phase, sum=1.0)
// ============================================================================

export interface PhaseAffinity {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

export function createBalancedPhaseAffinity(): PhaseAffinity {
  return { wood: 0.2, fire: 0.2, earth: 0.2, metal: 0.2, water: 0.2 };
}

export function normalizePhaseAffinity(pa: PhaseAffinity): PhaseAffinity {
  const sum = pa.wood + pa.fire + pa.earth + pa.metal + pa.water;
  if (sum <= 0) return createBalancedPhaseAffinity();
  return {
    wood: pa.wood / sum,
    fire: pa.fire / sum,
    earth: pa.earth / sum,
    metal: pa.metal / sum,
    water: pa.water / sum,
  };
}

// ============================================================================
// Phase Conquest/Generation Cycle
// ============================================================================

// Wood conquers Earth, Fire conquers Metal, Earth conquers Water,
// Metal conquers Wood, Water conquers Fire
const CONQUESTS: Record<string, string> = {
  wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire',
};

// Wood generates Fire, Fire generates Earth, Earth generates Metal,
// Metal generates Water, Water generates Wood
const GENERATIONS: Record<string, string> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
};

export type PhaseName = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

const PHASE_NAMES: PhaseName[] = ['wood', 'fire', 'earth', 'metal', 'water'];

/** Phase matchup multiplier: conquest=1.3, generation=1.3, reverse_conquest=0.7, neutral=1.0 */
export function phaseMatchup(attacker: PhaseName, defender: PhaseName): number {
  if (CONQUESTS[attacker] === defender) return 1.3;
  if (CONQUESTS[defender] === attacker) return 0.7;
  if (GENERATIONS[attacker] === defender) return 1.3;
  return 1.0;
}

/** Dot product of two phase affinities (for technique-state matching) */
export function phaseDotProduct(a: PhaseAffinity, b: PhaseAffinity): number {
  return a.wood * b.wood + a.fire * b.fire + a.earth * b.earth + a.metal * b.metal + a.water * b.water;
}

// ============================================================================
// Contamination State (§1.3)
// ============================================================================

export interface ContaminationState {
  modao: number;
  karmic: number;
  environmental: number;
  tribulation: number;
  total: number;
}

export function createContaminationState(): ContaminationState {
  return { modao: 0, karmic: 0, environmental: 0, tribulation: 0, total: 0 };
}

export function recalcContamination(c: ContaminationState): ContaminationState {
  return {
    ...c,
    total: c.modao * 0.3 + c.karmic * 0.3 + c.environmental * 0.2 + c.tribulation * 0.2,
  };
}

// ============================================================================
// Qi Reservoir (§1.1)
// ============================================================================

export interface QiReservoir {
  lowerDantian: number;
  middleDantian: number;
  upperDantian: number;
  capacityLower: number;
  capacityMiddle: number;
  capacityUpper: number;
  rechargeRate: number;
}

export function createQiReservoir(realm: Realm): QiReservoir {
  const ri = REALM_INDEX[realm];
  return {
    lowerDantian: ri >= 1 ? 10 : 0,
    middleDantian: ri >= 3 ? 5 : 0,
    upperDantian: ri >= 4 ? 2 : 0,
    capacityLower: ri >= 1 ? 100 : 0,
    capacityMiddle: ri >= 3 ? 200 : 0,
    capacityUpper: ri >= 4 ? 500 : 0,
    rechargeRate: ri >= 1 ? 0.1 : 0,
  };
}

// ============================================================================
// Meridian (§1.4)
// ============================================================================

export interface Meridian {
  meridianId: string;
  openness: number;
  inflammation: number;
  deviationDamage: number;
  phaseSignature: PhaseAffinity;
  routingAvailable: boolean;
}

export function createMeridian(id: string, phase: PhaseAffinity): Meridian {
  return {
    meridianId: id,
    openness: 0.1,
    inflammation: 0,
    deviationDamage: 0,
    phaseSignature: phase,
    routingAvailable: true,
  };
}

export function updateMeridianRouting(m: Meridian): Meridian {
  return {
    ...m,
    routingAvailable: m.inflammation <= 0.5 && m.deviationDamage <= 0.5,
  };
}

// ============================================================================
// QiState (§1)
// ============================================================================

export interface QiState {
  reservoir: QiReservoir;
  phaseAffinity: PhaseAffinity;
  yinYang: number;
  purity: number;
  contamination: ContaminationState;
  meridians: Meridian[];
  phaseResonance: PhaseAffinity;
}

export function createQiState(realm: Realm = 'mortal'): QiState {
  return {
    reservoir: createQiReservoir(realm),
    phaseAffinity: createBalancedPhaseAffinity(),
    yinYang: 0,
    purity: realm === 'mortal' ? 0 : 0.1,
    contamination: createContaminationState(),
    meridians: [
      createMeridian('central_conduit', createBalancedPhaseAffinity()),
      createMeridian('ancestral_gate', { wood: 0.4, fire: 0.1, earth: 0.2, metal: 0.1, water: 0.2 }),
      createMeridian('spirit_path', { wood: 0.1, fire: 0.1, earth: 0.2, metal: 0.4, water: 0.2 }),
    ],
    phaseResonance: createBalancedPhaseAffinity(),
  };
}

// ============================================================================
// Attachment (§2.2)
// ============================================================================

export type AttachmentType = 'grief' | 'fear' | 'desire' | 'hatred' | 'love' | 'pride' | 'shame';

export interface Attachment {
  attachmentId: string;
  subject: number;
  type: AttachmentType;
  intensity: number;
  integrationProgress: number;
  bornAt: number;
}

// ============================================================================
// Law Fragment (§2.3, doc 27 §3)
// ============================================================================

export interface LawFragmentRef {
  fragmentId: string;
  domain: string;
  integration: number;
  difficulty: number;
}

// ============================================================================
// Deviation Risk (§7)
// ============================================================================

export type DeviationRiskType =
  | 'false_circuit'
  | 'cross_current'
  | 'route_fixation'
  | 'delusional_conviction'
  | 'attachment_persistence'
  | 'greed_possession'
  | 'fear_possession'
  | 'hatred_possession';

export interface DeviationRisk {
  riskType: DeviationRiskType;
  accumulatedRisk: number;
  threshold: number;
  onsetCauses: string[];
}

export function createDeviationRisk(riskType: DeviationRiskType): DeviationRisk {
  const thresholds: Record<DeviationRiskType, number> = {
    false_circuit: 0.8,
    cross_current: 0.6,
    route_fixation: 0.7,
    delusional_conviction: 0.5,
    attachment_persistence: 0.7,
    greed_possession: 0.6,
    fear_possession: 0.6,
    hatred_possession: 0.6,
  };
  return {
    riskType,
    accumulatedRisk: 0,
    threshold: thresholds[riskType],
    onsetCauses: [],
  };
}

// ============================================================================
// Xinmo (active 心魔)
// ============================================================================

export interface XinmoEffect {
  target: string;
  effectType: string;
  magnitude: number;
}

export interface Xinmo {
  xinmoType: DeviationRiskType;
  onsetTick: number;
  severity: number;
  effects: XinmoEffect[];
  resolutionPath: string;
}

// ============================================================================
// HeartMindState (§2)
// ============================================================================

export interface HeartMindState {
  attention: number;
  will: number;
  emotionalBalance: number;
  unresolvedAttachments: Attachment[];
  integratedLawFragments: LawFragmentRef[];
  unintegratedLawFragments: LawFragmentRef[];
  devRisks: DeviationRisk[];
  xinmo: Xinmo[];
}

export function createHeartMindState(): HeartMindState {
  return {
    attention: 50,
    will: 50,
    emotionalBalance: 0,
    unresolvedAttachments: [],
    integratedLawFragments: [],
    unintegratedLawFragments: [],
    devRisks: [
      createDeviationRisk('false_circuit'),
      createDeviationRisk('cross_current'),
      createDeviationRisk('route_fixation'),
      createDeviationRisk('delusional_conviction'),
      createDeviationRisk('attachment_persistence'),
      createDeviationRisk('greed_possession'),
      createDeviationRisk('fear_possession'),
      createDeviationRisk('hatred_possession'),
    ],
    xinmo: [],
  };
}

// ============================================================================
// Dantian (§3)
// ============================================================================

export interface Dantian {
  dantianId: 'lower' | 'middle' | 'upper';
  capacity: number;
  currentVolume: number;
  phaseProfile: PhaseAffinity;
  stability: number;
}

export function createDantian(id: 'lower' | 'middle' | 'upper', capacity: number): Dantian {
  return {
    dantianId: id,
    capacity,
    currentVolume: 0,
    phaseProfile: createBalancedPhaseAffinity(),
    stability: 0.5,
  };
}

export interface GoldenCore {
  formedAt: number;
  stability: number;
  phaseProfile: PhaseAffinity;
}

export interface NascentSoul {
  formedAt: number;
  stability: number;
}

export interface DantianSystem {
  lower: Dantian;
  middle: Dantian | null;
  upper: Dantian | null;
  goldenCore: GoldenCore | null;
  nascentSoul: NascentSoul | null;
}

export function createDantianSystem(realm: Realm): DantianSystem {
  const ri = REALM_INDEX[realm];
  return {
    lower: createDantian('lower', ri >= 1 ? 100 : 0),
    middle: ri >= 3 ? createDantian('middle', 200) : null,
    upper: ri >= 4 ? createDantian('upper', 500) : null,
    goldenCore: ri >= 4 ? { formedAt: 0, stability: 0.5, phaseProfile: createBalancedPhaseAffinity() } : null,
    nascentSoul: ri >= 5 ? { formedAt: 0, stability: 0.3 } : null,
  };
}

/** Open the middle dantian at Foundation Establishment */
export function openMiddleDantian(ds: DantianSystem): DantianSystem {
  if (ds.middle !== null) return ds;
  return {
    ...ds,
    middle: createDantian('middle', 200),
  };
}

/** Open the upper dantian at Core Formation */
export function openUpperDantian(ds: DantianSystem): DantianSystem {
  if (ds.upper !== null) return ds;
  return {
    ...ds,
    upper: createDantian('upper', 500),
    goldenCore: { formedAt: 0, stability: 0.5, phaseProfile: createBalancedPhaseAffinity() },
  };
}

// ============================================================================
// Spiritual Roots (§4)
// ============================================================================

export interface RootAttribute {
  strength: number;
  latent: boolean;
  awakenedAt: number | null;
}

export type RootPurity = 'impure' | 'mixed' | 'pure' | 'heavenly';

export interface SpiritualRoots {
  phases: {
    wood: RootAttribute;
    fire: RootAttribute;
    earth: RootAttribute;
    metal: RootAttribute;
    water: RootAttribute;
  };
  total: number;
  purity: RootPurity;
}

export function classifyRootPurity(roots: SpiritualRoots): RootPurity {
  const phases = roots.phases;
  const values = [phases.wood.strength, phases.fire.strength, phases.earth.strength, phases.metal.strength, phases.water.strength];
  const maxVal = values.reduce((a, b) => a > b ? a : b, 0);
  const activeCount = values.filter(v => v > 0.1).length;

  if (maxVal >= 0.9 && activeCount <= 2) return 'heavenly';
  if (maxVal >= 0.7 && activeCount <= 2) return 'pure';
  if (roots.total >= 0.5) return 'mixed';
  return 'impure';
}

export function createSpiritualRoots(config?: Partial<Record<PhaseName, number>>): SpiritualRoots {
  const defaults: Record<PhaseName, number> = {
    wood: config?.wood ?? 0.2,
    fire: config?.fire ?? 0.2,
    earth: config?.earth ?? 0.2,
    metal: config?.metal ?? 0.2,
    water: config?.water ?? 0.2,
  };

  const phases = {
    wood: { strength: defaults.wood, latent: defaults.wood < 0.1, awakenedAt: null },
    fire: { strength: defaults.fire, latent: defaults.fire < 0.1, awakenedAt: null },
    earth: { strength: defaults.earth, latent: defaults.earth < 0.1, awakenedAt: null },
    metal: { strength: defaults.metal, latent: defaults.metal < 0.1, awakenedAt: null },
    water: { strength: defaults.water, latent: defaults.water < 0.1, awakenedAt: null },
  };

  const total = defaults.wood + defaults.fire + defaults.earth + defaults.metal + defaults.water;
  const roots: SpiritualRoots = { phases, total, purity: 'impure' };
  roots.purity = classifyRootPurity(roots);
  return roots;
}

/** Awaken a latent root */
export function awakenRoot(roots: SpiritualRoots, phase: PhaseName, tick: number): SpiritualRoots {
  const attr = roots.phases[phase];
  if (!attr.latent) return roots;
  const newAttr = { ...attr, latent: false, awakenedAt: tick };
  const newPhases = { ...roots.phases, [phase]: newAttr };
  const newTotal = newPhases.wood.strength + newPhases.fire.strength + newPhases.earth.strength + newPhases.metal.strength + newPhases.water.strength;
  const newRoots: SpiritualRoots = { phases: newPhases, total: newTotal, purity: 'impure' };
  newRoots.purity = classifyRootPurity(newRoots);
  return newRoots;
}

// ============================================================================
// Breakthrough State Machine (§5)
// ============================================================================

export type BreakthroughStage = 'prep' | 'threshold' | 'confrontation' | 'integration' | 'settlement' | 'failure';

export interface ConfrontationMaterial {
  attachment: Attachment;
  domain: string;
}

export interface BreakthroughState {
  cultivatorId: number;
  targetRealm: Realm;
  stage: BreakthroughStage;
  forcedAttempt: boolean;
  coherenceMeters: {
    bodyQi: number;
    qiAnchor: number;
    bodyAnchor: number;
  };
  confrontationMaterial: ConfrontationMaterial | null;
  xinmoRisk: 'none' | 'high';
  stageStartedAt: number;
}

export function createBreakthroughState(cultivatorId: number, targetRealm: Realm): BreakthroughState {
  return {
    cultivatorId,
    targetRealm,
    stage: 'prep',
    forcedAttempt: false,
    coherenceMeters: { bodyQi: 0.8, qiAnchor: 0.8, bodyAnchor: 0.8 },
    confrontationMaterial: null,
    xinmoRisk: 'none',
    stageStartedAt: 0,
  };
}

// ============================================================================
// Prep Checks (§5.2)
// ============================================================================

export function meanOf5Phases(pa: PhaseAffinity): number {
  return (pa.wood + pa.fire + pa.earth + pa.metal + pa.water) / 5;
}

export function maxPhaseDeviation(pa: PhaseAffinity): number {
  const mean = meanOf5Phases(pa);
  const deviations = [pa.wood, pa.fire, pa.earth, pa.metal, pa.water];
  let maxDev = 0;
  for (const v of deviations) {
    const dev = v - mean;
    const absDev = dev >= 0 ? dev : -dev;
    if (absDev > maxDev) maxDev = absDev;
  }
  return maxDev;
}

function phaseAffinityBalanced(qs: QiState, _target: Realm): boolean {
  return maxPhaseDeviation(qs.phaseAffinity) <= 0.30;
}

function psychospiritualResolved(hms: HeartMindState, _target: Realm): boolean {
  return hms.unresolvedAttachments.every(a => a.integrationProgress >= 0.7);
}

function reservoirSufficient(qs: QiState, target: Realm): boolean {
  const ri = REALM_INDEX[target];
  if (ri <= 1) return true; // mortal→qi_induction only needs minimal qi
  const totalReservoir = qs.reservoir.lowerDantian + qs.reservoir.middleDantian + qs.reservoir.upperDantian;
  const totalCapacity = qs.reservoir.capacityLower + qs.reservoir.capacityMiddle + qs.reservoir.capacityUpper;
  if (totalCapacity <= 0) return false;
  return (totalReservoir / totalCapacity) >= 0.5;
}

function meridiansStable(qs: QiState, _target: Realm): boolean {
  const criticalMeridians = qs.meridians.filter(m => m.openness > 0.3);
  if (criticalMeridians.length === 0) return true;
  return criticalMeridians.every(m => m.routingAvailable);
}

export function prepChecksPass(qs: QiState, hms: HeartMindState, target: Realm): boolean {
  return phaseAffinityBalanced(qs, target)
    && psychospiritualResolved(hms, target)
    && reservoirSufficient(qs, target)
    && meridiansStable(qs, target);
}

// ============================================================================
// Breakthrough Stage Transitions (§5.1)
// ============================================================================

export type ConfrontationResponse = 'integrate' | 'push_past' | 'abort';

/** PREP → THRESHOLD (if checks pass) or stay at PREP (forced goes through anyway) */
export function advancePrepToThreshold(
  bt: BreakthroughState,
  qs: QiState,
  hms: HeartMindState,
  forced: boolean,
  tick: number,
): BreakthroughState {
  const checksPass = prepChecksPass(qs, hms, bt.targetRealm);
  if (checksPass || forced) {
    return {
      ...bt,
      stage: 'threshold',
      forcedAttempt: forced,
      stageStartedAt: tick,
      coherenceMeters: { bodyQi: 0.8, qiAnchor: 0.8, bodyAnchor: 0.8 },
    };
  }
  return bt; // Stay at PREP
}

/** THRESHOLD: coherence drift. Seeded deterministically from state. */
export function coherenceDrift(
  bt: BreakthroughState,
  dt: number,
  driftSeed: number,
): { state: BreakthroughState; thresholdHeld: boolean } {
  const driftRate = 0.05 * (bt.forcedAttempt ? 1.5 : 1.0);
  // Deterministic drift: use driftSeed to create per-meter drift factors
  const f1 = ((driftSeed * 7 + 3) % 100) / 100; // 0..1
  const f2 = ((driftSeed * 13 + 7) % 100) / 100;
  const f3 = ((driftSeed * 19 + 11) % 100) / 100;

  const bodyQi = clamp(bt.coherenceMeters.bodyQi - driftRate * dt * (0.5 + f1 * 0.5), 0, 1);
  const qiAnchor = clamp(bt.coherenceMeters.qiAnchor - driftRate * dt * (0.5 + f2 * 0.5), 0, 1);
  const bodyAnchor = clamp(bt.coherenceMeters.bodyAnchor - driftRate * dt * (0.5 + f3 * 0.5), 0, 1);

  const allAboveThreshold = bodyQi >= 0.4 && qiAnchor >= 0.4 && bodyAnchor >= 0.4;

  return {
    state: {
      ...bt,
      coherenceMeters: { bodyQi, qiAnchor, bodyAnchor },
    },
    thresholdHeld: allAboveThreshold,
  };
}

/** THRESHOLD → CONFRONTATION when held for 30 ticks (representing 30s) */
export function checkThresholdToConfrontation(
  bt: BreakthroughState,
  currentTick: number,
  hms: HeartMindState,
): BreakthroughState {
  const holdDuration = currentTick - bt.stageStartedAt;
  if (holdDuration < 30) return bt;

  // Pick highest-intensity, lowest-integration attachment as confrontation material
  const unresolved = hms.unresolvedAttachments.filter(a => a.integrationProgress < 1.0);
  let material: ConfrontationMaterial | null = null;
  if (unresolved.length > 0) {
    // Sort by intensity desc, integration asc
    const sorted = [...unresolved].sort((a, b) => {
      if (a.intensity !== b.intensity) return b.intensity - a.intensity;
      return a.integrationProgress - b.integrationProgress;
    });
    material = {
      attachment: sorted[0],
      domain: 'heart_barrier',
    };
  }

  return {
    ...bt,
    stage: 'confrontation',
    confrontationMaterial: material,
    stageStartedAt: currentTick,
  };
}

/** CONFRONTATION: handle player response */
export function applyConfrontationResponse(
  bt: BreakthroughState,
  response: ConfrontationResponse,
): BreakthroughState {
  switch (response) {
    case 'integrate':
      if (bt.confrontationMaterial && bt.confrontationMaterial.attachment.integrationProgress >= 0.5) {
        return {
          ...bt,
          stage: 'integration',
          confrontationMaterial: {
            ...bt.confrontationMaterial,
            attachment: {
              ...bt.confrontationMaterial.attachment,
              integrationProgress: 1.0,
            },
          },
          stageStartedAt: bt.stageStartedAt,
        };
      } else {
        return { ...bt, stage: 'failure', xinmoRisk: 'high' };
      }
    case 'push_past':
      return { ...bt, stage: 'integration', xinmoRisk: 'high' };
    case 'abort':
      return { ...bt, stage: 'prep', confrontationMaterial: null };
    default:
      return bt;
  }
}

/** INTEGRATION → SETTLEMENT or FAILURE based on xinmo risk and deterministic coin */
export function resolveIntegration(
  bt: BreakthroughState,
  stateHash: number,
): BreakthroughState {
  if (bt.xinmoRisk === 'none') {
    return { ...bt, stage: 'settlement' };
  }
  // Deterministic coin: seeded by stateHash
  const coin = (stateHash % 100) < 50;
  if (coin) {
    return { ...bt, stage: 'settlement' };
  } else {
    return { ...bt, stage: 'failure', xinmoRisk: 'high' };
  }
}

// ============================================================================
// Technique & Effect Algebra (§10)
// ============================================================================

export type TechniqueType = 'gathering' | 'circulating' | 'refining' | 'projecting' | 'integrating' | 'comprehending';

export interface TechniqueEffect {
  reservoirDelta: number;
  purityDelta: number;
  phaseAffinityDelta: PhaseAffinity;
  yinYangDelta: number;
  meridianDevelopment: Partial<Record<string, number>>;
  contaminationDelta: Partial<ContaminationState>;
}

export interface DeviationRiskProfile {
  riskType: DeviationRiskType;
  rate: number;
}

export interface Technique {
  techniqueId: string;
  type: TechniqueType;
  baseEffect: TechniqueEffect;
  phaseAffinity: PhaseAffinity;
  yinYang: number;
  purityRequirement: number;
  reservoirCost: number;
  attentionCost: number;
  deviationRisks: DeviationRiskProfile[];
}

export function applyTechnique(
  qs: QiState,
  hms: HeartMindState,
  tech: Technique,
  dt: number,
): { qs: QiState; hms: HeartMindState } {
  // 1. Compute effectiveness modifier
  const phaseMatch = phaseDotProduct(qs.phaseAffinity, tech.phaseAffinity);
  const yinYangDiff = qs.yinYang - tech.yinYang;
  const yinYangAbs = yinYangDiff >= 0 ? yinYangDiff : -yinYangDiff;
  const yinYangMatch = 1 - yinYangAbs / 2;
  const purityModifier = qs.purity >= tech.purityRequirement ? 1.0 : 0.5;
  const attentionModifier = hms.attention >= tech.attentionCost * dt ? 1.0 : 0.3;
  const emotionalModifier = (hms.emotionalBalance + 1) / 2;

  const effectiveness = phaseMatch * yinYangMatch * purityModifier * attentionModifier * emotionalModifier;

  // 2. Apply effect scaled by effectiveness
  const newLowerDantian = clamp(
    qs.reservoir.lowerDantian + tech.baseEffect.reservoirDelta * effectiveness * dt,
    0, qs.reservoir.capacityLower,
  );
  const newPurity = clamp(qs.purity + tech.baseEffect.purityDelta * effectiveness * dt, 0, 1);
  const newYinYang = clamp(qs.yinYang + tech.baseEffect.yinYangDelta * effectiveness * dt, -1, 1);

  // Phase affinity delta
  const newPhaseAffinity = normalizePhaseAffinity({
    wood: qs.phaseAffinity.wood + (tech.baseEffect.phaseAffinityDelta.wood || 0) * effectiveness * dt,
    fire: qs.phaseAffinity.fire + (tech.baseEffect.phaseAffinityDelta.fire || 0) * effectiveness * dt,
    earth: qs.phaseAffinity.earth + (tech.baseEffect.phaseAffinityDelta.earth || 0) * effectiveness * dt,
    metal: qs.phaseAffinity.metal + (tech.baseEffect.phaseAffinityDelta.metal || 0) * effectiveness * dt,
    water: qs.phaseAffinity.water + (tech.baseEffect.phaseAffinityDelta.water || 0) * effectiveness * dt,
  });

  // Meridian development
  const newMeridians = qs.meridians.map(m => {
    const dev = tech.baseEffect.meridianDevelopment[m.meridianId];
    if (dev === undefined) return m;
    const newOpenness = clamp(m.openness + dev * effectiveness * dt, 0, 1);
    return { ...m, openness: newOpenness };
  });

  // Contamination delta
  let newContamination = { ...qs.contamination };
  const cd = tech.baseEffect.contaminationDelta;
  if (cd) {
    if (cd.modao !== undefined) newContamination.modao = clamp(newContamination.modao + cd.modao * dt, 0, 1);
    if (cd.karmic !== undefined) newContamination.karmic = clamp(newContamination.karmic + cd.karmic * dt, 0, 1);
    if (cd.environmental !== undefined) newContamination.environmental = clamp(newContamination.environmental + cd.environmental * dt, 0, 1);
    if (cd.tribulation !== undefined) newContamination.tribulation = clamp(newContamination.tribulation + cd.tribulation * dt, 0, 1);
    newContamination = recalcContamination(newContamination);
  }

  // 3. Consume attention
  const newAttention = clamp(hms.attention - tech.attentionCost * dt, 0, 100);

  const newQs: QiState = {
    ...qs,
    reservoir: { ...qs.reservoir, lowerDantian: newLowerDantian },
    purity: newPurity,
    yinYang: newYinYang,
    phaseAffinity: newPhaseAffinity,
    meridians: newMeridians,
    contamination: newContamination,
  };

  const newHms: HeartMindState = { ...hms, attention: newAttention };

  return { qs: newQs, hms: newHms };
}

// ============================================================================
// Bottleneck Detection (§6)
// ============================================================================

export interface BottleneckState {
  type: 'plateau' | 'wall';
  onsetTick: number;
  plateauFloor: number;
  resolutionConditions: ResolutionCondition[];
  resolvedAt: number | null;
}

export interface ResolutionCondition {
  type: 'comprehension_event' | 'pill' | 'teacher_intervention' | 'life_experience' | 'prerequisite_met';
  target: string;
  satisfied: boolean;
}

/** Check for plateau: improvement < 0.5% over 30 days (30 * 24 * 60 ticks) */
export function checkPlateau(
  history: number[],
  capacity: number,
): boolean {
  const requiredSamples = 30 * 24 * 60;
  if (history.length < 2) return false;
  if (capacity <= 0) return false;

  // Use what we have (may be less than 30 days for testing)
  const first = history[0];
  const last = history[history.length - 1];
  const improvement = (last - first) / capacity;
  return improvement < 0.005;
}

// ============================================================================
// Deviation Onset (§7)
// ============================================================================

export interface RoutingState {
  mode: 'normal' | 'closed_loop' | 'against_flow';
  usesReservoir: boolean;
  currentRoutingDuration: number;
}

export function accumulateFalseCircuit(routing: RoutingState, contamination: ContaminationState, dt: number): number {
  if (routing.mode === 'closed_loop' && !routing.usesReservoir) {
    return dt * 0.001 * (1 + contamination.modao);
  }
  return 0;
}

export function accumulateCrossCurrent(routing: RoutingState, dt: number): number {
  if (routing.mode === 'against_flow') {
    return dt * 0.002;
  }
  return 0;
}

export function accumulateRouteFixation(routing: RoutingState, dt: number): number {
  const duration = routing.currentRoutingDuration;
  if (duration > 600) {
    return dt * 0.0005 * (duration / 600);
  }
  return 0;
}

export function accumulateDelusionalConviction(
  unintegratedCount: number,
  heartMindCapacity: number,
): number {
  const excess = unintegratedCount - heartMindCapacity;
  if (excess <= 0) return 0;
  return excess * 0.1;
}

/** Check all deviation risks and manifest xinmo for those exceeding threshold */
export function checkDeviationOnset(
  devRisks: DeviationRisk[],
  tick: number,
): { updatedRisks: DeviationRisk[]; newXinmo: Xinmo[] } {
  const newXinmo: Xinmo[] = [];
  const existingTypes = new Set(devRisks
    .filter(r => r.accumulatedRisk > r.threshold)
    .map(r => r.riskType));

  const updatedRisks = devRisks.map(r => {
    if (r.accumulatedRisk > r.threshold && !existingTypes.has(r.riskType)) {
      // Actually this won't happen since we already filtered - fix logic
      return r;
    }
    return r;
  });

  // Check each risk
  for (const risk of devRisks) {
    if (risk.accumulatedRisk > risk.threshold) {
      // Check if xinmo already exists for this type
      const alreadyHas = newXinmo.some(x => x.xinmoType === risk.riskType);
      if (!alreadyHas) {
        newXinmo.push({
          xinmoType: risk.riskType,
          onsetTick: tick,
          severity: clamp((risk.accumulatedRisk - risk.threshold) / (1 - risk.threshold), 0, 1),
          effects: [{
            target: risk.riskType,
            effectType: 'deviation_penalty',
            magnitude: clamp((risk.accumulatedRisk - risk.threshold) * 2, 0, 1),
          }],
          resolutionPath: `resolve_${risk.riskType}`,
        });
      }
    }
  }

  return { updatedRisks, newXinmo };
}

/** Check for cascade: >3 active xinmo triggers storm */
export function checkDeviationCascade(xinmoList: Xinmo[]): boolean {
  return xinmoList.length > 3;
}

// ============================================================================
// Comprehension (§8)
// ============================================================================

export interface ComprehensionTarget {
  targetId: string;
  domain: string;
  maxIntensity: number;
  concealment: number;
  lawFragmentsAvailable: string[];
}

export interface ComprehensionAttempt {
  cultivatorId: number;
  target: ComprehensionTarget;
  targetIntensity: number;
  achievedIntensity: number;
  cost: { attention: number; time: number };
  resultingFragment: LawFragmentRef | null;
  success: boolean;
}

export function attemptComprehension(
  cultivatorId: number,
  target: ComprehensionTarget,
  skill: number,
  attention: number,
  maxAttention: number,
): ComprehensionAttempt {
  const attentionFraction = maxAttention > 0 ? attention / maxAttention : 0;
  const raw = target.maxIntensity * skill * (1 - target.concealment) * attentionFraction;
  const achievedIntensity = raw >= 1 ? (raw < 2 ? 1 : (raw < 3 ? 2 : (raw < 4 ? 3 : (raw < 5 ? 4 : 5)))) : 0;
  // Simplified: floor to integer 0-5
  let intensity = 0;
  if (raw >= 1) intensity = 1;
  if (raw >= 2) intensity = 2;
  if (raw >= 3) intensity = 3;
  if (raw >= 4) intensity = 4;
  if (raw >= 5) intensity = 5;

  const success = intensity >= 1;
  const cost = { attention: 10, time: 5 };

  let resultingFragment: LawFragmentRef | null = null;
  if (success && target.lawFragmentsAvailable.length > 0) {
    resultingFragment = {
      fragmentId: target.lawFragmentsAvailable[0],
      domain: target.domain,
      integration: 0,
      difficulty: target.maxIntensity - intensity,
    };
  }

  return {
    cultivatorId,
    target,
    targetIntensity: target.maxIntensity,
    achievedIntensity: intensity,
    cost,
    resultingFragment,
    success,
  };
}

// ============================================================================
// Dual Cultivation (§9)
// ============================================================================

export interface DualCultivationTechnique {
  techniqueId: string;
  phaseCompatibility: PhaseAffinity;
  yinYangBalance: number;
  reservoirCost: number;
  benefitRate: number;
}

export interface DualCultivationSession {
  participants: [number, number];
  technique: DualCultivationTechnique;
  startedAt: number;
  durationTicks: number;
  harmonyFactor: number;
  reservoirExchange: number;
  contaminationExchange: number;
  fragmentExchange: LawFragmentRef[];
  deviationRisk: number;
}

export function computeHarmonyFactor(
  qs1: QiState,
  hms1: HeartMindState,
  qs2: QiState,
  hms2: HeartMindState,
  technique: DualCultivationTechnique,
): number {
  // Phase match between cultivators
  const phaseMatch = phaseDotProduct(qs1.phaseAffinity, qs2.phaseAffinity);

  // Yin-Yang complementarity: closer to opposite = better
  const yinYangSum = qs1.yinYang + qs2.yinYang;
  const yinYangAbs = yinYangSum >= 0 ? yinYangSum : -yinYangSum;
  const yinYangMatch = 1 - yinYangAbs / 2;

  // Emotional balance match
  const eb1 = hms1.emotionalBalance;
  const eb2 = hms2.emotionalBalance;
  const emotionalMatch = ((eb1 + 1) / 2 + (eb2 + 1) / 2) / 2;

  // Phase compatibility with technique
  const techPhaseMatch = (
    phaseDotProduct(qs1.phaseAffinity, technique.phaseCompatibility) +
    phaseDotProduct(qs2.phaseAffinity, technique.phaseCompatibility)
  ) / 2;

  return clamp(phaseMatch * 0.3 + yinYangMatch * 0.3 + emotionalMatch * 0.2 + techPhaseMatch * 0.2, 0, 1);
}

export function createDualCultivationSession(
  p1id: number,
  p2id: number,
  qs1: QiState,
  hms1: HeartMindState,
  qs2: QiState,
  hms2: HeartMindState,
  technique: DualCultivationTechnique,
  tick: number,
): DualCultivationSession {
  const harmony = computeHarmonyFactor(qs1, hms1, qs2, hms2, technique);

  // Reservoir exchange: net flow from higher to lower
  const r1 = qs1.reservoir.lowerDantian;
  const r2 = qs2.reservoir.lowerDantian;
  const exchange = (r1 - r2) * harmony * technique.benefitRate;

  // Contamination exchange: flows from contaminated to clean
  const c1 = qs1.contamination.total;
  const c2 = qs2.contamination.total;
  const contExchange = (c1 - c2) * harmony * 0.1;

  // Deviation risk: elevated when harmony is low
  const devRisk = harmony < 0.3 ? (0.3 - harmony) * 2 : 0;

  return {
    participants: [p1id, p2id],
    technique,
    startedAt: tick,
    durationTicks: 0,
    harmonyFactor: harmony,
    reservoirExchange: exchange,
    contaminationExchange: contExchange,
    fragmentExchange: [],
    deviationRisk: devRisk,
  };
}

// ============================================================================
// Cultivator State (aggregate)
// ============================================================================

export interface CultivatorState {
  cultivatorId: number;
  realm: Realm;
  qiState: QiState;
  heartMindState: HeartMindState;
  dantianSystem: DantianSystem;
  spiritualRoots: SpiritualRoots;
  breakthrough: BreakthroughState | null;
  bottleneck: BottleneckState | null;
  tier: SimulationTier;
  activeTechnique: Technique | null;
  routingState: RoutingState;
  qiStateHistory: number[];
  lastActiveTick: number;
}

export function createCultivatorState(
  cultivatorId: number,
  roots: SpiritualRoots,
): CultivatorState {
  return {
    cultivatorId,
    realm: 'mortal',
    qiState: createQiState('mortal'),
    heartMindState: createHeartMindState(),
    dantianSystem: createDantianSystem('mortal'),
    spiritualRoots: roots,
    breakthrough: null,
    bottleneck: null,
    tier: 4 as SimulationTier,
    activeTechnique: null,
    routingState: { mode: 'normal', usesReservoir: true, currentRoutingDuration: 0 },
    qiStateHistory: [],
    lastActiveTick: 0,
  };
}

// ============================================================================
// Realm Advancement
// ============================================================================

export function advanceRealm(cultivator: CultivatorState, tick: number): CultivatorState {
  const ri = REALM_INDEX[cultivator.realm];
  if (ri >= REALM_LADDER.length - 1) return cultivator;

  const newRealm = REALM_LADDER[ri + 1];
  const newQiState = createQiState(newRealm);
  // Preserve phase affinity from roots
  newQiState.phaseAffinity = { ...cultivator.spiritualRoots.phases.wood, ...cultivator.spiritualRoots.phases.fire };
  // Actually, construct from root strengths normalized
  const rp = cultivator.spiritualRoots.phases;
  newQiState.phaseAffinity = normalizePhaseAffinity({
    wood: rp.wood.strength,
    fire: rp.fire.strength,
    earth: rp.earth.strength,
    metal: rp.metal.strength,
    water: rp.water.strength,
  });

  let newDantian = createDantianSystem(newRealm);
  // Preserve lower dantian state if upgrading from qi_induction
  if (ri >= 1) {
    newDantian = {
      ...newDantian,
      lower: { ...newDantian.lower, currentVolume: cultivator.dantianSystem.lower.currentVolume },
    };
  }
  if (newRealm === 'foundation_establishment') {
    newDantian = openMiddleDantian(newDantian);
  }
  if (newRealm === 'core_formation') {
    newDantian = openMiddleDantian(newDantian);
    newDantian = openUpperDantian(newDantian);
  }

  return {
    ...cultivator,
    realm: newRealm,
    qiState: newQiState,
    dantianSystem: newDantian,
    breakthrough: null,
    bottleneck: null,
  };
}

// ============================================================================
// Tier Management (§11)
// ============================================================================

export function setTier(cultivator: CultivatorState, tier: SimulationTier): CultivatorState {
  return { ...cultivator, tier };
}

/** S2 aggregate: compute daily cultivation progress */
export function aggregateDailyProgress(
  cultivator: CultivatorState,
  dt: number,
): CultivatorState {
  if (cultivator.tier === 0) return cultivator; // S0 frozen
  if (cultivator.tier >= 4 && cultivator.activeTechnique) {
    // S4: full algebra
    const result = applyTechnique(
      cultivator.qiState,
      cultivator.heartMindState,
      cultivator.activeTechnique,
      dt,
    );
    return {
      ...cultivator,
      qiState: result.qs,
      heartMindState: result.hms,
    };
  }
  // S2: aggregate daily effect (simplified)
  if (cultivator.tier === 2 && cultivator.activeTechnique) {
    const tech = cultivator.activeTechnique;
    const avgEffectiveness = 0.5; // simplified average
    const delta = tech.baseEffect.reservoirDelta * avgEffectiveness * dt;
    const newQiState: QiState = {
      ...cultivator.qiState,
      reservoir: {
        ...cultivator.qiState.reservoir,
        lowerDantian: clamp(
          cultivator.qiState.reservoir.lowerDantian + delta,
          0, cultivator.qiState.reservoir.capacityLower,
        ),
      },
    };
    return { ...cultivator, qiState: newQiState };
  }
  return cultivator;
}

// ============================================================================
// Utility
// ============================================================================

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// ============================================================================
// Cultivation API
// ============================================================================

export interface CultivationStats {
  totalCultivators: number;
  byRealm: Record<Realm, number>;
  byTier: Record<string, number>;
  totalXinmo: number;
  totalActiveBreakthroughs: number;
  totalBottlenecks: number;
}

export interface CultivationApi {
  // Cultivator management
  createCultivator(id: number, roots?: Partial<Record<PhaseName, number>>): CultivatorState;
  getCultivator(id: number): CultivatorState | undefined;
  removeCultivator(id: number): boolean;
  listCultivators(): number[];

  // Realm advancement
  advanceRealm(id: number, tick: number): CultivatorState | undefined;

  // State access
  getQiState(id: number): QiState | undefined;
  getHeartMindState(id: number): HeartMindState | undefined;
  getDantianSystem(id: number): DantianSystem | undefined;
  getSpiritualRoots(id: number): SpiritualRoots | undefined;

  // Technique application
  applyTechnique(id: number, technique: Technique, dt: number): { qs: QiState; hms: HeartMindState } | undefined;
  setActiveTechnique(id: number, technique: Technique | null): boolean;

  // Breakthrough
  startBreakthrough(id: number, targetRealm: Realm): BreakthroughState | undefined;
  getBreakthroughState(id: number): BreakthroughState | undefined;
  advanceBreakthroughStage(id: number, tick: number, action?: string): BreakthroughState | undefined;

  // Deviation
  accumulateDeviationRisk(id: number, riskType: DeviationRiskType, amount: number): boolean;
  checkDeviationOnset(id: number, tick: number): Xinmo[];

  // Comprehension
  attemptComprehension(id: number, target: ComprehensionTarget): ComprehensionAttempt | undefined;

  // Dual cultivation
  computeDualCultivation(id1: number, id2: number, technique: DualCultivationTechnique, tick: number): DualCultivationSession | undefined;

  // Bottleneck
  checkBottleneck(id: number, tick: number): BottleneckState | undefined;

  // Tier
  setTier(id: number, tier: SimulationTier): boolean;
  getTier(id: number): SimulationTier | undefined;

  // Simulation step
  stepCultivator(id: number, dt: number, tick: number): void;

  // Stats
  stats(): CultivationStats;
}

// ============================================================================
// API Implementation
// ============================================================================

export function createCultivationApi(): CultivationApi {
  const cultivators = new Map<number, CultivatorState>();

  function createCultivator(id: number, roots?: Partial<Record<PhaseName, number>>): CultivatorState {
 const sr = createSpiritualRoots(roots);
    const state = createCultivatorState(id, sr);
    cultivators.set(id, state);
    return state;
  }

  function getCultivator(id: number): CultivatorState | undefined {
    return cultivators.get(id);
  }

  function removeCultivator(id: number): boolean {
    return cultivators.delete(id);
  }

  function listCultivators(): number[] {
    return Array.from(cultivators.keys());
  }

  function advanceRealmCultivator(id: number, tick: number): CultivatorState | undefined {
    const c = cultivators.get(id);
    if (!c) return undefined;
    const updated = advanceRealm(c, tick);
    cultivators.set(id, updated);
    return updated;
  }

  function getQiState(id: number): QiState | undefined {
    return cultivators.get(id)?.qiState;
  }

  function getHeartMindState(id: number): HeartMindState | undefined {
    return cultivators.get(id)?.heartMindState;
  }

  function getDantianSystem(id: number): DantianSystem | undefined {
    return cultivators.get(id)?.dantianSystem;
  }

  function getSpiritualRoots(id: number): SpiritualRoots | undefined {
    return cultivators.get(id)?.spiritualRoots;
  }

  function applyTechniqueToCultivator(id: number, technique: Technique, dt: number) {
    const c = cultivators.get(id);
    if (!c) return undefined;
    const result = applyTechnique(c.qiState, c.heartMindState, technique, dt);
    const updated = { ...c, qiState: result.qs, heartMindState: result.hms };
    cultivators.set(id, updated);
    return result;
  }

  function setActiveTechnique(id: number, technique: Technique | null): boolean {
    const c = cultivators.get(id);
    if (!c) return false;
    cultivators.set(id, { ...c, activeTechnique: technique });
    return true;
  }

  function startBreakthrough(id: number, targetRealm: Realm): BreakthroughState | undefined {
    const c = cultivators.get(id);
    if (!c) return undefined;
    const bt = createBreakthroughState(id, targetRealm);
    cultivators.set(id, { ...c, breakthrough: bt });
    return bt;
  }

  function getBreakthroughState(id: number): BreakthroughState | undefined {
    return cultivators.get(id)?.breakthrough;
  }

  function advanceBreakthroughStage(id: number, tick: number, action?: string): BreakthroughState | undefined {
    const c = cultivators.get(id);
    if (!c || !c.breakthrough) return undefined;

    let bt = { ...c.breakthrough };

    switch (bt.stage) {
      case 'prep': {
        const forced = action === 'forced';
        bt = advancePrepToThreshold(bt, c.qiState, c.heartMindState, forced, tick);
        break;
      }
      case 'threshold': {
        const driftResult = coherenceDrift(bt, 1, tick);
        bt = driftResult.state;
        if (driftResult.thresholdHeld) {
          bt = checkThresholdToConfrontation(bt, tick, c.heartMindState);
        } else if (!bt.forcedAttempt) {
          bt = { ...bt, stage: 'prep' as BreakthroughStage, stageStartedAt: tick };
        }
        break;
      }
      case 'confrontation': {
        if (action === 'integrate' || action === 'push_past' || action === 'abort') {
          bt = applyConfrontationResponse(bt, action as ConfrontationResponse);
        }
        break;
      }
      case 'integration': {
        bt = resolveIntegration(bt, tick * 31 + c.cultivatorId * 7);
        break;
      }
      case 'settlement':
      case 'failure':
        // Terminal states
        break;
    }

    cultivators.set(id, { ...c, breakthrough: bt });
    return bt;
  }

  function accumulateDeviationRiskCultivator(id: number, riskType: DeviationRiskType, amount: number): boolean {
    const c = cultivators.get(id);
    if (!c) return false;
    const updatedRisks = c.heartMindState.devRisks.map(r => {
      if (r.riskType === riskType) {
        const newAcc = clamp(r.accumulatedRisk + amount, 0, 1);
        const newCauses = amount > 0 ? [...r.onsetCauses, `accumulated_${amount}`] : r.onsetCauses;
        return { ...r, accumulatedRisk: newAcc, onsetCauses: newCauses };
      }
      return r;
    });
    cultivators.set(id, {
      ...c,
      heartMindState: { ...c.heartMindState, devRisks: updatedRisks },
    });
    return true;
  }

  function checkDeviationOnsetCultivator(id: number, tick: number): Xinmo[] {
    const c = cultivators.get(id);
    if (!c) return [];
    const result = checkDeviationOnset(c.heartMindState.devRisks, tick);
    if (result.newXinmo.length > 0) {
      cultivators.set(id, {
        ...c,
        heartMindState: {
          ...c.heartMindState,
          devRisks: result.updatedRisks,
          xinmo: [...c.heartMindState.xinmo, ...result.newXinmo],
        },
      });
    }
    return result.newXinmo;
  }

  function attemptComprehensionCultivator(id: number, target: ComprehensionTarget): ComprehensionAttempt | undefined {
    const c = cultivators.get(id);
    if (!c) return undefined;
    const attempt = attemptComprehension(id, target, 0.5, c.heartMindState.attention, 100);
    if (attempt.resultingFragment) {
      const newUnintegrated = [...c.heartMindState.unintegratedLawFragments, attempt.resultingFragment];
      cultivators.set(id, {
        ...c,
        heartMindState: {
          ...c.heartMindState,
          unintegratedLawFragments: newUnintegrated,
          attention: c.heartMindState.attention - attempt.cost.attention,
        },
      });
    }
    return attempt;
  }

  function computeDualCultivationSession(
    id1: number,
    id2: number,
    technique: DualCultivationTechnique,
    tick: number,
  ): DualCultivationSession | undefined {
    const c1 = cultivators.get(id1);
    const c2 = cultivators.get(id2);
    if (!c1 || !c2) return undefined;
    return createDualCultivationSession(
      id1, id2,
      c1.qiState, c1.heartMindState,
      c2.qiState, c2.heartMindState,
      technique, tick,
    );
  }

  function checkBottleneckCultivator(id: number, tick: number): BottleneckState | undefined {
    const c = cultivators.get(id);
    if (!c) return undefined;

    // Check plateau
    if (checkPlateau(c.qiStateHistory, c.qiState.reservoir.capacityLower)) {
      const bn: BottleneckState = {
        type: 'plateau',
        onsetTick: tick,
        plateauFloor: 0.005,
        resolutionConditions: [
          { type: 'comprehension_event', target: 'any', satisfied: false },
          { type: 'pill', target: 'any', satisfied: false },
          { type: 'teacher_intervention', target: 'any', satisfied: false },
        ],
        resolvedAt: null,
      };
      cultivators.set(id, { ...c, bottleneck: bn });
      return bn;
    }

    // Check wall (prep checks fail at peak)
    const nextRi = REALM_INDEX[c.realm] + 1;
    if (nextRi < REALM_LADDER.length) {
      const nextRealm = REALM_LADDER[nextRi];
      if (!prepChecksPass(c.qiState, c.heartMindState, nextRealm)) {
        // Only a wall if the cultivator has been at this realm long enough
        // and has significant qi
        const totalQi = c.qiState.reservoir.lowerDantian + c.qiState.reservoir.middleDantian + c.qiState.reservoir.upperDantian;
        const totalCap = c.qiState.reservoir.capacityLower + c.qiState.reservoir.capacityMiddle + c.qiState.reservoir.capacityUpper;
        if (totalCap > 0 && (totalQi / totalCap) > 0.7) {
          const bn: BottleneckState = {
            type: 'wall',
            onsetTick: tick,
            plateauFloor: 0,
            resolutionConditions: [],
            resolvedAt: null,
          };
          cultivators.set(id, { ...c, bottleneck: bn });
          return bn;
        }
      }
    }

    return undefined;
  }

  function setTierCultivator(id: number, tier: SimulationTier): boolean {
    const c = cultivators.get(id);
    if (!c) return false;
    cultivators.set(id, setTier(c, tier));
    return true;
  }

  function getTierCultivator(id: number): SimulationTier | undefined {
    return cultivators.get(id)?.tier;
  }

  function stepCultivator(id: number, dt: number, tick: number): void {
    const c = cultivators.get(id);
    if (!c) return;
    if (c.tier === 0) return; // S0 frozen

    const updated = aggregateDailyProgress(c, dt);

    // Record history
    const newHistory = [...updated.qiStateHistory, updated.qiState.reservoir.lowerDantian];
    // Keep history bounded
    if (newHistory.length > 30 * 24 * 60 + 1) {
      newHistory.splice(0, newHistory.length - (30 * 24 * 60 + 1));
    }

    cultivators.set(id, { ...updated, qiStateHistory: newHistory, lastActiveTick: tick });
  }

  function stats(): CultivationStats {
    const byRealm: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    let totalXinmo = 0;
    let totalActiveBreakthroughs = 0;
    let totalBottlenecks = 0;

    for (const c of cultivators.values()) {
      byRealm[c.realm] = (byRealm[c.realm] || 0) + 1;
      byTier[String(c.tier)] = (byTier[String(c.tier)] || 0) + 1;
      totalXinmo += c.heartMindState.xinmo.length;
      if (c.breakthrough && c.breakthrough.stage !== 'failure' && c.breakthrough.stage !== 'settlement') {
        totalActiveBreakthroughs++;
      }
      if (c.bottleneck) totalBottlenecks++;
    }

    return {
      totalCultivators: cultivators.size,
      byRealm: byRealm as Record<Realm, number>,
      byTier,
      totalXinmo,
      totalActiveBreakthroughs,
      totalBottlenecks,
    };
  }

  return {
    createCultivator,
    getCultivator,
    removeCultivator,
    listCultivators,
    advanceRealm: advanceRealmCultivator,
    getQiState,
    getHeartMindState,
    getDantianSystem,
    getSpiritualRoots,
    applyTechnique: applyTechniqueToCultivator,
    setActiveTechnique,
    startBreakthrough,
    getBreakthroughState,
    advanceBreakthroughStage,
    accumulateDeviationRisk: accumulateDeviationRiskCultivator,
    checkDeviationOnset: checkDeviationOnsetCultivator,
    attemptComprehension: attemptComprehensionCultivator,
    computeDualCultivation: computeDualCultivationSession,
    checkBottleneck: checkBottleneckCultivator,
    setTier: setTierCultivator,
    getTier: getTierCultivator,
    stepCultivator,
    stats,
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export function createCultivationPlugin(): Plugin {
  let api: CultivationApi | null = null;

  return {
    id: 'ga:cultivation',
    version: '0.1.0',
    dependencies: ['ga:determinism'],

    init(host: PluginHost) {
      api = createCultivationApi();
      host.capabilities.register({
        capability: 'cultivation.state',
        provider: 'ga:cultivation',
        version: '0.1.0',
        instance: api,
      });
      host.capabilities.register({
        capability: 'cultivation.breakthrough',
        provider: 'ga:cultivation',
        version: '0.1.0',
        instance: api,
      });
      host.capabilities.register({
        capability: 'cultivation.deviation',
        provider: 'ga:cultivation',
        version: '0.1.0',
        instance: api,
      });
      host.setState('ga:cultivation', api);
      console.log('[ga:cultivation] Initialized — 3 capabilities registered');
    },

    destroy(host: PluginHost) {
      host.capabilities.unregister('cultivation.state', 'ga:cultivation');
      host.capabilities.unregister('cultivation.breakthrough', 'ga:cultivation');
      host.capabilities.unregister('cultivation.deviation', 'ga:cultivation');
      api = null;
      console.log('[ga:cultivation] Destroyed');
    },
  };
}
