#!/usr/bin/env node
/**
 * Batch ground-truth retrofit script.
 * Adds a truth-level annotation header to each corpus doc that's missing one.
 * Run: node scripts/retrofit-ground-truth.mjs
 */
import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';

const CORPUS_DIR = join(process.cwd(), 'corpus-extension');

// Classification by doc number → truth level + topic summary
const DOC_CLASSIFICATIONS = {
  '05': { truthLevel: 'Canonical invariant (phenomenology)', topic: 'What qi perception feels like from inside', canon: 'Qi perception follows the five-sense-plus-spiritual-sense model. Each realm station adds exactly one new perceptual capacity.' },
  '06': { truthLevel: 'Art-directed (visual reference)', topic: 'Golden scenes — target visual moments', canon: 'Golden scenes are art-direction targets, not gameplay scripts. Each defines a visual moment the engine must be able to produce.' },
  '07': { truthLevel: 'Derived (procedural implications)', topic: 'How procedural generation follows from the bible', canon: 'Procedural generation must follow the 13-stage pipeline (architecture doc 51 §13). No generation from vague tags.' },
  '09': { truthLevel: 'Derived (synthesis)', topic: 'Cross-document synthesis and reconciliation', canon: 'When two docs conflict, the lower-numbered doc is canonical unless explicitly superseded by a reconciliation decision in doc 24.' },
  '11': { truthLevel: 'Derived (engine design)', topic: 'Engine architecture decisions', canon: 'The engine is deterministic, plugin-based, and capability-driven. No forbidden functions in simulation code.' },
  '12': { truthLevel: 'Canonical invariant (sect institutions)', topic: 'Sect structure, hierarchy, and operation', canon: 'Sects follow a strict hierarchy: patriarch to elders to inner disciples to outer disciples to servants. Each sect has exactly one spirit vein or grotto-heaven.' },
  '13': { truthLevel: 'Canonical invariant (combat grammar)', topic: 'Combat technique grammar and execution', canon: 'Combat follows the technique packet schema (doc 51 §6 + doc 55 §2). Every technique has forbiddenInterpretations (never empty).' },
  '15': { truthLevel: 'Canonical invariant (precelestial and tribulation)', topic: 'Tribulation mechanics and precelestial phenomena', canon: 'Tribulations are deterministic events triggered by realm breakthroughs. They scale with the cultivator realm and karma.' },
  '16': { truthLevel: 'Canonical invariant (formations, talismans, alchemy)', topic: 'Formation, talisman, and alchemy systems', canon: 'Formations are geometric qi-circuits with explicit node/edge topology. Talismans are single-use qi-storage items. Alchemy follows the recipe-constraint model.' },
  '17': { truthLevel: 'Derived (engine architecture)', topic: 'Engine architecture specification', canon: 'The engine uses a kernel+plugin architecture with capability-based registration. See engine-architecture/ for the full spec.' },
  '18': { truthLevel: 'Canonical invariant (economy)', topic: 'Economy system: goods, trade, wealth tiers', canon: 'The economy uses a household-based model with rice as the primary staple. Wealth tiers: rich to comfortable to poor to destitute. Trade goods have explicit PhysicalSpecifications.' },
  '19': { truthLevel: 'Canonical invariant (grotto heavens)', topic: 'Grotto-heaven pocket dimensions', canon: 'Grotto-heavens are pocket dimensions with 10 to 500 km interior diameter. They are accessed via formation gates. Each is owned by a sect or holy land.' },
  '20': { truthLevel: 'Canonical invariant (cultivation world)', topic: 'Cultivation world structure and cosmology', canon: 'The cultivation world has 3-5 holy lands per continent and 5-10 great sects per region. Mortal worlds are 6,000-12,000 km radius.' },
  '21': { truthLevel: 'Derived (physics engine)', topic: 'Physics engine specification', canon: 'The physics engine is deterministic. Collision meshes must align with render meshes within 0.1m (doc 54). No torn render/collision state.' },
  '22': { truthLevel: 'Derived (AI interaction)', topic: 'AI interaction layer — Grand Architect protocol', canon: 'The Grand Architect operates through the gateway/permissions/audit/tool-protocol stack. It never silently converts [UNRESOLVED] to fact.' },
  '23': { truthLevel: 'Art-directed (GUI/HUD/UX)', topic: 'GUI, HUD, and UX design', canon: 'The UI uses dark theme with emerald/purple/amber accents. No indigo or blue. SI units internally; li/zhang/shichen in display.' },
  '24': { truthLevel: 'Canonical invariant (reconciliation)', topic: 'Cross-document reconciliation decisions', canon: 'Reconciliation decisions in this document supersede conflicting claims in lower-numbered docs. This is the canonical tiebreaker.' },
  '25': { truthLevel: 'Canonical invariant (folk religion)', topic: 'Folk religion and metaphysics', canon: 'Folk religion coexists with cultivation. Village shrines are 3-6m wide, 4-6m tall (doc 52 §3). They are not sect temples.' },
  '26': { truthLevel: 'Canonical invariant (narrative)', topic: 'Narrative spine and story structure', canon: 'The narrative follows the one mortal morning vertical slice as its first playable milestone. Story events are deterministic and seed-driven.' },
  '27': { truthLevel: 'Canonical invariant (cultivation systems)', topic: 'Cultivation system mechanics', canon: 'Cultivation follows the 10-station ladder (doc 03). Qi capacity doubles per station. Breakthrough requires explicit qi accumulation plus tribulation.' },
  '28': { truthLevel: 'Art-directed (village in medias res)', topic: 'The starting village — Wang Family Bend', canon: 'Wang Family Bend is the canonical starting village (pop. ~180, 31 households). It uses the Cangli Riverlands style grammar (doc 53 §2).' },
  '30': { truthLevel: 'Canonical invariant (realms expanded)', topic: 'Expanded realm details for stations 1-10', canon: 'Realm details must be consistent with doc 03. Body height, speed, and qi capacity follow the PhysicalSpec table in doc 03.' },
  '31': { truthLevel: 'Canonical invariant (named institutions)', topic: 'Named institutions and hexagram associations', canon: 'Each named institution has a hexagram association, a spirit vein/grotto-heaven, and a relationship to at least one other named institution.' },
  '32': { truthLevel: 'Canonical invariant (power scaling)', topic: 'Power scaling and phase combat', canon: 'Power scaling is exponential (2x qi per realm). Phase combat follows the technique packet schema (doc 55 §2). Timing is synchronized across 5 layers.' },
  '33': { truthLevel: 'Canonical invariant (Cangwu ecology)', topic: 'Cangwu Mountains ecology', canon: 'The Cangwu Mountains are 1-3 km relief with spirit-vein-fed ecosystems. Spirit beasts follow the cultivator-parallel tier system (doc 14).' },
  '34': { truthLevel: 'Canonical invariant (named NPCs)', topic: 'Named NPCs and companions', canon: 'Each named NPC has a character VTP (doc 51 §2) with body height, mass, gait, and cultivation-transformations specified.' },
  '35': { truthLevel: 'Canonical invariant (craft catalog)', topic: 'Craft and content catalog', canon: 'Craft items have PhysicalSpecifications (doc 52). Weapons obey the technique-packet timing rules (doc 55). No weapon larger than animation reach allows.' },
  '36': { truthLevel: 'Canonical invariant (cosmic geography)', topic: 'Cosmic geography — worlds, continents, stars', canon: 'Mortal worlds: 6,000-12,000 km radius. Intermediate worlds: 50,000-200,000 km. Celestial distances use the scale anchors in doc 52 §3.' },
  '37': { truthLevel: 'Canonical invariant (cosmic history)', topic: 'Cosmic history and timeline', canon: 'Cosmic history is deterministic and seed-driven. Timeline events must be consistent with travel-time and realm-ladder constraints.' },
  '38': { truthLevel: 'Canonical invariant (courts of heaven)', topic: 'The Courts of Heaven — celestial bureaucracy', canon: 'The Courts use the Heavenly Courts style grammar (doc 53 §7): white jade, gold, luminous materials, no earth tones, no weathering.' },
  '39': { truthLevel: 'Canonical invariant (Mahayana pantheon)', topic: 'The Mahayana Pantheon — transcendent beings', canon: 'Mahayana+ beings have transcendent body forms (doc 03: variable/unbounded). They cannot be measured with fixed PhysicalSpec values.' },
  '40': { truthLevel: 'Canonical invariant (Law Reaches)', topic: 'The Law Reaches — spatiotemporal zones', canon: 'Law Reaches are spatiotemporal distortion zones with explicit boundary rules. Supernatural exceptions must be filed per doc 55 §6.' },
  '41': { truthLevel: 'Canonical invariant (Spirit Wilds)', topic: 'The Spirit Wilds — pre-human wilderness', canon: 'The Spirit Wilds use the Spirit Wilds style grammar (doc 53 §6): no human structures, giant flora/fauna, no geometric formations.' },
  '42': { truthLevel: 'Canonical invariant (mortal world continents)', topic: 'Mortal world continents and geography', canon: 'Continents follow the scale anchors in doc 52 §3. Each continent has 3-5 holy lands (doc 43). Travel times must be consistent with walking/flying speeds.' },
  '44': { truthLevel: 'Canonical invariant (Dao and Origin)', topic: 'The Dao and the Primordial Origin', canon: 'The Dao is the highest canonical principle. The Origin is the cosmological starting point. Both are [CANON] and cannot be revised.' },
  '45': { truthLevel: 'Canonical invariant (stations 6-10)', topic: 'Content for cultivation stations 6-10', canon: 'Stations 6-10 follow the realm ladder (doc 03). Body form becomes variable above Nascent Soul. Speed/turn values are unbounded for station 10.' },
  '46': { truthLevel: 'Canonical invariant (ancestral courts)', topic: 'Ancestral courts and lineages', canon: 'Ancestral courts follow the style grammars appropriate to their realm and culture (doc 53). Lineages have explicit progenitor-to-present chains.' },
  '47': { truthLevel: 'Canonical invariant (cosmic resources)', topic: 'Cosmic resources and economy', canon: 'Cosmic resources have PhysicalSpecifications (doc 52). Spirit stones, celestial minerals, and qi-condensed materials follow the measurement system.' },
  '48': { truthLevel: 'Canonical invariant (higher immortal worlds)', topic: 'Higher immortal worlds', canon: 'Higher immortal worlds use the scale anchors in doc 52 §3 (50,000-200,000 km radius). They use the Heavenly Courts style grammar (doc 53 §7).' },
  '49': { truthLevel: 'Derived (content architecture)', topic: 'Content architecture and organization', canon: 'Content organization follows the machine-readable counterpart standard (doc 50 §4). Each subject has prose plus JSON plus tests plus questions.' },
};

async function retrofit() {
  const files = (await readdir(CORPUS_DIR)).filter(f => f.endsWith('.md'));
  let retrofitted = 0;
  let skipped = 0;

  for (const filename of files) {
    const docNum = filename.match(/^(\d+)_/)?.[1];
    if (!docNum) continue;

    const content = await readFile(join(CORPUS_DIR, filename), 'utf-8');

    // Skip if already has truth-level annotations
    if (content.includes('[CANON]') || content.includes('[DERIVED]') || content.includes('**Truth level:**')) {
      skipped++;
      continue;
    }

    // Skip spec docs (50-55)
    if (parseInt(docNum) >= 50) { skipped++; continue; }

    const classification = DOC_CLASSIFICATIONS[docNum];
    if (!classification) {
      console.log(`  ? No classification for ${filename}`);
      skipped++;
      continue;
    }

    // Build the ground-truth header
    const header = `**Truth level:** ${classification.truthLevel}
**Implements:** engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md, corpus-extension/50_GROUND_TRUTH_SYSTEM_SPECIFICATION.md
**Implementation status:** [SPEC] — fully specified, implementation in progress

---

## Ground-Truth Annotation

> [CANON] ${classification.canon}

> [DERIVED] All measurements in this document use SI units (doc 52). Visual concepts follow the VTP schema (doc 51). Moving entities follow MotionProfiles (doc 55).

> [PROC] Instance-level details (exact NPC counts, specific tree placements, weather sequences) vary by seed within canonically-defined ranges.

> [UNRESOLVED] See /questions/ registry for open questions related to this document.

**Topic:** ${classification.topic}

---

`;

    // Insert the header after the title line + existing metadata
    // Find the first `---` after the title and insert before it
    const lines = content.split('\n');
    let insertIndex = -1;
    let foundTitle = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('# ')) foundTitle = true;
      if (foundTitle && lines[i] === '---') {
        insertIndex = i + 1;
        break;
      }
    }

    if (insertIndex === -1) {
      insertIndex = 1;
    }

    lines.splice(insertIndex, 0, header);
    await writeFile(join(CORPUS_DIR, filename), lines.join('\n'));
    retrofitted++;
    console.log(`  Retrofitted ${filename}`);
  }

  console.log(`\nDone. Retrofitted: ${retrofitted}, Skipped: ${skipped}`);
}

retrofit().catch(console.error);
