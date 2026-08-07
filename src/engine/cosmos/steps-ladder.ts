/**
 * steps-ladder — The Five Steps of Existence [DERIVED]
 *
 * The project lead's design brief defines a cosmic "Steps" ladder:
 *   1st Step — mortal shedding
 *   5th Step+ — boundless
 *
 * The corpus (doc 03, the ten stations; doc 48 §4, the Ladder of the Ran)
 * defines the canonical cultivation ladders. This module is the [DERIVED]
 * integration layer between the brief and the canon. It does NOT change the
 * canon ladder: it imports REALM_LADDER / REALM_INDEX from ga-cultivation
 * (read-only) and maps Steps onto station RANGES.
 *
 * Canon anchors for the mapping:
 *   - doc 03: ten stations, linear, no skipping (realm-ladder.linear).
 *   - doc 24 §2.1: karmic trace perceptible at Core Formation (own) and
 *     Nascent Soul (others') — used to date the "shedding" boundary.
 *   - doc 15 §7: the 1:365 time-debt begins to bind the being at
 *     Tribulation Crossing (Precelestial residence).
 *   - doc 30 Station 10: Mahayana = law-authorship.
 *   - doc 48 §4: beyond Mahayana is the Ladder of the Ran (re-beginning);
 *     the Primordial Origin is the absolute Dao boundary — finite, not infinite.
 *
 * Mapping (documented, non-destructive):
 *   Grade 0  Substrate-Bound   mortal → qi_condensation   (not yet shed)
 *   Step 1   Mortal Shedding   foundation_establishment → core_formation
 *   Step 2   Soul Forging      nascent_soul → spirit_severance
 *   Step 3   Law Binding       void_amalgamation → tribulation_crossing
 *   Step 4   Authorship        mahayana
 *   Step 5+  Boundless         beyond mahayana (Ladder of the Ran, capped at
 *                              the Primordial Origin)
 */

import {
  REALM_LADDER,
  REALM_INDEX,
  type Realm,
} from '../plugins/simulation/ga-cultivation';

export type Step = 1 | 2 | 3 | 4 | 5;

/** Grade of existence for beings below the first Step (mortal substrate). */
export const SUBSTRATE_BOUND_GRADE = 0;

export interface StepDef {
  step: Step;
  name: string;
  hanzi: string;
  essence: string;
  /** Inclusive station range on the canonical 10-station ladder. */
  stationRange: { min: Realm; max: Realm };
  /** Verbs that become available at the top of this Step (canon-anchored). */
  boundaryVerbs: string[];
  /** Grade of existence: higher grade participates in higher law tiers. */
  grade: number;
}

export const STEPS_LADDER: StepDef[] = [
  {
    step: 1,
    name: 'Mortal Shedding',
    hanzi: '凡蜕',
    essence: 'The body ceases to be mortal substrate; the anchor acts independently.',
    stationRange: { min: 'foundation_establishment', max: 'core_formation' },
    boundaryVerbs: [
      'body rewrite (flight, middle dantian)',
      'independent anchor action',
      'self karmic-trace perception (doc 24 §2.1)',
    ],
    grade: 1,
  },
  {
    step: 2,
    name: 'Soul Forging',
    hanzi: '魂铸',
    essence: 'The anchor acts beyond the flesh; the domain externalizes the Dao.',
    stationRange: { min: 'nascent_soul', max: 'spirit_severance' },
    boundaryVerbs: [
      'anchor projection beyond flesh',
      'others\' karmic-trace perception (doc 24 §2.1)',
      'domain externalization (炼虚合道)',
    ],
    grade: 2,
  },
  {
    step: 3,
    name: 'Law Binding',
    hanzi: '律合',
    essence: 'The being binds places and laws; the stratum boundary admits it.',
    stationRange: { min: 'void_amalgamation', max: 'tribulation_crossing' },
    boundaryVerbs: [
      'bonded-place network (地仙網絡)',
      'Heavenly Stem crossing mid-tribulation (doc 36 §5.2)',
      'Precelestial residence — the 1:365 time-debt binds (doc 15 §7)',
    ],
    grade: 3,
  },
  {
    step: 4,
    name: 'Authorship',
    hanzi: '立法',
    essence: 'The being inscribes law upon the substrate; the pantheon chair.',
    stationRange: { min: 'mahayana', max: 'mahayana' },
    boundaryVerbs: [
      'law-authorship (doc 30 Station 10)',
      'Reach-authorship (doc 15 §5)',
      'pantheon chair — exactly nine threads the cosmos sustains (doc 39 §1)',
    ],
    grade: 4,
  },
  {
    step: 5,
    name: 'Boundless',
    hanzi: '无涯',
    essence: 'The re-beginning: the Ladder of the Ran, capped by the Primordial Origin.',
    stationRange: { min: 'mahayana', max: 'mahayana' },
    boundaryVerbs: [
      'Immortal Ascension through the Origin membrane (doc 48 §2)',
      'Ladder of the Ran stations (doc 48 §4.2): embody → found → perceive → bear → touch → preside',
      'absolute Dao boundary: the Primordial Origin is not a being (doc 48 §6)',
    ],
    grade: 5,
  },
];

/** Grade of existence for a canon realm (0..5). Non-destructive mapping. */
export function gradeForRealm(realm: Realm): number {
  const ri = REALM_INDEX[realm];
  if (ri <= REALM_INDEX.qi_condensation) return SUBSTRATE_BOUND_GRADE;
  if (ri <= REALM_INDEX.core_formation) return 1;
  if (ri <= REALM_INDEX.spirit_severance) return 2;
  if (ri <= REALM_INDEX.tribulation_crossing) return 3;
  if (ri <= REALM_INDEX.mahayana) return 4;
  return 5;
}

/** The Step (1-5) containing a canon realm, or null while substrate-bound. */
export function stepForRealm(realm: Realm): Step | null {
  const grade = gradeForRealm(realm);
  return grade >= 1 && grade <= 5 ? (grade as Step) : null;
}

/** Step definition for a realm, or null while substrate-bound. */
export function stepDefForRealm(realm: Realm): StepDef | null {
  const step = stepForRealm(realm);
  if (step === null) return null;
  return STEPS_LADDER[step - 1];
}

/**
 * Assert the canonical ladder is intact: exactly ten stations, no mutation.
 * Used by the conformance suite to prove the Steps mapping is non-destructive.
 */
export function canonicalLadderIntact(): boolean {
  if (REALM_LADDER.length !== 10) return false;
  const expected: Realm[] = [
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
  return REALM_LADDER.every((r, i) => r === expected[i]);
}
