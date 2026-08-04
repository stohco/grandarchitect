# 43 — Holy Lands and Great Sects

**Status:** `[CANON]` Candidate canon. The cultivation world's upper-tier institutions, in fulfilment of doc 20 §1.3 (3-5 holy lands per continent, 5-10 great sects per region) and doc 42 (the continents and their previews). Compliant with 24_RECONCILIATION_AND_DECISIONS §4.3 (Jade Void Holy Land: Daoist Jade Void, 2,100, Nascent Soul, 3,000 disciples, peak grotto-heaven), 31_NAMED_INSTITUTIONS_AND_HEXAGRAMS §1-2 (Cangwu Sect, Azure Sword Sect fully specified; §2.9 the Jade Void's regional position), 34_NAMED_NPCS_AND_COMPANIONS §166 (Xu Yunfeng of Jade Void, Leng Qingxue's correspondent), 35_CRAFT_CONTENT_CATALOG §3.9 (Patriarch Mu, Azure Sword alchemist), 37_COSMIC_HISTORY §6 (Pillar Dynasty, Crimson Vow Alliance), 38_THE_COURTS_OF_HEAVEN (holy lands independent but deferential; Courts' six departments), 39_THE_MAHAYANA_PANTHEON §2.5 (Yin Mu's Cangwu grotto-heaven), 42_THE_MORTAL_WORLDS_CONTINENTS (the continent geography this document populates).
**Date:** 2026-08-03
**Truth level:** Canonical invariant (institutional identity) + Derived (scale)
**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md`, `corpus-extension/51_VISUAL_TRUTH_PACKET_SCHEMA.md` §4 (Architecture packet), `corpus-extension/52_MEASUREMENT_AND_SCALE_SYSTEM.md` §3 (scale anchors), `corpus-extension/53_STYLE_GRAMMARS.md` §3–§4 (Northern Cloud + Southern Orthodoxy grammars), `corpus-extension/55_MOTION_AND_EFFECT_GRAMMAR.md` §5 (cultivator MotionProfile)
**Implementation status:** `[SPEC]` — fully specified, generators pending
**Conventions:** Hanzi in parentheses on first use. No pinyin tone marks. Every named institution has a personality, a specialty, a sect master or patriarch (with realm and age), a grotto-heaven or spirit vein, and a relationship to at least one other named institution. The Cangwu Sect (doc 31 §1) is a small sect, not a great sect; it is referenced here for relational completeness but its full spec remains in doc 31.

---

## Ground-Truth Specification Summary

> `[CANON]` Each continent has 3–5 holy lands and each region has 5–10 great sects. Holy lands operate at Nascent Soul+ realm with 1,000–5,000 disciples. Great sects operate at Core Formation+ with 500–2,000 disciples.

> `[DERIVED]` Holy land main halls: 50–100 m wide, 30–60 m tall (celestial-scale architecture per doc 52 §3). Great sect main halls: 20–40 m wide, 10–20 m tall.

> `[DERIVED]` Holy land grotto-heavens: 10–500 km interior diameter. Great sect spirit veins: 8–12 km length (major vein per doc 14).

> `[ART]` Holy lands use the Heavenly Courts style grammar (doc 53 §7): white jade, gold, luminous materials. Great sects use Northern Cloud (§3) or Southern Orthodoxy (§4) grammars depending on alignment.

> `[PROC]` Disciple count varies ±20% by seed. Holy land age: 1,000–10,000 years. Great sect age: 300–3,000 years.

> `[UNRESOLVED]` Whether the Jade Void Holy Land's grotto-heaven has a second, sealed interior layer — see `/questions/holy-lands.yaml#jade-void-second-layer`.

### PhysicalSpecification — Holy land main hall

```json
{
  "id": "arch-holy-land-main-hall",
  "dimensions": {
    "widthMeters": { "min": 50, "max": 100, "typical": 70 },
    "depthMeters": { "min": 40, "max": 80, "typical": 55 },
    "heightMeters": { "min": 30, "max": 60, "typical": 42 }
  },
  "measurementConfidence": "derived",
  "rationale": "Sized for Nascent Soul+ cultivators (1.80m avg) with monumental scaling factor 20×"
}
```

### PhysicalSpecification — Great sect main hall

```json
{
  "id": "arch-great-sect-main-hall",
  "dimensions": {
    "widthMeters": { "min": 20, "max": 40, "typical": 28 },
    "depthMeters": { "min": 15, "max": 30, "typical": 22 },
    "heightMeters": { "min": 10, "max": 20, "typical": 14 }
  },
  "measurementConfidence": "derived",
  "rationale": "Sized for Core Formation+ cultivators (1.78m avg) with sect-scale factor 8×"
}
```

### PerceptualSpec — Holy land celestial gate

```json
{
  "physicalScale": {
    "dimensions": { "heightMeters": { "typical": 620 } },
    "measurementConfidence": "art-directed",
    "rationale": "Holy-land gate; monumentally scaled for Core Formation+ cultivators"
  },
  "perceptualRequirements": {
    "humanScaleFeatures": "Human-height doors (2.4m) remain visible at the base; stair treads 0.2m tall",
    "atmosphericEffects": "Clouds intersect the upper third (400m+); atmospheric haze begins at 300m",
    "structuralSubdivisions": "Pillars segmented every 15-25m with visible capital bands",
    "cameraConstraints": "Camera fly speed reduced from 30 m/s to 8 m/s while entering the gate corridor",
    "lodTransitions": "LOD0 <50m, LOD1 <200m, LOD2 <1km, LOD3 <5km",
    "comparisonAnchors": "Cultivator figures (1.8m) at entrance; banners 3m wide"
  }
}
```

### MotionProfile — Holy land cultivator (Nascent Soul, flying)

```json
{
  "maximumSpeedMetersPerSecond": { "min": 30, "max": 60, "typical": 45 },
  "accelerationCurve": "exponential-qi-strong",
  "turnRateRadiansPerSecond": { "min": 6.0, "max": 12.0, "typical": 9.0 },
  "minimumTurnRadiusMeters": { "min": 0.5, "max": 2.0, "typical": 1.0 },
  "motionStyleTags": ["gliding", "effortless", "nascent-soul", "spatial-mastery"],
  "cameraPresentation": { "followMode": "cinematic", "followDistanceMeters": { "typical": 10 }, "lagSeconds": { "typical": 0.05 } }
}
```

### Forbidden interpretations

- `[FORBIDDEN]` Holy lands with earth tones, weathering, or patina (Heavenly Courts grammar requires luminous perfection — doc 53 §7)
- `[FORBIDDEN]` Great sects using gold surfaces unless Southern Orthodoxy grammar (doc 53 §4) explicitly permits
- `[FORBIDDEN]` Holy land buildings below 30m height (contradiction: holy lands are celestial-scale)
- `[FORBIDDEN]` Great sect buildings exceeding 20m height (that is holy-land scale)
- `[FORBIDDEN]` Any sect or holy land without a spirit vein or grotto-heaven (contradiction detection: `ecology.no-barren-sect`)

### Acceptance tests

- `holy-lands.count-per-continent` — 3–5 holy lands per continent
- `great-sects.count-per-region` — 5–10 great sects per region
- `holy-lands.scale.celestial` — main halls 30–60m tall
- `great-sects.scale.sect` — main halls 10–20m tall
- `holy-lands.style.heavenly-courts` — luminous materials, no earth tones
- `holy-lands.has-grotto-heaven` — every holy land has a grotto-heaven
- `great-sects.has-spirit-vein` — every great sect is on a spirit vein
- `holy-lands.realm.nascent-soul-plus` — all holy land patriarchs are Nascent Soul+

---

---

## 0. Why this document exists

Doc 20 §1.3 specifies that the cultivation world has 3-5 holy lands per continent and 5-10 great sects per region. Doc 24 §4.3 named one holy land (the Jade Void) and two sects (the Cangwu Sect, the Azure Sword Sect). Doc 31 fully specified those two sects. Doc 42 named the four other holy lands (Yellow Court, Skyfire, Verdant Pillar, NorthSea) and 13 great sects across the five continents, but committed only their previews. This document fully specifies the five holy lands, the 13 great sects, the grotto-heaven catalogue, the political map, and the protagonist's path through the political map across Act 2 and Act 3.

The bible's political geography is now legible from the Jade Void patriarch's seat on Voidjade Peak to the Stone Lantern Sect's frontier spirit-beacon on Xi's coast. The protagonist's choices, from session 120 onward, are made against this map. The map is finite, the institutions are named, and the protagonist's path through them is committed.

---

## 1. The five holy lands

One per continent. All patriarchs are below Tribulation Crossing (doc 38: "the holy lands' patriarchs are below Tribulation Crossing; they cannot enter the courts as peers"). All relationships to the Courts are either "independent but deferential" or "independent" (the Verdant Pillar, with its yao-foundation, and the NorthSea, with its older-than-Courts records, are the two independents).

### 1.1 The Jade Void Holy Land (玉虛聖地) — Dong Continent

- **Patriarch:** Daoist Jade Void (玉虛真人), Nascent Soul, age 2,100, founder and retired patriarch. **Acting head:** Elder Mu Yunfeng (穆雲峰), Nascent Soul early-stage, age 800, 17th-generation successor.
- **Disciples:** 3,000 (1,800 outer, 1,200 inner, 47 Foundation Establishment elders, 3 Nascent Soul elders).
- **Compound:** The Three-Courtyard Seat (三院) on Voidjade Peak (虛玉峰), Yunwu Mountains, Dong's western coast, 400 li inland from Qingyang (per doc 42 §8.3).
- **Grotto-heaven:** The Jade Void Grotto-Heaven (玉虛洞天), wood-phase, time-rate 1:5.
- **Spirit vein:** The Voidjade Wood Vein (虛玉木脈), Dong's largest wood-phase vein.
- **Specialty:** Divination (derived from the Silent Hexagram Method fragment, doc 37 §6.3), ancestral veneration (the rotating-shrine rite in the Cangli Riverlands), library (the cultivation world's most comprehensive non-Courts repository, doc 42 §8.4).
- **Personality:** Patient, withdrawn, grieving. Daoist Jade Void has outlived nineteen successor-generations of disciples. He declined Tribulation Crossing three times, on the grounds that his ancestral-veneration practice is more stable at Nascent Soul than at Mahayana, and that his continuing presence sustains the rotating-shrine rite. His grief is the grief of a patriarch who has become, in his own perception, more institution than person.
- **Courts relationship:** Independent but deferential; petitions through the Records department's regional magistrates (doc 38 §2.1).
- **Other holy lands:** Polite rivalry with Yellow Court (Zhong); warm scholarly collaboration with Verdant Pillar (Nan, the divided custody of the Pillar Dynasty Annals); respectful distance with NorthSea (Bei, the Jade Void defers to the NorthSea on ancestral-court matters); cool distance with Skyfire (Xi, wood-phase vs metal-phase).
- **Vassal sects:** Azure Sword Sect (Zhong), Pearl-Tide Sect (Zhong), Emerald Pagoda Sect (Dong), Whale-Rider Sect (Dong, partial).
- **Narrative role:** Act 2 indirect (Xu Yunfeng's correspondence with Leng Qingxue; rotating-shrine hermitage 12 li west of Wang Family Bend). Act 3 direct (Nascent Soul journey to Voidjade Peak; library access; meeting with Daoist Jade Void; primary institutional ally for Pei Liang confrontation and Transcend path).

### 1.2 The Yellow Court Holy Land (黃庭聖地) — Zhong Continent

- **Patriarch:** Daoist Yellow Court (黃庭真人), Nascent Soul late-stage, age 3,400. **Acting head:** Elder Tan Yueshan (譚岳山), Nascent Soul early-stage, age 540.
- **Disciples:** 4,200 (2,500 outer, 1,700 inner, 62 Foundation Establishment elders, 4 Nascent Soul elders).
- **Compound:** The Five-Hall Seat (五堂) on Yellow Court Peak (黃庭峰), Zhong's western interior central range, 8,000 li west of Yanjing.
- **Grotto-heaven:** The Yellow Court Grotto-Heaven (黃庭洞天), earth-phase, time-rate 1:8.
- **Spirit vein:** The Yellow Court Earth Vein (黃庭土脈), Zhong's largest earth-phase vein, underlying the western interior desert.
- **Specialty:** Earth-phase alchemy (the Foundation-Solid Pill, the Core-Stabilizing Pill, the rare Earth-Marrow Pill); the Great Yan Dynasty's traditional alchemical supplier. The Yellow Court's relationship to Patriarch Mu (Azure Sword Sect's alchemist, doc 35 §3.9) is supply-chain: the Yellow Court's outer hall provides Patriarch Mu with earth-phase reagents his region cannot grow.
- **Personality:** Scholastic, hierarchical, slow. The Yellow Court operates at the tempo of a 3,400-year-old institution; the Great Yan Dynasty's succession crisis is, for Daoist Yellow Court, a brief inconvenience. The patriarch's grief is the grief of a scholastic who has watched eight predecessor dynasties rise and fall.
- **Courts relationship:** Allied (the Yellow Court's alchemical tithes to the Courts' refiners are the Courts' largest external supply).
- **Other holy lands:** Polite rivalry with Jade Void (influence over Zhong's middle reaches); distant cool with Skyfire (earth-phase vs metal-phase); distant cool with Verdant Pillar (wood-phase dominates earth-phase); respectful distance with NorthSea.
- **Vassal sects:** Sand-Veiled Sect (Zhong), Heavenly Pivot Sect (Zhong, partial), Iron-Horse Sect (Zhong, partial — the Yellow Court provides the Iron-Horse's alchemical supply).
- **Narrative role:** Act 2 distant (the Yellow Court's alchemical supply chain touches the Azure Sword Sect through Patriarch Mu). Act 3 moderate (the protagonist at Nascent Soul may visit to consult its alchemical records on the Crimson Vow Remnant's corrupted fire-phase tradition; the visit is optional).

### 1.3 The Skyfire Holy Land (天火聖地) — Xi Continent

- **Patriarch:** Patriarch Iron Sage (鐵聖上人), Nascent Soul, age 2,800. **Acting head:** Elder Lian Tie (煉鐵), Nascent Soul early-stage, age 620.
- **Disciples:** 2,800 (1,600 outer, 1,200 inner, 38 Foundation Establishment elders, 2 Nascent Soul elders).
- **Compound:** The Skyfire Crucible (天火爐) at the peak of the Ironbone Range's central spire, Xi Continent.
- **Grotto-heaven:** The Skyfire Crucible Grotto-Heaven (天火爐洞天), metal-fire phase, time-rate 1:4.
- **Spirit vein:** The Skyfire Metal Vein (天火金脈), Xi's largest metal-phase vein, with a fire-phase secondary vein feeding the Crucible's forges.
- **Specialty:** Metal-phase smithing, weapon-craft, formation arrays; the Courts of Heaven's traditional weapon-supplier. Signature technique: the **Iron Sage's Nine-Fold Fold (鐵聖九折)**, a forging method that produces blades of extraordinary phase-coherence; only the patriarch and three forge-elders know it.
- **Personality:** Taciturn, exacting, forge-ascetic. Patriarch Iron Sage has not spoken in council for three centuries; his silence is his law. The Skyfire's forge-elders communicate in hammer-taps and qi-modulations. The patriarch's grief is the grief of a smith who has outlived every weapon he has forged — the weapons are in other hands, the hands are dead, the weapons are rusted or broken or lost.
- **Courts relationship:** Closest of the five holy lands; the only holy land patriarch who visits the Courts' Roads department in person (doc 38 §2.4).
- **Other holy lands:** Cool distance with Jade Void (metal-phase vs wood-phase, metaphysically opposed); distant cool with Yellow Court; respectful distance with Verdant Pillar and NorthSea.
- **Vassal sects:** Ironbone Sect (Xi); Stone Lantern Sect (Xi, partial — the Stone Lantern's frontier mission is Courts-delegated and the Stone Lantern does not tithe).
- **Narrative role:** Act 2 absent. Act 3 distant (the protagonist at Spirit Severance may visit to commission a sword for the Pei Liang confrontation; the Skyfire's intelligence on the Western Spirit Wilds' Law Reaches is, in the Transcend path, the protagonist's primary source for the Law Reach venue's selection).

### 1.4 The Verdant Pillar Holy Land (青柱聖地) — Nan Continent

- **Patriarch:** Daoist Pillar Canopy (柱冠真人), Nascent Soul, age 1,700, human co-founder. **Co-founder:** Old Pillar (老柱), tree-yao, Foundation Establishment yao, age ~3,200 (the cultivation world's oldest non-Mahayana yao). **Acting head:** Elder Sang Qingyu (桑青羽), Nascent Soul early-stage, age 380 (the holy land's first half-yao acting head; her mother was a Pillar Descendant tree-yao).
- **Disciples:** 1,800 (1,000 outer, 800 inner — 240 of the inner are yao disciples, the cultivation world's only holy land with a yao-disciple contingent).
- **Compound:** The Verdant Pillar Seat (青柱院) on the central highlands' great earth-wood vein, Nan Continent.
- **Grotto-heaven:** The Verdant Pillar Grotto-Heaven (青柱洞天), wood-phase, time-rate 1:12; the grotto's interior contains the seven surviving Pillar Cities' ruins and bark-strip libraries.
- **Spirit vein:** The Pillar Root Vein Remnant (柱根脈餘), the cosmic-scale Pillar Root Vein's (doc 37 §9.2) deepest surviving trace.
- **Specialty:** Yao cultivation (a hybrid human-yao tradition), wood-phase beast-taming, Pillar Dynasty lore (holds 5 of the 12 volumes of the Pillar Dynasty Annals and the most complete bark-strip library).
- **Personality:** Hybrid, patient, ecologically-minded. The patriarch and the co-founder govern as joint-stewards — the patriarch handles human-cultivator relations, the co-founder handles the grotto's yao-ecology; the two have not disagreed in 1,700 years. The Verdant Pillar's grief is the grief of ecologists watching the Thinning (doc 39 §2.5) thin their grotto's wood-phase qi; the Pillar Root Vein Remnant is dying.
- **Courts relationship:** Independent (the yao-foundation places the holy land outside the Courts' lineage-jurisdiction; the Courts respect this and the Verdant Pillar does not petition).
- **Other holy lands:** Warm scholarly collaboration with Jade Void; warm with NorthSea (the two yao-respecting institutions); cool distance with Skyfire (metal cuts wood); distant cool with Yellow Court.
- **Vassal sects:** Redwood Canopy Sect (Nan), Sea-Fan Sect (Nan, partial — the Sea-Fan's coastal mission is independent of the Verdant Pillar's interior focus).
- **Narrative role:** Act 2 absent. Act 3 moderate (the protagonist at Nascent Soul may visit to investigate the Cangli spirit vein's connection to the Pillar Root Vein; the visit is the protagonist's primary source on the Pillar Dynasty's qi-economy and the Cangli spirit vein's cosmic-history).

### 1.5 The NorthSea Holy Land (北海聖地) — Bei Continent

- **Patriarch:** Matriarch NorthSea (北海道君), Nascent Soul, age 3,000 (the cultivation world's oldest non-Mahayana being). **Acting head:** Elder Bing Zhen (冰臻), Nascent Soul early-stage, age 720.
- **Disciples:** 2,200 (1,300 outer, 900 inner — 180 of the inner are yao disciples, drawn from the Frostfang Yao).
- **Compound:** The Ice-Record Hall (冰錄堂) at the glacial peak of Bei's central range.
- **Grotto-heaven:** The NorthSea Grotto-Heaven (北海洞天), water-yin phase, time-rate 1:20 (the slowest in the catalogue); the grotto's interior is a permanent ice-field.
- **Spirit vein:** The NorthSea Cold Vein (北海寒脈), Bei's largest water-yin vein.
- **Specialty:** Water-phase ice-cultivation (signature technique: the **NorthSea Stillness, 北海寂**, a meditation that brings qi-circulation to absolute zero; the Matriarch's 2,500-year-old authorship), ancestral-court preservation (the Ice-Record Hall holds the Mortal Stratum's oldest accessible ancestral-court records, predating the Courts' founding at Year ~40,000 by 8,000 years; the records are inscribed in ice on the Hall's walls, readable only by the Matriarch and two elders).
- **Personality:** Cold, ancient, record-keeping. The Matriarch has spent three millennia maintaining the continent's ancestral-court records; her grief is the grief of a record-keeper whose records outlast their subjects. She speaks rarely; when she speaks, her words are the words of a being who has watched the continent's mortals die for 3,000 years and remembers each lineage's name.
- **Courts relationship:** Independent peer (the NorthSea's records predate the Courts' founding; the NorthSea considers itself peer-to-the-Courts in matters of ancestral record; the Courts tolerate this and the NorthSea does not challenge the Courts' lineage-jurisdiction).
- **Other holy lands:** Respectful distance with Jade Void (the Jade Void defers to the NorthSea on ancestral-court matters; the NorthSea defers to the Jade Void on divination matters); warm with Verdant Pillar; distant with Skyfire and Yellow Court.
- **Vassal sects:** Snowstrider Sect (Bei); Mammoth-Bone Sect (Bei, partial — the Mammoth-Bone's yao-alliance is independent of the NorthSea's human-focused tradition).
- **Narrative role:** Act 2 absent. Act 3 distant (the protagonist at Void Amalgamation may visit to consult the ancestral-court records on the Wang lineage, if the protagonist has bonded a place that allows the consultation; endgame optional content).

---

## 2. The great sects

13 great sects across the five continents (the Cangwu Sect is a small sect, referenced in §2.14 for relational completeness). Each has a Core Formation+ sect master, hundreds of disciples, multiple spirit veins, and one or more grotto-heavens (per doc 20 §1.3). The format: name — location — sect master (realm, age) — disciples and spirit veins — grotto-heaven — specialty — personality — holy land relationship — other relationships — narrative role.

### 2.1 The Azure Sword Sect (碧劍宗) — Zhong, Cangwu Mountains

Sect master **Leng Wushuang (冷無霜)**, Core Formation, age 340, appears 50. 400 disciples (300 outer, 100 inner); three spirit veins (the Azure Sword Vein, the Jade-Edge Vein, the Northern Cangwu Vein); the Jade Edge Grotto-Heaven (玉涯洞天, metal-phase, time-rate 1:3, in the western Cangwu's deep extension). **Specialty:** sword cultivation (碧劍, the jade-green sword). **Personality:** proud, inward, grieving — the sect's expansion toward the Cangli Riverlands is, per Leng Qingxue's dissent, Leng Wushuang's 80-year act of mourning for her surveyor husband, hardened into policy. The three factions (Expansionist, Isolationist, Independence; doc 31 §2.5) are the sect's internal weather; Leng Wushuang holds the balance and has not committed. **Holy land relationship:** vassal of the Jade Void (one mid-grade spirit stone per decade; the Jade Void's implicit protection). **Other relationships:** cold with the Cangwu Sect (the latent spirit vein dispute); distant with the Sand-Veiled Sect (the Yellow Court–Jade Void rivalry's downstream); warm with the Iron-Horse Sect (sword-cultivation root); cool with the Azuremist Sect (Dong, cross-continental sword-cousins who exchange outer disciples every 60 years). **Narrative role:** Act 2 central (the Cangli spirit vein dispute; Leng Qingxue's defection; the protagonist's first sect-level dilemma). Act 3 moderate (the Azure Sword's role depends on the protagonist's earlier choices). Full spec in doc 31 §2.

### 2.2 The Heavenly Pivot Sect (天樞宗) — Zhong, Imperial Heartland

Sect master **Patriarch Heavenly-Pivot (天樞上人)**, Core Formation late-stage, age 880. 800 disciples (500 outer, 300 inner); two spirit veins (the Imperial Pivot Vein beneath Yanjing, the Yan River Vein); the Heavenly Pivot Grotto-Heaven (天樞洞天, metal-earth phase, time-rate 1:4, anchored beneath the imperial palace). **Specialty:** formation arrays, the empire's spiritual-geomancy advisors, the imperial court's Core Formation enforcement arm. **Personality:** courtly, political, calculating — the sect master is, in practice, the emperor's cultivation-advisor; the sect has backed the literati faction (Chief Grand Secretary Li Tingyun) and the eunuch faction's rise would be the sect's catastrophe. **Holy land relationship:** partial vassal of the Yellow Court (alchemical reagents for imperial-court intelligence). **Other relationships:** cold with the Azure Sword Sect (the two contest the empire's sword-cultivation patronage); cordial with the Iron-Horse Sect (the empire's two military sects); formal with the Pearl-Tide Sect. **Narrative role:** Act 2 absent. Act 3 distant (the protagonist at Core Formation may be summoned to Yanjing for consultation on the Crimson Vow Remnant; optional).

### 2.3 The Sand-Veiled Sect (沙幕宗) — Zhong, Western Interior

Sect master **Patriarch Dune (沙丘老人)**, Core Formation, age 600. 350 disciples; two spirit veins (the Yumen Oasis Vein, the Sand-Veiled Desert Vein); the Sand-Veiled Grotto-Heaven (沙幕洞天, earth-fire phase, time-rate 1:3, beneath the Sand-Veiled Caravansary at Yumen). **Specialty:** desert trade-route protection, the Sand-Veiled Caravansary's neutral-ground enforcement, earth-fire alchemy. **Personality:** mercantile, neutral, durable — operates at the tempo of the desert trade; the Caravansary's no-combat rule is the sect's signature, enforced by the steward's displeasure (a bar-from-trade no western-dependent cultivator can afford). **Holy land relationship:** vassal of the Yellow Court (the Yellow Court's primary western-interior proxy). **Other relationships:** cold with the Azure Sword Sect (the Yellow Court–Jade Void rivalry's downstream); cordial with the Stone Lantern Sect (Xi, the Western Ocean Crossing's two anchors); distant with the Pearl-Tide Sect. **Narrative role:** Act 2 absent. Act 3 distant (the protagonist at Core Formation may pass through the Caravansary on the Western Ocean Crossing; optional).

### 2.4 The Pearl-Tide Sect (珠潮宗) — Zhong, Eastern Coast

Sect master **Matriarch Tide Pearl (潮珠道君)**, Core Formation, age 480. 500 disciples; two spirit veins (the Pearl-Tide Harbor Vein, the Eastern Coast Vein); the Pearl-Tide Grotto-Heaven (珠潮洞天, water-phase, time-rate 1:2, anchored at the harbor's mouth). **Specialty:** maritime cultivation, the Vermilion Pearl Route's Zhong-side anchor, the Pearl Archipelago Compact's Zhong-side signatory. **Personality:** maritime, mercantile, generous — operates at the tempo of the Eastern Sea's tides; the Matriarch's grief is the grief of a sea-captain who has lost 17 junks to leviathans in her 480-year lifetime and remembers each ship's name and crew. **Holy land relationship:** vassal of the Jade Void (the Jade Void's preferred Zhong-side intermediary). **Other relationships:** cordial with the Azure Sword Sect; tense with the Crystal-Tide Sect (the Eastern Sea spirit-herb beds' contest); cooperative with the Whale-Rider Sect (the Vermilion Pearl Route's two surface anchors); cold with the Sea-Fan Sect (Nan, the Southern Monsoon Run's territorial contest). **Narrative role:** Act 2 absent. Act 3 moderate (the protagonist's Nascent-Soul journey to the Jade Void runs through Haimen and the Vermilion Pearl Route; the Pearl-Tide's outer disciples staff the protagonist's spirit-junk).

### 2.5 The Iron-Horse Sect (鐵馬宗) — Zhong, Northern Marches

Sect master **Patriarch Iron-Horse (鐵馬上人)**, Core Formation late-stage, age 720. 600 disciples (the empire's largest great-sect cavalry reserve); two spirit veins (the Beiguan Steppe Vein, the Northern Cangwu Vein's northern extension); the Iron-Horse Grotto-Heaven (鐵馬洞天, metal-water phase, time-rate 1:3, at the Beiguan garrison's central keep). **Specialty:** beast-mounted cavalry cultivation, the **Northern Slash (北斬)** saber-art, the empire's northern frontier defense. **Personality:** martial, stoic, weatherbeaten — the Patriarch's grief is the grief of a frontier commander who has buried eleven generations of cavalry at the border. **Holy land relationship:** partial vassal of the Yellow Court (alchemical supply). **Other relationships:** warm with the Azure Sword Sect (sword-cultivation root; Iron-Horse's founder was an Azure Sword outer disciple four centuries ago); cold with the Snowstrider Sect (Bei, the long border war); cordial with the Heavenly Pivot Sect. **Narrative role:** Act 2 absent. Act 3 absent.

### 2.6 The Emerald Pagoda Sect (翠塔宗) — Dong, Central Lowlands

Sect master **Patriarch Emerald Furnace (翠爐上人)**, Core Formation late-stage, age 590. 450 disciples; three spirit veins (the Cuiping Wood Vein, the Central Lowlands Vein, the Southern Marsh Vein); the Emerald Pagoda Grotto-Heaven (翠塔洞天, wood-phase, time-rate 1:6, at the sect's nine-tier alchemy pagoda at Cuiping, 300 li south of Qingyuan). **Specialty:** wood-phase alchemy (Root-Developing Pill, Body-Tempering Pill, the rare Wood-Marrow Pill), the Jade Void's primary pill-supplier. **Personality:** scholastic, exacting, proud — operates at the tempo of the alchemical furnace; the Patriarch's grief is the grief of an alchemist watching his furnace-gardens thin under the Thinning. **Holy land relationship:** near-vassal of the Jade Void (the Jade Void supplies the manuals; the Emerald Pagoda supplies the pills; the two grotto-heavens are mutually dependent). **Other relationships:** distant professional respect with Patriarch Mu (Azure Sword Sect's alchemist, doc 35 §3.9 — the two correspond on alchemical problems across the Eastern Sea); cordial with the Azuremist Sect; cooperative with the Whale-Rider Sect. **Narrative role:** Act 2 absent. Act 3 moderate (the protagonist at Nascent Soul visits the Emerald Pagoda en route to Voidjade Peak; the visit is the protagonist's primary source for the Wood-Marrow Pill, which the protagonist may need for the Spirit Severance breakthrough).

### 2.7 The Whale-Rider Sect (鯨馭宗) — Dong, Eastern Coast

Sect master **Matriarch Whale-Song (鯨吟道君)**, Core Formation, age 410. 380 disciples (40 inner are beast-tamers bonded to the qi-whales); two spirit veins (the Haiqing Coast Vein, the Eastern Sea Deep Vein); the Whale-Rider Grotto-Heaven (鯨馭洞天, water-phase, time-rate 1:4, at the Haiqing harbor's deep-water shrine). **Specialty:** sea-beast taming (a pod of seventeen cultivated qi-whales bred for nine centuries), oceanic spirit-herb gathering, deep-water exploration, the Vermilion Pearl Route's Dong-side anchor. **Personality:** wild, salt-stained, faithful — the Matriarch's grief is the grief of a beast-tamer who has buried seventeen qi-whales in her 410-year lifetime, each a being she had known since it was a calf. **Holy land relationship:** partial vassal of the Jade Void (maintains the Dong-side of the Vermilion Pearl Route). **Other relationships:** cooperative with the Pearl-Tide Sect (the Route's two surface anchors); tense with the Crystal-Tide Sect (the deep-water spirit-herb beds' contest, mitigated by the Pearl Archipelago Compact); cordial with the Emerald Pagoda Sect. **Narrative role:** Act 2 absent. Act 3 moderate (the protagonist's Nascent-Soul journey's Qingyang Reach is patrolled by the Whale-Rider; the protagonist may meet a Whale-Rider patrol cultivator at the Little Pearl Island rest-stop).

### 2.8 The Azuremist Sect (青嵐宗) — Dong, Central Range

Sect master **Patriarch Azure-Mist (青嵐上人)**, Core Formation, age 380. 320 disciples; two spirit veins (the Cloud Forest Vein, the Central Range Vein); the Azuremist Grotto-Heaven (青嵐洞天, wood-phase, time-rate 1:5, at the sect's cloud-forest peak, 1,200 li east of Qingyuan). **Specialty:** wood-phase sword cultivation (Dong's counterpart to the Azure Sword Sect's tradition, derived from the same pre-Crimson-Vow root); the cultivation world's most demanding sword-tradition, practiced in the cloud forest's canopy where the wood-phase qi is densest and the visibility is lowest. **Personality:** ascetic, withdrawn, artful — the Patriarch's grief is the grief of a swordsman watching his tradition thin under the Thinning; the cloud forest's wood-phase qi is less dense each century. **Holy land relationship:** cool independent of the Jade Void (the Azuremist considers the Jade Void's divination-tradition a distraction from the sword; the Jade Void considers the Azuremist's sword-asceticism useful but limited). **Other relationships:** sword-cousins with the Azure Sword Sect (the two exchange outer disciples every 60 years); cordial with the Emerald Pagoda Sect; distant with the Whale-Rider Sect. **Narrative role:** Act 2 absent. Act 3 absent.

### 2.9 The Ironbone Sect (鐵骨宗) — Xi, Ironbone Range

Sect master **Patriarch Iron-Fang (鐵牙上人)**, Core Formation, age 610 (Matriarch Ironbone's son, the Ironbone Confederacy's hereditary War-Chair). 400 disciples; two spirit veins (the Ironbone Vein, the Central Spire Vein); the Ironbone Grotto-Heaven (鐵骨洞天, metal-phase, time-rate 1:3, at the Tiegufeng citadel's central forge). **Specialty:** metal-phase body-tempering, the Ironbone Clan's ancestral saber technique, the Ironbone Confederacy's hereditary War-Chair. **Personality:** clannish, martial, loyal — the Patriarch's grief is the grief of a clan-patriarch who has watched the Confederacy's forty-three citadels dwindle (the Confederacy had fifty-one citadels at its founding 2,400 years ago; eight have been lost to the Thinning's vein-exhaustion). **Holy land relationship:** near-vassal of the Skyfire (the Skyfire's forge-elders refine the Ironbone's saber-blanks; the Ironbone's outer disciples serve the Skyfire's forges). **Other relationships:** cold with the Stone Lantern Sect (Xi, the two contest the Confederacy's military primacy); cordial with the Sand-Veiled Sect (the Western Ocean Crossing's two anchors); distant with the Azure Sword Sect. **Narrative role:** Act 2 absent. Act 3 absent.

### 2.10 The Stone Lantern Sect (石燈宗) — Xi, Eastern Coast

Sect master **Patriarch Stone-Lantern (石燈上人)**, Core Formation, age 540. 280 disciples (the smallest of the 13 great sects but the most strategically positioned); one spirit vein (the Eastern Coast Vein — the sect's small size reflects its single-vein endowment); **no grotto-heaven** (the only great sect without one; its frontier mission consumes all available qi-resources). **Specialty:** formation arrays (the spirit-stone lanterns that mark the Western Ocean's coast and warn of qi-storms), the Western Spirit Wilds' Reach-resonance monitoring (eleven mapped Reach-locations, doc 42 §3.5). **Personality:** watchful, isolated, dutiful — operates at the tempo of the lighthouse-keeper; the Patriarch's grief is the grief of a lighthouse-keeper who has watched eleven Law Reach-locations flicker and shift over five centuries — the Reaches are not stable, and the Thinning is changing them. **Holy land relationship:** independent of the Skyfire (the Stone Lantern's frontier mission is Courts-delegated; the Skyfire respects this and does not tithe the Stone Lantern). **Other relationships:** cold with the Ironbone Sect; cordial with the Sand-Veiled Sect; formal with the Courts of Heaven's Roads department. **Narrative role:** Act 2 absent. Act 3 distant (the protagonist at Spirit Severance, pursuing the Transcend path, may pass through the Stone Lantern's coast on the way to a Western Spirit Wilds Law Reach; the Stone Lantern's intelligence on the Reach-resonance is the protagonist's primary source).

### 2.11 The Sea-Fan Sect (海扇宗) — Nan, Monsoon Cities

Sect master **Matriarch Sea-Fan (海扇道君)**, Core Formation, age 470. 420 disciples; two spirit veins (the Nanhai Coast Vein, the Monsoon Current Vein); the Sea-Fan Grotto-Heaven (海扇洞天, water-phase, time-rate 1:2, at the Nanhai harbor's mouth). **Specialty:** water-phase maritime cultivation, the Monsoon Council's enforcement arm, the Southern Monsoon Run's Nan-side anchor. **Personality:** mercantile, cosmopolitan, generous — operates at the tempo of the monsoon; the Matriarch's grief is the grief of a maritime commander who has watched the Southern Monsoon Run's fleet shrink from forty ships per monsoon-window to twelve in her 470-year lifetime. **Holy land relationship:** partial vassal of the Verdant Pillar (the Verdant Pillar does not tithe the Sea-Fan, but the Sea-Fan's inner disciples train at the Verdant Pillar's grotto-heaven). **Other relationships:** cooperative with the Pearl-Tide Sect (the Southern Monsoon Run's two anchors — though the two contest the southern maritime trade); cooperative with the Redwood Canopy Sect (Nan, the two jointly enforce the Linwang trade-fair's neutrality); cordial with the Whale-Rider Sect (deep-water spirit-herb cooperation). **Narrative role:** Act 2 absent. Act 3 absent.

### 2.12 The Redwood Canopy Sect (紅冠宗) — Nan, Jungle Interior

Sect master **Patriarch Redwood (紅冠上人)**, Core Formation, age 530 (half-yao; mother was a Pillar Descendant tree-yao). 300 disciples (40 inner are yao disciples, drawn from the Pillar Descendants); two spirit veins (the Linwang Wood Vein, the Jungle Interior Vein); the Redwood Canopy Grotto-Heaven (紅冠洞天, wood-phase, time-rate 1:6, at the Linwang trade-fair's central grove). **Specialty:** wood-phase cultivation, yao-human diplomacy, the Linwang trade-fair's neutral-ground enforcement. **Personality:** hybrid, patient, diplomatic — the Patriarch's grief is the grief of a half-yao who has watched both his human and yao kin thin under the centuries; his mother (the tree-yao) is still alive at 1,800, but her grove has lost twelve of its oldest trees in the last two centuries. **Holy land relationship:** the Verdant Pillar's preferred successor-institution (the Redwood Canopy's outer disciples train at the Verdant Pillar's grotto-heaven; the Verdant Pillar's elders consider the Redwood Canopy their heir). **Other relationships:** cooperative with the Sea-Fan Sect; warm with the Mammoth-Bone Sect (Bei, the cross-continental yao-allied sects' correspondence — the two exchange outer disciples every 60 years); distant cool with the Azuremist Sect. **Narrative role:** Act 2 absent. Act 3 moderate (the protagonist at Nascent Soul may visit the Redwood Canopy en route to the Verdant Pillar; the visit is the protagonist's introduction to the yao-cultivation tradition).

### 2.13 The Snowstrider Sect (雪行宗) — Bei, Beicheng

Sect master **Patriarch Snowstrider (雪行上人)**, Core Formation, age 590 (the Black-Ice Khan's cultivation-teacher). 350 disciples; two spirit veins (the Beicheng Coast Vein, the Southern Steppe Vein); the Snowstrider Grotto-Heaven (雪行洞天, water-phase, time-rate 1:4, at the Beicheng garrison's central keep). **Specialty:** water-phase mounted cavalry cultivation, the Khanate's cavalry spirit-beast training, the Northern Ice Lane's Bei-side anchor. **Personality:** nomadic, stoic, weatherbeaten — the Patriarch's grief is the grief of a steppe-commander who has watched the Khanate's herds thin under the Thinning; the great reindeer-herds that sustained the Khanate's cavalry are half the size they were at his birth. **Holy land relationship:** near-vassal of the NorthSea (the Snowstrider's sect master is always a NorthSea-trained cultivator). **Other relationships:** cold with the Iron-Horse Sect (Zhong, the long border war); cooperative with the Mammoth-Bone Sect (Bei, the two jointly patrol the deep tundra's edge); cold with the Pearl-Tide Sect (the Northern Ice Lane's two anchors' territorial contest). **Narrative role:** Act 2 absent. Act 3 absent.

### 2.14 The Mammoth-Bone Sect (巨骨宗) — Bei, Deep Tundra

Sect master **Patriarch Mammoth-Bone (巨骨上人)**, Core Formation, age 720 (married into the Frostfang Yao; wife is a tiger-yao). 220 disciples (30 inner are yao disciples, drawn from the Frostfang Yao); one spirit vein (the Deep Tundra Vein — the sect's small size reflects its single-vein endowment and remote location); the Mammoth-Bone Grotto-Heaven (巨骨洞天, water-yin phase, time-rate 1:8, at the sect's mammoth-bone central hall, 1,500 li north of Beicheng). **Specialty:** beast-mounted cultivation (the sect's cultivators ride mammoth-yao), yao-human diplomacy, the deep-tundra patrol. **Personality:** hybrid, patient, weatherbeaten — the Patriarch's grief is the grief of a half-human who has watched the Frostfang Yao's herds thin under the Thinning; his wife's tiger-yao lineage has lost three of its eldest in the last century. **Holy land relationship:** independent of the NorthSea (the Mammoth-Bone's yao-alliance is independent of the NorthSea's human-focused tradition; the two institutions respect each other and consult on continental spirit-vein ecology). **Other relationships:** cooperative with the Snowstrider Sect; warm with the Redwood Canopy Sect (the cross-continental yao-allied sects' correspondence); formal with the Frostfang Yao (the Yao elder-council approves the sect's disciple roster). **Narrative role:** Act 2 absent. Act 3 absent.

### 2.15 Reference: the Cangwu Sect (蒼梧派) — small sect

The Cangwu Sect (doc 31 §1) is a small sect, not a great sect, referenced here only for relational completeness. Sect master **Wu Changqing (吳長青)**, Qi Condensation peak, age 52; 30 disciples; one minor spirit vein (the Green Mirror Vein); no grotto-heaven. **Relationships to the 13 great sects:** cold with the Azure Sword Sect (the latent spirit vein dispute, the imminent vassalage); distant with all other great sects (the Cangwu is too small to register on any great sect's political map). **Relationship to the Jade Void Holy Land:** indirect (the Jade Void's rotating shrine hermitage is 12 li from the Cangwu Sect's compound; the rotating elders and the Cangwu Sect master are acquaintances but not allies). Full spec in doc 31 §1.

---

## 3. The grotto-heaven catalogue

Eight named grotto-heavens held by the five holy lands and the 13 great sects. Per doc 19, each grotto-heaven is a pocket-world anchored to the Mortal Stratum; per doc 24 §2.7, each grotto's interior is bound to its surface anchor (Tu Nan's grotto-anchor binding law, doc 39 §2.6). Time-rates follow doc 19 §2.4 (1 day inside = N days outside).

| Grotto-heaven | Holder | Anchor | Size / climate | Time | Ecology & access |
|---|---|---|---|---|---|
| **Jade Void Grotto-Heaven (玉虛洞天)** | Jade Void Holy Land (Dong) | Voidjade Peak, Founder's Courtyard shrine | ~50 li, wood-phase, dense, mild; qi-scent of cedar | 1:5 | Spirit herbs (Silent-Heart Vine, Voidjade Moss); one songbird-yao (Qingyuan, 600). Inner disciples+; the founder's primary residence |
| **Jade Edge Grotto-Heaven (玉涯洞天)** | Azure Sword Sect (Zhong) | Cave 300 li west of sect compound, western Cangwu deep extension | ~30 li, metal-phase, sharp, cold; qi-scent of iron and snow | 1:3 | Sword-Edge Grass, iron-marmots. Inner disciples+; Leng Wushuang's Nascent Soul attempts (both failed) were conducted here; central forge-lake is the sect's weapon-refinement site |
| **Yellow Court Grotto-Heaven (黃庭洞天)** | Yellow Court Holy Land (Zhong) | Yellow Court Peak, patriarch's seat | ~80 li, earth-phase, dense, warm; qi-scent of clay and harvest | 1:8 | Seven alchemical garden-caves; Earth-Marrow Mushroom, Desert-Bloom Lotus. Inner disciples+; patriarch's alchemical retreat |
| **Verdant Pillar Grotto-Heaven (青柱洞天)** | Verdant Pillar Holy Land (Nan) | Central highlands' earth-wood vein, holy land's central tree-shrine | ~120 li, wood-phase, dense, ancient; 30,000-year-old forest | 1:12 | Pillar Sap, Bark-Strip Moss; the seven surviving Pillar Cities' ruins and bark-strip libraries. Inner disciples+; libraries require patriarch's permission |
| **Skyfire Crucible Grotto-Heaven (天火爐洞天)** | Skyfire Holy Land (Xi) | Ironbone Range central spire peak, Crucible's central forge | ~40 li, metal-fire phase, sharp, searing; qi-scent of hot iron and ash | 1:4 | Forge-Bell Flower, Iron-Sage's-Mint; forge-salamanders, iron-hawks. Inner disciples+; the patriarch has not left in nine centuries; all Core-Formation-grade weapon-refinement here |
| **NorthSea Grotto-Heaven (北海洞天)** | NorthSea Holy Land (Bei) | Bei's central range glacial peak, Ice-Record Hall shrine | ~60 li, water-yin phase, cold, still; absolute zero (Matriarch's technique sustains) | 1:20 | Ice-Record Moss (the inscription-medium for the ancestral-court records); two frost-serpent-yao (Foundation Establishment) serve as record-keepers. Inner disciples+; Hall requires Matriarch's permission |
| **Pearl-Tide Grotto-Heaven (珠潮洞天)** | Pearl-Tide Sect (Zhong) | Haimen harbor's mouth, sect's waterfront compound | ~20 li, water-phase, mild, briny; qi-scent of salt and kelp | 1:2 | Sea-Silk Kelp (shallow-water variant), pearl-oysters (Tide-Pearl cultivation). Inner disciples+; Matriarch's audience chamber; outer-disciple training grounds |
| **Emerald Pagoda Grotto-Heaven (翠塔洞天)** | Emerald Pagoda Sect (Dong) | Cuiping, nine-tier alchemy pagoda's top floor | ~25 li, wood-phase, dense, fragrant; qi-scent of blossom and resin | 1:6 | Nine terraced gardens; Wood-Marrow Mushroom, Root-Developing Root, Body-Tempering Bark. Inner disciples+; patriarch's alchemical retreat; the Jade Void's de facto alchemical annex |

### 3.1 The grotto-heaven economy

The eight named grotto-heavens are the cultivation world's most contested resource. A grotto-heaven multiplies a sect's cultivation time (the slowest, the NorthSea's at 1:20, gives one year of practice for every twenty days of debt-free exterior time); it grows spirit herbs that the Mortal Stratum's surface ecology cannot support; it provides a defensible interior realm where a sect's Core Formation+ cultivators can retreat for breakthroughs. The Azure Sword Sect's two failed Nascent Soul attempts (doc 31 §2.4) were conducted in the Jade Edge Grotto-Heaven; the Jade Void's founder has spent the last 1,400 years primarily in the Jade Void Grotto-Heaven. The grotto-heaven's anchor (the surface cave or shrine where the grotto opens) is, in the cultivation world's brutal accounting, the most defensible point in a sect's territory — destroying the anchor seals the grotto (per Tu Nan's law, doc 39 §2.6) but does not destroy the grotto's interior, which means a sect whose anchor is destroyed loses access but does not lose the interior's accumulated spirit herbs or inscribed records. This is why the Azure Sword Sect's expansion targets the Cangwu Mountains' latent spirit vein (a vein that could anchor a new grotto-heaven) rather than an existing grotto-heaven anchor (which would be defended to the death).

The eight grotto-heavens' time-rates range from 1:2 (the Pearl-Tide's, the fastest — the sect's mercantile mission benefits from near-real-time rate) to 1:20 (the NorthSea's, the slowest — the Matriarch's record-keeping requires the longest possible interior time per exterior day). The time-rate is a function of the grotto's anchor-vein's qi-density and the grotto's holder's cultivation; the Jade Void's 1:5 reflects the founder's 2,100-year Nascent Soul sustained by the Voidjade Wood Vein. A grotto-heaven's time-rate can be increased by the holder's cultivation (a Spirit Severance holder can deepen a grotto's time-debt) but cannot exceed the anchor-vein's capacity. The Thinning (doc 39 §2.5) is, for the grotto-heavens, a slow decline: each century, the anchor-veins' output drops slightly, and the grottos' time-rates and ecologies thin correspondingly. The Verdant Pillar's 30,000-year-old forest is dying; the NorthSea's Ice-Record Moss is thinning; the Skyfire's forge-lake's molten iron is cooling. The grotto-heavens are the Thinning's most visible manifestation at the institutional scale.

---

## 4. The political map

### 4.1 The five holy lands' balance

The five holy lands form a pentagon, with the Jade Void (Dong) and the Yellow Court (Zhong) as the two most politically active, the Skyfire (Xi) as the Courts' closest ally, the Verdant Pillar (Nan) as the independent yao-respecting outlier, and the NorthSea (Bei) as the oldest and most withdrawn. The pentagon's edges:

- **Jade Void ↔ Yellow Court:** polite rivalry for influence over Zhong's middle reaches. 2,000 years old, never violent; both patriarchs are below the threshold where direct conflict would be productive. Expresses through vassal-sect politics (the Azure Sword's expansion is the Jade Void's proxy-move against the Yellow Court's influence; the Yellow Court's alchemical supply to the Iron-Horse is a counter-move).
- **Jade Void ↔ Verdant Pillar:** warm scholarly collaboration (the divided custody of the Pillar Dynasty Annals). The two patriarchs correspond once per century — the cultivation world's longest-running scholarly exchange.
- **Jade Void ↔ NorthSea:** respectful distance (the Jade Void defers to the NorthSea on ancestral-court matters; the NorthSea defers to the Jade Void on divination matters).
- **Jade Void ↔ Skyfire:** cool distance (wood-phase vs metal-phase, metaphysically opposed). No direct conflict, no direct alliance.
- **Yellow Court ↔ Skyfire:** distant cool (earth-phase vs metal-phase, complementary but contested — earth generates metal, but the Yellow Court considers the Skyfire's smithing derivative, and the Skyfire considers the Yellow Court's alchemy secondary).
- **Yellow Court ↔ Verdant Pillar:** distant cool (earth-phase vs wood-phase, metaphysically contested — wood dominates earth).
- **Yellow Court ↔ NorthSea:** respectful distance (the two oldest patriarchs: 3,400 years to 3,000).
- **Skyfire ↔ Verdant Pillar:** cool distance (metal-phase vs wood-phase — metal cuts wood).
- **Skyfire ↔ NorthSea:** distant cool (metal-phase vs water-phase — metal generates water, but the Skyfire considers the NorthSea's ice-cultivation derivative).
- **Verdant Pillar ↔ NorthSea:** warm (the two yao-respecting institutions; the two patriarchs consult on yao-cultivation matters).

### 4.2 The great sects in the balance

Each great sect fits into the holy-land pentagon as a vassal, a partial-vassal, or an independent. The 13 great sects' alignments:

- **Jade Void vassals:** Azure Sword, Pearl-Tide (Zhong); Emerald Pagoda, Whale-Rider (Dong, partial).
- **Yellow Court vassals:** Sand-Veiled, Heavenly Pivot (partial), Iron-Horse (partial) (Zhong).
- **Skyfire vassals:** Ironbone (Xi); Stone Lantern (Xi, independent — Courts-delegated mission).
- **Verdant Pillar vassals:** Redwood Canopy (Nan); Sea-Fan (Nan, partial).
- **NorthSea vassals:** Snowstrider (Bei); Mammoth-Bone (Bei, independent — yao-alliance).
- **Cross-bloc sects:** Azuremist (Dong, cool independent of the Jade Void); Redwood Canopy and Mammoth-Bone (the cross-continental yao-allied correspondence, exchanging outer disciples every 60 years).

### 4.3 The Azure Sword Sect's expansionist interest

The Azure Sword Sect's expansion toward the Cangli Riverlands (doc 31 §2.4) is the political map's most active fault-line. Formally, a claim on the Cangwu Mountains' latent spirit vein (which the Azure Sword needs for Leng Wushuang's third Nascent Soul attempt). Informally, the Jade Void's proxy-move against the Yellow Court's influence in Zhong's middle reaches (the Cangli region's absorption into the Azure Sword's territory extends the Jade Void's suzerainty westward).

The expansion's three resistances:
- **The Cangwu Sect's resistance** (the Independence faction, doc 31 §2.2): Wu Changqing's desperate bet on the protagonist. The smallest and weakest resistance.
- **The Azure Sword's own Isolationist faction** (Elder Jing You, doc 31 §2.5): the internal resistance. Cites the Jade Void's goodwill as the sect's strategic anchor.
- **The Jade Void's rotating-shrine elders** (Xu Yunfeng and Lin Qingzhou, doc 42 §8.5): the external resistance. The Jade Void has not yet intervened, but the founder's birthplace-claim gives the holy land a standing the Azure Sword cannot ignore.

The protagonist's intervention (session ~300, doc 26 §4.2) is the Act 2 political verb that resolves (or escalates) the expansion. Three paths:
- **Mediation:** negotiate a regional compact (Leng Qingxue and Xu Yunfeng's proposal, doc 34 §166) leaving the Cangwu Mountains' spirit vein under the Cangwu Sect's stewardship with Azure Sword and Jade Void as guarantors. The reformer's path.
- **Alliance lobbying:** file a formal complaint with the Immortal Alliance (doc 20 §1.3) and use the alliance's slow adjudication to stall the expansion while the protagonist's power grows. The legalist's path.
- **Jade Void invocation:** travel (or send a message) to the Jade Void's rotating-shrine hermitage and ask the rotating elders to invoke the holy land's birthplace-claim. The high-politician's path — the riskiest, because the Jade Void's intervention could protect the Cangwu Sect, or could absorb the Cangli region into the holy land's direct suzerainty, replacing one suzerain with another.

### 4.4 The rogue cultivators and the small-sect ecology

Below the 13 great sects and the five holy lands, the cultivation world has two further layers: the small sects (of which the Cangwu Sect is the named example) and the rogue cultivators (散修, per doc 20 §1.3). The small sects are the cultivation world's "towns" — single-vein institutions with 20-80 disciples, Qi Condensation sect masters, no grotto-heavens. Each small sect is, in practice, a vassal-in-waiting of the nearest great sect or holy land; the Cangwu Sect's imminent vassalage to the Azure Sword Sect (doc 31 §1.6) is the typical case. The cultivation world has perhaps 200 small sects across the five continents; they are the political map's background texture, procedural content generated against the seed.

The rogue cultivators are the political map's wildcards. A rogue cultivator is a cultivator with no sect affiliation (doc 20 §1.3, §4.3); Old Chen is the named example (a retired rogue, doc 06 Scene 2). Most rogues are poor, vulnerable, and despised; a few are powerful (a rogue Nascent Soul is a force unto themselves, unbound by any sect's discipline and unaffiliated with any holy land's network). The rogue cultivator network is the cultivation world's informal intelligence-channel — rogues travel, observe, and trade information in ways that sect-bound cultivators cannot. Old Chen's old connections include a Jade Void elder (now dead) and a network of regional rogues who, in Act 2, can provide the protagonist with intelligence on Pei Liang's movements (doc 26 §3.3). The protagonist, as a former rogue (if the protagonist chooses the rogue path, doc 20 §4.3), inherits Old Chen's network and the rogues' grudging respect. The rogue cultivators' relationship to the 13 great sects is uniformly tense (the great sects consider rogues a destabilizing presence; the rogues consider the great sects predatory); the rogues' relationship to the five holy lands is uniformly distant (the holy lands do not notice individual rogues, except when a rogue reaches Nascent Soul and becomes a force the holy lands must reckon with).

### 4.5 The Courts of Heaven's relationship to the political map

The Courts (doc 38) are not a holy land and not a sect; they are the Precelestial institution with jurisdiction over records of the dead and heaven-sealed oaths. The Courts' relationship to the political map: the Yellow Court and the Skyfire are the two Courts-allied holy lands (alchemical tithes; weapon-supply); the Jade Void is independent but deferential (petitions through the Records department's regional magistrates); the Verdant Pillar and the NorthSea are independent; the 13 great sects' Courts-relationships are mediated through their holy-land suzerains (a vassal sect's Courts-petition passes through its holy land's intermediaries). The protagonist's Courts-relationship (Act 3, doc 26 §4.3) begins with the Cangwu Sect's failed Adjudication petition (doc 38 §2.3) and culminates, in the Transcend path, with the protagonist's Mahayana law-authorship — which requires the Courts' ratification (the bardo-harvest-loophole law amends Qiu Wuhen's bardo-window law, doc 38 §4.1, and the amendment requires Qiu Wuhen's ratification or dispersal).

---

## 5. The protagonist's path through the political map

### 5.1 Act 2 (Foundation Establishment → Core Formation, sessions 100-500)

The protagonist's Act 2 institutional encounters, in order:

1. **The Cangwu Sect (session ~120)** — the protagonist joins as a junior disciple (doc 26 §4.2). The protagonist's first sect. The Cangwu Sect is the smallest institution on the political map; the protagonist's joining is, for the sect, an event (the Independence faction's first potential ally). The protagonist's relationship to the Cangwu Sect is the protagonist's first 恩-debt (doc 20 §3.3) — Wu Changqing's bet on the protagonist creates an obligation the protagonist carries through the rest of the game.

2. **The Azure Sword Sect (session ~200, with Pei Liang's raid)** — the protagonist's first encounter is through Leng Qingxue, who is sent to investigate the raid (doc 26 §3.3). The relationship is adversarial-by-default (the Cangwu Sect's vassalage dispute) but mediated by Leng Qingxue's defection and the protagonist's romance with her (doc 34 §166). The protagonist's choice — side with Leng Wushuang's expansion, side with Leng Qingxue's dissent, or pursue a third path — is the Act 2 central political decision.

3. **The Jade Void Holy Land (session ~150-300, indirect)** — encountered indirectly through three channels: (a) the rotating-shrine hermitage 12 li west of Wang Family Bend, where the protagonist may meet Xu Yunfeng at Foundation Establishment; (b) Leng Qingxue's secret correspondence with Xu Yunfeng, which the protagonist may discover (and may join); (c) Old Chen's old connections (Old Chen once delivered a message to a Jade Void elder, decades ago — the elder is now dead, but the message's content, if Old Chen reveals it, concerns the founder's birthplace-search). The protagonist does not visit Dong Continent in Act 2.

4. **The Pearl-Tide Sect (session ~250-400, optional)** — the protagonist may travel to Haimen (1,200 li north) at Foundation Establishment, either to consult the Pearl-Tide's maritime intelligence on the Crimson Vow Remnant's network (the Remnant's recruiter crossed the Eastern Sea; the Pearl-Tide's outer disciples may have noticed) or to book passage on a Vermilion Pearl Route spirit-junk. Optional but enriches the Act 2 political map.

5. **The Heavenly Pivot Sect (session ~400, optional)** — the protagonist may be summoned to Yanjing (5,400 li northwest) by the Heavenly Pivot Sect, if the protagonist's growing reputation reaches the imperial court. Optional and dangerous — the succession crisis makes Yanjing volatile.

The protagonist does **not** encounter in Act 2: the Yellow Court, Skyfire, Verdant Pillar, or NorthSea holy lands; the Iron-Horse, Sand-Veiled, Emerald Pagoda, Whale-Rider, Azuremist, Ironbone, Stone Lantern, Sea-Fan, Redwood Canopy, Snowstrider, or Mammoth-Bone sects; the Crystal-Tide undersea sect; the Pearl Archipelago. These are Act 3 or optional content.

### 5.2 Act 3 (Nascent Soul → Mahayana, sessions 500-1500+)

The protagonist's Act 3 institutional encounters, in order:

1. **The Azure Sword Sect (session ~500-1000, continuing)** — the Azure Sword's role depends on the protagonist's Act 2 choices. If the protagonist sided with Leng Qingxue, the Azure Sword (now under Leng Qingxue's influence, following Leng Wushuang's death or retirement) becomes the protagonist's primary Zhong-side ally. If the protagonist opposed Leng Wushuang's expansion without aligning with Leng Qingxue, the Azure Sword becomes a rival. If the protagonist mediated the regional compact, the Azure Sword is a neutral-to-friendly institution.

2. **The Jade Void Holy Land (session ~1000-1100, direct)** — the protagonist, at Nascent Soul, accepts (or seeks) an invitation to Voidjade Peak. The journey is the protagonist's first cross-continental travel: the Vermilion Pearl Route by spirit-junk (30 days), then overland from Qingyang to Voidjade Peak (2 hours by flight). At Voidjade Peak, the protagonist meets Daoist Jade Void, accesses the library (the Pillar Dynasty Annals, the Crimson Vow Code fragments, the Silent Hexagram Method), and learns the founder's Cangli birth-origin and the connection between the Cangli spirit vein and the Pillar Root Vein (doc 37 §9.2). The Jade Void becomes the protagonist's primary Act 3 institutional ally.

3. **The Verdant Pillar Holy Land (session ~1100-1200, optional)** — the protagonist may travel from Dong to Nan (a 14,000-li flight, 2 days at Nascent Soul speed) to investigate the Cangli spirit vein's connection to the Pillar Root Vein. At the Verdant Pillar, the protagonist meets Daoist Pillar Canopy and Old Pillar (the tree-yao co-founder), accesses the Pillar Cities' ruins and bark-strip libraries, and learns the Pillar Dynasty's qi-economy and the cosmic-history of the Cangli vein's decline. Optional but provides cosmic-history context for the Pei Liang confrontation.

4. **The Yellow Court Holy Land (session ~1200-1300, optional)** — the protagonist may travel from Nan to Zhong's western interior (a 16,000-li flight, 2-3 days at Nascent Soul speed) to consult the Yellow Court's alchemical records on the Crimson Vow Remnant's corrupted fire-phase tradition. Optional but provides the alchemical-counter to the Remnant's fire-phase technique. The visit also exposes the protagonist to the Yellow Court's polite-rivalry with the Jade Void, which the protagonist must navigate carefully (the Yellow Court's patriarch is older than the Jade Void's and considers the Jade Void's Cangli birthplace-claim an overreach).

5. **The Skyfire Holy Land (session ~1300-1400, optional, Spirit Severance)** — the protagonist, at Spirit Severance, may travel to Xi (a 25,000-li flight from Zhong, 3-4 days at Spirit Severance speed) to commission a sword for the Pei Liang confrontation. Optional but provides the cultivation world's highest-tier metal-phase weapon. The visit also exposes the protagonist to the Skyfire's intelligence on the Western Spirit Wilds' Law Reaches — which is, in the Transcend path, the protagonist's primary source for the Law Reach venue's selection.

6. **The NorthSea Holy Land (session ~1400+, optional, Void Amalgamation)** — the protagonist, at Void Amalgamation (if reached), may travel to Bei to consult the NorthSea's ancestral-court records on the Wang lineage. The protagonist's deepest optional content; requires the protagonist to have bonded a place that allows the consultation (the NorthSea's 1:20 time-rate makes the visit costly — one day inside = twenty days outside, and the consultation may take days). The protagonist's primary source on the founder's mortal lineage and its connection (if any) to the Wang lineage.

7. **The Courts of Heaven (session ~1400+, Transcend path only)** — the protagonist, in the Transcend path (doc 26 §4.3), crosses Tribulation and enters the Precelestial. The Courts are the protagonist's final institutional encounter — the protagonist's Mahayana law-authorship requires the Courts' ratification (Qiu Wuhen's ratification or dispersal, doc 38 §4.1). The Courts are not a holy land and not a sect; they are the cultivation world's apex institution, and the protagonist's relationship to them is the game's final political drama.

The protagonist does **not** encounter (in any act, except by optional exploration): the Iron-Horse, Sand-Veiled, Sea-Fan, Redwood Canopy, Snowstrider, Mammoth-Bone, Ironbone, or Azuremist sects; the Crystal-Tide undersea sect; the Pearl Archipelago's Compact governance; the Abyssal Yao Council. These are worldbuilding content — the political map's background, which the protagonist perceives but does not necessarily interact with.

The protagonist's path through the political map is, in summary, a spiral: the Cangwu Sect (the smallest) → the Azure Sword Sect (the regional) → the Jade Void Holy Land (the continental) → the Verdant Pillar and the Yellow Court (the cross-continental) → the Skyfire (the trans-continental) → the NorthSea (the deepest optional) → the Courts of Heaven (the cosmic). Each step widens the protagonist's horizon; each step also deepens the protagonist's 恩-debts and the political consequences of the protagonist's choices. The path is the game's political spine.

---

## 6. What this document enables

- The cultivation world's upper tier is now fully specified: five holy lands (one per continent), 13 great sects (across the five continents), eight named grotto-heavens (with full ecological and political specs), and the political map that connects them.
- Every named institution has a personality, a specialty, a sect master or patriarch, a spirit vein or grotto-heaven, and at least one relationship to another named institution. The political map is legible from any institution's perspective.
- The protagonist's path through the political map is committed across Act 2 (Foundation Establishment → Core Formation) and Act 3 (Nascent Soul → Mahayana). The path is specific: which institutions the protagonist encounters, in what order, with what consequence.
- The Azure Sword Sect's expansionist interest in the Cangli Riverlands is placed in the political map's full context — the Jade Void's proxy-move against the Yellow Court, the three resistances (Cangwu Sect, Isolationist faction, Jade Void rotating-shrine elders), and the protagonist's three intervention paths.
- The Courts of Heaven's relationship to the political map is specified — the Yellow Court and Skyfire as Courts-allied, the Jade Void as deferential, the Verdant Pillar and NorthSea as independent, the 13 great sects as mediated through their suzerains. The protagonist's Transcend-path relationship to the Courts is the game's final political drama.
- The grotto-heaven catalogue (eight grotto-heavens) provides the cultivation world's pocket-world geography. Each grotto has a holder, an anchor location, a size, a qi-climate, a time-rate, an ecology, and an access-policy. The protagonist's Act 3 grotto-visits (the Jade Void's, the Verdant Pillar's, the Yellow Court's, the Skyfire's, optionally the NorthSea's) are concrete narrative objects.
- The political map's lower tier — the small sects and the rogue cultivators — is specified in §4.4, giving the political map depth below the great-sect tier. Old Chen's rogue network, the Cangwu Sect's vassal-in-waiting status, and the protagonist's potential inheritance of Old Chen's connections are now legible against the full institutional landscape.
- The five holy lands' personality-spectrum is committed: the Jade Void's patient grief, the Yellow Court's scholastic slowness, the Skyfire's forge-ascetic silence, the Verdant Pillar's hybrid patience, the NorthSea's cold record-keeping. Each patriarch is a person, not a stat block; each holy land has a grief (the Thinning's manifestation at the institutional scale) that the protagonist can perceive and, at Mahayana, can in principle address.

---

## 7. What this document does not decide

- **The full roster of great sects per continent.** Doc 20 §1.3 specifies 5-10 per region, implying 25-50 great sects across the five continents. This document names 13 (the politically-central ones); the rest are procedural content.
- **The full roster of holy lands per continent.** Doc 20 §1.3 specifies 3-5 per continent, implying 15-25 holy lands across the five continents. This document names five (one per continent, the most politically-central); the rest are smaller, regional holy lands that defer to the named five.
- **The small sects.** Doc 20 §1.3 specifies that the cultivation world also has small sects (like the Cangwu Sect) below the great-sect tier. This document references the Cangwu Sect for relational completeness but does not name other small sects. They are procedural content.
- **The protagonist's specific Act 3 optional-visit content.** This document commits the protagonist's Act 3 visit-options (the Verdant Pillar, the Yellow Court, the Skyfire, the NorthSea, the Courts); it does not commit the visits' specific narrative beats, the NPCs the protagonist meets, or the consequences of the visits' outcomes. These are content-design decisions, not political-map decisions.
- **The grotto-heavens' specific interior geography.** Each grotto's size, qi-climate, time-rate, and ecology are specified; the specific terrain, the specific spirit-herb locations, and the specific spirit-beast encounters are procedural content, generated against the seed and the grotto-specific geography generator (a future plugin, per doc 19 §4.1's pattern).
- **The protagonist's specific Mahayana endgame.** The Transcend path's Law Reach venue is in the deep Precelestial above Xi Continent (the Western Spirit Wilds are the most Reach-rich region). The specific Reach the protagonist authors their law in is endgame content, not political-map commitment. The protagonist's relationship to the nine Mahayana (doc 39) is specified in doc 39 §5; this document does not duplicate that specification.
- **The inter-sect trade and the spirit-stone economy.** This document specifies the political relationships (vassalage, alliance, rivalry) but not the economic flows (spirit-stone tithes, trade-route volumes, alchemical supply-chains' quantities). The economy's broad shape is in doc 18; the institution-specific economic flows are procedural content, generated against the seed and the political map committed here.

These are deferred details, not deferred forks. The decisions this document makes — the five holy lands' full specs, the 13 great sects' full specs, the eight grotto-heavens' catalogue, the political map, and the protagonist's Act 2-3 path through the political map — are committed. If they prove wrong in prototype, the prototype's evidence overrides this document, and this document is revised — not appended with a candidate alternative.
