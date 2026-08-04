# 53 — Style Grammars

**Status:** `[CANON]` Canonical invariant. Defines the design grammar for every culture, faction, world, era, and craft tradition in the multiverse.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md` §12

**Purpose:** Replace generic fantasy tags ("xianxia," "ancient Chinese," "immortal") with specific, enforceable design rules. Procedural generation operates within these boundaries.

---

## §1. Grammar Fields

Every style grammar specifies:

```typescript
interface StyleGrammar {
  id: string;
  name: string;
  truthLevel: 'CANON' | 'DERIVED' | 'ART';
  scope: 'culture' | 'faction' | 'world' | 'region' | 'era' | 'craft';

  // ---- Form ----
  preferredProportions: string;
  structuralShapes: string;
  curvature: string;
  symmetry: string;

  // ---- Surface ----
  materialHierarchy: string;
  surfaceFinish: string;
  colorRelationships: string;
  motifs: string;
  negativeSpace: string;
  decorationDensity: string;
  craftsmanship: string;
  weathering: string;

  // ---- Presentation ----
  lighting: string;
  movementLanguage: string;
  soundLanguage: string;
  vfxLanguage: string;

  // ---- Boundaries ----
  forbiddenMotifs: string[];
  permittedInfluences: string[];
  regionalVariants: string;
  historicalEvolution: string;
}
```

---

## §2. Culture: Cangli Riverlands (沧篱江乡)

**Scope:** The mortal substrate where the player begins. Rural, riverine, subtropical.

> `[CANON]` The Cangli Riverlands are the starting region. Their visual identity is muted, earthy, and grounded — the opposite of sect opulence.

### Architecture
- **Proportions:** Low and wide; 1:1.2 to 1:1.5 width-to-depth ratio for households
- **Structural shapes:** Rectangular footprint, hipped or gabled roof, no curved eaves
- **Curvature:** Minimal; straight rooflines, right-angle joints
- **Symmetry:** Bilateral symmetry on the main hall; asymmetry acceptable on outbuildings
- **Material hierarchy:** Timber frame (load-bearing) → brick noggin infill → lime-washed walls → grey clay tile roof
- **Surface finish:** Lime wash on walls (off-white to pale grey); exposed dark timber; unlaid brick at foundation
- **Color relationships:** Earth tones — off-white, ochre, dark brown, grey-green tile. No saturated reds or golds.
- **Decoration density:** Low. Door lintels may have simple carved auspicious symbols. No painted beams.
- **Weathering:** Moss on north-facing walls; river-stain on foundations; tile-edge lichen

### Materials
- **Timber:** Dark cedar (杉木), locally sourced
- **Stone:** Pale river granite for foundations
- **Ceramic:** Grey clay roof tiles, unglazed
- **Metal:** Wrought iron for hinges and locks; no bronze or gold

### Movement language
- **Villagers:** Measured, slightly burdened; rural laborer's walk (1.3 m/s typical)
- **No martial-arts flourishes** in civilian NPCs

### VFX language
- **None in civilian context.** Spirit-light (will-o-wisp) occurrences are rare ambient phenomena, not character effects.
- Fog is natural morning mist, not magical.

### Forbidden motifs
- `[FORBIDDEN]` Curved temple eaves (reserved for shrines and sects)
- `[FORBIDDEN]` Red pillars (reserved for official/sect buildings)
- `[FORBIDDEN]` Gold leaf or gilding of any kind
- `[FORBIDDEN]` Glowing runes or formation marks on civilian structures
- `[FORBIDDEN]` Floating elements or supernatural lighting on mortal buildings
- `[FORBIDDEN]` Modern materials (concrete, steel, glass)
- `[FORBIDDEN]` Symmetrical courtyard complexes larger than 15m width (that is sect/official scale)

### Permitted influences
- Song Dynasty vernacular architecture (referenced in doc 10)
- Jiangnan water-town aesthetic
- Subtropical agricultural settlement patterns

---

## §3. Culture: Northern Cloud Monasteries (北云宗)

**Scope:** A Foundation-stage sect in the Cangwu Mountains. Ascetic, vertical, cloud-shrouded.

> `[CANON]` The Northern Cloud Monasteries embody the principle of "high and hidden" — verticality, mist, and restraint.

### Architecture
- **Proportions:** Strong vertical hierarchy; 1:2 to 1:3 width-to-height ratio for main halls
- **Structural shapes:** Narrow lower structures widening toward rooflines; long horizontal eaves
- **Curvature:** Slight upward curve at eave ends (subtle, not exaggerated)
- **Symmetry:** Strict bilateral symmetry on the central axis
- **Material hierarchy:** Exposed dark structural timber → pale stone infill → oxidized bronze fittings → light mineral roof
- **Surface finish:** Natural timber (dark cedar); pale stone (uncut face); oxidized bronze (green-brown patina)
- **Color relationships:** Dark brown, pale grey, cloud-green, oxidized bronze. No saturated colors.
- **Decoration density:** Low. Structural members are the decoration. Minimal carving.
- **Weathering:** Wind-polished stone; moss in joints; timber silvered by altitude sun

### Materials
- **Timber:** High-altitude dark cedar
- **Stone:** Pale granite, uncut face
- **Metal:** Oxidized bronze for fittings, bells, incense burners
- **Ceramic:** Cloud-grey glazed tile

### Movement language
- **Cultivators:** Slow anticipation, minimal wasted movement, sharp final acceleration
- **Walking speed:** 1.0 m/s (deliberate); 2.5 m/s (purposeful); 8+ m/s (qi-enhanced)

### VFX language
- **Low particle density** — mist and cloud volumes, not sparkles
- **Broad mist volumes** — atmospheric, not magical-looking
- **Pale desaturated light** — no saturated colors
- **No rainbow effects** — monochrome or analogous palette only
- **Sword qi:** Visible as a faint white-blue edge distortion, not a glowing energy blade

### Forbidden motifs
- `[FORBIDDEN]` Generic gold palace surfaces
- `[FORBIDDEN]` Dense glowing runes or formation circles (too ostentatious for Cloud style)
- `[FORBIDDEN]` Floating crystal decoration
- `[FORBIDDEN]` Excessively curved fantasy roofs (Wuxia-game exaggeration)
- `[FORBIDDEN]` Saturated red, orange, or purple in architecture
- `[FORBIDDEN]` Neon-style glowing qi effects
- `[FORBIDDEN]` Western Gothic or Romanesque structural elements

### Permitted influences
- Tang Dynasty mountain temple architecture
- Japanese Yamabushi aesthetic (for the ascetic mountain element)
- Tibetan monastery verticality (for scale reference, not decoration)

---

## §4. Culture: Southern Orthodoxy (南正道)

**Scope:** The established orthodox sects of the southern regions. Formal, hierarchical, gold-accented but restrained.

> `[CANON]` Southern Orthodoxy represents institutional cultivation — structured, canonical, with visible authority markers.

### Architecture
- **Proportions:** 1:1.5 to 1:2 width-to-height; balanced horizontal and vertical
- **Structural shapes:** Broad podium base, multi-eave upper structure, dougong brackets visible
- **Curvature:** Moderate eave curvature; upswept corners
- **Symmetry:** Strict central axis; subsidiary buildings mirror-symmetric
- **Material hierarchy:** Stone podium → red lacquered columns → grey tile roof → bronze fittings
- **Color relationships:** Vermillion red, charcoal grey, bronze, pale stone. Gold accents only on official halls.
- **Decoration density:** Moderate. Painted beams (geometric, not figurative). Bronze door studs.

### VFX language
- **Moderate particle density** — more than Cloud, less than demonic
- **Warm gold-white light** for orthodox techniques
- **Formation circles** are permitted but must be geometric and precise, not chaotic

### Forbidden motifs
- `[FORBIDDEN]` Black, blood-red, or sickly green color palette (demonic)
- `[FORBIDDEN]` Asymmetrical or chaotic structural layouts
- `[FORBIDDEN]` Organic/figurative carvings on structural members (geometric only)
- `[FORBIDDEN]` Exposed skeletal or skull motifs

---

## §5. Culture: Demonic Cultivators (魔修)

**Scope:** The unorthodox, forbidden path. Not "evil" in the Western sense — transgressive, consuming, anti-hierarchical.

> `[CANON]` Demonic cultivation is visually distinct from orthodox: asymmetric, consuming, blood-aspected, with visible cost to the practitioner.

### Architecture
- **Proportions:** Asymmetric; often carved or grown rather than built
- **Structural shapes:** Irregular, organic, sometimes appearing grown from stone or bone
- **Curvature:** Twisting, non-Euclidean at higher realms
- **Material hierarchy:** Dark stone → bone/petrified wood → blood-iron → obsidian
- **Color relationships:** Black, deep red, sickly green, bone-white. No gold.
- **Decoration density:** High but unsettling — too many eyes, too many mouths, asymmetrical repetition

### Movement language
- **Unsettling gait:** Smooth where orthodox is sharp; sharp where orthodox is smooth
- **Body cost:** Visible physical degradation — withered limbs, overgrown bone, skin discoloration

### VFX language
- **High particle density** — blood mist, soul-wisp trails, consuming darkness
- **Saturated dark colors** — blood-red, poison-green, void-black
- **Sickly bioluminescence** — not clean light but organic glow
- **Sound:** Wet, organic, dissonant — not clean metallic rings

### Forbidden motifs
- `[FORBIDDEN]` Clean symmetrical formations (that is orthodox)
- `[FORBIDDEN]` Gold, white-gold, or pure white light (that is orthodox)
- `[FORBIDDEN]` Healthy appearance in high-realm demonic cultivators (the path costs the body)
- `[FORBIDDEN]` Making demonic cultivation look "cool" without visible cost — corruption must be visible

---

## §6. Culture: Spirit Wilds (灵荒)

**Scope:** The uncontained wilderness beyond Law Reach. Pre-human, primordial, ecosystem-scale.

> `[CANON]` The Spirit Wilds have no human architecture. Everything is grown, nested, or woven by spirit beasts and ancient flora.

### Architecture
- **None.** Spirit Wild "structures" are nests, groves, lairs, and natural formations modified by spirit presence.

### Visual language
- **Scale:** Everything is larger than mortal-world equivalent — trees 80-200m, beasts 10-100m
- **Color:** Deep saturated natural colors — moss green, bark brown, bioluminescent blue-green
- **Atmosphere:** Dense haze, spore clouds, qi-mist
- **Light:** Dappled canopy light; bioluminescent undergrowth; no artificial light sources

### Forbidden motifs
- `[FORBIDDEN]` Human structures or tools (unless ruins of a lost expedition)
- `[FORBIDDEN]` Geometric formations or cultivation circles (that is civilized)
- `[FORBIDDEN]` Domesticated animals or farmed plants

---

## §7. Culture: Heavenly Courts (天庭)

**Scope:** The Celestial bureaucracy. Vast, formal, crystalline, incomprehensible in scale.

> `[CANON]` The Heavenly Courts are the only culture where gold and luminous materials are canonical. Everything is monumentally scaled.

### Architecture
- **Proportions:** 1:3 to 1:5 width-to-height; cathedral-scale
- **Structural shapes:** Crystalline, prismatic, impossibly precise joints
- **Material hierarchy:** White jade → gold → celestial crystal → luminous pearl
- **Color relationships:** White, gold, pale jade, luminous blue-white. No earth tones.

### VFX language
- **Light is structural** — buildings emit their own illumination
- **No particles** — effects are clean geometric light, not organic
- **Sound:** Resonant chimes, harmonic drones, no percussion

### Forbidden motifs
- `[FORBIDDEN]` Earth tones, weathering, or patina (the Courts do not decay)
- `[FORBIDDEN]` Wood, thatch, or vernacular materials
- `[FORBIDDEN]` Asymmetry or organic irregularity
- `[FORBIDDEN]` Dust, dirt, or untidiness of any kind

---

## §8. Procedural Generation Boundaries

Procedural generators must respect style grammar boundaries:

1. A generator creating a Cangli Riverlands building must not produce curved eaves (forbidden by §2).
2. A generator creating a Northern Cloud Monastery building must not use gold surfaces (forbidden by §3).
3. A generator creating a demonic cultivator must include visible body cost (required by §5).
4. A generator creating a Heavenly Court structure must use luminous materials only (required by §7).

The Visual Accuracy Oracle checks generated content against these boundaries. Violations are rejected.

---

## §9. Regional Variant Rules

Each grammar permits regional variation within defined boundaries:

| Grammar | Permitted variation | Forbidden variation |
|---------|-------------------|---------------------|
| Cangli Riverlands | Roof tile color (grey to brown); wall lime wash tint (warm to cool) | Curved eaves; red pillars; gold |
| Northern Cloud | Eave curvature degree (subtle to moderate); stone color (grey to blue-grey) | Gold surfaces; dense runes; floating crystals |
| Southern Orthodoxy | Red shade (vermillion to brick); bronze patina (fresh to dark) | Black palette; asymmetry; organic carving |
| Demonic | Specific corruption type (bone, blood, shadow); degree of asymmetry | Clean symmetry; gold; healthy appearance |
| Spirit Wilds | Biome type (forest, swamp, mountain); dominant spirit species | Human structures; geometric formations |
| Heavenly Courts | Crystal hue (white to pale blue); gold karat (visible but not garish) | Earth tones; weathering; organic forms |
