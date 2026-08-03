# 19 — Audio & Music Architecture

**Status:** Engineering specification. The `ga:audio` plugin — Web Audio integration, deterministic event scheduling, music, LOD, accessibility, serialization, streaming, and asset format.
**Date:** 2026-08-03

---

## 0. What this document is

The engine's audio layer is a plugin (`ga:audio`) bound by the same determinism contract as every other plugin (doc 17 §3). Audio has three jobs: render the world's acoustic surface (the windlass creak, the river, the bird on the ridge), render music that obeys the solar-term and the player's realm, and surface canonical state to players who cannot hear it. The first two are the "engine"; the third is what makes the engine serve the player instead of the player serving the engine (AGENTS.md Part 3: "Design for joy first").

Audio is **not** part of the canonical state. The waveform coming out of a speaker is a render artifact, like the pixels on screen. What *is* canonical is the set of audio **events** the simulation emits — `windlass.creak` at tick 45230, position (12.4, 0.8, 3.1), velocity 0.2 — because that event is a consequence of the windlass physics body moving, and the windlass physics body is canonical. Two replays with the same seed + same inputs produce the same audio events at the same ticks; whether the user's speakers produce the same pressure waves is the renderer's problem, not the simulation's.

### Precedents cited (AGENTS.md Part 3: "Cite the precedent")

- **Web Audio API** (W3C, browser-native) — the substrate. No third-party audio engine is wrapped; Web Audio is the right tool for a browser-native engine (Ponytail §13: "prefer established libraries").
- **Godot 4 Audio Bus layout** — the layered bus model (Master → SFX/Music/VO → sub-buses). Adopted because the bus graph is the cleanest way to expose volume/mute per-category to the tweak panel.
- **FMOD / Wwise event system** — the concept of a parameterised "audio event" (a sound plus named parameters) rather than a raw sample. Adopted; rejected (see §11) only the tooling integration.
- **Minecraft's deterministic random tick sound** — same block, same position, same seed → same ambient sound. The principle applied to the windlass.
- **THREE.AudioListener / THREE.PositionalAudio** — Three.js's Web Audio wrapper. Used as the bridge between the scene graph and Web Audio's `PannerNode`.

---

## 1. Web Audio API integration

### 1.1 The plugin shape

```typescript
interface AudioPlugin extends Plugin {
  id: 'ga:audio';
  dependencies: ['ga:core', 'ga:determinism', 'ga:renderer', 'ga:assets', 'ga:scene'];
  init(host: PluginHost): void;
}

interface AudioState {
  masterGain: number;       // 0..1, default 0.8
  categoryGains: Record<AudioCategory, number>;
  muted: boolean;
  listenerPose: Pose;       // copied from the camera each frame
  activeVoices: VoiceId[];
  activeEvents: AudioEvent[];  // the in-flight events this tick
  musicState: MusicState;
  lods: Record<string, AudioLod>; // per-source LOD table
}
```

The `AudioContext` is created on first user gesture (browsers require it; we surface a "click to begin" the first time the player loads the engine, then never again). The context is **not** part of `AudioState` — it is renderer-owned, like a `WebGLRenderingContext`, and never serialized.

### 1.2 The bus graph

```
                              ┌── masterGain ──► destination
                              │
   SFX bus ──────────────────►│
   Music bus ─────────────────┤
   VO bus (dialogue) ────────►│
   Ambient bed bus ──────────►│
   Qi-perception bus ─────────┤   (only audible when qi-perception active)
   UI bus ───────────────────►│
                              │
   per-source: source → panner → category bus
```

Each bus exposes a `gain` and `mute` to the tweak panel (per doc 11 §1.2: every consequential parameter is real-time tweakable). Categories: `sfx`, `music`, `vo`, `ambient`, `qi`, `ui`. The qi-perception bus is unusual — its gain is multiplied by the qi-perception layer's intensity (per doc 11 §3.2), so sounds routed through it fade in only when the player is actively sensing.

### 1.3 The Three.js bridge

`THREE.AudioListener` is attached to the camera. `THREE.PositionalAudio` wraps a `PannerNode` with `AudioListener`-relative positioning. The audio plugin does **not** create positional audio objects directly — it asks the scene plugin for an entity's world transform, then writes that transform to the `PannerNode`. This keeps a single source of truth (the scene graph) and avoids the divergence where the audio position lags the visual position by a frame.

```typescript
interface VoiceHandle {
  id: VoiceId;
  eventId: AudioEventId;
  sourceNode: AudioBufferSourceNode;
  pannerNode?: PannerNode;     // undefined for non-positional
  gainNode: GainNode;
  categoryBus: AudioCategory;
  startedAtTick: number;
  startedAtCtxTime: number;
}
```

---

## 2. Positional audio

### 2.1 The PannerNode configuration

```typescript
panner.panningModel = 'HRTF';           // binaural, default
panner.distanceModel = 'inverse';       // gain = refDist / (refDist + rolloff*(d-refDist))
panner.refDistance = 1.0;
panner.rolloffFactor = 1.5;
panner.maxDistance = 100.0;
panner.coneInnerAngle = 360;            // omnidirectional by default
panner.coneOuterAngle = 0;
panner.coneOuterGain = 0;
```

`HRTF` is the default for the desktop and mobile target. `equalpower` is a lower-quality fallback only used when the user opts into "low-quality audio" (a checkbox in the audio settings panel; not part of canonical state, never serialized into a save).

### 2.2 Velocity for Doppler

```typescript
panner.positionX.value = transform.position[0];
panner.positionY.value = transform.position[1];
panner.positionZ.value = transform.position[2];

// Doppler is opt-in per source; off by default
if (source.dopplerOn) {
  panner.velocityX.value = body.linearVelocity[0];
  panner.velocityY.value = body.linearVelocity[1];
  panner.velocityZ.value = body.linearVelocity[2];
  listener.velocityX.value = listenerBody?.linearVelocity[0] ?? 0;
  // ...
}
```

Doppler is off by default because for cultivators moving at 50–120 m/s (doc 32 §1.2), unattenuated Doppler turns every footstep into a sonic boom. Per-source opt-in is the simplest implementation that fully meets the requirement (Ponytail §2); a global rule would require a per-realm Doppler scale, which is speculative.

### 2.3 The spatialisation failure case

**Failure case (positional):** A panner node whose source entity has been destroyed by the time the buffer finishes loading. The plugin holds a `WeakRef` to the entity; on the load callback, if the entity is gone, the voice is cancelled and the buffer is released to the cache. This prevents the classic "ghost sound from a deleted object" bug. Rejected alternative: hold a strong reference — leaks memory for the entire session.

---

## 3. Deterministic audio events

### 3.1 What an audio event is

An `AudioEvent` is a *canonical* simulation emission, not a rendered sound. The simulation emits events; the audio plugin renders them.

```typescript
interface AudioEvent {
  id: AudioEventId;              // monotonic, hashable
  tick: number;                  // the tick at which the event fires
  sourceEntityId: number;        // canonical
  sourceTransform: Transform;    // canonical (copied at emit time)
  sourceVelocity: Vec3;          // canonical
  eventId: string;               // e.g. 'windlass.creak', 'footstep.gravel', 'qi.route.fire'
  params: Record<string, number | string>;  // deterministic-typed
  category: AudioCategory;
  priority: AudioPriority;       // DROP_FIRST | DROP_LAST | NEVER_DROP
  lod: AudioLodSpec;             // distance + tier thresholds
}
```

The `params` are restricted to `number | string` because the audio event is part of the determinism contract: it must be CBOR-serializable and SHA-256-hashable (doc 17 §3). Nested objects would force a stricter schema; we do not need them.

### 3.2 The windlass example

At tick 45230 the windlass physics body rotates past a sticky gear tooth. The physics plugin emits:

```typescript
{
  tick: 45230,
  sourceEntityId: 7821,
  sourceTransform: { position: [12.4, 0.8, 3.1], rotation: [...] },
  sourceVelocity: [0, 0, 0],
  eventId: 'mechanism.windlass.creak',
  params: { load_kg: 80, humidity: 0.62, age_years: 14 },
  category: 'sfx',
  priority: 'NEVER_DROP',
  lod: { s4Dist: 30, s2Dist: 80, s0Dist: 200 }
}
```

The audio plugin reads the params, picks a sample (or generates a procedural one — §3.4), and plays it. The same seed + same inputs → same windlass rotation at tick 45230 → same event → same sound. Two players in two browsers hear the creak at the same moment of game-time.

### 3.3 The event log

Audio events are recorded in the **input log** (doc 24 §1.5) only when they are caused by the *player* (e.g., the player activates qi perception, the player strikes the windlass, the player triggers a verbal incantation). Simulation-emitted ambient events (windlass turning on its own because an NPC is drawing water) are **not** in the input log — they are derivable from the simulation state at that tick, so including them would duplicate state.

The SaveFile (doc 24 §1.5) does **not** carry an audio-event log. The audio event stream is regenerated on load by replaying the simulation up to the save tick. This is the simplest implementation that meets the determinism contract (Ponytail §2).

```typescript
interface InputLogAudioEntry {
  tick: number;
  kind: 'audio.invoke';           // player-initiated
  eventId: string;                // 'qi.perception.activate' etc.
  params: Record<string, number | string>;
}
```

### 3.4 Procedural vs sampled

Two kinds of audio event:

- **Sampled** — a recorded `.opus` clip chosen by `eventId` + `params`. The windlass creak is sampled: three variants exist; the choice is `det_rng() % 3` seeded by `eventHash`. Deterministic.
- **Procedural** — synthesised at emit time using `det_*` functions. Used for qi-resonance tones (a fire-routed qi-perception tone has frequency `220 * (1 + reservoirFraction)` Hz, gated by `det_sin`-shaped envelope). Procedural is the only option when the parametric space is too large to sample (qi has 5 phases × 4 routings × 5 intensities × continuous reservoir).

Procedural audio obeys the determinism contract: it calls `det_sin`/`det_exp` from `ga:determinism`, never `Math.sin`/`Math.exp`. Web Audio's `OscillatorNode` is allowed for the carrier (it's a renderer primitive) but the **modulation** envelope must be computed by `det_*` and written to the `AudioParam` via `setValueCurveAtTime` — never via `linearRampToValueAtTime` with a non-deterministic `AudioContext.currentTime`. (The envelope shape is deterministic; the schedule is not. We compute the schedule relative to a deterministic `tick`-derived start time, not `currentTime`.)

### 3.5 The determinism failure case

**Failure case (determinism):** A procedural qi-resonance tone uses `OscillatorNode.frequency.setValueAtTime(220, ctx.currentTime)`. `ctx.currentTime` advances differently across browsers, so the tone is non-deterministic. The fix: capture the tick when the event was emitted, derive `ctxTimeOffset = (tick - currentTick) / 60 + ctx.currentTime`, and schedule against that. The shape is deterministic; the wall-clock scheduling is browser-relative but the *ordering* and *parametric shape* are identical across browsers. Rejected alternative: forbid `OscillatorNode` and synthesise everything in a `ScriptProcessor` or `AudioWorklet` — too expensive and too brittle.

---

## 4. The music system

### 4.1 What music is, in this engine

Music is a layered ambient score keyed to (a) the solar term, (b) the player's current realm, (c) the current dramatic register (calm/tension/combat/awe), and (d) the current stratum (Mortal/Acquired/Precelestial). Each layer is a looping stem; the music bus mixes the active layers with crossfades controlled by `det_*` curves.

### 4.2 The music state

```typescript
interface MusicState {
  currentTerm: SolarTerm;            // 24 terms
  currentRealm: Realm;               // mortal..mahayana
  currentStratum: Stratum;           // mortal | acquired | precelestial
  register: MusicRegister;           // calm | tension | combat | awe | grief
  registerIntensity: number;         // 0..1
  activeStems: StemId[];
  stemGains: Record<StemId, number>;
  transition: MusicTransition | null;
}

interface MusicTransition {
  fromStem: StemId;
  toStem: StemId;
  startedAtTick: number;
  durationTicks: number;             // 240 ticks = 4 seconds at 60Hz
  curve: 'linear' | 'ease_in_out';  // resolved via det_*
}
```

### 4.3 Music is not canonical

The music playing at tick T is a function of `(solarTerm(T), playerRealm(T), stratum(T), register(T))` — all canonical inputs. Therefore music is **derived** and **not in the input log**. A save at tick T will play the same music when loaded because the canonical inputs are the same. This is the simplest design that meets the determinism contract: derive, do not store (Ponytail §2).

### 4.4 The stem library

Stems are `.opus` files at 48 kHz mono, looped seamlessly, average length 30–60 s. The library is organised by `(term, realm, register)`:

```
music/
  mortal/
    spring/term_01_lichun/
      calm/opus/mortal_lichun_calm.opus
      tension/...
      combat/...
    ...
  qi_condensation/
    spring/...
  ...
  precelestial/
    awe/opus/prec_awe_01.opus
```

Each stem carries a manifest entry: `{ bpm, key, loopStart, loopEnd, density, phase }`. Density controls how many stems layer simultaneously (calm = 1–2, combat = 3–4, awe = 2–3 with sub-bass). Phase is the qi-phase affinity (used only when the player is in qi-perception mode — a wood-phase stem gets +6 dB on the qi-perception bus).

### 4.5 The music failure case

**Failure case (music):** The dramatic register flips back and forth because the player is on the edge of an enemy's perception radius. Anti-hysteresis: the register changes only when `registerIntensity` crosses 0.7 going up or 0.3 going down, with a minimum 4-second hold. Rejected alternative: a state machine with explicit transitions per pair — combinatorial explosion (5 registers × 5 registers = 25 transitions per realm per term).

---

## 5. Audio LOD

### 5.1 The two axes

Audio LOD has two independent axes: **distance** (how far the source is from the listener) and **simulation tier** (S0–S4, per doc 25). Distance controls rendering quality (sample rate, voice count, HRTF vs equalpower). Simulation tier controls whether the audio event is emitted at all.

### 5.2 Distance LOD

```typescript
interface AudioLodSpec {
  s4Dist: number;   // within this: full quality, HRTF, all voices
  s2Dist: number;   // within this: medium, equalpower, capped at 8 voices per category
  s0Dist: number;   // beyond this: silent
}

function resolveLod(event: AudioEvent, listenerPos: Vec3): 's4' | 's2' | 's0' {
  const d = det_distance(event.sourceTransform.position, listenerPos);
  if (d <= event.lod.s4Dist) return 's4';
  if (d <= event.lod.s2Dist) return 's2';
  if (d <= event.lod.s0Dist) return 's0';
  return 'silent';
}
```

Beyond `s0Dist`, the event is **dropped before voice allocation**. The dropped event is still in the canonical event log (it would have played, given a closer listener), which is important for the deaf-player visual equivalents (§6) — the visual cue fires regardless of audio LOD.

### 5.3 Simulation-tier LOD

This is specified in doc 25 §3 and summarised here:

- **S4 entities** emit audio events every tick they do something audible.
- **S3 entities** emit at reduced frequency (e.g., footsteps every other step).
- **S2 entities** emit only category-level ambient (one "crowd murmur" voice for 200 NPCs, not 200 individual voices).
- **S1 / S0 entities** emit no audio events at all.

The audio plugin does not decide tier; the relevance layer (doc 25 §6) does. The audio plugin only consumes the tier tag attached to each event.

### 5.4 Voice cap

A hard cap of **64 simultaneous voices** per listener (a number calibrated against mid-range mobile Web Audio performance — cited from Chrome's published `AudioContext` budget guidance, ~128 voices safe on desktop, ~64 on mobile). The cap is enforced by priority:

1. `NEVER_DROP` events always play.
2. `DROP_LAST` events are queued; if the queue overflows, the most recent queued event is dropped.
3. `DROP_FIRST` events play if there is room; otherwise dropped at voice-allocation time.

The voice cap is not canonical; it is a renderer budget. Two browsers with different caps will still emit the same canonical events.

---

## 6. Audio cues for deaf players — visual equivalents

### 6.1 The principle

The engine's canonical state is what the player needs to know. Audio is *one* rendering of that state. If the player cannot hear audio, they must still receive the canonical state through another sense. This is not an accessibility "feature" — it is a contract: **every canonical audio event has a visual equivalent that fires at the same tick, with the same semantic content** (AGENTS.md Part 3: "Build the engine, not just the brake").

### 6.2 The visual-equivalent registry

```typescript
interface VisualEquivalent {
  eventId: string;                          // 'mechanism.windlass.creak'
  mode: 'icon' | 'particle' | 'shader' | 'caption';
  intensity: (params: Record<string, number | string>) => number;
  duration: (params) => number;             // in ticks
}

const VISUAL_EQUIVALENTS: Record<string, VisualEquivalent> = {
  'mechanism.windlass.creak': {
    mode: 'icon',
    intensity: (p) => clamp(p.load_kg / 200, 0.2, 1.0),
    duration: () => 12,
  },
  'qi.route.fire': {
    mode: 'particle',
    intensity: (p) => p.intensity,
    duration: (p) => 30 + p.intensity * 60,
  },
  'combat.strike.heavy': {
    mode: 'shader',                          // screen-edge flash
    intensity: (p) => p.force_j / 5000,
    duration: () => 6,
  },
  'npc.dialogue.start': {
    mode: 'caption',
    intensity: () => 1.0,
    duration: (p) => p.duration_ticks,
  },
};
```

### 6.3 The four modes

- **Icon** — a small diegetic glyph appears at the source's screen position (a windlass icon next to the windlass; a "?" for an off-screen NPC). Fades over `duration` ticks.
- **Particle** — the qi-particle system emits a burst of phase-coloured particles at the source's world position. Used for qi events.
- **Shader** — a full-screen post effect (flash, vignette, chromatic shift). Used for combat strikes and tribulation.
- **Caption** — a subtitle at the bottom of the screen. Used for dialogue and ritual incantations.

### 6.4 The mode is per-event, not per-player

The deaf-player toggle is `audioVisualEquivalents: 'always' | 'never' | 'when-muted'`. When `always`, every visual equivalent fires for every canonical event regardless of whether the audio also plays. When `never`, only events that would normally have a visual (e.g., dialogue captions are always on for everyone) fire. When `when-muted`, they fire only if the master gain is 0.

The toggle is **player preference, not canonical state**. It is stored in player settings, not in the SaveFile's `pluginSlices`. The canonical audio event log is unaffected.

### 6.5 The accessibility failure case

**Failure case (accessibility):** A canonical event has no registered visual equivalent. The audio plugin, in dev mode, throws: `MissingVisualEquivalent: event 'qi.contamination.flare' has no visual equivalent`. This is a contract violation. Every event added to the engine must register a visual equivalent at the same time. Rejected alternative: silently fall back to a generic icon — would hide the gap and let the engine ship with broken accessibility (AGENTS.md Part 3: "Uniform 'every finding repaired' closure is the tell that no real review happened").

---

## 7. Audio streaming

### 7.1 The streaming model

Audio assets are streamed from OPFS (doc 08 §5.3) on demand, decoded into `AudioBuffer`s, and held in an LRU cache. The cache is bounded by **bytes**, not entries: default 64 MB, configurable via tweak panel. The bound is the right tool because a 30-second music stem is ~1 MB and a 0.5-second footstep is ~10 KB — entry-based eviction would either evict music too aggressively or never evict footsteps.

### 7.2 The streaming pipeline

```
1. AudioEvent fires at tick T
2. Audio plugin resolves (eventId, params) → assetHash (deterministic)
3. Check cache: if present, schedule voice at T's ctxTimeOffset
4. If absent:
   a. Issue async fetch from OPFS by assetHash
   b. Decode via AudioContext.decodeAudioData (off-main-thread in modern browsers)
   c. Insert into cache (evicting LRU if over budget)
   d. Schedule voice — but only if the event's lod allows it (the player may have moved on)
5. Voice plays at scheduled ctxTime
```

### 7.3 The streaming failure case

**Failure case (streaming):** The fetch + decode latency (50–300 ms on first play of an uncached asset) means the voice plays late. For one-shot SFX this is audible; for music stems it is acceptable (crossfades are 4 s). The fix:

- **Pre-fetch on prediction.** When the simulation predicts an audio event (e.g., a windlass is rotating toward the creak tick — derivable from angular velocity), the audio plugin starts fetching 30 ticks (500 ms) before the predicted event. Prediction is conservative: a false positive wastes a fetch; a false negative falls back to the late path.
- **Never block the simulation.** A late voice is dropped, not queued. The canonical event log already records that it would have played; the renderer catches up.

Rejected alternative: preload every audio asset at startup. The full stem library is ~500 MB; loading it all would blow the engine's "loads in a browser in under 5 seconds" target (doc 17 §0 differentiator).

### 7.4 AudioWorklet for procedural synthesis

Procedural qi-resonance tones run in an `AudioWorklet` (off-main-thread) so the main thread's 16 ms frame budget is not consumed by sample-rate computation. The worklet is registered at engine startup from a single bundled module `audio-worklet.js`. The worklet receives parameter curves (computed deterministically by `det_*` on the main thread) via `MessagePort`, and renders them to the audio output. The worklet itself contains no canonical-state logic — it is a pure signal processor (Ponytail §4: modular separation).

---

## 8. Audio asset format

### 8.1 The choice

| Format | Container | Codec | Bitrate | Why |
|---|---|---|---|---|
| Sampled SFX | `.opus` | Opus | 48 kbps mono | Best-in-class quality at low bitrate; universal browser support (Chrome, Firefox, Safari 16+, Edge) |
| Music stems | `.opus` | Opus | 96 kbps stereo | Slightly higher bitrate for music; same universal support |
| Voice-over | `.opus` | Opus | 64 kbps mono | Speech-optimised Opus mode |
| Procedural | n/a | n/a | n/a | Synthesised in `AudioWorklet`; no asset |

Rejected alternative: Vorbis (`.ogg`). Opus is strictly better at every bitrate above 32 kbps and is now universally supported. Rejected alternative: AAC (`.m4a`). Higher latency on decode in Chrome; nontrivial royalty history. Rejected alternative: WAV. Uncompressed; 10–50× the asset size for the same perceived quality.

### 8.2 The asset manifest

```typescript
interface AudioAssetManifestEntry {
  assetHash: string;                  // SHA-256 of the .opus file bytes
  eventId: string;                    // 'mechanism.windlass.creak'
  variant: number;                    // 0..N for sampled variants
  durationMs: number;
  sampleRate: number;                 // always 48000
  channels: 1 | 2;
  loopStart?: number;                 // ms, for music stems
  loopEnd?: number;
  params: Record<string, [number, number]>;  // param → [min, max] range this variant covers
}
```

The asset pipeline (doc 11 §5) produces these entries from authored source (WAV masters → Opus transcode → manifest). The manifest is content-addressed: changing one stem changes its hash, which changes the manifest's hash, which the engine fetches on next load.

### 8.3 Variant selection is deterministic

```typescript
function pickVariant(eventId: string, params: Record<string, number | string>, detRng: DetRng): number {
  const eventHash = det_hash_string(eventId + JSON.stringify(params));  // canonical
  return Number(BigInt.asUintN(64, eventHash) % BigInt(numVariants));
}
```

Two players with the same seed pick the same variant. The windlass creak is variant 2 for both. Rejected alternative: pick by `params.load_kg` buckets — would force authored bucket boundaries and break when params drift.

---

## 9. Rejected alternatives

### 9.1 Wrapping FMOD / Wwise

FMOD Studio and Wwise are the AAA industry standard. Rejected because:

1. Both require native binaries; neither has a WASM build that runs in a browser without Emscripten gymnastics.
2. Both have licensing models incompatible with an open-source engine (FMOD's free tier caps at one product, $200k revenue; Wwise is per-title).
3. Their event-authoring tooling is excellent but not necessary — the engine's tweak panel + manifest format covers the same ground with less ceremony (Ponytail §2: simplest implementation that fully meets the requirement).

### 9.2 Storing waveform peaks in the save

A "spectrogram save" — record the master output's peak envelope, replay it on load. Rejected because (a) the envelope is gigabytes per session, (b) it is renderer output, not canonical state, (c) it would conflict with the determinism contract (two different renderers produce different envelopes). The contract is: canonical events regenerate the audio, not the other way around.

### 9.3 A separate "audio seed"

A proposal: audio gets its own seed, decoupled from the world seed, so audio designers can re-roll ambient sounds without re-rolling the world. Rejected because it breaks the single-seed-reconstructs-everything property (doc 07 §1.1). The audio seed is `derivedSeed(worldSeed, 'audio')`, exactly like every other sub-seed in the hierarchy. If audio designers want to re-roll, they re-roll the audio sub-seed — but that re-roll is itself a deterministic derivation, recorded in the canonical state.

---

## 10. Failure cases (consolidated)

1. **Late voice on first play** — mitigated by prediction-based pre-fetch (§7.3).
2. **Ghost sound from deleted entity** — mitigated by `WeakRef` check before scheduling (§2.3).
3. **Non-deterministic procedural tone** — mitigated by `det_*` envelope + tick-relative scheduling (§3.5).
4. **Music register thrash** — mitigated by hysteresis (§4.5).
5. **Missing visual equivalent for a canonical event** — throws in dev mode (§6.5).
6. **Voice cap overflow** — priority-based drop (§5.4); dropped events still recorded in canonical log.
7. **AudioContext suspended (no user gesture)** — UI blocks the simulation start behind a "click to begin" overlay; after the first gesture, the context persists.
8. **Sample-rate mismatch (44.1 kHz vs 48 kHz device)** — the asset pipeline always outputs 48 kHz; `AudioContext.sampleRate` is whatever the device reports; we resample at decode time. The resampler is browser-native and not canonical.

---

## 11. What this document enables

- The audio layer is a plugin (`ga:audio`) bound by the determinism contract.
- Canonical audio events are part of the simulation; rendered audio is renderer output, not state.
- Positional audio uses Web Audio's `PannerNode` with HRTF default; the scene graph is the single source of truth for source positions.
- Music is derived from `(term, realm, stratum, register)` and not stored in the save.
- Audio LOD has two axes (distance and simulation tier); a hard voice cap of 64 is enforced by priority.
- Every canonical audio event has a registered visual equivalent; missing equivalents throw in dev mode.
- Audio assets are Opus, streamed from OPFS on demand, content-addressed by hash.
- Rejected alternatives (FMOD, spectrogram save, separate audio seed) are documented with reasons.

The next step is to implement the `ga:audio` plugin against this spec, starting with the bus graph, the event log, and the windlass creak as the first canonical audio event — the smallest end-to-end thing that proves the contract (AGENTS.md Part 3: "Authorize the smallest end-to-end thing that works").
