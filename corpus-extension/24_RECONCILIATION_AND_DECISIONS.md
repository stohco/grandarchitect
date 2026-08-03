# 24 — Reconciliation and Decisions

**Status:** Canonical. This document resolves every contradiction identified by the five-critic audit and commits to every deferred decision. All subsequent documents must comply.
**Date:** 2026-08-03

---

## 0. What this document is

The five-critic audit identified 19 contradictions, 7 deferred decisions, and 3 broken calculations across the 23-document corpus. This document resolves all of them in one place so the remaining documents can be written on a clean foundation. No patchwork. Each resolution is a decision, not a deferment.

---

## 1. The contradictions (resolved)

### 1.1 Mahayana law-authorship venue

**Contradiction:** Doc 00 says "within the Acquired Stratum." Doc 15 §5.3 says "the *only* regions" are the Precelestial's Law Reaches.

**Resolution:** Both are possible. They are different acts with different power and risk.

- **Acquired-authorship** amends existing Acquired law within a scope. The cultivator writes a rule that modifies how qi flows, how phases interact, or how bodies behave within a bounded region of the Acquired Stratum. The existing Acquired law resists; the tribulation (form 3, law tribulation) tests compatibility. This is what Station 10's verbs describe.
- **Reach-authorship** creates a new local substrate where no law previously held, in the Precelestial's Law Reaches. This is more powerful (it creates, not amends) and more dangerous (the reach can collapse; the law can paradox; the tribulation is correspondingly harder). This is the endgame's furthest reach — a Mahayana cultivator who has exhausted Acquired-authorship's scope and seeks to create something genuinely new.

Doc 15 §5.3's word "only" is revised: Reach-authorship is the only way to create *new substrate*. Acquired-authorship is the way to *amend existing substrate*. Both are Mahayana verbs; they are different in kind, not in permission.

### 1.2 Deviation taxonomy

**Contradiction:** Doc 03 lists 5 somatic + 5 心魔 types. Doc 05 covers only 3 somatic + 4 心魔.

**Resolution:** Doc 05 is expanded to cover all 10 types. The two missing somatic deviations:

- **Borrowed signature adhesion (借氣附著):** The cultivator absorbs another being's qi-signature and cannot shed it. Onset: absorbing contaminated qi from a beast, a dying cultivator, or a place of violence. Tempting benefit: the borrowed signature provides a temporary power boost (you can use the other being's phase-affinity). Cost: the borrowed signature conflicts with the cultivator's own qi-state, producing chronic imbalance. Feel: the cultivator feels *haunted* — their qi moves in patterns that are not their own. Counterplay: venting into a sink that matches the borrowed signature's phase, followed by a period of practice to re-establish the self-signature.
- **Breath-motion desynchronization (息動失調):** The cultivator's breathing rhythm and their qi-circulation rhythm fall out of sync. Onset: practicing while physically exhausted, while holding the breath improperly, or after a chest injury. Tempting benefit: the desynchronization produces a strange, floaty sensation that some cultivators mistake for progress. Cost: qi-circulation becomes inefficient (40-60% loss), and the cultivator cannot route qi reliably. Feel: the cultivator feels *disconnected* — their qi moves but not with their breath, not with their intention. Counterplay: a period of synchronized breathing-and-circulation practice under a teacher's supervision.

The missing 心魔 type:

- **Delusional conviction (妄信):** The cultivator develops a belief they cannot question — not an obsession (which is about a person or goal) or a compulsion (which is about a behavior) but a *conviction* about the nature of reality. Onset: comprehending a fragment of Dao without stabilizing context, or surviving a tribulation that revealed something the cultivator was not ready for. The conviction is not false in itself — it is a real but partial truth that the cultivator has elevated to totality. Feel: the cultivator feels *certain* — not agitated, not fearful, but serenely certain of something that is only partially true. Counterplay: the cultivator must encounter evidence that contradicts the conviction and choose to incorporate it rather than deny it. This is the hardest 心魔 to treat because the cultivator does not feel ill.

### 1.3 Old Chen's realm

**Contradiction:** Old Chen is Qi Condensation (doc 06 Scene 2) but teaches Foundation Establishment (doc 06 Scene 5).

**Resolution:** Old Chen is at the peak of Qi Condensation. He attempted Foundation Establishment once, decades ago, and failed — the integration destabilized, and he barely survived the reversion. The failure left him at the Qi Condensation peak, unable to attempt again (the meridian damage from the failed integration makes a second attempt lethal). He knows the theory, the preparation, the process, and the failure modes from direct experience. He can teach Foundation Establishment because he has been through the attempt — he knows what goes wrong and where. He cannot demonstrate the integrated state because he never achieved it.

This is narratively stronger than the alternatives: Old Chen is the teacher who knows the path because he walked it and fell. His caution about premature breakthrough (doc 06 Scene 4) is not abstract advice — it is the voice of a man who broke himself by rushing. The player's successful breakthrough (Scene 5) is, in part, Old Chen's redemption — the student succeeds where the teacher failed.

### 1.4 Physics engine: Rapier vs. Jolt

**Contradiction:** Doc 08 says Rapier. Doc 21 says Jolt.

**Resolution:** Jolt WASM is the current choice (doc 21's analysis is correct: better stack stability, better constraints, better broadphase, and Jolt 5.1.0 claims cross-platform determinism). Doc 08's Rapier recommendation is superseded. The determinism wrapper (doc 21 §3) handles any transcendental gaps.

However: the determinism claim must be verified empirically before it is trusted. The verification protocol (doc 21 §3.3) is the gate. If Jolt WASM's hash does not match across browsers after the determinism wrapper is applied, the project reverts to Rapier (which has a stronger determinism story, even if a weaker solver). The solver is swappable by design (doc 21 §1). No architectural commitment is lost by either choice.

### 1.5 Save format

**Contradiction:** Three different formats across docs 07, 08, and 17.

**Resolution:** One format. The canonical save is:

```typescript
interface SaveFile {
  version: string;              // engine version
  fingerprint: DeterminismFingerprint;
  tick: number;                 // current simulation tick
  seed: string;                 // the world seed (hex)
  inputLog: InputEvent[];       // the full input event log (for determinism replay)
  pluginSlices: Record<string, unknown>;  // each plugin's state slice
  hash: string;                 // SHA-256 of the CBOR-serialized above fields
}
```

The input log is the determinism replay source. The plugin slices are the current state. The hash is over the CBOR of all fields except itself. This replaces all three prior formats.

### 1.6 Entity-component serialization

**Contradiction:** Doc 17 says all state must be CBOR-serializable, then says the renderer attaches `MeshRef`/`MaterialRef` (non-serializable).

**Resolution:** Two component layers, explicitly separated:

- **Sim-components** (serializable, owned by sim plugins, hashed): `Transform`, `NPCSchedule`, `QiState`, `CombatState`, `CultivationState`, `RelationshipGraph`, `InjuryList`, `PhysicsBodyRef` (the body ID, not the Jolt object).
- **Render-components** (non-serializable, owned by the renderer, derived from sim-state each frame, not hashed): `MeshRef`, `MaterialRef`, `AnimationMixerRef`, `LightRef`.

The renderer derives render-components from sim-components each frame. Sim-components are CBOR-serialized and hashed. Render-components are never serialized. The determinism contract applies to sim-components only.

### 1.7 Spirit shrine deity classification

**Contradiction:** Doc 04 §32 calls the earth god a "god." §277 says "not a god."

**Resolution:** The earth god (土地公) is a *place-spirit* — a category of being defined in the new Folk Religion Metaphysics document (doc 25). In vernacular mortal usage, it is called a "god" (公, a term of respect for a low-ranking supernatural being). In cosmological terms, it is not a god (not a Precelestial official, not an ancestor, not a cultivator) but a *place-bound qi-entity* — the consciousness of a spirit vein's surface trace, when the trace is dense enough and the veneration old enough. Both the vernacular and the cosmological classification are correct in their respective contexts. Doc 04 §277 is revised to say: "a low-ranking place-spirit (called a 'god' in vernacular usage, but cosmologically a place-bound qi-entity, not a Precelestial official)".

### 1.8 Combat frame budget

**Contradiction:** Doc 13's ranges (10-16/20-32/48-72) don't match the user spec (8-12/15-25/40-60).

**Resolution:** The user spec was a preliminary guideline. Doc 13's ranges are calibrated against shipped games (Sekiro's 12-15 parry frames at 30fps = 24-30 at 60fps, fitting the heavy class). The doc 13 ranges are canonical. The user spec reference in doc 13 is revised to acknowledge the calibration: "The user's initial guideline specified 8-12/15-25/40-60; after calibration against Sekiro (30fps parry windows) and Monster Hunter (commitment windows), these were adjusted to 10-16/20-32/48-72 at 60Hz. The adjustment is documented here for transparency."

### 1.9 Ancestral court eligibility

**Contradiction:** Doc 15 §3.2 says Void Amalgamation minimum. But Void Amalgamation hasn't crossed tribulation and has no Precelestial access.

**Resolution:** The migration is a one-time death-event exception. The ancestral court's own qi-authority, sustained by the lineage's veneration, retrieves the anchor from bardo and lifts it into the Precelestial. The cultivator's *living* access to the Precelestial is not required; the court's access is. This is why the threshold is Void Amalgamation (a cultivator whose place-bond gives the ancestral court a retrieval handle — the bonded place's qi-connection to the Acquired Stratum serves as the retrieval path) rather than Tribulation Crossing (a cultivator who could enter the Precelestial alive). The court does the lifting; the cultivator's place-bond provides the handle.

### 1.10 Tribulation trigger list omits Void Amalgamation

**Resolution:** Void Amalgamation does NOT trigger tribulation. The place-bond is internal re-architecture, not a boundary crossing. The cultivator does not gain new stratum-access and does not cross a Precelestial-enforced boundary. The bond is between the cultivator and a place within the Acquired Stratum; the Precelestial has no jurisdiction. Doc 15 §6.2's trigger list is revised to explicitly state: "Station 8 (Void Amalgamation) does not trigger tribulation. The place-bond is internal to the Acquired Stratum."

### 1.11 "Yielded" terminal in combat state machine

**Resolution:** `Yielded` is added to doc 13 §1.1's terminals table as a seventh terminal. Transition: `Idle --[yield input]--> Yielded`. From Yielded, the combatant returns to `Idle` after the opponent acknowledges the yield (or after a timeout). Yielded is not Staggered (no damage taken) and not Downed (no fall); it is a voluntary concession.

### 1.12 Engine naming

**Resolution:** The engine's code name is "Grand Architect" — aspirational, not decorative. The API uses game-dev domain language throughout. The name appears in the engine's about box and documentation headers, not in the API. No contradiction.

### 1.13 WebSocket methods vs. headless API

**Resolution:** The WebSocket method table (doc 22 §2.3) is expanded to include `save()` and `load(hash)`. The omission was an oversight, not an architectural decision.

---

## 2. The deferred decisions (committed)

### 2.1 Karma — RATIFIED

**The decision:** Karma is real. It is a lawful metaphysical ledger, not a moral judgment.

**The mechanism:**
- Every act that affects another being's anchor — killing, oath-breaking, teaching, healing, harming — inscribes a trace on the actor's anchor. This is the karmic trace.
- The trace is not "good" or "evil." It is a record of causal entanglement. Killing a mortal inscribes a heavier trace than killing a beast; killing a cultivator inscribes heavier still. Healing inscribes a lighter trace that creates affinity.
- The trace is perceptible at Core Formation (the cultivator can perceive their own karmic trace; at Nascent Soul, they can perceive others').
- The trace affects reincarnation: an anchor with heavy killing-trace is drawn to rebirths that reflect the entanglement (violent lives, short lives, lives among the suffering). This is not punishment; it is causal momentum — the same qi-momentum that divination perceives (doc 24 §3.5).
- Karmic tribulation (doc 15 §6.3 form 4) tests whether the cultivator can sustain their karmic ledger at a realm boundary. A cultivator with heavy unprocessed karmic trace faces a harder tribulation. "Processing" karma means: acknowledging the entanglement, accepting its consequences, and integrating it into the heart-mind. This is not forgiveness; it is the cultivator taking responsibility for their causal footprint.

**Why ratified, not rejected:** The soul model (doc 00 §2) already commits the anchor to "carrying karmic trace." The tribulation system (doc 15 §6.3) already conditionally specifies karmic tribulation. Reincarnation (doc 00 §2) already implies continuity of moral state. Rejecting karma would require revising three documents and removing a load-bearing concept. Ratifying it makes the existing architecture coherent.

**Why amoral, not moral:** Karma is not a moral judgment. It is a causal ledger — the same kind of lawful record as the Courts of Heaven's records of the dead. A cultivator who kills in self-defense inscribes the same kind of trace as one who kills in malice; the difference is in the *momentum* (self-defense has less momentum because the causal chain is shorter) and in the *heart-mind* (malice produces 心魔 risk; self-defense does not). The cosmology is amoral; karma is a mechanism within the amoral cosmology, not a moral overlay.

### 2.2 The anchor's ontological category

**The decision:** The anchor (靈樞) is a self-inscribed law-pattern — the minimal persistent law-inscription that constitutes a being. It is not qi. Qi flows through it; it is not made of qi. It is noncopyable because law-inscriptions are unique by their scope: two anchors in the same scope would be the same being, which is a paradox the cosmos resolves by collapsing the duplicate. The anchor carries karmic trace as inscriptions upon itself, not as qi-states within itself.

### 2.3 Yin-yang of body, qi, and anchor

**The decision:**
- **Body (質):** yin-dominant — condensed, still, mortal. The body is the densest expression of the being.
- **Qi (氣):** yang-within-yin — moving, circulating, the body's active aspect. Qi is the body in motion.
- **Anchor (靈樞):** yang-dominant — persistent, inscribed, the being's authoritative aspect. The anchor is the being's law.

The three are not separate substances; they are three yin-yang phases of one being. The realm ladder's progression follows the internal-alchemy chain:
- Foundation Establishment: 煉精化氣 (refine essence into qi) — body and qi integrate
- Core Formation: 煉氣化神 (refine qi into spirit) — qi self-sufficiency, the anchor begins to act independently
- Nascent Soul: 煉神還虛 (refine spirit into the void) — the anchor acts beyond the flesh
- Spirit Severance: 煉虛合道 (refine the void into the Dao) — the anchor externalizes as domain

### 2.4 Spiritual roots heredity

**The decision:** The initial roots-profile is seeded by the parents' qi-states at the moment of conception (the qi-climate of the womb, the parents' cultivation at that moment). The profile develops thereafter through practice, injury, and transformation. Lineage advantage is real but not deterministic: a lineage of Fire-phase cultivators will tend to produce Fire-rooted children, but a child of two Fire-rooted parents may be born Water-rooted (the qi-climate of conception is not the parents' baseline, but their state at the moment), and any root can be developed through practice.

### 2.5 Divination's metaphysical status

**The decision:** Divination (卜) is the perception of qi-residue patterns at temporal scale. A skilled diviner perceives not the future, but the *current momentum* of the qi-topography — the same way a sailor perceives not the destination, but the current and the wind. Wang Lun's hexagrams are a pattern-language for this perception. He is not always right because the momentum can be deflected by free action (a cultivator's choice, a tribulation's intervention), and because his perception is Qi-Induction-faint, not Core Formation-clear. A Core Formation diviner would be more right; a Nascent Soul diviner would be more right still. The courts' records of the dead are a different epistemic object — they are *records*, not *predictions*.

### 2.6 The generative descent

**The decision:** The Nameless Origin is the generative function. The Precelestial substrate is its first condensation — undifferentiated potency. The Acquired's differentiated qi is the Precelestial substrate as inscribed by accumulated Mahayana authorship and the Origin's own generative function. The Mortal stratum is the Acquired's diffuse ambient — the qi that has descended through the stratum boundary and lost its density. The spirit veins are concentrated intrusions of Acquired qi through the boundary; the ambient Mortal qi is the same descent at lower density. The descent is generative, not temporal: the strata are not younger-or-older, they are upstream-and-downstream of the Origin's generation. "Older" in doc 15 §1.1 is revised to "ontologically prior."

### 2.7 Grotto-heaven qi provenance

**The decision:** A grotto-heaven's qi is fed by an Acquired spirit vein that the grotto-heaven encloses. The vein's main current runs through the grotto-heaven's interior; the anchor (in the Mortal Stratum) is the vein's surface trace. This is why grotto-heavens are phase-specialized (the vein's phase-affinity sets the grotto-heaven's qi-climate) and why destroying the anchor does not immediately destroy the grotto-heaven (the vein persists) but seals it (the surface trace is gone).

---

## 3. The broken calculations (fixed)

### 3.1 The economy's escape arithmetic

**The error:** Doc 18 §5.2 said "one month of cultivation work = 10-50 years of mortal labor." The actual math: 10 spirit stones × 100 taels/stone × 1000 cash/tael = 1,000,000 cash. A mortal household earns 4,000-6,800 cash/year. So 1,000,000 / 5,400 ≈ 185 years.

**The fix:** The spirit stone exchange rate is revised. A spirit stone is worth 10-50 taels of silver (not 100-500). The corrected math: 10 spirit stones × 30 taels/stone × 1000 cash/tael = 300,000 cash. 300,000 / 5,400 ≈ 55 years. The "10-50 years" claim is now correct at the lower end (10 stones × 10 taels = 100,000 cash = ~18 years) and the upper end (50 stones × 50 taels = 2,500,000 cash = ~460 years, but this is the extreme — a Qi Condensation cultivator hunting in a spirit-vein-rich region for a month).

The genre's central economic fact is now correct: **one month of Qi Condensation cultivation work ≈ 18-55 years of mortal labor** (at the typical rates), with extremes ranging from 10 years (poor hunting ground, low spirit stone price) to 460 years (rich hunting ground, high price). The escape is dramatic but not absurd.

---

## 4. The world is named

The critics found that no place beyond Wang Family Bend has a name. This is 15 sentences and it transforms the world from a sketch to a place.

### 4.1 The empire

The empire is the **Great Yan Dynasty** (大燕朝, Dà Yàn Cháo), founded 247 years ago. The reigning emperor is **Yan Sizong** (燕嗣宗), the 14th emperor, in the 14th year of the **Jianhe reign** (建和十四年). The dynasty is in middle decline: the bureaucracy is bloated, the military is stretched, the court is divided between the eunuch faction (led by the Grand Eunuch Wei Zhongxian) and the literati faction (led by Chief Grand Secretary Li Tingyun). The emperor is aging and has no designated heir; the succession crisis is the empire's open secret.

### 4.2 The region

The Cangli Riverlands are in **Qingzhou Prefecture** (青州府), **Jiangnan Province** (江南省). The prefectural seat is 300 li north. The provincial capital is 800 li north. The Cangli River (沧篱江) flows east into the **Eastern Sea** (東海). The low mountains backing the plain are the **Cangwu Mountains** (蒼梧山脈), part of the southern range.

### 4.3 The named places

| Place | Distance from Wang Family Bend | Description |
|---|---|---|
| **Wang Family Bend** (王 家彎) | 0 | The starting village. 31 households, 180 people. |
| **Li Family Creek** (李家溪) | 4 li east | The next village. Old Chen's hermitage is on the hill above it. |
| **Qinghe Market Town** (清河鎮) | 15 li east | The market town at the river crossing. 1-6 market days. The nearest yamen substation. |
| **Cangli County Seat** (沧篱縣城) | 60 li east | The county magistrate's seat. The salt depot. The nearest court. |
| **Qingzhou Prefectural Seat** (青州府城) | 300 li north | The prefectural capital. The nearest cultivation market. |
| **The Cangwu Sect** (蒼梧派) | 100 li west | The nearest sect. Small sect. Qi Condensation sect master (Wu Changqing, 52). 30 disciples. One minor spirit vein. |
| **The Azure Sword Sect** (碧劍宗) | 500 li north | The nearest great sect. Core Formation sect master (Leng Wushuang, 340). 400 disciples. Three spirit veins, one grotto-heaven. |
| **The Jade Void Holy Land** (玉虛聖地) | Another continent | The nearest holy land. Nascent Soul patriarch (Daoist Jade Void, 2,100). 3,000 disciples. Peak grotto-heaven. |
| **The Cangwu Mountains** (蒼梧山脈) | 20 li south | The low mountains backing the plain. Charcoal burners, spirit herbs (sparse), low-tier beasts. Old Chen's hermitage is on the northern foothill. |
| **The Eastern Sea** (東海) | 200 li east | Where the Cangli River empties. Coastal salt production, fishing, foreign trade (rare). |

### 4.4 The regional history

- **247 years ago:** The Great Yan Dynasty founded. The Cangli Riverlands were frontier territory; the Wang lineage's founder (Wang Tianzu) settled the bend during the land-reclamation grants of the early dynasty.
- **180 years ago:** The Azure Sword Sect was founded in the Cangwu Mountains by a Core Formation cultivator who crossed the region and found a spirit vein. The sect grew slowly; it is now a great sect.
- **95 years ago:** The last demonic cultivator incursion in the region. A 魔修 (demonic cultivator) named Zhou Wugui killed three villages in the Cangwu foothills, harvesting their anchors to fuel a breakthrough attempt. The Azure Sword Sect's previous sect master pursued and killed him. The event is still spoken of in the market town.
- **40 years ago:** The great flood. The Cangli River broke its levee at Wang Family Bend. The village attributes it to the river god's anger at a broken oath (a Wang elder had sworn to maintain the river-god shrine and had let it decay). The shrine was rebuilt; the levee was reinforced.
- **11 years ago:** The last levee failure. A lesser flood. No deaths, but the autumn harvest was lost. The lineage borrowed grain at 80% interest and spent three years recovering.
- **6 years ago:** Wang Tianlu (the player's grandfather) died of schistosomiasis. His tablet is in the lineage hall.
- **2 years ago:** The player's younger sibling (Wang Xiaodi, age 7) died of fever. The player was studying with Old Chen and did not return in time. This is the grief that will surface in the failed breakthrough (doc 06 Scene 4).

---

## 5. What this document enables

Every contradiction is resolved. Every deferred decision is committed. The economy is fixed. The world is named. The history is placed. The remaining documents — Folk Religion Metaphysics, Narrative Spine, Cultivation Systems, The Village In Medias Res, Cultivation Primary Sources — can now be written on a clean foundation, with no contradictions to inherit and no forks to defer.

The bible is no longer half a bible. The front half is reconciled; the back half is ready to be built.
