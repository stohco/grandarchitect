# 31 — Cultivation: The Effect Algebra

**Status:** Foundation. The cultivation simulator — the qi-state, the heart-mind state, the dantian system, the spiritual roots, the breakthrough state machine, bottlenecks, comprehension, deviation onset, dual cultivation, and the effect algebra that binds techniques to state and state to techniques. Includes the tier-degradation rules and the determinism contract.
**Date:** 2026-08-03

---

## 0. What this document is and why it exists

The prior corpus (docs 03, 05, 27) specified the cultivation *stations* (Mortal, Qi Induction, Qi Condensation, Foundation Establishment, Core Formation, Nascent Soul, Spirit Severance, Void Amalgamation, Tribulation Crossing, Mahayana) and the *breakthrough rite* as a five-stage state machine. It did not specify the *algebra* — the rule that says *this technique, applied to this qi-state, produces that qi-state*, and the inverse rule that says *this qi-state modifies the effect of that technique*. Without that algebra, two implementers produce two different cultivation feels, and neither is right because neither was specified.

This document specifies the algebra. It is a pure function over a typed state, with named operators for each technique class, named modifiers for each state component, and a deterministic hash for every transition. It obeys the ratified yin-yang of body/qi/anchor (per doc 24 §2.3): body = yin, qi = yang-within-yin, anchor = yang. It advances along the internal-alchemy chain: 煉精化氣 → 煉氣化神 → 煉神還虛 → 煉虛合道.

The doctrine (AGENTS.md Part 3: "Build the engine, not just the brake") requires that the cultivation simulator be the engine the prior corpus named but never built. The brake (deviation is bad, forced attempts fail, bottlenecks exist) was specified; the engine (how techniques modify state, how state modifies techniques) was not. This document is the engine.

### Precedents cited

- **Cultist Simulator (Weather Factory, 2018) — the principle/aspect system.** Each card has aspects; each verb accepts cards whose aspects match. The effect algebra below adopts the principle-of-aspect-matching for technique-state compatibility.
- **Project Zomboid (The Indie Stone, 2013) — the trait-and-moodlet system.** Each character has traits (stable) and moodlets (transient) that modify skill effectiveness. This document adopts the trait/stable + moodlet/transient split for the heart-mind state.
- **Disco Elysium (ZA/UM, 2019) — the thought-cabinet internalization.** Thoughts modify stats once internalized. This document adopts the internalization mechanic for law-fragment integration (per doc 27 §3).
- **Path of Exile 2 (Grinding Gear, 2024) — the skill gem + support gem algebra.** Skills are modified by supports in a composable way. This document adopts the composable-modifier algebra for technique-state interaction.

---

## 1. The qi-state

The qi-state is the cultivator's qi-system's instantaneous configuration. It is a typed record.

```typescript
interface QiState {
  reservoir: QiReservoir;          // §1.1
  phaseAffinity: PhaseAffinity;    // §1.2 — 5-phase profile
  yinYang: number;                 // -1.0 (pure yin) .. +1.0 (pure yang)
  purity: number;                  // 0.0..1.0; how refined the qi is
  contamination: ContaminationState; // §1.3
  meridians: Meridian[];           // §1.4
  phaseResonance: PhaseSignature;  // current 5-phase modulation
}

interface QiReservoir {
  lowerDantian: number;            // 0.0..capacityLower
  middleDantian: number;           // 0.0..capacityMiddle (Foundation Establishment+)
  upperDantian: number;            // 0.0..capacityUpper (Core Formation+)
  capacityLower: number;
  capacityMiddle: number;
  capacityUpper: number;
  rechargeRate: number;            // per tick from ambient qi
}
```

### 1.1 The reservoir (dantian volume)

The reservoir is the cultivator's stored qi. Lower dantian (lower abdomen) is the primary reservoir from Qi Induction onward. Middle dantian (chest) opens at Foundation Establishment. Upper dantian (brow) opens at Core Formation. The total reservoir is the sum of open dantians' current values.

The reservoir recharges from ambient qi (per doc 28 §2.2) at `rechargeRate = base_recharge * ambient_qi_magnitude * phase_match`. A cultivator in a qi-rich, phase-matched region recharges quickly; one in a qi-poor region recharges slowly or not at all.

**Failure case — reservoir depletion.** When `total_reservoir < safe_threshold` (default 5% of capacity), the cultivator enters `QiDepletion` (per doc 13 §8.1): qi-verbs unavailable, mortal verbs only, deviation risk elevated. Recovery requires rest in a qi-rich environment.

### 1.2 Phase affinity

The 5-phase profile (per doc 00 §6): wood (木), fire (火), earth (土), metal (金), water (水). Each phase has an affinity in `[0.0, 1.0]`; the sum is normalized to 1.0.

```typescript
interface PhaseAffinity {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
  // sum = 1.0 (invariant; the simulator enforces)
}
```

The affinity is largely stable (set at character generation by the spiritual roots, per §4) but can shift via: (1) long-term practice of a phase-emphasizing technique, (2) consuming phase-bearing pills, (3) breakthrough rites that rebalance, (4) deviation onset that distorts.

### 1.3 Contamination

```typescript
interface ContaminationState {
  modao: number;                   // 0..1; from deviation, modao techniques
  karmic: number;                  // 0..1; from oath-breaking, betrayal
  environmental: number;           // 0..1; from contaminated region
  tribulation: number;             // 0..1; from tribulation residue
  total: number;                   // weighted sum
}
```

Contamination reduces effective purity: `effectivePurity = purity * (1 - contamination.total)`. It also raises deviation risk (per §7) and suppresses some techniques (e.g., a high-modao cultivator cannot use Foundation Establishment+ integration rites without cleansing first).

### 1.4 Meridians

```typescript
interface Meridian {
  meridianId: string;              // 'central_conduit', 'ancestral_gate', 'spirit_path', etc.
  openness: number;                // 0..1; how developed
  inflammation: number;            // 0..1; from qi-strikes or routing overload
  deviationDamage: number;         // 0..1; from somatic deviation
  phaseSignature: PhaseSignature;  // the meridian's natural phase flow
  routingAvailable: boolean;       // false if inflammation or deviation blocks routing
}
```

A meridian with `inflammation > 0.5` or `deviationDamage > 0.5` is `routingAvailable = false`. The cultivator cannot route qi through it (per doc 13 §8.3). Recovery requires rest and specific anti-inflammatory practices.

---

## 2. The heart-mind state (xinggong, 心宮)

The heart-mind state is the cultivator's psychospiritual configuration. It is *separate from* the qi-state: a cultivator can have abundant qi and a deranged heart-mind (the deviation-prone prodigy) or scarce qi and a serene heart-mind (the aging mortal).

```typescript
interface HeartMindState {
  attention: number;               // 0..100; current attention budget (per doc 13 §5)
  will: number;                    // 0..100; current will budget (separate from attention)
  emotionalBalance: number;        // -1.0 (turbulent) .. +1.0 (serene)
  unresolvedAttachments: Attachment[]; // §2.2
  integratedLawFragments: LawFragmentRef[]; // §3, doc 27 §3
  unintegratedLawFragments: LawFragmentRef[]; // risk of 妄信
  devRisks: DeviationRisk[];       // §7
  xinmo: Xinmo[];                  // active 心魔 (per doc 24 §1.2)
}
```

### 2.1 Attention and will

Attention is the per-tick cognitive budget, consumed by perception (per doc 13 §5) and active techniques. Will is the per-tick volitional budget, consumed by committed techniques (breakthrough rites, comprehension attempts, dual cultivation). They refill at `refill_rate * (1 + emotionalBalance)` — a serene heart-mind refills faster; a turbulent one slower.

### 2.2 Unresolved attachments

```typescript
interface Attachment {
  attachmentId: string;
  subject: number;                 // NPC id or named concept
  type: 'grief' | 'fear' | 'desire' | 'hatred' | 'love' | 'pride' | 'shame';
  intensity: number;               // 0..1
  integrationProgress: number;     // 0..1; how processed
  bornAt: number;
}
```

Attachments with `integrationProgress < 0.7` block breakthrough rites (per doc 27 §1.4, the Foundation Establishment gate). They also raise deviation risk (per §7). Resolution: deliberate integration (the *integrate* verb in the breakthrough rite), life experience (a grief that resolves through mourning), or teacher-guided practice.

### 2.3 Law-fragment integration

Per doc 27 §3, a law-fragment with `integration < 0.6` is `unintegrated`. When `unintegratedLawFragments.length > heart_mind_capacity` (a function of realm and 性gong development), the cultivator develops the 妄信 deviation. This is the "knows too much, understands too little" trap, made mechanical.

---

## 3. The dantian system

The three dantians (lower, middle, upper) are the three reservoirs of qi, opened progressively at realm advancement:

```
Realm                       Lower  Middle  Upper
─────────────────────────   ─────  ──────  ─────
Mortal                      (—)    (—)    (—)    // no qi reservoir; cultivator is mortal
Qi Induction                ✓      (—)    (—)    // reservoir opens, small capacity
Qi Condensation             ✓      (—)    (—)    // lower dantian develops
Foundation Establishment    ✓      ✓      (—)    // middle dantian opens
Core Formation              ✓      ✓      ✓      // upper dantian opens; golden core forms
Nascent Soul                ✓      ✓      ✓      // anchor (元婴) seats in upper dantian
Spirit Severance            ✓      ✓      ✓      // domain holds in upper dantian
Void Amalgamation           ✓      ✓      ✓      // bonded to a place
Tribulation Crossing        ✓      ✓      ✓      // robust across all
Mahayana                    ✓      ✓      ✓      // indestructible (per doc 00 §2)
```

```typescript
interface DantianSystem {
  lower: Dantian;
  middle: Dantian | null;         // null until Foundation Establishment
  upper: Dantian | null;          // null until Core Formation
  goldenCore: GoldenCore | null;  // forms at Core Formation breakthrough
  nascentSoul: NascentSoul | null; // forms at Nascent Soul breakthrough
}

interface Dantian {
  dantianId: 'lower' | 'middle' | 'upper';
  capacity: number;
  currentVolume: number;
  phaseProfile: PhaseAffinity;    // each dantian has its own phase mix
  stability: number;              // 0..1; how stable the qi is here
}
```

---

## 4. Spiritual roots (linggen, 靈根)

Spiritual roots are the cultivator's innate phase-affinity profile, set at character generation. They are 5 phases × 3 attributes:

```typescript
interface SpiritualRoots {
  phases: {
    wood: RootAttribute;
    fire: RootAttribute;
    earth: RootAttribute;
    metal: RootAttribute;
    water: RootAttribute;
  };
  total: number;                   // sum of all phases' strength; gates base cultivation rate
  purity: 'impure' | 'mixed' | 'pure' | 'heavenly';  // classification
}

interface RootAttribute {
  strength: number;                // 0..1; how strong this phase's root is
  latent: boolean;                 // true if hidden / unawakened
  awakenedAt: number | null;       // tick of awakening (via comprehension, breakthrough, trauma)
}
```

**The purity classification.** A cultivator with one phase at 0.9 and the others at 0.025 is "pure wood root" — rare, fast cultivation in wood-phase, slow in others. A cultivator with all five phases at 0.2 is "impure/mixed" — slow cultivation overall but balanced. The genre's "trash root" (廢靈根) is a cultivator with `total < 0.1`.

**Failure case — root ceiling.** A cultivator whose root profile is too weak in the phase their next station's practice requires may plateau indefinitely (per doc 27 §2.5, the "permanent plateau"). Resolution: develop the root (rare, via heavenly treasure or divine intervention) or accept the ceiling. This is the genre's "talent ceiling," made mechanical.

---

## 5. Breakthrough mechanics (the five-stage state machine)

Per doc 27 §1, the breakthrough rite is a five-stage state machine: Preparation → Threshold → Confrontation → Integration → Settlement, with a sixth Failure terminal. This document *ratifies* that state machine (no redesign) and specifies the *effect algebra* at each stage.

```typescript
interface BreakthroughState {
  cultivatorId: number;
  targetRealm: Realm;
  stage: 'prep' | 'threshold' | 'confrontation' | 'integration' | 'settlement' | 'failure';
  forcedAttempt: boolean;
  coherenceMeters: {
    bodyQi: number;                // 0..1
    qiAnchor: number;              // 0..1
    bodyAnchor: number;            // 0..1
  };
  confrontationMaterial: ConfrontationMaterial | null;
  xinmoRisk: 'none' | 'high';
  stageStartedAt: number;
}

type Realm =
  | 'mortal' | 'qi_induction' | 'qi_condensation' | 'foundation_establishment'
  | 'core_formation' | 'nascent_soul' | 'spirit_severance'
  | 'void_amalgamation' | 'tribulation_crossing' | 'mahayana';
```

### 5.1 Stage transitions

```
PREP --[4 prerequisite checks pass]--> THRESHOLD
PREP --[forced_attempt]--> THRESHOLD(forced)

THRESHOLD --[all 3 coherence meters held ≥ 0.4 for 30s]--> CONFRONTATION
THRESHOLD --[any meter < 0.4, not forced]--> PREP (no damage)
THRESHOLD --[any meter < 0.4, forced]--> CONFRONTATION(intense)

CONFRONTATION --[integrate-success]--> INTEGRATION
CONFRONTATION --[integrate-fail]--> FAILURE(xinmo)
CONFRONTATION --[push-past]--> INTEGRATION(unstable, xinmoRisk=high)
CONFRONTATION --[abort]--> PREP (reservoir /= 2)

INTEGRATION --[3-5s stable]--> SETTLEMENT
INTEGRATION --[unstable, rng < 0.5]--> SETTLEMENT(with xinmo)
INTEGRATION --[unstable, rng ≥ 0.5]--> FAILURE(xinmo + revert)

SETTLEMENT --[perceptions online]--> DONE

FAILURE --[revert]--> PREP (with damage)
FAILURE --[xinmo]--> PREP (with deviation)
```

### 5.2 The effect algebra at each stage

**PREP.** The four prerequisite checks (per doc 27 §1.3) are predicates over the qi-state and heart-mind state:

```typescript
function prepChecksPass(qs: QiState, hms: HeartMindState, target: Realm): boolean {
  return phaseAffinityBalanced(qs, target)
      && psychospiritualResolved(hms, target)
      && reservoirSufficient(qs, target)
      && meridiansStable(qs, target);
}

function phaseAffinityBalanced(qs: QiState, target: Realm): boolean {
  const mean = meanOf5Phases(qs.phaseAffinity);
  const maxDeviation = maxOf5Phases(|phase - mean|);
  return maxDeviation <= 0.30;  // no phase more than ±0.30 from mean
}

function psychospiritualResolved(hms: HeartMindState, target: Realm): boolean {
  return hms.unresolvedAttachments.every(a => a.integrationProgress >= 0.7);
}
```

**THRESHOLD.** The coherence meters drift apart over time. The player routes qi through three named meridians to re-converge them. The drift function:

```typescript
function coherenceDrift(state: BreakthroughState, dt: number): BreakthroughState {
  const driftRate = 0.05 * (forcedAttempt ? 1.5 : 1.0);  // per second
  return {
    ...state,
    coherenceMeters: {
      bodyQi:    clamp(state.coherenceMeters.bodyQi    - driftRate * dt * rng_drift(), 0, 1),
      qiAnchor:  clamp(state.coherenceMeters.qiAnchor  - driftRate * dt * rng_drift(), 0, 1),
      bodyAnchor:clamp(state.coherenceMeters.bodyAnchor- driftRate * dt * rng_drift(), 0, 1),
    },
  };
}
```

**CONFRONTATION.** The surfacing material (per doc 27 §1.3) is chosen from the cultivator's `unresolvedAttachments` (the highest-intensity, lowest-integration one). The player's three responses:

```typescript
type ConfrontationResponse = 'integrate' | 'push_past' | 'abort';

function applyConfrontationResponse(
  state: BreakthroughState,
  response: ConfrontationResponse,
  attachment: Attachment,
): BreakthroughState {
  switch (response) {
    case 'integrate':
      // success if attachment.integrationProgress >= 0.5
      if (attachment.integrationProgress >= 0.5) {
        attachment.integrationProgress = 1.0;  // resolved permanently
        return { ...state, stage: 'integration' };
      } else {
        return { ...state, stage: 'failure', xinmoRisk: 'high' };
      }
    case 'push_past':
      return { ...state, stage: 'integration', xinmoRisk: 'high' };
    case 'abort':
      // reservoir halved (the cost of withdrawing mid-rite)
      qs.reservoir.lowerDantian *= 0.5;
      return { ...state, stage: 'prep' };
  }
}
```

**INTEGRATION.** The three coherence meters snap to 1.0 simultaneously. If `xinmoRisk = 'high'`, a 50% coin (seeded by cultivator state hash) decides between SETTLEMENT-with-xinmo and FAILURE-with-revert.

**SETTLEMENT.** Lifespan extends per doc 03 Station 4 (~200 years at Foundation Establishment). New perceptions come online over in-game days. The cultivator gains the new station's verbs.

---

## 6. Bottlenecks

Per doc 27 §2, two types: within-station plateau (rate failure) and between-station wall (gate failure).

```typescript
interface BottleneckState {
  type: 'plateau' | 'wall';
  onsetTick: number;
  plateauFloor: number;            // 0.5% of per-day capacity, per doc 27 §2.2
  resolutionConditions: ResolutionCondition[];
  resolvedAt: number | null;
}

interface ResolutionCondition {
  type: 'comprehension_event' | 'pill' | 'teacher_intervention' | 'life_experience' | 'prerequisite_met';
  target: string;                  // e.g., 'wood_phase_fragment', 'foundation_pill', 'meridian_balance'
  satisfied: boolean;
}
```

The plateau detector runs every in-game day:

```typescript
function checkPlateau(cultivator: Cultivator): boolean {
  const recent = cultivator.qiStateHistory.last(30 * 24 * 60);  // 30 days of ticks
  const improvement = (recent.last().lowerDantian - recent.first().lowerDantian) / cultivator.reservoir.capacityLower;
  return improvement < 0.005;  // < 0.5% over 30 days
}
```

The wall is the prep-check failure (§5.2): when the cultivator has reached their station's peak but `prepChecksPass` returns false, they are at the wall.

---

## 7. Deviation onset (the threshold function)

Deviation (心魔, xinmo) onset is governed by a threshold function over accumulated deviation-risk:

```typescript
interface DeviationRisk {
  riskType: 'false_circuit' | 'cross_current' | 'route_fixation' | 'delusional_conviction' | 'attachment_persistence' | 'greed_possession' | 'fear_possession' | 'hatred_possession';
  accumulatedRisk: number;        // 0..1
  threshold: number;              // 0..1; when accumulated > threshold, deviation manifests
  onsetCauses: string[];          // what has been pushing this risk up
}

interface Xinmo {
  xinmoType: DeviationRisk['riskType'];
  onsetTick: number;
  severity: number;               // 0..1
  effects: XinmoEffect[];         // what it does to qi-state and heart-mind state
  resolutionPath: string;         // what would resolve it
}
```

**The threshold function.** Each risk type has its own accumulation rule:

```typescript
// false_circuit: routing qi in closed loop bypassing reservoir
function accumulateFalseCircuit(qs: QiState, dt: number): number {
  if (qs.routing === 'closed_loop' && !qs.usesReservoir) {
    return dt * 0.001 * (1 + qs.contamination.modao);
  }
  return 0;
}

// cross_current: routing qi against its natural flow
function accumulateCrossCurrent(qs: QiState, dt: number): number {
  if (qs.routing === 'against_flow') {
    return dt * 0.002;
  }
  return 0;
}

// route_fixation: locked into one routing too long
function accumulateRouteFixation(qs: QiState, dt: number): number {
  const timeInCurrentRouting = qs.currentRoutingDuration;
  if (timeInCurrentRouting > 600) {  // > 10 minutes
    return dt * 0.0005 * (timeInCurrentRouting / 600);
  }
  return 0;
}

// delusional_conviction: too many unintegrated law-fragments
function accumulateDelusionalConviction(hms: HeartMindState): number {
  const excess = hms.unintegratedLawFragments.length - hms.heartMindCapacity;
  return Math.max(0, excess * 0.1);  // 10% risk per excess fragment
}
```

**Onset.** When `accumulatedRisk > threshold`, the deviation manifests. The cultivator gains a `Xinmo` record with typed effects (e.g., route_fixation makes the switch transition illegal until resolved). The deviation persists until its `resolutionPath` is followed (specific practice, teacher intervention, life experience).

**Failure case — deviation cascade.** A deviation can raise other risks (a fixated cultivator may false-circuit to compensate). The simulator caps the cascade: `deviation_count > 3` triggers a `DeviationStormEvent` (per doc 30 §1) — the cultivator loses control, possibly attacks allies, possibly dies. This is the genre's "going mad from cultivation" trope, made mechanical.

---

## 8. Comprehension (wudao, 悟道)

Per doc 27 §3, comprehension is two mechanics at two stations: at Qi Condensation, a perception-deepener; at Foundation Establishment+, an active verb producing law-fragments.

```typescript
interface ComprehensionAttempt {
  cultivatorId: number;
  target: ComprehensionTarget;
  targetIntensity: number;        // 1..5; max intensity the target can supply
  achievedIntensity: number;      // 1..5; function of cultivator skill + attention
  cost: { attention: number; time: number };
  resultingFragment: LawFragmentRef | null;
  success: boolean;
}

interface ComprehensionTarget {
  targetId: string;
  domain: string;                 // 'wood_phase', 'meridian_structure', 'anchor_nature', etc.
  maxIntensity: number;           // 1..5
  concealment: number;            // 0..1; reduces achieved intensity
  lawFragmentsAvailable: string[];
}
```

**The algebra.** `achievedIntensity = floor(min(targetIntensity, cultivator.skill * (1 - concealment) * attention_fraction))`. A skilled, attentive cultivator comprehends deeply; an unskilled or distracted one comprehends shallowly or not at all.

**Failure case — comprehension of the unsuited.** A cultivator attempting a target whose `domain` exceeds their realm has the fragment's `unintegrated` difficulty doubled (per doc 27 §3.3) and the delusional-conviction threshold halved. A Qi Condensation cultivator comprehending tribulation structure is at high risk of 妄信.

---

## 9. Dual cultivation (shuangxiu, 雙修)

Dual cultivation is the practice of two cultivators combining their qi-states to mutual benefit. It is *not* the genre's "yin-yang dual cultivation" sexual-cultivation trope (that is rejected per AGENTS.md Part 3: "Police historical derivation" — late-imperial sexual-alchemy tropes are not the universal cultivation practice and will not be the engine's default).

```typescript
interface DualCultivationSession {
  participants: [number, number];
  technique: DualCultivationTechnique;
  startedAt: number;
  durationTicks: number;
  harmonyFactor: number;          // 0..1; how well their qi-states match
  reservoirExchange: number;      // net qi transferred (positive = participant[0] gains)
  contaminationExchange: number;  // net contamination transferred
  fragmentExchange: LawFragmentRef[]; // law-fragments shared
  deviationRisk: number;          // elevated if harmony is low
}

interface DualCultivationTechnique {
  techniqueId: string;
  phaseCompatibility: PhaseAffinity; // required phase match
  yinYangBalance: number;          // -1..+1; required yin-yang signature
  reservoirCost: number;           // per participant per tick
  benefitRate: number;             // cultivation-rate multiplier if harmony high
}
```

**The harmony rule.** `harmonyFactor = phase_match * yinYang_match * emotionalBalance_match * trust_match`. Two cultivators with phase-compatible roots, opposite yin-yang signatures, balanced emotions, and high trust have `harmonyFactor` near 1.0 — dual cultivation is highly effective. Two cultivators with mismatched roots, same-signature yin-yang, turbulent emotions, or low trust have `harmonyFactor` near 0 — dual cultivation is ineffective or harmful.

**Failure case — forced dual cultivation.** Two cultivators with low harmony who attempt dual cultivation anyway accumulate deviation risk (per §7) at an elevated rate. The simulator does not prevent the attempt (the doctrine: "the system permits the action; the world punishes it"), but the consequences are severe. This is the genre's "yin-yang mismatch disaster" trope, made mechanical without being the default mode.

---

## 10. The effect algebra (technique × state)

The core algebra: a technique applied to a qi-state produces a new qi-state, and the qi-state modifies the technique's effect. The algebra is composable (techniques chain) and lawful (deterministic).

```typescript
interface Technique {
  techniqueId: string;
  type: 'gathering' | 'circulating' | 'refining' | 'projecting' | 'integrating' | 'comprehending';
  baseEffect: TechniqueEffect;    // what it does at full effectiveness
  phaseAffinity: PhaseAffinity;   // which phases it favors
  yinYang: number;                // -1..+1; yin-yang signature
  purityRequirement: number;      // minimum purity to use safely
  reservoirCost: number;          // per tick
  attentionCost: number;          // per tick
  deviationRisks: DeviationRiskProfile;  // which risks it accumulates
}

interface TechniqueEffect {
  reservoirDelta: number;         // qi added (positive) or consumed
  purityDelta: number;            // purity change
  phaseAffinityDelta: PhaseAffinity;
  yinYangDelta: number;
  meridianDevelopment: Partial<Record<string, number>>;
  contaminationDelta: Partial<ContaminationState>;
}

// The algebra:
function applyTechnique(
  qs: QiState,
  hms: HeartMindState,
  tech: Technique,
  dt: number,
): { qs: QiState; hms: HeartMindState; deviations: DeviationRisk[] } {
  // 1. Compute the technique's effectiveness modifier from state
  const phaseMatch = phaseDotProduct(qs.phaseAffinity, tech.phaseAffinity);
  const yinYangMatch = 1 - Math.abs(qs.yinYang - tech.yinYang) / 2;
  const purityModifier = qs.purity >= tech.purityRequirement ? 1.0 : 0.5;
  const attentionModifier = hms.attention >= tech.attentionCost * dt ? 1.0 : 0.3;
  const emotionalModifier = (hms.emotionalBalance + 1) / 2;

  const effectiveness = phaseMatch * yinYangMatch * purityModifier * attentionModifier * emotionalModifier;

  // 2. Apply the effect, scaled by effectiveness
  const newQs: QiState = {
    ...qs,
    reservoir: { ...qs.reservoir, lowerDantian: qs.reservoir.lowerDantian + tech.baseEffect.reservoirDelta * effectiveness * dt },
    purity: clamp(qs.purity + tech.baseEffect.purityDelta * effectiveness * dt, 0, 1),
    // ... other fields
  };

  // 3. Accumulate deviation risks
  const deviations = accumulateDeviations(qs, tech, dt);

  // 4. Consume attention and reservoir
  const newHms: HeartMindState = { ...hms, attention: hms.attention - tech.attentionCost * dt };

  return { qs: newQs, hms: newHms, deviations };
}
```

**The five multipliers.** Phase-match (technique's phase vs. cultivator's affinity), yin-yang match, purity modifier (impure cultivator is half-effective), attention modifier (distracted cultivator is 30% effective), emotional modifier (turbulent heart-mind halves effectiveness). A skilled cultivator with matching roots, balanced yin-yang, refined qi, focused attention, and serene heart-mind is 5× more effective than a mismatched, distracted, turbulent one. This is the genre's "talent + preparation + state" triad, made mechanical.

**The chain rule.** Techniques compose: applying technique B after technique A uses the qi-state *as modified by A*. The composition is associative (techniques can be ordered in any sequence with the same final state, modulo the time costs). This is the algebra's most important property: it makes the simulator deterministic and the playstyle combinatorial.

---

## 11. Tier simulation (S4 / S2 / S0)

Cultivation degrades by tier:

```
┌─────────┬──────────────────────────────────────────────────────────────┐
│ Tier    │ Cultivation behavior                                          │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S4      │ Full effect algebra. Every technique application is         │
│ (full)  │ simulated. Deviation risks accumulate per tick. Breakthrough│
│         │ rites are real-time state machines.                          │
│         │ Cost: ~1ms per cultivator per tick. Cap: 16 cultivators at  │
│         │ S4 per region (the player + named NPCs + key antagonists).  │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S2      │ Aggregate cultivation. Per-day cultivation-progress update  │
│ (aggr.) │ using the cultivator's current technique's average effect.  │
│         │ Deviation risks accumulate per day at reduced resolution.    │
│         │ Breakthrough rites fire as events (per doc 30) with          │
│         │ predetermined outcomes (seeded by state hash).               │
│         │ Cost: ~0.1ms per cultivator per day.                         │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S0      │ Frozen. No cultivation. The cultivator's qi-state is the    │
│ (frozen)│ frozen state at demotion. On promotion, S2 catches up by   │
│         │ applying the cultivator's daily cultivation-progress over   │
│         │ the elapsed time, with deterministic RNG for any rites.     │
└─────────┴──────────────────────────────────────────────────────────────┘
```

**The promotion rule.** An S0 cultivator promoted to S2 catches up by running their last-active technique's `aggregate_daily_effect` over the elapsed days. The aggregate is computed once (at demotion) and applied per-day on promotion. Breakthrough rites during the absence are determined by the cultivator's state hash at the rite-initiation tick (seeded deterministically).

**Failure case — promotion surprise.** A cultivator who broke through during the absence is at the new realm on promotion. The simulator records the breakthrough event in the persistent log (per doc 30 §12) and rehydrates the cultivator at the new realm with their post-breakthrough state. The player may be surprised — and so may the in-world NPCs, who knew the cultivator before the absence.

---

## 12. Determinism contract

Every cultivation operation is a pure function of:

```
cultivation_state(t+1) = cultivation_fn(
  qiState(t),
  heartMindState(t),
  technique,                  // the active technique
  ambientQi(t),               // from ecology
  rng(cultivatorSeed, tick)   // for breakthrough coin, deviation onset
)
```

**Hash verification.** `hashCultivation(cultivatorId, tick)` returns the SHA-256 of the CBOR-encoded `(QiState, HeartMindState)` pair. Two runs with the same seed produce identical hashes.

**Breakthrough determinism.** The 50% coin in the unstable-integration path (per §5.2) is seeded by `(cultivatorSeed, targetRealm, confrontationMaterialHash, worldStateHash)`. Two isomorphic cultivators in identical state produce identical breakthrough outcomes.

**Technique chaining.** The chain rule (§10) is associative: the simulator can batch-apply techniques in any order and produce the same final state (modulo time costs). This enables the S2 aggregate-cultivation optimization.

---

## 13. Rejected alternatives

- **HP-based cultivation (practice fills a bar; bar fills = breakthrough).** Rejected: produces no skill expression. The five-stage state machine (§5) and the effect algebra (§10) make the *how* of cultivation matter.
- **Random-roll breakthrough (RNG success/failure).** Rejected: deterministic-state-driven outcomes only. The 50% unstable-integration coin is the only randomness, and it is seeded by state hash.
- **Sexual-alchemy dual cultivation (the genre's "yin-yang dual cultivation" trope).** Rejected as the *default* mode (per AGENTS.md Part 3: "Police historical derivation"). The engine supports dual cultivation as energy-and-fragment exchange (§9), not as sexual mechanics.
- **Power-scaling cultivation (cultivator gains 10× power per realm).** Rejected: per doc 32 (combat), the multipliers are bounded (1.5-3× per realm). Cultivation opens *verbs*, not infinite power.
- **Per-cultivator threading.** Rejected: determinism requires single-threaded per-region cultivation. Cross-region parallelism is allowed (cultivators do not interact across regions within a tick).
- **LLM-generated cultivation narratives.** Rejected for the simulation core. LLMs may narrate breakthrough experiences in the journal (per doc 23 §1.3) but cannot determine outcomes.

---

## 14. Open decisions (surfaced for review)

1. **The 5-multiplier effectiveness formula (§10).** Invented. The exact weighting of phase/yin-yang/purity/attention/emotional may need rebalancing after playtesting.
2. **The 0.30 max-phase-deviation for breakthrough prep (§5.2).** Inherited from doc 27 §1.3. May be too strict (few cultivators can rebalance) or too lenient (breakthroughs too easy).
3. **The 0.7 integration-progress threshold for attachments (§5.2).** Inherited from doc 27. May be too high (attachments feel permanent) or too low (they resolve too easily).
4. **The 5% reservoir safe threshold (§1.1).** Invented. May be too low (depletion feels sudden) or too high (cultivators feel constantly depleted).
5. **The 16-cultivator S4 cap per region (§11).** Invented. May be too few for a sect compound with 50 disciples; the cap may need to scale with region importance.
6. **The 0.5 effectiveness penalty for impure cultivators (§10).** Invented. May be too punishing or too lenient.
7. **The 50% unstable-integration coin (§5.2).** Inherited from doc 27. The exact probability may need tuning; 50% is the genre's midpoint but playtesting will reveal whether it feels fair.

---

## 15. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus's cultivation docs (03, 05, 27) were the brake (deviation is bad, forced attempts fail, bottlenecks exist). This document specifies the engine: the qi-state, the heart-mind state, the dantian system, the spiritual roots, the breakthrough state machine's effect algebra, the deviation threshold function, the dual-cultivation harmony rule, the five-multiplier effectiveness formula.
- **Make decisions; do not defer:** the qi-state schema, the heart-mind state schema, the dantian system, the root schema, the breakthrough state machine, the deviation threshold function, the dual-cultivation rule, the effect algebra, the tier mapping are all decided. §14 are tuning parameters, not forks.
- **Cite the precedent:** Cultist Simulator, Project Zomboid, Disco Elysium, Path of Exile 2 are named and their contributions specified.
- **Confront the central tension directly:** the doctrine (AGENTS.md Part 3) forbids sexual-alchemy dual cultivation as the default; the genre wants it. This document resolves the tension by specifying energy-and-fragment dual cultivation as the default, with the sexual-alchemy version explicitly rejected (§13).
- **Design for joy first:** the first hour's joy is feeling the effect algebra — the player's qi-perception (per doc 05) reveals that their phase-affinity matches the ambient qi of a specific spot, and practicing there is 5× faster than practicing elsewhere. The algebra makes the world readable.
- **Authorize the smallest end-to-end thing:** this document specifies enough to implement the Mortal → Qi Condensation cultivation (the player's first three realms) as the first prototype. Upper realms are design-ready; their prototypes are deferred until the Qi Condensation cultivation is proven.

This document is the cultivation bible. It is the effect-algebra engine the prior corpus was missing.
