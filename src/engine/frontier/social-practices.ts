#!/usr/bin/env bun
/**
 * frontier/social-practices.ts — social-practice simulation (directive §14 layer 5).
 *
 * Versu/CiF style: instead of scripting dialogue, author reusable SITUATIONS —
 * greeting a senior, disciplining a junior, requesting instruction, bargaining,
 * challenging someone, giving face, losing face, refusing a toast, sect
 * recruitment, auction bidding, debt acknowledgement, blood feud, Dao debate...
 *
 * Each practice supplies possible ACTIONS according to the current participants
 * and circumstances. Multiple practices can overlap (a bargaining scene can
 * become a debt-invocation scene). The xianxia ledger (face, seniority, debt,
 * oath, grudge) from npc-cognition.ts drives which actions are available and
 * how they resolve.
 *
 * This is the authored, compiled corpus layer: development agents manufacture
 * practices; the runtime selects and executes them — zero LLM calls.
 *
 * Run: bun run src/engine/frontier/social-practices.ts
 */

import { SocialLedger, DialogueAct, DialogueIntent } from './npc-cognition';

export interface Participant {
  id: string;
  realmIndex: number;
  seniorTo: boolean;       // by sect rank / lineage
  isTarget: boolean;
}

export interface PracticeTrigger {
  /** Situation name this practice applies to (e.g. 'trespass', 'bargain', 'toast'). */
  situation: string;
  minParticipants: number;
  maxParticipants: number;
  /** Ledger conditions that make this practice available. */
  requires?: {
    debtOwedTo?: string;        // someone in the scene owes this participant
    grudgeAgainst?: string;
    oathBound?: string;
  };
}

export interface PracticeAction {
  id: string;
  act: DialogueAct;
  /** Target the action is aimed at (participant id). */
  targetRole: 'target' | 'junior' | 'senior' | 'any';
  /** Score modifiers applied to the action's selection. All optional; missing = 0. */
  boosts: {
    faceThreat?: number;       // high when public audience / losing face
    debtPresent?: number;      // high when the target owes us
    seniorityGap?: number;     // high when we outrank the target
    realmGap?: number;
  };
  /** Effects on the ledger when the action is taken. */
  effects: {
    giveFace?: { person: string; amount: number };
    loseFace?: { person: string; amount: number };
    invokeDebt?: { owedTo: string };
    holdGrudge?: { person: string; amount: number };
  };
}

export interface SocialPractice {
  id: string;
  trigger: PracticeTrigger;
  actions: PracticeAction[];
}

export interface PracticeRequest {
  situation: string;
  participants: Participant[];
  ledger: SocialLedger;
  publicAudience: boolean;
}

export interface PracticeResolution {
  chosen: PracticeAction;
  /** Why it was chosen (for audit / determinism). */
  reason: string;
  /** Ledger after applying the action's effects. */
  ledgerAfter: SocialLedger;
}

export class SocialPracticeEngine {
  practices: Map<string, SocialPractice> = new Map();

  register(p: SocialPractice): void {
    this.practices.set(p.id, p);
  }

  /** All practices whose trigger matches the request. Overlapping allowed. */
  matchingPractices(req: PracticeRequest): SocialPractice[] {
    return [...this.practices.values()].filter((p) => {
      const t = p.trigger;
      if (t.situation !== req.situation) return false;
      if (req.participants.length < t.minParticipants || req.participants.length > t.maxParticipants) return false;
      if (t.requires?.debtOwedTo && !req.participants.some((pt) => pt.isTarget && req.ledger.debts.some((d) => d.owedTo === t.requires!.debtOwedTo))) return false;
      if (t.requires?.grudgeAgainst && !req.participants.some((pt) => pt.isTarget && (req.ledger.grudges.get(pt.id) ?? 0) > 0)) return false;
      return true;
    });
  }

  /**
   * Resolve the situation: pick the highest-scoring action across all matching
   * practices. Scores combine the participant's own boosts with the request
   * context (audience, seniority, debt, realm). Deterministic — ties break by
   * registration order.
   */
  resolve(req: PracticeRequest): PracticeResolution | null {
    const practices = this.matchingPractices(req);
    if (practices.length === 0) return null;

    let best: PracticeAction | null = null;
    let bestScore = -Infinity;
    let bestReason = '';
    let bestPractice = '';

    for (const p of practices) {
      for (const action of p.actions) {
        const b = action.boosts;
        const faceThreat = b.faceThreat ?? 0;
        const debtPresent = b.debtPresent ?? 0;
        const seniorityGap = b.seniorityGap ?? 0;
        const realmGap = b.realmGap ?? 0;
        const target = req.participants.find((pt) => pt.isTarget);
        const senior = req.participants.find((pt) => pt.seniorTo);
        const nonTarget = req.participants.find((pt) => !pt.isTarget);
        const score =
          faceThreat * (req.publicAudience ? 1 : 0.2) +
          debtPresent * (target && req.ledger.debts.some((d) => d.owedTo === target.id) ? 1 : 0) +
          seniorityGap * (senior && target && senior.realmIndex - target.realmIndex > 0 ? 1 : 0) +
          realmGap * (target && nonTarget && target.realmIndex > nonTarget.realmIndex ? 1 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = action;
          bestPractice = p.id;
          bestReason = `practice=${p.id} score=${score.toFixed(2)}`;
        }
      }
    }

    if (!best) return null;

    // apply effects to a copy of the ledger
    const ledgerAfter: SocialLedger = {
      face: new Map(req.ledger.face),
      debts: [...req.ledger.debts],
      oaths: new Map(req.ledger.oaths),
      grudges: new Map(req.ledger.grudges),
      favors: new Map(req.ledger.favors),
    };
    if (best.effects.giveFace) {
      const e = best.effects.giveFace;
      ledgerAfter.face.set(e.person, Math.min(1, (ledgerAfter.face.get(e.person) ?? 0.5) + e.amount));
    }
    if (best.effects.loseFace) {
      const e = best.effects.loseFace;
      ledgerAfter.face.set(e.person, Math.max(0, (ledgerAfter.face.get(e.person) ?? 0.5) - e.amount));
    }
    if (best.effects.invokeDebt) {
      ledgerAfter.debts = ledgerAfter.debts.filter((d) => d.owedTo !== best!.effects.invokeDebt!.owedTo);
    }
    if (best.effects.holdGrudge) {
      const e = best.effects.holdGrudge;
      ledgerAfter.grudges.set(e.person, Math.min(1, (ledgerAfter.grudges.get(e.person) ?? 0) + e.amount));
    }

    return { chosen: best, reason: bestReason, ledgerAfter };
  }
}

/* ---------------- conformance ---------------- */

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

function buildPractices(): SocialPracticeEngine {
  const engine = new SocialPracticeEngine();
  engine.register({
    id: 'practice:trespass-warning',
    trigger: { situation: 'trespass', minParticipants: 2, maxParticipants: 4, requires: { debtOwedTo: 'player' } },
    actions: [
      { id: 'warn-and-forgive', act: 'warn', targetRole: 'target', boosts: { faceThreat: 0.3, debtPresent: 1.0, seniorityGap: 0.2, realmGap: 0 }, effects: { giveFace: { person: 'player', amount: 0.1 } } },
      { id: 'punish', act: 'command', targetRole: 'target', boosts: { faceThreat: 0.6, debtPresent: 0, seniorityGap: 0.5, realmGap: 0 }, effects: { loseFace: { person: 'player', amount: 0.2 } } },
    ],
  });
  engine.register({
    id: 'practice:trespass-punish',
    trigger: { situation: 'trespass', minParticipants: 2, maxParticipants: 4 },
    actions: [
      { id: 'punish', act: 'command', targetRole: 'target', boosts: { faceThreat: 0.6, debtPresent: 0, seniorityGap: 0.5, realmGap: 0 }, effects: { loseFace: { person: 'player', amount: 0.2 } } },
      { id: 'threaten', act: 'threaten', targetRole: 'target', boosts: { faceThreat: 0.2, debtPresent: 0, seniorityGap: 0.1, realmGap: 0 }, effects: {} },
    ],
  });
  engine.register({
    id: 'practice:toast-refusal',
    trigger: { situation: 'toast', minParticipants: 2, maxParticipants: 3 },
    actions: [
      { id: 'accept-toast', act: 'give_face', targetRole: 'senior', boosts: { faceThreat: 0.8, seniorityGap: 1.0, realmGap: 0 }, effects: { giveFace: { person: 'senior', amount: 0.15 } } },
      { id: 'refuse-toast', act: 'deflect', targetRole: 'senior', boosts: { faceThreat: 0.1, seniorityGap: -0.5, realmGap: 0 }, effects: { loseFace: { person: 'refuser', amount: 0.1 } } },
    ],
  });
  return engine;
}

function run() {
  console.log('=== Social Practice Engine Conformance ===\n');

  const engine = buildPractices();

  // 1. trespass with a debt: the debt-invoking warning practice matches
  const ledger = createLedgerWithDebt();
  const req: PracticeRequest = {
    situation: 'trespass',
    participants: [
      { id: 'elder', realmIndex: 4, seniorTo: true, isTarget: false },
      { id: 'player', realmIndex: 0, seniorTo: false, isTarget: true },
    ],
    ledger,
    publicAudience: true,
  };
  const matches = engine.matchingPractices(req);
  assert(matches.some((p) => p.id === 'practice:trespass-warning'), 'trespass practice matches when debt present');

  const res = engine.resolve(req)!;
  assert(res.chosen.id === 'warn-and-forgive', `debt causes warn-and-forgive (got ${res.chosen.id})`);
  assert((res.ledgerAfter.face.get('player') ?? 0) > 0.5, 'warn-and-forgive gives the player face');

  // 2. same situation WITHOUT the debt → punish wins (face threat + seniority)
  const noDebtLedger = createLedger();
  const reqNoDebt: PracticeRequest = {
    situation: 'trespass',
    participants: [
      { id: 'elder', realmIndex: 4, seniorTo: true, isTarget: false },
      { id: 'player', realmIndex: 0, seniorTo: false, isTarget: true },
    ],
    ledger: noDebtLedger,
    publicAudience: true,
  };
  const resNoDebt = engine.resolve(reqNoDebt)!;
  assert(resNoDebt.chosen.id === 'punish', 'without debt, seniority+audience drives punish');

  // 3. toast practice: accepting a senior's toast is dominant
  const toastReq: PracticeRequest = {
    situation: 'toast',
    participants: [
      { id: 'junior', realmIndex: 1, seniorTo: false, isTarget: true },
      { id: 'senior', realmIndex: 6, seniorTo: true, isTarget: false },
    ],
    ledger: createLedger(),
    publicAudience: true,
  };
  const toastRes = engine.resolve(toastReq)!;
  assert(toastRes.chosen.id === 'accept-toast', `accepting a senior toast wins (got ${toastRes.chosen.id})`);

  // 4. overlapping practices: both may match; engine picks highest score (no crash)
  const both = engine.matchingPractices(toastReq);
  assert(both.length >= 1, 'at least one practice matches toast');

  // 5. no match → null
  const none = engine.resolve({ situation: 'auction', participants: [{ id: 'a', realmIndex: 0, seniorTo: false, isTarget: true }], ledger: createLedger(), publicAudience: false });
  assert(none === null, 'unregistered situation resolves to null');

  // 6. determinism: same inputs → same action, every run
  const r1 = engine.resolve(req)!;
  const r2 = engine.resolve(req)!;
  assert(r1.chosen.id === r2.chosen.id, 'deterministic resolution');

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

function createLedger(): SocialLedger {
  return { face: new Map(), debts: [], oaths: new Map(), grudges: new Map(), favors: new Map() };
}
function createLedgerWithDebt(): SocialLedger {
  const l = createLedger();
  l.debts.push({ owedTo: 'player', amount: 0.8, reason: 'spared_my_life', tick: 1 });
  return l;
}

if (import.meta.main) run();
