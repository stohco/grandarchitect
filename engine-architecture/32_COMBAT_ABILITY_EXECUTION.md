# 32 — Combat: Ability Execution

**Status:** Foundation. The combat state machine's execution engine — the production rules with frame costs, the tempo economy, the commitment model, the qi-routing system (4 routings × 5 phases = 20 combinations), the phase-matchup multipliers, residue reading in combat, the five combat scales, the nine-type injury model, the per-realm death model, and the determinism contract that verifies same-inputs-same-outcome by hash.
**Date:** 2026-08-03

---

## 0. What this document is and why it exists

The prior corpus (doc 13: combat grammar) specified the combat *vocabulary* — the state machine's terminals, the tempo economy's existence, the routing system's topology, the injury types, the death model — at design resolution. It did not specify the *execution engine*: how production rules consume frames, how the tempo economy clears, how qi-routing modifies damage, how phase-matchups multiply effects, how residue is read in real-time, how the five scales adapt the state machine, how injuries gate transitions, how death propagates per realm, and how all of this is hash-verified.

This document specifies the execution engine. It is the combat system at implementation resolution for the first three realms (Mortal, Qi Induction, Qi Condensation) and at design resolution for the upper realms. It *ratifies* doc 13's state machine (no redesign) and specifies the algebra that makes it run.

The doctrine (AGENTS.md Part 3: "Cite the precedent; do not float above it") requires that every frame-cost claim be anchored to a shipped game. This document names Sekiro, Monster Hunter, Third Strike, Guilty Gear, Bushido Blade, Super Smash Bros., Celeste, Total War, and Mount & Blade and specifies what each contributes at what number.

### Precedents cited (recap from doc 13, with calibration)

- **Sekiro (FromSoftware, 2019)** — commitment model; deflection window 12-15 frames at 30fps (~400-500ms).
- **Monster Hunter: World (Capcom, 2018)** — committed startup/active/recovery; Great Sword charge cannot cancel once committed.
- **Street Fighter III: Third Strike (Capcom, 1999)** — parry window 7-10 frames at 60fps (~120-170ms).
- **Guilty Gear XX #Reload (Arc System Works, 2004)** — Roman Cancel as the one sanctioned cancel, costs resources.
- **Bushido Blade (Lightweight, 1997)** — one-hit-kill model; specific injuries (cut tendon, fractured bone) end fights.
- **Super Smash Bros. Melee (HAL, 2001)** — 10-frame input buffer.
- **Celeste (Matt Makes Games, 2018)** — 6-frame coyote time; 6-frame input buffer.
- **Total War / Mount & Blade** — battlefield and force-multiplier models.

---

## 1. The combat state machine (recap with frame costs)

Per doc 13 §1, the combat state machine has 8 terminals. This document adds frame costs and transition preconditions.

```typescript
type CombatState =
  | 'Idle'         | 'Committed'    | 'Active'     | 'Recovery'
  | 'Staggered'    | 'Downed'       | 'Yielded'    | 'Dead';

interface CombatantState {
  combatantId: number;
  state: CombatState;
  stateEnteredAt: number;          // tick
  stateFrameCount: number;         // frames since state entered
  stateFrameTarget: number;        // frames the state will hold (for Committed/Active/Recovery)
  inputBuffer: BufferedInput[];    // last 8 frames of inputs (per §2)
  currentAction: ActionInstance | null;
  routing: QiRouting;              // §4
  injuries: Injury[];              // §8
  deviationMeter: number;          // 0..1; per doc 13 §8.4
}
```

### 1.1 The production rules (frame-costed transitions)

Each transition is a production rule with frame-cost and preconditions:

```
RULE set 1: IDLE transitions (the resting state)
─────────────────────────────────────────────────
Idle ─[input:attack, can_route]──> Committed.Anticipation(frames = startupFrames(action))
Idle ─[input:defend, can_route]──> Committed.Guard(frames = guardStartupFrames)
Idle ─[input:dodge, can_route_to_legs]──> Committed.Dodge(frames = dodgeStartupFrames)
Idle ─[input:read_residue, attention ≥ 5]──> Committed.Reading(frames = 30, attention cost 5)
Idle ─[input:yield]──> Yielded
Idle ─[incoming_attack hits, no defend]──> Staggered(frames = staggerFrames)

RULE set 2: COMMITTED transitions (the wind-up; cannot cancel)
─────────────────────────────────────────────────
Committed.Anticipation ─[frames ≥ startupFrames]──> Active
Committed.Anticipation ─[incoming_attack hits]──> Staggered (counter-hit; +50% damage)
Committed.Guard ─[frames ≥ guardStartupFrames]──> Active.GuardHold
Committed.Dodge ─[frames ≥ dodgeStartupFrames]──> Active.DodgeInvuln (i-frames)

RULE set 3: ACTIVE transitions (the effect; the strike lands or the guard holds)
─────────────────────────────────────────────────
Active ─[frames ≥ activeFrames]──> Recovery
Active.GuardHold ─[input released]──> Recovery
Active.GuardHold ─[incoming_attack, guard holds]──> Active.GuardHold (reservoir drained by block_cost)
Active.GuardHold ─[incoming_attack, guard breaks]──> Staggered (guard-break; long stagger)
Active.DodgeInvuln ─[frames ≥ iFrames]──> Recovery

RULE set 4: RECOVERY transitions (the cooldown; cannot act)
─────────────────────────────────────────────────
Recovery ─[frames ≥ recoveryFrames]──> Idle
Recovery ─[incoming_attack hits]──> Staggered (counter-hit; +50% damage)

RULE set 5: STAGGERED transitions (the punishment state)
─────────────────────────────────────────────────
Staggered ─[frames ≥ staggerFrames]──> Idle
Staggered ─[incoming_attack hits]──> Staggered (stagger extension; cap at max_stagger_extension)
Staggered ─[incoming_attack, magnitude ≥ knockdown_threshold]──> Downed

RULE set 6: DOWNED transitions (the prone state)
─────────────────────────────────────────────────
Downed ─[frames ≥ getupFrames]──> Idle
Downed ─[incoming_attack hits]──> Downed (extension; cap at max_down_extension)
Downed ─[incoming_attack, lethal]──> Dead

RULE set 7: YIELDED transitions (the surrender state)
─────────────────────────────────────────────────
Yielded ─[opponent ceases]──> Idle (after 60 frames of no incoming attack)
Yielded ─[incoming_attack hits]──> Dead (killing a yielded opponent is criminal; per doc 13 §9)

RULE set 8: DEAD (the terminal)
─────────────────────────────────────────────────
Dead ─[per-realm anchor fate; per §10]──> (bardo / dispersed / reincarnated)
```

**Frame cost table (Qi Condensation baseline):**

| Action | Startup | Active | Recovery | Total | Notes |
|---|---|---|---|---|---|
| Fast strike (light) | 8 | 4 | 12 | 24 | ~400ms at 60fps |
| Medium strike | 14 | 6 | 20 | 40 | ~670ms |
| Heavy strike | 24 | 8 | 36 | 68 | ~1130ms |
| Defend (guard up) | 6 | hold | 12 | 18+ | guardStartup=6 |
| Dodge (legs) | 10 | 12 i-frames | 14 | 36 | i-frames per Sekiro |
| Read residue | 30 | — | 30 | 60 | attention cost 5 |
| Yield | 1 | — | — | 1 | instant |
| Heavy qi-burst (area) | 40 | 8 | 60 | 108 | ~1.8s |

---

## 2. The tempo economy

The tempo economy is the rule that prevents both combatants from attacking simultaneously without consequence. It is enforced by the commitment model (§3) and the input buffer.

```typescript
interface BufferedInput {
  input: CombatInput;
  bufferedAtFrame: number;        // frame the input was received
  consumedAtFrame: number | null; // frame it was consumed (or null if pending)
}

type CombatInput =
  | 'attack_fast' | 'attack_medium' | 'attack_heavy'
  | 'defend' | 'dodge' | 'read_residue'
  | 'route_hands' | 'route_legs' | 'route_skin' | 'route_senses'
  | 'yield' | 'burst_area';
```

**The 8-frame input buffer (Smash Bros. precedent, 8 frames chosen between Smash's 10 and Celeste's 6).** Inputs received during Committed/Active/Recovery are buffered for up to 8 frames. On transition to Idle, the most recent buffered input is consumed. If the buffer holds multiple inputs, the most recent wins (the player's last intention).

**The clear rule.** The buffer clears on:
- Successful consumption (an input was used).
- 8-frame expiration (an input was held too long without being consumed).
- Opponent's hit (your buffered input is interrupted by being staggered).

**Failure case — buffer lock.** A player who spams inputs fills the buffer with noise; their intended input may be lost. The simulator does not prevent this (the doctrine: "the system permits the action; the world punishes it"). The player learns to time inputs.

---

## 3. The commitment model

Once a combatant enters `Committed.Anticipation`, they cannot cancel. This is the Sekiro/Monster Hunter precedent.

```typescript
interface CommitmentRule {
  fromState: CombatState;
  toState: CombatState;
  cancelable: boolean;
  cancelCost: number | null;       // resource cost if a cancel is allowed (e.g., Roman Cancel)
  cancelWindow: number;            // frames during which cancel is allowed (0 if never)
}

// The single sanctioned cancel: qi-burst during Committed.Anticipation,
// costs 30% of reservoir (per Guilty Gear Roman Cancel precedent)
const qiBurstCancel: CommitmentRule = {
  fromState: 'Committed',
  toState: 'Active',
  cancelable: true,
  cancelCost: 0.30,                // 30% of reservoir
  cancelWindow: 4,                 // only the first 4 frames of Anticipation
};
```

**The exception list.** Cancelable actions are limited to:
1. Qi-burst cancel (above) — available at Qi Condensation+.
2. Treasure activation (per doc 13 §6.5) — available at Core Formation+.
3. Domain withdrawal (per doc 13 §6.7) — available at Spirit Severance+.

Everything else is committed. The doctrine's "no cancels" rule (per doc 13 §3) is the default; the exceptions are the named unlocks at higher realms.

**Failure case — cancel spam.** A player who qi-burst-cancels every action drains their reservoir fast. The simulator enforces the reservoir cost; the player cannot cancel without the qi. This is the genre's "reckless cultivator wastes qi" trope, made mechanical.

---

## 4. Qi routing (phase-aware, 4 routings × 5 phases = 20 combinations)

Per doc 13 §4, qi can be routed to four body regions (Hands, Legs, Skin, Senses), each with five phase modes (Wood, Fire, Earth, Metal, Water). The 20 combinations each have distinct effects.

```typescript
interface QiRouting {
  region: RoutingRegion;
  phase: Phase;
  switchCost: number;              // frames to switch from previous routing
  reservoirDrain: number;          // per tick while active
}

type RoutingRegion = 'hands' | 'legs' | 'skin' | 'senses';
type Phase = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

// The 20 combinations, each with a distinct effect profile:
const routingEffects: Record<RoutingRegion, Record<Phase, RoutingEffect>> = {
  hands: {
    wood:   { damage: 1.0, effect: 'lifesteal_small',     phaseType: 'generation' },
    fire:   { damage: 1.5, effect: 'burn_dot',            phaseType: 'conquest'   },
    earth:  { damage: 0.8, effect: 'knockback',           phaseType: 'neutral'    },
    metal:  { damage: 1.8, effect: 'armor_pierce',        phaseType: 'conquest'   },
    water:  { damage: 0.9, effect: 'slow_target',         phaseType: 'generation' },
  },
  legs: {
    wood:   { speed: 1.3, effect: 'root_break',           phaseType: 'generation' },
    fire:   { speed: 1.5, effect: 'trail_burn',           phaseType: 'conquest'   },
    earth:  { speed: 0.9, effect: 'immovable',            phaseType: 'neutral'    },
    metal:  { speed: 1.1, effect: 'cut_ground',           phaseType: 'conquest'   },
    water:  { speed: 1.4, effect: 'flow_dodge',           phaseType: 'generation' },
  },
  skin: {
    wood:   { defense: 1.2, effect: 'regen_small',        phaseType: 'generation' },
    fire:   { defense: 0.8, effect: 'reflect_burn',       phaseType: 'conquest'   },
    earth:  { defense: 1.8, effect: 'stone_skin',         phaseType: 'neutral'    },
    metal:  { defense: 1.5, effect: 'blade_reflect',      phaseType: 'conquest'   },
    water:  { defense: 1.0, effect: 'flow_redirect',      phaseType: 'generation' },
  },
  senses: {
    wood:   { perception: 1.5, effect: 'read_ecology',    phaseType: 'generation' },
    fire:   { perception: 1.3, effect: 'see_residue_hot', phaseType: 'conquest'   },
    earth:  { perception: 1.0, effect: 'feel_vibration',  phaseType: 'neutral'    },
    metal:  { perception: 1.4, effect: 'detect_weapon',   phaseType: 'conquest'   },
    water:  { perception: 1.6, effect: 'read_emotion',    phaseType: 'generation' },
  },
};
```

**The switch cost.** Switching routing costs `switchCost` frames (default 60-120 at Qi Condensation, per doc 13 §4.2 — the user's "1-2 seconds"). During the switch, the combatant is in `Committed.RoutingSwitch` and cannot attack or defend. The switch cost is the tempo-economy's guard against constant routing-juggling.

**Failure case — route fixation (per doc 13 §8.4).** A combatant who stays in one routing too long accumulates route-fixation deviation risk (per doc 31 §7). When the deviation manifests, the switch transition becomes illegal until the deviation is resolved. The combatant is locked into one routing — predictable, exploitable.

---

## 5. Phase matchup multipliers (wuxing generation/conquest)

Per doc 00 §6, the five phases interact via the generation (相生) and conquest (相剋) cycles. In combat, the attacker's phase vs. the defender's phase produces a multiplier on damage and effect.

```
Generation cycle (相生):  wood → fire → earth → metal → water → wood
                          (attacker generates defender: -50% damage, +50% lifesteal)

Conquest cycle (相剋):    wood → earth → water → fire → metal → wood
                          (attacker conquers defender: +50% damage, +50% effect strength)

Neutral (same phase):     1.0× damage, 1.0× effect
```

```typescript
function phaseMultiplier(attackerPhase: Phase, defenderPhase: Phase): PhaseMatchup {
  if (attackerPhase === defenderPhase) return { damageMult: 1.0, effectMult: 1.0, type: 'neutral' };
  if (conquers(attackerPhase, defenderPhase)) return { damageMult: 1.5, effectMult: 1.5, type: 'conquest' };
  if (generates(attackerPhase, defenderPhase)) return { damageMult: 0.5, effectMult: 0.5, type: 'generation', lifesteal: 0.5 };
  // reverse conquest: attacker is conquered by defender
  return { damageMult: 0.75, effectMult: 0.75, type: 'reverse_conquest' };
}

function conquers(a: Phase, d: Phase): boolean {
  const conquestOrder: Phase[] = ['wood', 'earth', 'water', 'fire', 'metal'];
  return conquestOrder.indexOf(a) === (conquestOrder.indexOf(d) + 1) % 5;
}

function generates(a: Phase, d: Phase): boolean {
  const generationOrder: Phase[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  return generationOrder.indexOf(a) === (generationOrder.indexOf(d) + 1) % 5;
}
```

**Failure case — phase mismatch lock.** A combatant whose phase is conquered by the opponent's must switch routing to a generating or conquering phase — paying the switch cost (§4) during the opponent's recovery window. A skilled opponent reads the mismatch and punishes the switch. This is the genre's "phase counter" combat, made mechanical.

---

## 6. Residue reading in combat

Per doc 13 §5 and doc 27 §5, qi-bearing events leave residue. In combat, every strike, every routing switch, every commitment leaves residue that a perceptive opponent can read.

```typescript
interface CombatResidue {
  residueId: number;
  originatingAction: ActionInstance;
  bornAtFrame: number;
  intensity: number;               // decays per frame
  halfLife: number;                // frames (default 60 at Qi Condensation)
  phaseSignature: Phase;
  location: Vec3;                  // where the residue is
  actorSignature: number;          // hash of the actor's qi-state at the moment
}

interface ReadingAttempt {
  readerId: number;
  targetResidue: CombatResidue;
  attentionCost: number;           // 5/15/30 per residue-read type, per doc 13 §5.2
  perceived: {
    actionType: string;
    phase: Phase;
    intensity: number;
    actorStateHash: string;
  } | null;                        // null if read failed (attention insufficient or residue too faint)
  success: boolean;
}
```

**The reading rule.** A combatant in `Committed.Reading` (30 frames, 5 attention) can read the most recent residue in their perception range. The read reveals: the originating action's type (strike, defend, dodge, route-switch), the phase, the intensity, and a hash of the actor's qi-state at the moment (which an experienced reader can map to "their reservoir is at 40%" or "they have a meridian inflammation").

**Failure case — reading trap.** A deceptive opponent (high `traits.deception`, per doc 26 §12) can leave a forged residue (per doc 27 §5 failure case). The reader perceives a false action type or phase. Detecting the forgery requires `qi_perception` higher than the forger's skill by one realm tier. This is the genre's "false tell" combat, made mechanical.

---

## 7. The five combat scales

Per doc 13 §7, combat occurs at five scales. Each scale configures the state machine.

```typescript
type CombatScale = 'duel' | 'mob' | 'giant' | 'battlefield' | 'law_conflict';

interface CombatScaleConfig {
  scale: CombatScale;
  stateMachine: 'full' | 'simplified' | 'terrain' | 'force_multiplier' | 'law_state_machine';
  maxCombatants: number;
  routingAvailable: boolean;
  residueReadable: boolean;
  injuriesTracked: boolean;
}
```

### 7.1 Duel (1v1)

Full state machine (§1). All transitions, all routings, all residue readable, all injuries tracked. The prototype's Golden Scene 3 (per doc 09 §1.3).

### 7.2 Mob (1v12)

The cultivator's state machine is full. The mob members' state machines are simplified (per doc 13 §7.2): each mob member has only `Idle`, `Committed`, `Recovery`, `Staggered`, `Downed`, `Dead`. No routing, no feints, no reads. Crowd control matters; the cultivator must use area effects and mobility.

### 7.3 Giant hunt (1 vs. giant beast)

The giant is a terrain piece with hit zones (per doc 13 §7.3). Each zone has its own injury state. The cultivator's state machine is full but many actions are insufficient to stagger; the cultivator must chain hits to a single zone or land a heavy qi-burst to a weak zone. The giant's attacks are telegraphed over 60-120 frames.

### 7.4 Battlefield (army-scale)

The cultivator is a force multiplier (per doc 13 §7.4). The battlefield has its own state machine (army morale, formation, supply). The cultivator fights at key moments — breaking a formation, dueling the enemy commander, holding a breach. Between moments, they recover, route, or read the battlefield's residue (a Core Formation+ cultivator reads the *battlefield's* qi-state).

### 7.5 Law conflict (Spirit Severance+)

No physical combat; the contest is over whose law holds (per doc 13 §7.5). The state machine is `Law-Proposed → Law-Contested → Law-Resolved`. No physical state machine; no injuries. Resolution by withdrawal, exhaustion, external adjudication, or mutual destruction.

---

## 8. The injury model (9 types)

Per doc 13 §8, injuries are specific physical and qi-system damage, not hit points. This document ratifies the 9 types and specifies their onset thresholds and recovery times.

```typescript
interface Injury {
  injuryType: InjuryType;
  location: InjuryLocation;
  severity: number;                // 0..1
  onsetTick: number;
  onsetThreshold: number;          // the damage magnitude that triggered it
  recoveryTime: number;            // in-game days, untreated
  recoveryTimeTreated: number;     // with medicine
  effects: InjuryEffect[];
  resolved: boolean;
  resolvedAt: number | null;
}

type InjuryType =
  | 'cut_superficial' | 'cut_deep' | 'cut_tendon' | 'fractured_bone'
  | 'meridian_inflammation' | 'organ_damage' | 'qi_depletion'
  | 'anchor_bruise' | 'core_crack';

type InjuryLocation =
  | 'head' | 'torso' | 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg'
  | 'meridian_central' | 'meridian_ancestral' | 'meridian_spirit'
  | 'organ_lung' | 'organ_liver' | 'organ_heart' | 'organ_kidney'
  | 'anchor' | 'core';
```

**The onset threshold table:**

| Injury | Onset threshold | Effect | Recovery (untreated) | Recovery (treated) |
|---|---|---|---|---|
| Cut (superficial) | damage ≥ 5% HP-equiv | Pain (small tempo penalty); bleeding | 1-3 days | hours |
| Cut (deep) | damage ≥ 15% HP-equiv | Pain (large tempo); significant bleeding | 30-90 days | 7-14 days |
| Cut tendon | precision strike to wrist/ankle | Limb function drops to ~20-30% | 90-180 days | 30-60 days |
| Fractured bone | damage ≥ 30% HP-equiv to a region | Region unusable | 60-120 days | 30-60 days |
| Meridian inflammation | qi-strike to meridian, or routing overload | Meridian blocks routing; deviation-prone | 14-30 days | 7-14 days |
| Organ damage | deep strike to torso | Systemic effects (lung: stamina 2×; liver: contamination tolerance halved; heart: reservoir cap reduced; kidney: recharge halved) | 180-365 days | 60-180 days |
| Qi depletion | reservoir < 5% safe threshold | All qi-verbs unavailable | hours of rest | faster in qi-rich env |
| Anchor bruise | spiritual strike (Core Formation+) | Perception unreliable; oaths strained; deviation risk up | 30-60 days | 14-30 days |
| Core crack | sufficient shock to Core Formation cultivator | Catastrophic; qi uncontrollable; deviation near-certain | years, if survived | often fatal |

**The injury stack.** Injuries compound (per doc 13 §8.2): a combatant with a cut tendon in the wrist, a fractured rib, and meridian inflammation in the arm has compounded penalties — grip reduced, breathing impaired, arm-routing blocked. The combatant is mechanically barely functional.

**Injury and the state machine.** Injuries modify transitions (per doc 13 §8.3): a fractured leg makes the dodge transition illegal; meridian inflammation blocks routing through that meridian; organ damage to the lung doubles all tempo costs; qi depletion blocks all qi-bearing Committed states.

---

## 9. The death model (per-realm anchor fate)

Per doc 13 §9, bodily death is the `Dead` terminal; what happens to the anchor depends on realm. This document specifies the per-realm transition probabilities and timings.

```typescript
interface DeathTransition {
  deadCultivator: number;
  realm: Realm;
  deathTick: number;
  anchorFate: AnchorFate;
  bardoWindow: number;             // ticks the anchor can be retrieved
  retrievalAvailable: boolean;
}

type AnchorFate =
  | 'bardo_short'        // Mortal–Qi Condensation: hours to days
  | 'bardo_medium'       // Foundation Establishment: weeks
  | 'bardo_long'         // Core Formation: months; core can be retrieved
  | 'anchor_flight'      // Nascent Soul: anchor flees independently
  | 'domain_persist'     // Spirit Severance: anchor bound to domain
  | 'place_bond'         // Void Amalgamation: anchor bonded to a place
  | 'robust'             // Tribulation Crossing+: robust but not invincible
  | 'final_death';       // Mahayana law-conflict / sufficient tribulation
```

**The death state machine (per doc 13 §9.2):**

```
Dead ─[anchor leaves body]──> Bardo
Bardo ─[retrieved by ally/teacher]──> Retrieved (還魂)
Bardo ─[bardo window expires, karmic trace ratified]──> Reincarnated (轉世)
Bardo ─[anchor dispersed by force or expired unratified]──> Dispersed (寂滅, final death)
```

**The retrieval window.** Per realm:
- Mortal/Qi Induction/Qi Condensation: 1 in-game day (per doc 13 §9.1)
- Foundation Establishment: 7 in-game days
- Core Formation: 30 in-game days (the golden core persists)
- Nascent Soul: anchor flees immediately; no retrieval window (the cultivator is not dead)
- Spirit Severance: the domain persists; the cultivator can reconstitute from it if the domain stands
- Void Amalgamation: the place persists; the cultivator endures if the place stands
- Tribulation Crossing/Mahayana: robust; final death only through specific high-realm conflict

**Failure case — final death exploit.** A player who reaches Mahayana cannot be killed by lesser means. The simulator enforces this: lower-realm attacks have no effect on a Mahayana anchor. Final death requires either (a) a Mahayana law-conflict (per §7.5) lost decisively, (b) a sufficient tribulation (per doc 15), or (c) expiry of the bardo window after bodily death. This is the genre's "Mahayana invincibility" trope, made mechanical and bounded.

---

## 10. Combat determinism (hash verification)

Combat is deterministic: same inputs → same outcome. The engine verifies this by hashing each combatant's state at each frame.

```typescript
interface CombatDeterminismCheck {
  combatId: number;
  frame: number;
  combatantStates: Record<number, string>;  // combatantId → state hash
  inputHash: string;                         // hash of all inputs this frame
  totalHash: string;                         // SHA-256 of the combined state
}

function hashCombatantState(state: CombatantState): string {
  // CBOR-encode the full state (including RNG stream position) and SHA-256
  const cbor = cborEncode(state);
  return sha256(cbor);
}

function hashCombatInputs(inputs: CombatInput[]): string {
  return sha256(cborEncode(inputs));
}
```

**The verification rule.** Two runs with the same seed and the same player inputs produce identical `totalHash` at every frame. A mismatch flags the divergent frame, the divergent combatant, and the divergent field. The engine's CI runs a combat-replay test: a recorded duel is replayed; the hash at each frame must match the recorded hash.

**Input determinism.** Inputs are stamped with the frame they were received (per doc 17 §6.1, the input barrier). The same input at the same frame produces the same effect. The 8-frame buffer (§2) is deterministic: the buffer's state at any frame is a pure function of prior inputs.

**RNG consumption.** Combat uses RNG for: deviation-onset coin (per doc 31 §7), injury-onset roll (when damage is near a threshold), and the unstable-integration coin in breakthrough (per doc 31 §5.2, not in combat but adjacent). Each consumption is logged per combatant per frame; the RNG stream is seeded by `(combatantSeed, combatId, frame)`.

---

## 11. Tier simulation (S4 / S2 / S0)

Combat degrades by tier:

```
┌─────────┬──────────────────────────────────────────────────────────────┐
│ Tier    │ Combat behavior                                               │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S4      │ Full state machine. Every frame simulated. Residue readable.│
│ (full)  │ Injuries tracked per combatant. Player is present; combat is │
│         │ real-time. Cap: 16 combatants per region at S4 (player +    │
│         │ named NPCs + current antagonists).                           │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S2      │ Aggregate combat. Combats resolve as events (per doc 30)    │
│ (aggr.) │ with predetermined outcomes (seeded by state hash). No frame-│
│         │ by-frame state machine. Injuries aggregated to "wounded" or  │
│         │ "dead".                                                       │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S0      │ Frozen. No combat. Combatants' states are frozen at demotion.│
│ (frozen)│ On promotion, S2 catches up by resolving any combats that   │
│         │ would have occurred during the absence, with deterministic  │
│         │ RNG for outcomes.                                             │
└─────────┴──────────────────────────────────────────────────────────────┘
```

**Failure case — promotion combat artifact.** A combatant who would have died during the absence is dead on promotion. The simulator records the death in the persistent log (per doc 30 §12) and rehydrates the combatant as Dead with their anchor-fate determined by their realm. The player may discover that an antagonist died in their absence — or that a key ally did.

---

## 12. The 16-cultivator S4 cap and overflow

The S4 cap (16 combatants per region) is a performance budget. Overflow is handled by promoting the highest-priority combatants (the player, named NPCs in active conflict with the player) and demoting the lowest (anonymous mob members).

```typescript
interface S4CombatPriority {
  combatantId: number;
  priority: number;                // higher = more likely to stay at S4
}

// Priority computation:
//   player: +1000 (always S4 when in combat)
//   named NPCs in player's party: +500
//   named NPCs in active conflict with player: +400
//   named NPCs otherwise: +100
//   anonymous combatants in player's vicinity: +50
//   anonymous combatants elsewhere: +10
```

When the cap is exceeded, the lowest-priority combatants demote to S2 (their combat resolves as an aggregate event). This preserves the player's combat experience (full state machine for the player and their immediate opponents) while keeping the simulator performant.

---

## 13. Rejected alternatives

- **HP-bar combat (damage reduces a number; 0 = death).** Rejected: produces no skill expression, no injury specificity. The 9-type injury model (§8) is the engine.
- **Real-time-with-pause combat (Baldur's Gate precedent).** Rejected: violates the commitment model (§3). Pause-and-issue-orders is a different feel; the genre's combat is real-time.
- **Turn-based combat (JRPG precedent).** Rejected: wrong tempo for xianxia. Combat is real-time with frames, not turns.
- **Auto-combat (the cultivator auto-attacks; player only chooses targets).** Rejected: produces no skill expression. The state machine's commitment and routing (§3, §4) require player input.
- **Free-cancel combat (any action can be canceled at any time).** Rejected: violates the commitment model (per doc 13 §3). The exceptions are the named cancels (§3).
- **Dice-roll combat (D&D-style d20).** Rejected: deterministic-state-driven outcomes only (per doc 17 §3). The RNG consumption is logged and seeded (§10).

---

## 14. Open decisions (surfaced for review)

1. **The 8-frame input buffer (§2).** Inherited from doc 13. May need to be 6 or 10 after playtesting.
2. **The 60-120 frame routing switch cost at Qi Condensation (§4).** Inherited from doc 13. May be too punishing or too lenient.
3. **The 100-unit attention budget at Qi Condensation (§6, per doc 13 §5).** Invented. Needs playtesting against residue-reading costs.
4. **The injury types' exact recovery times (§8).** Ranges, not values. The procedural generator (doc 07) will need specific values, set in `combat.json` and tuned.
5. **The 16-combatant S4 cap (§12).** Invented. May be too low for mob-scale combat; may need to scale with combat scale.
6. **The 30% reservoir cost for qi-burst cancel (§3).** Invented. May be too punishing or too lenient.
7. **The bardo window per realm (§9).** Inherited from doc 13 §9.1 but specified as concrete values here. May need tuning.
8. **The phase-multiplier values (§5: 1.5× conquest, 0.5× generation, 0.75× reverse-conquest).** Invented. May need rebalancing after playtesting.

---

## 15. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus's combat doc (13) was the brake (no cancels, no free hits, no random rolls). This document specifies the engine: the production rules with frame costs, the tempo economy, the commitment model, the 20-combination routing system, the phase-matchup multipliers, the residue-reading rules, the five combat scales, the 9-type injury model, the per-realm death model, the determinism contract.
- **Make decisions; do not defer:** the state machine, the frame costs, the routing system, the phase multipliers, the injury thresholds, the death windows, the determinism hash are all decided. §14 are tuning parameters, not forks.
- **Cite the precedent:** Sekiro, Monster Hunter, Third Strike, Guilty Gear, Bushido Blade, Super Smash Bros., Celeste, Total War, Mount & Blade are named and their contributions specified at frame-level resolution.
- **Design for joy first:** the first hour's joy is reading the opponent's residue, recognizing the routing mismatch, and punishing with a phase-counter strike. The combat system is designed to produce the genre's best combat feel — readable, punishable, skill-expressive — adapted to xianxia's qi-system.
- **Authorize the smallest end-to-end thing:** this document specifies enough to implement the Qi Condensation duel (Golden Scene 3) as the first prototype. Upper realms and upper scales are design-ready; their prototypes are deferred until the Qi Condensation duel is proven.

This document is the combat execution bible. It is the engine the prior corpus's combat grammar was missing.
