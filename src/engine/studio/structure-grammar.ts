/**
 * Structure Grammar — Procedural Architectural System
 * ====================================================
 *
 * Instead of manually building every structure, the Live Studio generates
 * structures from grammar rules. GLM can safely alter the number of bays,
 * roof family, foundation height, or destruction state without manually
 * rebuilding the entire mesh.
 *
 * Example:
 *   asset_id: STR_CLOUD_SECT_MAIN_HALL_A01
 *   grammar: XIANXIA_SECT_HALL_V1
 *   footprint:
 *     bays_x: 7
 *     bays_z: 5
 *     bay_size_m: 6
 *   roof:
 *     family: double_eave_hip
 *     pitch_deg: 31
 *     overhang_m: 1.6
 *     corner_lift_m: 0.7
 *   structure:
 *     column_family: lacquered_timber_heavy
 *     beam_family: cloud_bracket_grand
 */

import type { MeshKernel } from './mesh-kernel';
import { createMeshKernel, addVertex, addFace, addRegion } from './mesh-kernel';
import { extrudeFaces } from './mesh-operations';

// ---------------------------------------------------------------------------
// Structure Grammar Types
// ---------------------------------------------------------------------------

export type StructureGrammarType =
  | 'XIANXIA_COTTAGE_V1'
  | 'XIANXIA_TOWNHOUSE_V1'
  | 'XIANXIA_TEHOUSE_INN_V1'
  | 'XIANXIA_SECT_GATE_V1'
  | 'XIANXIA_SECT_HALL_V1'
  | 'XIANXIA_PAVILION_V1'
  | 'XIANXIA_PAGODA_V1'
  | 'XIANXIA_CLIFF_ABODE_V1'
  | 'XIANXIA_IMMORTAL_PALACE_V1';

export type RoofFamily =
  | 'flat' | 'single_eave_gable' | 'single_eave_hip'
  | 'double_eave_hip' | 'sweeping_eave' | 'pavilion_roof'
  | 'pagoda_tier';

export type ColumnFamily =
  | 'timber_simple' | 'timber_lacquered' | 'lacquered_timber_heavy'
  | 'stone_round' | 'stone_octagonal' | 'jade_pillar';

export type BeamFamily =
  | 'simple_beam' | 'bracket_simple' | 'cloud_bracket'
  | 'cloud_bracket_grand' | 'dragon_bracket';

export interface StructureGrammarParams {
  assetId: string;
  grammar: StructureGrammarType;

  footprint: {
    baysX: number;
    baysZ: number;
    baySizeM: number;
  };

  foundation: {
    heightM: number;
    terrainConform: boolean;
  };

  walls: {
    heightM: number;
    thicknessM: number;
    material: string;
  };

  roof: {
    family: RoofFamily;
    pitchDeg: number;
    overhangM: number;
    cornerLiftM: number;
    material: string;
  };

  structure: {
    columnFamily: ColumnFamily;
    beamFamily: BeamFamily;
    columnRadiusM: number;
  };

  damageState: 'clean' | 'aged' | 'damaged' | 'collapsed' | 'repairing';
}

// ---------------------------------------------------------------------------
// Structure Generator
// ---------------------------------------------------------------------------

export function generateStructure(params: StructureGrammarParams): MeshKernel {
  const kernel = createMeshKernel(params.assetId, `Structure: ${params.grammar}`);
  const { footprint, foundation, walls, roof, structure } = params;

  const totalWidth = footprint.baysX * footprint.baySizeM;
  const totalDepth = footprint.baysZ * footprint.baySizeM;
  const halfW = totalWidth / 2;
  const halfD = totalDepth / 2;

  // --- Foundation ---
  const foundationVerts = [
    addVertex(kernel, [-halfW, 0, -halfD]),
    addVertex(kernel, [halfW, 0, -halfD]),
    addVertex(kernel, [halfW, foundation.heightM, -halfD]),
    addVertex(kernel, [-halfW, foundation.heightM, -halfD]),
    addVertex(kernel, [-halfW, 0, halfD]),
    addVertex(kernel, [halfW, 0, halfD]),
    addVertex(kernel, [halfW, foundation.heightM, halfD]),
    addVertex(kernel, [-halfW, foundation.heightM, halfD]),
  ];
  const foundationFaces: number[] = [];
  foundationFaces.push(addFace(kernel, [foundationVerts[0], foundationVerts[1], foundationVerts[2], foundationVerts[3]]));
  foundationFaces.push(addFace(kernel, [foundationVerts[5], foundationVerts[4], foundationVerts[7], foundationVerts[6]]));
  foundationFaces.push(addFace(kernel, [foundationVerts[4], foundationVerts[0], foundationVerts[3], foundationVerts[7]]));
  foundationFaces.push(addFace(kernel, [foundationVerts[1], foundationVerts[5], foundationVerts[6], foundationVerts[2]]));
  foundationFaces.push(addFace(kernel, [foundationVerts[3], foundationVerts[2], foundationVerts[6], foundationVerts[7]]));
  foundationFaces.push(addFace(kernel, [foundationVerts[4], foundationVerts[5], foundationVerts[1], foundationVerts[0]]));

  addRegion(kernel, 'foundation', 'Foundation', foundationVerts);

  // --- Floor ---
  const floorY = foundation.heightM;
  const floorVerts = [
    addVertex(kernel, [-halfW + 0.1, floorY, -halfD + 0.1]),
    addVertex(kernel, [halfW - 0.1, floorY, -halfD + 0.1]),
    addVertex(kernel, [halfW - 0.1, floorY, halfD - 0.1]),
    addVertex(kernel, [-halfW + 0.1, floorY, halfD - 0.1]),
  ];
  addFace(kernel, floorVerts);
  addRegion(kernel, 'floor', 'Floor', floorVerts);

  // --- Columns ---
  const columnHeight = walls.heightM;
  const columnRadius = structure.columnRadiusM;
  const columnTopY = floorY + columnHeight;

  for (let bx = 0; bx <= footprint.baysX; bx++) {
    for (let bz = 0; bz <= footprint.baysZ; bz++) {
      const cx = -halfW + bx * footprint.baySizeM;
      const cz = -halfD + bz * footprint.baySizeM;

      // Simplified column: 4-sided box
      const colVerts = [
        addVertex(kernel, [cx - columnRadius, floorY, cz - columnRadius]),
        addVertex(kernel, [cx + columnRadius, floorY, cz - columnRadius]),
        addVertex(kernel, [cx + columnRadius, columnTopY, cz - columnRadius]),
        addVertex(kernel, [cx - columnRadius, columnTopY, cz - columnRadius]),
        addVertex(kernel, [cx - columnRadius, floorY, cz + columnRadius]),
        addVertex(kernel, [cx + columnRadius, floorY, cz + columnRadius]),
        addVertex(kernel, [cx + columnRadius, columnTopY, cz + columnRadius]),
        addVertex(kernel, [cx - columnRadius, columnTopY, cz + columnRadius]),
      ];
      // Column faces (4 sides + top + bottom)
      addFace(kernel, [colVerts[0], colVerts[1], colVerts[2], colVerts[3]]);
      addFace(kernel, [colVerts[5], colVerts[4], colVerts[7], colVerts[6]]);
      addFace(kernel, [colVerts[4], colVerts[0], colVerts[3], colVerts[7]]);
      addFace(kernel, [colVerts[1], colVerts[5], colVerts[6], colVerts[2]]);
      addFace(kernel, [colVerts[3], colVerts[2], colVerts[6], colVerts[7]]);
    }
  }

  // --- Walls (between columns) ---
  const wallThickness = walls.thicknessM;
  const wallY = floorY;
  const wallTopY = floorY + columnHeight;

  // Front wall (z = -halfD)
  const frontWallVerts = [
    addVertex(kernel, [-halfW + columnRadius, wallY, -halfD - wallThickness / 2]),
    addVertex(kernel, [halfW - columnRadius, wallY, -halfD - wallThickness / 2]),
    addVertex(kernel, [halfW - columnRadius, wallTopY, -halfD - wallThickness / 2]),
    addVertex(kernel, [-halfW + columnRadius, wallTopY, -halfD - wallThickness / 2]),
  ];
  addFace(kernel, frontWallVerts);

  // Back wall (z = halfD)
  const backWallVerts = [
    addVertex(kernel, [-halfW + columnRadius, wallY, halfD + wallThickness / 2]),
    addVertex(kernel, [halfW - columnRadius, wallY, halfD + wallThickness / 2]),
    addVertex(kernel, [halfW - columnRadius, wallTopY, halfD + wallThickness / 2]),
    addVertex(kernel, [-halfW + columnRadius, wallTopY, halfD + wallThickness / 2]),
  ];
  addFace(kernel, backWallVerts);

  // Left wall (x = -halfW)
  const leftWallVerts = [
    addVertex(kernel, [-halfW - wallThickness / 2, wallY, -halfD + columnRadius]),
    addVertex(kernel, [-halfW - wallThickness / 2, wallY, halfD - columnRadius]),
    addVertex(kernel, [-halfW - wallThickness / 2, wallTopY, halfD - columnRadius]),
    addVertex(kernel, [-halfW - wallThickness / 2, wallTopY, -halfD + columnRadius]),
  ];
  addFace(kernel, leftWallVerts);

  // Right wall (x = halfW)
  const rightWallVerts = [
    addVertex(kernel, [halfW + wallThickness / 2, wallY, -halfD + columnRadius]),
    addVertex(kernel, [halfW + wallThickness / 2, wallY, halfD - columnRadius]),
    addVertex(kernel, [halfW + wallThickness / 2, wallTopY, halfD - columnRadius]),
    addVertex(kernel, [halfW + wallThickness / 2, wallTopY, -halfD + columnRadius]),
  ];
  addFace(kernel, rightWallVerts);

  // --- Roof ---
  const roofY = wallTopY;
  const pitchRad = (roof.pitchDeg * Math.PI) / 180;
  const roofHeight = (totalWidth / 2) * Math.tan(pitchRad);
  const overhang = roof.overhangM;
  const cornerLift = roof.cornerLiftM;

  // Roof base (eaves)
  const roofBaseVerts = [
    addVertex(kernel, [-halfW - overhang, roofY, -halfD - overhang]),
    addVertex(kernel, [halfW + overhang, roofY, -halfD - overhang]),
    addVertex(kernel, [halfW + overhang, roofY, halfD + overhang]),
    addVertex(kernel, [-halfW - overhang, roofY, halfD + overhang]),
  ];

  // Ridge (peak)
  const ridgeY = roofY + roofHeight;
  const ridgeHalfLen = halfD + overhang;
  const ridgeVerts = [
    addVertex(kernel, [0, ridgeY, -ridgeHalfLen]),
    addVertex(kernel, [0, ridgeY, ridgeHalfLen]),
  ];

  // Roof slopes (two triangles per side for hip roof)
  // Front slope
  addFace(kernel, [roofBaseVerts[0], roofBaseVerts[1], ridgeVerts[0]]);
  // Back slope
  addFace(kernel, [roofBaseVerts[3], roofBaseVerts[2], ridgeVerts[1]]);
  // Left hip
  addFace(kernel, [roofBaseVerts[0], roofBaseVerts[3], ridgeVerts[1], ridgeVerts[0]]);
  // Right hip
  addFace(kernel, [roofBaseVerts[1], roofBaseVerts[2], ridgeVerts[1], ridgeVerts[0]]);

  addRegion(kernel, 'roof', 'Roof', [...roofBaseVerts, ...ridgeVerts]);

  // --- Damage state ---
  if (params.damageState === 'damaged' || params.damageState === 'collapsed') {
    // Add damage tags
    kernel.tags.push({ tag: 'damage_state', value: params.damageState });

    if (params.damageState === 'collapsed') {
      // Collapse roof vertices downward
      for (const vId of [...roofBaseVerts, ...ridgeVerts]) {
        const v = kernel.vertices.get(vId);
        if (v) {
          v.position[1] *= 0.3; // Collapse to 30% height
        }
      }
    } else if (params.damageState === 'damaged') {
      // Add some damage to roof vertices
      for (const vId of roofBaseVerts) {
        const v = kernel.vertices.get(vId);
        if (v) {
          v.position[1] -= 0.1; // Slight sag
        }
      }
    }
  } else {
    kernel.tags.push({ tag: 'damage_state', value: params.damageState });
  }

  // --- Tags ---
  kernel.tags.push({ tag: 'grammar', value: params.grammar });
  kernel.tags.push({ tag: 'footprint', value: `${footprint.baysX}x${footprint.baysZ} bays @ ${footprint.baySizeM}m` });
  kernel.tags.push({ tag: 'roof_family', value: roof.family });
  kernel.tags.push({ tag: 'column_family', value: structure.columnFamily });
  kernel.tags.push({ tag: 'beam_family', value: structure.beamFamily });

  return kernel;
}

// ---------------------------------------------------------------------------
// Default structure parameters
// ---------------------------------------------------------------------------

export function defaultSectHallParams(assetId: string): StructureGrammarParams {
  return {
    assetId,
    grammar: 'XIANXIA_SECT_HALL_V1',
    footprint: { baysX: 7, baysZ: 5, baySizeM: 6 },
    foundation: { heightM: 1.4, terrainConform: true },
    walls: { heightM: 4, thicknessM: 0.3, material: 'white_plaster' },
    roof: {
      family: 'double_eave_hip',
      pitchDeg: 31,
      overhangM: 1.6,
      cornerLiftM: 0.7,
      material: 'blue_gray_roof_tile',
    },
    structure: {
      columnFamily: 'lacquered_timber_heavy',
      beamFamily: 'cloud_bracket_grand',
      columnRadiusM: 0.35,
    },
    damageState: 'clean',
  };
}

export function defaultCottageParams(assetId: string): StructureGrammarParams {
  return {
    assetId,
    grammar: 'XIANXIA_COTTAGE_V1',
    footprint: { baysX: 3, baysZ: 2, baySizeM: 3 },
    foundation: { heightM: 0.4, terrainConform: true },
    walls: { heightM: 2.7, thicknessM: 0.15, material: 'wattle_daub' },
    roof: {
      family: 'single_eave_gable',
      pitchDeg: 35,
      overhangM: 0.8,
      cornerLiftM: 0,
      material: 'thatch',
    },
    structure: {
      columnFamily: 'timber_simple',
      beamFamily: 'simple_beam',
      columnRadiusM: 0.12,
    },
    damageState: 'clean',
  };
}
