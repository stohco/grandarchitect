# CHARACTER FORGE — the img2threejs-style reconstruction ledger
#
# The method (adopted from github.com/img2threejs/img2threejs): rebuild
# the reference as a CODE-ONLY procedural three.js model, pass-by-pass,
# every pass verified against the reference with evidence. Transparency
# rule: name exactly what changed, with the measured numbers, and what
# still doesn't match. Never claim "done" for "improved".
#
# Canonical reference: the attached character image + evidence/refs/
# ref-base-front-4x.png (the poster's base-body figure, upscaled 4x).

## INTAKE v2 (2026-08-13) — the CANONICAL reference (eeeeeeeeeee.png)
The user provided the actual reference image (228x522, registered as
evidence/refs/character-reference.png, shown in the gym with G).
PIXEL-MEASURED by evidence/measure-reference.cjs:
- figure 509px tall; width bands (of height): hairline 0.10, eye 0.092,
  shoulder 0.289, chest 0.332, waist 0.360, hip 0.375 (widest), crotch
  0.336, knee 0.230, ankle 0.230 (bands below the shoulder include the
  arms hanging at the sides)
- skin median rgb (208,166,131) warm tan; hair (29,21,14) near-black
- vision intake: 7.75 HU, shirtless base body, BLACK fitted boxer-briefs,
  hair pulled into a compact topknot, palms slightly back, lean athletic
  with defined pecs/abs, serious neutral face

## PASS 2 — canonical retune (pixel-measured)
Changed (PASS 1 → PASS 2, from the pixel bands minus the arm mass):
- shoulderWidth 0.40 → 0.47
- chestRadius 0.164 → 0.16
- waistRadius 0.109 → 0.125
- hipRadius 0.136 → 0.15
- thighRadius 0.073 → 0.08
- calfRadius 0.055 → 0.058
- headSize 0.105 → 0.09 (narrow head, per the 0.10 band)
- skin #F5E8D3 (fair — the poster crop misread) → #D0A683 (pixel median)
- briefs WHITE → BLACK fitted (the canonical image)
Still not matching (known): the compact topknot hair mass, the pec/ab
sculpt detail, the palms-back stance.

## PASS 1 — measured parameter retune (the body-factory defaults)
Changed (old → measured):
- shoulderWidth 0.46 → 0.40
- chestRadius 0.185 → 0.164
- waistRadius 0.150 → 0.109  (the reference's dramatic pinch)
- hipRadius 0.172 → 0.136
- thighRadius 0.094 → 0.073
- calfRadius 0.060 → 0.055
- upperArm 0.064 → 0.054 / forearm 0.050 → 0.044
- headSize 0.118 → 0.105 (narrower, longer head: 8.3 HU)
- skin 0xd6a87a (warm tan) → 0xf5e8d3 (fair cool, measured)
- underwear black → WHITE (0xe6e2da), shortened to a brief
- chest mass moved down (nipple line 1.42 → 1.35, per the 0.26 fraction)
- arms rest ~10° out (rig rest-pose rotation.z ±0.15)
Still not matching (known): the exact pec/ab sculpting detail, the tied
hair silhouette, the painted-material softness.

## VERIFICATION (ongoing)
- gauntlet width-profile delta per angle (evidence/gauntlet/round-*)
- croquis landmark alignment (head-units live in the gym)
- rig walk test (arm pivots, head steady, no seam at joints)
