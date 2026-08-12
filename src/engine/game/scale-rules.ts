/**
 * game/scale-rules.ts — the poster's HUMAN SCALE law, as code.
 *
 * IMAGE_DIRECTIVES §4 (STRUCTURE RULES, I6/I2) — HUMAN SCALE (binding):
 * doors ≥2.2 m high (I1: doorway 2.40 m), paths ≥2.0 m wide, interior
 * doors 120-150 cm, circulation 120-150 cm, ceiling 3.0-4.5 m; stairs
 * rise 0.16-0.18 m, run 0.26-0.32 m, width ≥1.5 m; all modules on a
 * 0.5 m / 1 m snap grid. Conformance pins these (village-conformance
 * asserts the square, the cart road and the house door against this).
 */
export const SCALE_RULES = {
  /** Doors ≥2.2 m high (poster I6). */
  doorMinHeight: 2.2,
  /** Doorway full height 2.40 m (poster I1). */
  doorwayFullHeight: 2.4,
  /** Paths ≥2.0 m wide. */
  pathMinWidth: 2.0,
  /** Stair rise 0.16-0.18 m. */
  stairRise: [0.16, 0.18],
  /** Stair run 0.26-0.32 m. */
  stairRun: [0.26, 0.32],
  /** Stair width ≥1.5 m. */
  stairMinWidth: 1.5,
  /** Module snap grid 0.5 m / 1 m. */
  snapGrid: 0.5,
  /** Interior doors 120-150 cm. */
  interiorDoorWidth: [1.2, 1.5],
  /** Ceilings 3.0-4.5 m. */
  ceilingHeight: [3.0, 4.5],
  /** Interior door height (the same 2.2 m envelope). */
  doorInteriorHeight: 2.2,
};
