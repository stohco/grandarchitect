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

## INTAKE (2026-08-12) — measured from the reference
- Head units: ~8.3 HU (slender, elongated build — NOT a 7.5-HU realistic)
- Vertical fractions from the top: eye 0.06, chin 0.12, shoulder 0.18,
  chest/nipple 0.26, waist 0.36, hip 0.44, crotch 0.48, knee 0.72, ankle 0.96
- Widths (fraction of height): head 0.08, SHOULDER 0.22, chest 0.18,
  WAIST 0.12, hip 0.15, thigh 0.08, calf 0.06
- Posture: symmetric, arms hang ~10° OUT from the sides
- Build: lean athletic — defined pecs, ~4-pack abs, toned (not bulky)
  deltoids, lean thighs
- Hair: black, shoulder-length, tied back
- Underwear: WHITE briefs, reaching ~0.15 down the thigh
- Skin: fair/pale, cool — #F5E8D3

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
