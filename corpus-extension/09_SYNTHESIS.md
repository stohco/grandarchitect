# 09 — Synthesis: The Smallest End-to-End Thing That Works

**Status:** The proposal. Ready to build when the user authorizes.
**Date:** 2026-08-03

---

## 0. What this document is for

The doctrine (AGENTS.md Part 3) says: "Ship the working thing before the perfect thing." and "Authorize the smallest end-to-end thing that works." This document specifies that thing.

It draws on:
- Documents 00-06 (the lore: decisions, substrate, realms, phenomenology, scenes)
- Document 07 (the procedural generation implications)
- Document 08 (the Three.js stack)

It defines the smallest prototype that, if it works, proves the engine. If it does not work, no amount of additional lore or governance will save the project — and that is the most valuable thing the prototype can teach.

---

## 1. The prototype: "One Mortal Morning"

### 1.1 The scope

One mortal morning in Wang Family Bend. The player wakes at dawn (卯時), draws water from the well, carries it to a household, eats breakfast, and performs one piece of labor (sweeping the courtyard or carrying night-soil to a paddy). One NPC (the player's mother, Lady Chen 陳氏) has a schedule, speaks a few lines, and reacts to the player's actions. The morning lasts ~20 minutes of real time. At the end, the player can save, and reloading the save produces a byte-identical world state.

That's it. One verb (carry water), one NPC (the mother), one scene (the household compound at dawn), one failure (spill the bucket), one recovery (refill at the well), one save/load hash check.

### 1.2 What it proves

- **The determinism stack:** RNG, fixed-point, transcendentals, CBOR, hashing, SQLite-WASM — all working together to produce a reproducible world state.
- **The save/load hash parity:** save → exit → reload → hash matches.
- **The rendering stack:** Three.js r185 + TSL + WebGPU/WebGL2 fallback, rendering a small scene at 60fps on the reference hardware.
- **The NPC schedule state machine:** one NPC with a daily schedule, reacting to time and to the player.
- **The verb commitment model:** one verb (carry water) with commitment, failure, and recovery.
- **The cross-modal perception foundation:** the rendering pipeline that will later support qi perception (post-processing, audio, haptics) is in place, even if qi perception itself is not yet activated.

### 1.3 What it does NOT prove (yet)

- Qi perception (that's the second prototype)
- Combat (that's the third)
- The full village (that's the fourth)
- The century-spanning save (that's the fifth)
- The realm ladder beyond Mortal (that's much later)

This is the smallest thing. It proves the engine runs. It does not prove the game is fun — that comes later, when the first awe (Phenomenology §4) is prototyped.

---

## 2. The scene, specified concretely

### 2.1 The setting

The Wang Senior Household (王正房) compound, dawn, early spring (just after Lichun, 立春). The compound:

- **The gate** (門, *mén*): a wooden gate in the south wall of the compound, opening to East Lane. Closed at night; the player opens it to fetch water.
- **The courtyard** (院子, *yuànzi*): compacted earth, ~8m × 6m. A stone trough for washing. A broom leaning against the kitchen wall. The player's younger sibling's toys (a wooden top, a clay ball) in a corner.
- **The main house** (正房, *zhèngfáng*): south-facing, on a low stone foundation. Paper windows (lattice covered with oiled paper). A wooden door. Inside: a kang (炕, heated brick bed), a low table, an ancestor altar with two tablets (the player's grandparents), a chest for clothing, a jar for grain.
- **The kitchen** (廚房, *chúfáng*): a small building east of the main house. A stove (竈, *zào*) with two wok-holes and a flue. A water jar (水缸, *shuǐgāng*), currently half-empty. A pile of firewood. A few bowls, chopsticks, a ladle.
- **The pigsty-latrine** (豬廁, *zhūcè*): a small structure behind the kitchen, east of the courtyard. The pig (one, named 大黑, *Dàhēi*, "Big Black") is sleeping. The latrine is a wooden seat over a pit.
- **The well** (井, *jǐng*): not in the compound — it's the communal well at the junction of East and West Lanes, ~30m south of the gate. The player must leave the compound to fetch water.

### 2.2 The NPC: Lady Chen (陳氏)

The player's mother, 54. She has:

- **A schedule:** wakes before dawn, starts the stove, boils water, cooks breakfast (congee 粥), wakes the household, eats, begins weaving.
- **A relationship to the player:** maternal — concerned, slightly fretful, expecting obedience but not unkind.
- **A few lines of dialogue:**
  - On waking the player: "起來了，去打水。" (Up. Go fetch water.)
  - If the player spills the water: "唉，小心點。" (Sigh. Be careful.)
  - If the player returns successfully: "好，倒進缸裡。吃飯了。" (Good. Pour it in the jar. Time to eat.)
  - If the player dawdles: "水呢？" (Where's the water?)
- **Reactions:** she tracks the player's progress. If the player takes too long, she comes to the gate to look. If the player spills, she sighs but does not scold harshly. If the player succeeds, she nods and serves breakfast.

### 2.3 The verb: carry water (打水, *dǎshuǐ*)

The player leaves the compound, walks to the communal well (30m), draws water with the windlass (轆轤), fills a wooden bucket (木桶, *mùtǒng*), carries it back, and pours it into the kitchen's water jar.

**Mechanics:**
- **Walk:** WASD or arrow keys. The player-character walks at a mortal pace (~1.2 m/s).
- **Draw water:** at the well, press E to grab the windlass handle. Hold to crank. The bucket descends, fills, ascends. Takes ~10 seconds. The player-character's arms fatigue slightly (a stamina cost, rendered as a subtle camera sway).
- **Carry:** the bucket is now in the player's hands. Walking speed is reduced (~0.8 m/s). The bucket has a "spill risk" — if the player turns too fast, runs, or collides with an object, water spills. The spill is rendered (water on the ground, the bucket lighter). A small spill is recoverable (the water jar accepts partial fills); a large spill requires returning to the well.
- **Pour:** at the kitchen, press E to pour the bucket into the water jar. The jar fills. If the jar is full, Lady Chen says "好" and serves breakfast. If the jar is not full (partial spill), the player must fetch again.
- **Failure:** if the player spills the entire bucket (ran, collided hard), the bucket is empty. Lady Chen sighs. The player returns to the well.
- **Recovery:** the well is always available. There is no permanent failure. The morning continues until the water jar is full.

### 2.4 The save/load hash check

At any point, the player can press a key to save. The save:
- Serializes the world state (player position, bucket state, water jar state, Lady Chen's state, the time of day) via CBOR (RFC 8949 deterministic encoding).
- Hashes the bytes via `crypto.subtle.digest('SHA-256')`.
- Stores the bytes + hash in SQLite-WASM (opfs-sahpool VFS).
- Displays the hash to the player (so they can verify).

On reload:
- The save is read from SQLite.
- The bytes are re-hashed.
- The hash is compared to the stored hash. If they match, the load proceeds. If they don't, the load fails with an error (determinism violation detected).
- The world state is deserialized and the simulation resumes from the saved tick.

**The test:** save → exit the browser tab → reopen → load → the world is identical, the hash matches, Lady Chen is where she was, the bucket is where it was, the water jar is as full as it was. This is the proof that the determinism stack works.

---

## 3. The technical implementation, ordered

### 3.1 Phase 0: The determinism infrastructure (weeks 1-4)

Before any game logic, build the foundation:

1. **The deterministic transcendentals module (Gap 1).** A small WASM module exporting `det_sin`, `det_cos`, `det_tan`, `det_atan2`, `det_exp`, `det_log`, `det_pow`, `det_sqrt` using Cody-Waite range reduction + minimax polynomials. Reference: fdlibm/musl. Target ~5KB WASM. Verify bit-identical output across Chrome, Firefox, Safari. **This is the single most critical piece. Without it, nothing else is deterministic.**

2. **The RNG.** xoshiro256** + splitmix64 in TypeScript, inline (~80 lines). Initialized from a 256-bit seed (SHA-256 of a user-provided string or a fixed default). Substreams derived via splitmix64. Test: same seed → same sequence, across browsers.

3. **The fixed-point math.** Q32.32 fixed-point library in TypeScript, ported from FixedMathSharp's design. Vec2, Vec3, Vec4, Mat4, Quat. Test: verify against FixedMathSharp's C# test vectors.

4. **The serialization.** CBOR via cbor-x, configured for deterministic encoding (`useRecords: false`, `mapsAsObjects: false`). Test: same object → same bytes, across browsers.

5. **The hashing.** `crypto.subtle.digest('SHA-256')` for async checkpoints. `@noble/hashes/sha2` for synchronous in-worker hashing. Test: same bytes → same hash.

6. **The save manifest.** A `DeterminismFingerprint` field in every save: `{ rngVersion, transcendentalsVersion, fixedPointVersion, cborVersion, hashAlgorithmVersion }`. A save from fingerprint X loads only in engine fingerprint X (or a documented migration path).

**Exit criterion for Phase 0:** A headless test that runs a simulation of 1000 ticks (each tick: generate a random number, compute a sine, add to a fixed-point accumulator, serialize the state, hash it) and produces the same hash across Chrome, Firefox, and Safari. If this passes, the determinism stack works. If it doesn't, nothing downstream matters.

### 3.2 Phase 1: The storage layer (weeks 3-4, overlapping)

7. **SQLite-WASM with opfs-sahpool VFS.** Set up in a dedicated worker (single writer). Create the schema: `saves(id, tick, hash, bytes, created_at)`, `events(tick, type, payload)`, `entities(id, type, state)`.

8. **OPFS asset cache.** A content-addressable store: `<sha256>.glb`, `<sha256>.ktx2`. Fetch assets over HTTP, hash them, cache in OPFS. On subsequent loads, check OPFS first.

9. **`navigator.storage.persist()`.** Request on first save. Show the user a message: "This game stores save data on your device. Please allow persistent storage so your saves are not lost."

10. **The save/load API.** `save(state) → hash`, `load(hash) → state`, `verify(hash) → boolean`. All via Comlink RPC to the SQLite worker.

**Exit criterion:** Save a 1MB state to SQLite, close the tab, reopen, load. The hash matches. The state is identical.

### 3.3 Phase 2: The worker architecture (weeks 4-5)

11. **Set up self-hosting with COOP+COEP headers.** This is required for SharedArrayBuffer. If using a dev server (Vite, Next.js), configure the headers. For production, self-host (no GitHub Pages).

12. **The sim worker.** Runs the simulation (deterministic, fixed-point, no transcendentals except via the WASM module). Writes renderables to a SharedArrayBuffer.

13. **The render worker.** OffscreenCanvas + Three.js. Reads the SharedArrayBuffer. Renders. No game logic.

14. **The SQLite worker.** Already set up in Phase 1.

15. **Comlink RPC** between main thread and workers for non-hot-path communication (save/load, dialogue, UI).

**Exit criterion:** The sim worker writes a frame to the SAB; the render worker reads it and renders a triangle. The triangle moves deterministically with the seed. No game logic yet, just the pipeline.

### 3.4 Phase 3: The asset pipeline (weeks 5-6)

16. **Build the glTF assets.** The compound's modular pieces: gate, courtyard (terrain), main house, kitchen, pigsty-latrine, well, bucket. Each a simple low-poly model (~1000-5000 tris). The player-character and Lady Chen: simple skinned meshes (~3000 tris each).

17. **Run glTF-Transform at build time.** weld → dedup → quantise → meshopt-compress → KTX2-reencode textures. Emit deterministic `.glb` files.

18. **Ship the meshoptimizer WASM decoder** (~3KB) and KTX2Loader in the runtime.

19. **Pre-bake the BVH** for the courtyard terrain (for click-to-move and collision, even though the prototype is simple).

**Exit criterion:** A `.glb` loads in the browser, renders at 60fps, and its hash is stable across reloads.

### 3.5 Phase 4: The rendering (weeks 6-8)

20. **Set up Three.js r185 via `three/webgpu`** with TSL node materials. Configure auto-fallback to WebGL2.

21. **Render the compound.** The courtyard terrain, the buildings (instanced where possible, hero for the main house), the well, the bucket. Lighting: dawn light (warm, low angle, long shadows). Post-processing: subtle depth-of-field, warm color grade.

22. **Render the player-character and Lady Chen.** Skinned meshes, simple idle/walk/carry animations. The player-character holds the bucket when carrying.

23. **Render the water.** The well (a dark shaft with a glint of water at the bottom), the bucket (water level visible inside), the water jar in the kitchen. Simple shader-based water, not a full fluid sim.

24. **Render the audio.** Dawn birdsong, the creak of the windlass, the splash of water into the bucket, the player's footsteps on compacted earth, Lady Chen's voice. Spatial audio (the windlass is to the south, Lady Chen is in the kitchen).

**Exit criterion:** The compound renders at 60fps on the reference hardware (GTX 1070 / i5-3570K / 8GB, per the research). The scene is recognizable as a Chinese village household at dawn. The atmosphere is warm, quiet, mortal.

### 3.6 Phase 5: The simulation (weeks 8-10)

25. **The player-character controller.** WASD movement at mortal pace. E to interact. The bucket state (empty, partial, full) tracked. The spill risk (turn speed, collision) computed. The carry speed reduction applied.

26. **Lady Chen's state machine.** A simple schedule: wake → start stove → boil water → cook congee → wake player → wait for water → serve breakfast. Reactions: if player takes >5 minutes (in-game), go to gate to look. If player spills, sigh. If player succeeds, nod and serve.

27. **The time-of-day system.** The morning advances from dawn (卯時) to mid-morning (巳時) over ~20 minutes of real time. The sun rises, the light changes, the shadows shorten. The solar term is Lichun (early spring), so the air is cold, the breath visible.

28. **The verb: carry water.** Implemented per §2.3. Walk to well, draw water, carry back, pour into jar. Spill risk. Recovery. Lady Chen's reaction.

**Exit criterion:** The player can play the morning. They wake, fetch water, return, pour it, eat breakfast. Lady Chen reacts. The morning ends. The whole sequence takes ~15-20 minutes. It feels like a morning in a Chinese village — quiet, ordinary, real.

### 3.7 Phase 6: The save/load test (week 10)

29. **The save/load hash check.** Per §2.4. Save at any point. Exit. Reload. The hash matches. The world is identical.

30. **The cross-browser test.** Save in Chrome. Load in Firefox. The hash matches. (This is the test that proves the transcendentals module works. If it fails, the transcendentals have a bug.)

31. **The cross-hardware test.** Save on desktop. Load on a different desktop. The hash matches. (If it doesn't, there's a hardware-dependent nondeterminism — likely in the GPU path, which should not be feeding back into the sim.)

**Exit criterion:** The save/load hash matches across browsers and hardware. The determinism stack is proven.

---

## 4. What success looks like

The prototype runs. The player wakes in the compound, fetches water, returns, eats breakfast. Lady Chen reacts. The morning feels real — quiet, ordinary, mortal. The save/load hash matches across browsers.

If this happens, the engine works. The determinism stack is proven. The rendering stack is proven. The NPC schedule is proven. The verb commitment model is proven. The foundation is laid for the next prototype (qi perception, the first awe).

The prototype should take ~10 weeks for one careful programmer. It can be parallelized: the determinism infrastructure (Phase 0) and the asset pipeline (Phase 3) can proceed in parallel; the worker architecture (Phase 2) and the rendering (Phase 4) can overlap.

---

## 5. What failure looks like

### 5.1 If the determinism stack fails

If the save/load hash does not match across browsers, the transcendentals module has a bug, or the RNG has a 32-bit/64-bit issue, or the CBOR serialization has a key-ordering issue. This is fixable — go back to Phase 0, find the bug, re-verify. The prototype cannot proceed until the hash matches.

### 5.2 If the rendering fails

If the scene does not render at 60fps on the reference hardware, the asset budget is wrong (too many tris, too many draw calls) or the WebGPU backend has a performance bug (use the WebGL2 fallback). This is fixable — reduce the asset budget, optimize the instancing.

### 5.3 If the morning does not feel real

If the player plays the morning and it feels like a tutorial, a chore, or a tech demo — if the quiet does not feel quiet, if the water does not feel heavy, if Lady Chen does not feel like a mother — then the engine works but the experience does not. This is the most important failure mode, and it is the one the prototype is best positioned to detect.

If this happens, the fix is not more lore or more governance. The fix is: adjust the rendering (lighting, audio, animation), adjust the verb timing (how long the windlass takes, how heavy the bucket feels), adjust Lady Chen's reactions (more subtle, more maternal, less robotic). Iterate until the morning feels real. This is experience design, and it is the engine the project has been missing.

### 5.4 If the prototype cannot be built in ~10 weeks

If the scope keeps expanding (more NPCs, more verbs, a larger scene), the prototype will slip, and the project will fall back into the pattern of producing apparatus instead of experience. The doctrine (AGENTS.md Part 1) says: "Grow the system in layers. Start from the smallest version that works end to end." This prototype is the smallest version. Do not expand it. If a feature is not in §2, it does not belong in the prototype.

---

## 6. What comes after

If the prototype succeeds, the next prototypes are:

1. **"The First Perception"** — add the cross-modal qi perception layer (Phenomenology §1). The player perceives qi for the first time, at the well or in the lineage hall. This tests the rendering of the perception mode and the feel of the first awe.

2. **"The First Route"** — add the Qi Condensation station. The player routes qi to their hands for the first time and lifts a stone they could not lift before. This tests the inner geography perception and the routing verb.

3. **"The First Duel"** — add combat (Golden Scene 3). The player fights Zongde on the threshing ground. This tests the combat grammar, the reservoir model, and the social consequences.

4. **"The Village"** — expand to the full village (all 31 households, the lineage hall, the graveyard, the paddies). This tests the NPC generator, the schedule system, and the social simulation.

5. **"The Year"** — expand to a full in-game year, with the solar term calendar, the festival cycle, agriculture, and the life course. This tests the event generator and the long-duration simulation.

6. **"The Century"** — expand to a multi-century save, with aging, lineage succession, and the return-after-absence test. This tests the tiered storage, the compaction, and the century-absence scenario.

Each prototype is the smallest end-to-end thing that proves the next layer. None of them is the full game. The full game is the composition of proven prototypes, not a monolithic build.

---

## 7. The doctrine check

This synthesis obeys the AGENTS.md doctrine:

- **Ponytail §2 (simplest implementation):** The prototype is the smallest end-to-end thing. No speculative features.
- **Ponytail §3 (grow in layers):** The prototype is the first layer. Each subsequent prototype adds one layer.
- **Ponytail §7 (long-term architecture):** The determinism infrastructure is built for the long term. The prototype's scope is small, but the stack is not a stopgap.
- **Ponytail §8 (study established products):** The Three.js research (document 08) grounds every choice in verified repositories.
- **Karpathy §1 (think before coding):** This document is the thinking. The implementation follows.
- **Karpathy §2 (simplicity first):** One verb, one NPC, one scene, one save/load.
- **Karpathy §3 (surgical changes):** The prototype does not modify the existing corpus; it adds a new artifact (the running game).
- **Karpathy §4 (goal-driven execution):** The success criterion is the save/load hash match. The loop is: build → test → fix → re-test until the hash matches.
- **Part 3 §2 (make decisions):** Documents 00-06 made decisions. This document makes the decision to build.
- **Part 3 §3 (authorize the smallest thing):** This is the authorization proposal.
- **Part 3 §7 (design for joy first):** The morning must feel real. That is the joy criterion.
- **Part 3 §13 (ship the working thing):** This is the working thing, specified.

---

## 8. The request

The user said: "don't start coding the game until I say so." This document specifies what "coding the game" means: the prototype described in §2, built in the order in §3, with the success criterion in §4.

When the user says "go," the implementation begins. Not before. But the specification is complete, the stack is researched, the lore is decided, and the engine is designed. The gate can open with zero lag.

The cost of keeping the gate closed is named in AGENTS.md Part 3: "Every round of critique without a decision or a prototype deepens the pattern." This synthesis is the decision and the prototype specification. The remaining step is the user's authorization.
