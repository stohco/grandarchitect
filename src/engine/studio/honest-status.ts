/**
 * Honest Maturity Assessment — Live Studio
 * =========================================
 *
 * This file documents the TRUE maturity level of each Live Studio subsystem.
 * It exists to prevent the pattern of claiming "complete" for prototypes.
 *
 * Last updated: 2026-08-06
 * Last verified commit: 870ca34
 */

export const STUDIO_MATURITY = {
  meshKernel: {
    status: 'experimental',
    description: 'Editable mesh representation with half-edge storage. No persistent element IDs, no invariant validation on mutation, no non-manifold handling, no attribute interpolation.',
    whatWorks: ['Basic vertex/face/half-edge storage', 'addVertex/addFace', 'toBufferGeometry conversion'],
    whatDoesNotWork: ['Persistent element IDs after topology changes', 'Non-manifold input handling', 'Attribute interpolation across operations', 'Undoable topology edits with lineage'],
  },
  operationStack: {
    status: 'prototype',
    description: 'Serializable list of operations. Can evaluate primitives and some modifiers. Not a full modifier stack with dependency tracking.',
    whatWorks: ['Operation serialization', 'Basic evaluation pipeline', 'Primitive generation (box, cylinder, sphere)'],
    whatDoesNotWork: ['Operation dependency tracking', 'Partial re-evaluation', 'Operation merging', 'Live preview during edit'],
  },
  meshOperations: {
    status: 'prototype',
    description: 'Simplified topology operations. Extrude works for isolated faces. Bevel is basic edge chamfering. Loop cut creates vertices but does NOT split faces. Solidify creates shell but may produce inverted normals on complex meshes.',
    whatWorks: ['Extrude on isolated faces', 'Solidify on convex meshes', 'Normal generation'],
    whatDoesNotWork: ['Extrude on adjacent faces (creates internal walls)', 'Bevel with multi-edge corners', 'Loop cut (does not split faces or reconnect half-edges)', 'UV propagation during operations', 'Skin weight propagation'],
  },
  uvUnwrap: {
    status: 'projection-mapping',
    description: 'NOT general UV unwrapping. Only does projection mapping (planar, box, cylindrical, spherical). No seam selection, chart parameterization, distortion analysis, or island packing.',
    correctName: 'projectUVs',
  },
  lodGeneration: {
    status: 'experimental',
    description: 'Area-based face deletion. Removes smallest faces first. Will destroy important features (eyes, fingers, blade tips). NOT safe for production use.',
    correctName: 'experimentalAreaDecimation',
  },
  collisionProxy: {
    status: 'experimental',
    description: 'Generates a decimated mesh and tags it as collision. NOT validated collision geometry. No convex hull, convex decomposition, primitive approximation, or compound colliders.',
  },
  structureGrammar: {
    status: 'prototype',
    description: 'Parametric architectural blockout generator. Creates foundation, floor, columns, walls, and roof from grammar parameters. No structural support graph validation, no terrain conforming, no damage state geometry (only vertex displacement for collapsed state).',
  },
  characterAuthoring: {
    status: 'prototype',
    description: 'Procedural mannequin and cylindrical garment-shell generator. NOT anatomical character topology. Height-based region assignment is crude. Garment fitting is a cylinder with clearance, not real garment patterns.',
    whatWorks: ['Body silhouette generation from profile', '22 body-hide zone assignment by height', '8 socket placement', 'Assembly with hide zone detection'],
    whatDoesNotWork: ['Anatomical topology (separate arms, legs, hands, face)', 'Garment patterns with sewing', 'Cloth simulation', 'Pose-aware hide zone testing', 'Skin weight transfer validation'],
  },
  voxelTerrain: {
    status: 'laboratory',
    description: 'Small dense density-field experiment. 32³ voxels max tested. Surface extraction is block-face extraction, NOT Marching Cubes. No sparse bricks, no chunk streaming, no adaptive resolution, no seamless borders, no LOD, no worker execution.',
    correctSurfaceExtractionName: 'block-face extraction',
    notMarchingCubes: true,
  },
  glbExport: {
    status: 'minimal-static-mesh',
    description: 'Minimal GLB writer for positions, normals, UVs, indices. Does NOT export skin weights, joints, inverse bind matrices, skeleton, animations, morph targets, textures, PBR material fields, or extensions.',
  },
  animationStudio: {
    status: 'data-model',
    description: 'Animation data structures and evaluator. Has keyframes, tracks, clips, events, blend trees, state machine, retargeting. NO interactive tooling (no timeline, dope sheet, curve editor, pose controls, viewport manipulation).',
    quaternionWarning: 'Rotation tracks interpolate quaternion components per-axis using linear/smoothstep/bezier. This may produce invalid rotations. Proper SLERP or spline quaternion interpolation is NOT implemented.',
  },
  uvMaterialEditor: {
    status: 'analysis-utilities',
    description: 'UV island analysis, texel density, seam detection, material data model. NOT a material editor. No shader graph, texture painting, channel packing, live preview, or shader compilation.',
    uvIslandWarning: 'Island detection uses UV proximity grouping, NOT topological connectivity. This is incorrect for proper UV island analysis.',
  },
  studioPanel: {
    status: 'api-launcher',
    description: 'Button panel that calls API actions. NOT an interactive modeling environment. No 3D viewport, no selection, no gizmo manipulation, no operation-stack inspector, no undo/redo.',
  },
  runtimeBridge: {
    status: 'prototype',
    description: 'Calls executeCommand to place assets. But conflates GLB asset with world cell. No AssetRevision/EntityInstance/WorldCell separation. invalidateCell() does not compile or activate artifacts.',
    architecturalIssue: 'placeAssetInWorld creates one world cell per asset. Should register AssetRevision, then create EntityInstance inside WorldCell.',
  },
} as const;

/**
 * What the Live Studio actually is:
 *
 * A native procedural and semantic authoring environment UNDER ACTIVE DEVELOPMENT.
 *
 * Not a Blender replacement.
 * Not a complete modeling kernel.
 * Not a production character pipeline.
 * Not a destructible terrain system.
 * Not an animation studio.
 *
 * What it correctly provides:
 * - Structured operation graph (better than raw vertex manipulation for GLM)
 * - Engine-independent mesh representation (MeshKernel is NOT Three.js BufferGeometry)
 * - Procedural generators for structures and character proxies
 * - Density field for terrain experiments
 * - GLB export for static meshes
 * - Animation data model with evaluation
 * - UV/material analysis utilities
 * - API for programmatic asset generation
 *
 * What it does NOT provide (honestly):
 * - Interactive 3D modeling viewport
 * - Production-quality topology operations
 * - General UV unwrapping
 * - Validated collision generation
 * - Marching Cubes surface extraction
 * - Character rigging/animation tooling
 * - Material editing/shader compilation
 * - Asset revision/entity/cell separation
 * - Atomic artifact compilation and activation
 */
