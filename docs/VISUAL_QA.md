# VISUAL QA — the evidence-pinned examiner protocol (the "smarter VLM")
#
# Status: authoritative method (2026-08-12). Replaces the free-form
# vision review in ASSET_PIPELINE GATE 2/4.

## The law
The vision model does NOT describe scenes. It VERIFIES claims. Every
claim it is asked to verify must already be supported by a probe —
a number, an overlay, or a projection — captured by
evidence/visual-examiner.cjs. The probes are the evidence of record;
the vision model is a second reader of the same frames, never the
primary judge.

## The loop (per asset)
1. `node evidence/visual-examiner.cjs gym evidence/qa/<asset>` — captures
   the canonical frames, draws the croquis overlays, computes pixel
   stats, writes evidence/qa/<asset>/manifest.json.
2. The orchestrator writes QUESTIONS.md into the same folder — one
   question per claim, each with: the claim, the expected value from the
   manifest, and the frame to look at. No open-ended questions.
3. The vision agent (subagent type `vision`) reads manifest.json +
   QUESTIONS.md, inspects ONLY the named frames, and answers each claim
   VERIFIED / NOT-VERIFIED with a one-line reason. `vision-lite` may be
   used for single-frame spot checks (large free quota).
4. Verdicts are appended to manifest.json. A NOT-VERIFIED claim opens an
   iteration item on the asset in its gym — not an argument with the
   vision model.

## Question forms (templates)
- "Does the <landmark> dash at y≈<n>px land on the <anatomy>?" (expected
  y from the manifest landmarks)
- "Is the <feature> visible in frame X? The probe counts <n> <color> px
  in the region — confirm the region shows <feature>." (pixel counts)
- "Is the silhouette width/height ≈ <ratio>? (measured <ratio>.)"
- "Is <directive> satisfied? (<IMAGE_DIRECTIVES section>.)"

## Known limits
- At 1280x720 with stylized low-poly assets, features under ~8 px are
  unverifiable by the model — such claims get probe-only evidence and a
  `PROBE-ONLY` verdict instead.
- The model cannot be trusted on counts ("how many") or colors by name;
  it can be trusted on presence/absence and position-relative-to-marker
  when a marker is drawn.
- Never ask it to judge beauty or style compliance in one shot; ask for
  the specific directive checks instead.

## History (why this exists)
Three consecutive open-ended reviews misread shipped work: claimed the
sacred pine and the shrine were "missing" (probes: loaded, grounded,
law-clean), claimed a character was "featureless" while 51k feature
pixels rendered, and missed bright croquis dashes entirely. The probes
were right every time. This protocol demotes the model to verifier of
what the probes already know.
