/**
 * Definition Database — aggregation index.
 *
 * Merges the base authored definitions with the corpus-mined wiki layers
 * (NPCs, craft, ecology, places). The genesis gate and the definition
 * conformance suite audit this database as the wiki-scale canon content.
 */

import type { Definition } from '../definitions';
import {
  ESSENCE_DEFINITIONS,
  REALM_DEFINITIONS,
  DEVIATION_DEFINITIONS,
  TECHNIQUE_DEFINITIONS as CORE_TECHNIQUE_DEFINITIONS,
  PRACTICE_DEFINITIONS,
  LOCATION_DEFINITIONS,
} from '../definitions';
import { NPC_DEFINITIONS } from './npcs';
import { CRAFT_DEFINITIONS } from './craft';
import { ECOLOGY_DEFINITIONS } from './ecology';
import { PLACE_DEFINITIONS } from './places';
import { BASE_GAP_DEFINITIONS } from './base-gaps';
import { TECHNIQUE_DEFINITIONS } from './techniques';
import { ECONOMY_HISTORY_DEFINITIONS } from './economy-history';
import { STATIONS_6_10_DEFINITIONS } from './stations-6-10';
import { FOLK_RELIGION_DEFINITIONS } from './folk-religion';
import { NARRATIVE_DEFINITIONS } from './narrative';
import { SECT_CANON_DEFINITIONS } from './sect-canon';

export const ALL_DEFINITIONS: Definition[] = [
  ...ESSENCE_DEFINITIONS,
  ...REALM_DEFINITIONS,
  ...DEVIATION_DEFINITIONS,
  ...CORE_TECHNIQUE_DEFINITIONS,
  ...TECHNIQUE_DEFINITIONS,
  ...PRACTICE_DEFINITIONS,
  ...LOCATION_DEFINITIONS,
  ...NPC_DEFINITIONS,
  ...CRAFT_DEFINITIONS,
  ...ECOLOGY_DEFINITIONS,
  ...PLACE_DEFINITIONS,
  ...BASE_GAP_DEFINITIONS,
  ...ECONOMY_HISTORY_DEFINITIONS,
  ...STATIONS_6_10_DEFINITIONS,
  ...FOLK_RELIGION_DEFINITIONS,
  ...NARRATIVE_DEFINITIONS,
  ...SECT_CANON_DEFINITIONS,
];

export const DEFINITION_TOTAL = ALL_DEFINITIONS.length;

export { NPC_DEFINITIONS, CRAFT_DEFINITIONS, ECOLOGY_DEFINITIONS, PLACE_DEFINITIONS, BASE_GAP_DEFINITIONS, TECHNIQUE_DEFINITIONS, ECONOMY_HISTORY_DEFINITIONS, STATIONS_6_10_DEFINITIONS, FOLK_RELIGION_DEFINITIONS, NARRATIVE_DEFINITIONS, SECT_CANON_DEFINITIONS };
