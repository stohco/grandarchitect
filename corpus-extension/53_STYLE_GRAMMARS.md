# 53 — Style Grammars

**Status:** `[CANON]` Defines design grammars for every culture, faction, world, era, and craft tradition.

**Implements:** `engine-architecture/51_MULTIVERSE_GROUND_TRUTH_ARCHITECTURE.md` §12

---

## §1. Grammar Fields

```typescript
interface StyleGrammar {
  id: string; name: string;
  truthLevel: 'CANON' | 'DERIVED' | 'ART';
  scope: 'culture' | 'faction' | 'world' | 'region' | 'era' | 'craft';
  preferredProportions: string; structuralShapes: string;
  curvature: string; symmetry: string;
  materialHierarchy: string; surfaceFinish: string;
  colorRelationships: string; motifs: string; negativeSpace: string;
  decorationDensity: string; craftsmanship: string; weathering: string;
  lighting: string; movementLanguage: string; soundLanguage: string; vfxLanguage: string;
  forbiddenMotifs: string[]; permittedInfluences: string[];
  regionalVariants: string; historicalEvolution: string;
}
```

## §2. Cangli Riverlands (沧篱江乡)

Mortal substrate. Rural, riverine, subtropical. Muted, earthy, grounded.

**Architecture:** Low and wide (1:1.2–1:1.5 W:D), rectangular footprint, hipped/gabled roof, no curved eaves. Minimal curvature, bilateral symmetry on main hall. Timber frame → brick noggin infill → lime-washed walls → grey clay tile. Earth tones (off-white, ochre, dark brown, grey-green). Low decoration density.

**Materials:** Dark cedar, pale river granite, grey clay tile (unglazed), wrought iron.

**Movement:** Measured, slightly burdened; 1.3 m/s typical. No martial-arts flourishes in civilians.

**VFX:** None in civilian context. Fog is natural morning mist.

**Forbidden:** Curved temple eaves, red pillars, gold leaf, glowing runes, floating elements, modern materials, symmetrical courtyards >15m width.

## §3. Northern Cloud Monasteries (北云宗)

Foundation-stage sect. Ascetic, vertical, cloud-shrouded.

**Architecture:** Strong vertical hierarchy (1:2–1:3 W:H), narrow lower widening toward roofline, long horizontal eaves, slight upward eave curve. Strict bilateral symmetry. Exposed dark timber → pale stone infill → oxidized bronze → light mineral roof. Dark brown, pale grey, cloud-green, oxidized bronze. Low decoration.

**Materials:** High-altitude dark cedar, pale granite (uncut face), oxidized bronze, cloud-grey glazed tile.

**Movement:** Slow anticipation, minimal wasted movement, sharp final acceleration. 1.0 m/s deliberate, 2.5 purposeful, 8+ qi-enhanced.

**VFX:** Low particle density, broad mist volumes, pale desaturated light, no rainbow effects. Sword qi = faint white-blue edge distortion.

**Forbidden:** Gold palace surfaces, dense glowing runes, floating crystals, excessively curved fantasy roofs, saturated red/orange/purple, neon glowing qi, Western Gothic/Romanesque elements.

## §4. Southern Orthodoxy (南正道)

Established orthodox sects. Formal, hierarchical, gold-accented but restrained.

**Architecture:** 1:1.5–1:2 W:H, broad podium base, multi-eave upper structure, visible dougong brackets. Moderate eave curvature, upswept corners. Stone podium → red lacquered columns → grey tile → bronze fittings. Vermillion, charcoal grey, bronze, pale stone. Gold accents only on official halls. Moderate decoration (painted beams, bronze door studs).

**VFX:** Moderate particle density, warm gold-white light for orthodox techniques. Formation circles geometric and precise.

**Forbidden:** Black/blood-red/sickly green palette (demonic), asymmetrical layouts, organic/figurative carvings on structural members, skeletal/skull motifs.

## §5. Demonic Cultivators (魔修)

Unorthodox, transgressive, consuming, anti-hierarchical. Not "evil" in Western sense — visible cost to practitioner.

**Architecture:** Asymmetric, often carved or grown. Irregular, organic, sometimes appearing grown from stone or bone. Twisting, non-Euclidean at higher realms. Dark stone → bone/petrified wood → blood-iron → obsidian. Black, deep red, sickly green, bone-white. No gold. High but unsettling decoration (too many eyes, too many mouths, asymmetrical repetition).

**Movement:** Unsettling gait — smooth where orthodox is sharp, sharp where orthodox is smooth. Visible physical degradation.

**VFX:** High particle density (blood mist, soul-wisp trails, consuming darkness). Saturated dark colors. Sickly bioluminescence. Wet, organic, dissonant sound.

**Forbidden:** Clean symmetrical formations, gold/white-gold/pure white light, healthy appearance in high-realm demonic cultivators, making demonic cultivation look "cool" without visible cost.

## §6. Spirit Wilds (灵荒)

Uncontained wilderness beyond Law Reach. Pre-human, primordial, ecosystem-scale.

No human architecture. Everything is grown, nested, or woven by spirit beasts and ancient flora. Scale: everything larger than mortal-world equivalent (trees 80–200m, beasts 10–100m). Deep saturated natural colors. Dense haze, spore clouds, qi-mist. Dappled canopy light, bioluminescent undergrowth, no artificial light.

**Forbidden:** Human structures or tools (unless ruins), geometric formations or cultivation circles, domesticated animals or farmed plants.

## §7. Heavenly Courts (天庭)

Celestial bureaucracy. Vast, formal, crystalline, incomprehensible in scale.

**Architecture:** 1:3–1:5 W:H, cathedral-scale. Crystalline, prismatic, impossibly precise joints. White jade → gold → celestial crystal → luminous pearl. White, gold, pale jade, luminous blue-white. No earth tones.

**VFX:** Light is structural — buildings emit their own illumination. No particles — effects are clean geometric light. Resonant chimes, harmonic drones, no percussion.

**Forbidden:** Earth tones, weathering, patina, wood/thatch/vernacular materials, asymmetry, organic irregularity, dust/dirt/untidiness.

## §8. Procedural Generation Boundaries

1. Cangli building must not produce curved eaves (forbidden by §2).
2. Northern Cloud building must not use gold surfaces (forbidden by §3).
3. Demonic cultivator must include visible body cost (required by §5).
4. Heavenly Court structure must use luminous materials only (required by §7).

The Visual Accuracy Oracle checks generated content against these boundaries. Violations are rejected.

## §9. Regional Variant Rules

| Grammar | Permitted variation | Forbidden variation |
|---------|-------------------|---------------------|
| Cangli Riverlands | Roof tile color (grey-brown); wall lime wash tint | Curved eaves; red pillars; gold |
| Northern Cloud | Eave curvature degree; stone color | Gold; dense runes; floating crystals |
| Southern Orthodoxy | Red shade; bronze patina | Black palette; asymmetry; organic carving |
| Demonic | Corruption type; degree of asymmetry | Clean symmetry; gold; healthy appearance |
| Spirit Wilds | Biome type; dominant spirit species | Human structures; geometric formations |
| Heavenly Courts | Crystal hue; gold karat | Earth tones; weathering; organic forms |
