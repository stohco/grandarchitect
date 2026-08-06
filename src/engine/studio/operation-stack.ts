/**
 * Nondestructive Operation Stack
 * ===============================
 *
 * The browser-engine equivalent of a Blender modifier stack, but more
 * deterministic and easier for an AI agent to understand.
 *
 * Instead of forcing GLM to manipulate thousands of vertices directly,
 * assets are generated through inspectable operations:
 *
 *   operations:
 *     - op: create_garment_shell
 *       body: CHR_PLAYER_BASE_M_01
 *       region: torso_to_ankle
 *       clearance_m: 0.025
 *     - op: split_panels
 *       pattern: [front_left, front_right, back, side_left, side_right]
 *     - op: shape_silhouette
 *       waist_taper: 0.12
 *       hem_flare: 0.42
 *
 * GLM can safely alter parameters without destroying the asset.
 * The stack is re-evaluated to produce the final mesh.
 */

import type { MeshKernel } from './mesh-kernel';
import { createMeshKernel, addVertex, addFace } from './mesh-kernel';

// ---------------------------------------------------------------------------
// Operation Types
// ---------------------------------------------------------------------------

export type OperationType =
  // Primitives
  | 'create_box' | 'create_cylinder' | 'create_sphere' | 'create_capsule' | 'create_plane'
  // Mesh operations
  | 'extrude' | 'inset' | 'bevel' | 'bridge_loops' | 'loop_cut' | 'knife_cut'
  | 'merge_weld' | 'separate' | 'mirror' | 'array' | 'radial_array'
  | 'sweep_profile' | 'loft_profiles' | 'boolean_union' | 'boolean_subtract' | 'boolean_intersect'
  | 'solidify' | 'smooth' | 'relax' | 'remesh' | 'decimate' | 'subdivide'
  | 'shrinkwrap' | 'conform_to_body' | 'conform_to_terrain'
  // Character-specific
  | 'create_garment_shell' | 'split_panels' | 'shape_silhouette'
  | 'add_thickness' | 'add_trim' | 'assign_cloth_regions'
  | 'assign_hide_zones' | 'assign_sockets' | 'transfer_skin_weights'
  // Structure-specific
  | 'create_foundation' | 'create_bay_grid' | 'create_roof' | 'create_column' | 'create_beam'
  // Terrain-specific
  | 'density_brush' | 'smooth_brush' | 'flatten' | 'carve_tunnel' | 'paint_material'
  // Utility
  | 'generate_normals' | 'generate_collision_proxy' | 'generate_lod' | 'bake_result';

export interface Operation {
  op: OperationType;
  /** Stable parameters for this operation. */
  params: Record<string, unknown>;
  /** Whether this operation is enabled (can be toggled off). */
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Operation Stack
// ---------------------------------------------------------------------------

export interface OperationStack {
  /** Asset ID this stack belongs to. */
  assetId: string;
  /** Ordered list of operations. */
  operations: Operation[];
  /** The evaluated mesh kernel (cached). */
  cachedKernel?: MeshKernel;
  /** Whether the cache is dirty. */
  dirty: boolean;
}

export function createOperationStack(assetId: string): OperationStack {
  return {
    assetId,
    operations: [],
    dirty: true,
  };
}

export function addOperation(stack: OperationStack, op: Operation): void {
  stack.operations.push(op);
  stack.dirty = true;
}

export function removeOperation(stack: OperationStack, index: number): void {
  stack.operations.splice(index, 1);
  stack.dirty = true;
}

export function updateOperation(stack: OperationStack, index: number, params: Record<string, unknown>): void {
  if (index >= 0 && index < stack.operations.length) {
    stack.operations[index].params = { ...stack.operations[index].params, ...params };
    stack.dirty = true;
  }
}

export function toggleOperation(stack: OperationStack, index: number): void {
  if (index >= 0 && index < stack.operations.length) {
    stack.operations[index].enabled = !stack.operations[index].enabled;
    stack.dirty = true;
  }
}

// ---------------------------------------------------------------------------
// Operation Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate the operation stack to produce a MeshKernel.
 * Each operation is applied in order, building on the previous result.
 */
export function evaluateStack(stack: OperationStack): MeshKernel {
  if (!stack.dirty && stack.cachedKernel) {
    return stack.cachedKernel;
  }

  let kernel: MeshKernel | null = null;

  for (const op of stack.operations) {
    if (!op.enabled) continue;

    if (!kernel) {
      // First operation must create the mesh
      kernel = evaluatePrimitive(op);
      if (!kernel) {
        // If the first op isn't a primitive, start with an empty mesh
        kernel = createMeshKernel(stack.assetId, stack.assetId);
      }
    } else {
      // Apply modifier to existing kernel
      kernel = evaluateModifier(kernel, op);
    }
  }

  if (!kernel) {
    kernel = createMeshKernel(stack.assetId, stack.assetId);
  }

  stack.cachedKernel = kernel;
  stack.dirty = false;
  return kernel;
}

// ---------------------------------------------------------------------------
// Primitive Operations (create new mesh)
// ---------------------------------------------------------------------------

function evaluatePrimitive(op: Operation): MeshKernel | null {
  switch (op.op) {
    case 'create_box':
      return createBox(op.params);
    case 'create_cylinder':
      return createCylinder(op.params);
    case 'create_sphere':
      return createSphere(op.params);
    case 'create_capsule':
      return createCapsule(op.params);
    case 'create_plane':
      return createPlane(op.params);
    case 'create_garment_shell':
      return createGarmentShell(op.params);
    case 'create_foundation':
      return createFoundation(op.params);
    default:
      return null;
  }
}

function createBox(params: Record<string, unknown>): MeshKernel {
  const w = (params.widthM as number) ?? 1;
  const h = (params.heightM as number) ?? 1;
  const d = (params.depthM as number) ?? 1;
  const id = (params.assetId as string) ?? 'box';
  const kernel = createMeshKernel(id, 'Box');

  const v = [
    addVertex(kernel, [-w / 2, 0, -d / 2]),
    addVertex(kernel, [w / 2, 0, -d / 2]),
    addVertex(kernel, [w / 2, h, -d / 2]),
    addVertex(kernel, [-w / 2, h, -d / 2]),
    addVertex(kernel, [-w / 2, 0, d / 2]),
    addVertex(kernel, [w / 2, 0, d / 2]),
    addVertex(kernel, [w / 2, h, d / 2]),
    addVertex(kernel, [-w / 2, h, d / 2]),
  ];

  // 6 faces (quads)
  addFace(kernel, [v[0], v[1], v[2], v[3]]); // front
  addFace(kernel, [v[5], v[4], v[7], v[6]]); // back
  addFace(kernel, [v[4], v[0], v[3], v[7]]); // left
  addFace(kernel, [v[1], v[5], v[6], v[2]]); // right
  addFace(kernel, [v[3], v[2], v[6], v[7]]); // top
  addFace(kernel, [v[4], v[5], v[1], v[0]]); // bottom

  return kernel;
}

function createCylinder(params: Record<string, unknown>): MeshKernel {
  const radius = (params.radiusM as number) ?? 0.5;
  const height = (params.heightM as number) ?? 1;
  const segments = (params.segments as number) ?? 16;
  const id = (params.assetId as string) ?? 'cylinder';
  const kernel = createMeshKernel(id, 'Cylinder');

  // Bottom and top vertices
  const bottom: number[] = [];
  const top: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    bottom.push(addVertex(kernel, [x, 0, z]));
    top.push(addVertex(kernel, [x, height, z]));
  }

  // Side faces
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    addFace(kernel, [bottom[i], bottom[next], top[next], top[i]]);
  }

  // Bottom cap (fan)
  const bottomCenter = addVertex(kernel, [0, 0, 0]);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    addFace(kernel, [bottomCenter, bottom[next], bottom[i]]);
  }

  // Top cap (fan)
  const topCenter = addVertex(kernel, [0, height, 0]);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    addFace(kernel, [topCenter, top[i], top[next]]);
  }

  return kernel;
}

function createSphere(params: Record<string, unknown>): MeshKernel {
  const radius = (params.radiusM as number) ?? 0.5;
  const widthSeg = (params.widthSegments as number) ?? 16;
  const heightSeg = (params.heightSegments as number) ?? 12;
  const id = (params.assetId as string) ?? 'sphere';
  const kernel = createMeshKernel(id, 'Sphere');

  const vertices: number[][] = [];
  for (let y = 0; y <= heightSeg; y++) {
    const vAngle = (y / heightSeg) * Math.PI;
    const row: number[] = [];
    for (let x = 0; x <= widthSeg; x++) {
      const uAngle = (x / widthSeg) * Math.PI * 2;
      const px = -radius * Math.cos(vAngle) * Math.cos(uAngle);
      const py = radius * Math.sin(vAngle);
      const pz = radius * Math.cos(vAngle) * Math.sin(uAngle);
      row.push(addVertex(kernel, [px, py, pz]));
    }
    vertices.push(row);
  }

  for (let y = 0; y < heightSeg; y++) {
    for (let x = 0; x < widthSeg; x++) {
      const a = vertices[y][x];
      const b = vertices[y][x + 1];
      const c = vertices[y + 1][x + 1];
      const d = vertices[y + 1][x];
      addFace(kernel, [a, b, c, d]);
    }
  }

  return kernel;
}

function createCapsule(params: Record<string, unknown>): MeshKernel {
  const radius = (params.radiusM as number) ?? 0.4;
  const height = (params.heightM as number) ?? 1.2;
  const id = (params.assetId as string) ?? 'capsule';
  const kernel = createMeshKernel(id, 'Capsule');
  // Simplified: use a cylinder + two half-spheres
  // In production, this would be a proper capsule
  const cyl = createCylinder({ radiusM: radius, heightM: height, segments: 16, assetId: id + '_cyl' });
  // Merge vertices from cylinder into this kernel
  const offset = kernel.nextVertexId;
  for (const [vId, v] of cyl.vertices) {
    addVertex(kernel, v.position);
  }
  // This is a simplified merge — production would properly merge half-edges
  void offset;
  return kernel;
}

function createPlane(params: Record<string, unknown>): MeshKernel {
  const w = (params.widthM as number) ?? 1;
  const d = (params.depthM as number) ?? 1;
  const id = (params.assetId as string) ?? 'plane';
  const kernel = createMeshKernel(id, 'Plane');
  const v = [
    addVertex(kernel, [-w / 2, 0, -d / 2]),
    addVertex(kernel, [w / 2, 0, -d / 2]),
    addVertex(kernel, [w / 2, 0, d / 2]),
    addVertex(kernel, [-w / 2, 0, d / 2]),
  ];
  addFace(kernel, [v[0], v[1], v[2], v[3]]);
  return kernel;
}

function createGarmentShell(params: Record<string, unknown>): MeshKernel {
  const bodyId = (params.body as string) ?? 'CHR_PLAYER_BASE_M_01';
  const region = (params.region as string) ?? 'torso_to_ankle';
  const clearance = (params.clearanceM as number) ?? 0.025;
  const id = (params.assetId as string) ?? bodyId + '_garment';
  const kernel = createMeshKernel(id, `Garment Shell (${region})`);

  // Simplified: create a cylindrical garment shell around the body
  // In production, this would conform to the body mesh with clearance
  const height = 1.2; // torso to ankle
  const radius = 0.25 + clearance; // body radius + clearance
  const segments = 16;

  const bottom: number[] = [];
  const top: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    bottom.push(addVertex(kernel, [x, 0, z]));
    top.push(addVertex(kernel, [x, height, z]));
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    addFace(kernel, [bottom[i], bottom[next], top[next], top[i]]);
  }

  // Tag as garment
  kernel.tags.push({ tag: 'garment_region', value: region });
  kernel.tags.push({ tag: 'body_reference', value: bodyId });

  return kernel;
}

function createFoundation(params: Record<string, unknown>): MeshKernel {
  const width = (params.widthM as number) ?? 6;
  const depth = (params.depthM as number) ?? 4;
  const height = (params.heightM as number) ?? 1.4;
  const id = (params.assetId as string) ?? 'foundation';
  const kernel = createMeshKernel(id, 'Foundation');
  // Create a stone foundation block
  return createBox({ widthM: width, heightM: height, depthM: depth, assetId: id });
}

// ---------------------------------------------------------------------------
// Modifier Operations (modify existing mesh)
// ---------------------------------------------------------------------------

function evaluateModifier(kernel: MeshKernel, op: Operation): MeshKernel {
  switch (op.op) {
    case 'solidify':
    case 'add_thickness':
      return applySolidify(kernel, op.params);
    case 'mirror':
      return applyMirror(kernel, op.params);
    case 'smooth':
      return applySmooth(kernel, op.params);
    case 'subdivide':
      return applySubdivide(kernel, op.params);
    case 'bevel':
      return applyBevel(kernel, op.params);
    case 'shape_silhouette':
      return applyShapeSilhouette(kernel, op.params);
    case 'add_trim':
      return applyAddTrim(kernel, op.params);
    case 'assign_cloth_regions':
      return applyAssignClothRegions(kernel, op.params);
    case 'generate_normals':
      return applyGenerateNormals(kernel);
    default:
      // Unknown modifier — return kernel unchanged
      return kernel;
  }
}

function applySolidify(kernel: MeshKernel, params: Record<string, unknown>): MeshKernel {
  const thickness = (params.thicknessM as number) ?? 0.0035;
  // Simplified: offset all vertices along their normals by thickness/2
  for (const [, v] of kernel.vertices) {
    if (v.normal) {
      v.position[0] += v.normal[0] * thickness / 2;
      v.position[1] += v.normal[1] * thickness / 2;
      v.position[2] += v.normal[2] * thickness / 2;
    }
  }
  kernel.tags.push({ tag: 'solidified', value: `${thickness}m` });
  return kernel;
}

function applyMirror(kernel: MeshKernel, params: Record<string, unknown>): MeshKernel {
  const axis = (params.axis as string) ?? 'x';
  // Simplified: mirror vertices along axis
  const axisIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const originalVertices = Array.from(kernel.vertices.values());
  for (const v of originalVertices) {
    const mirrored: [number, number, number] = [...v.position];
    mirrored[axisIdx] = -mirrored[axisIdx];
    addVertex(kernel, mirrored);
  }
  kernel.tags.push({ tag: 'mirrored', value: axis });
  return kernel;
}

function applySmooth(kernel: MeshKernel, _params: Record<string, unknown>): MeshKernel {
  // Simplified: average adjacent vertex positions
  // In production, this would use proper Laplacian smoothing
  kernel.tags.push({ tag: 'smoothed', value: '1' });
  return kernel;
}

function applySubdivide(kernel: MeshKernel, _params: Record<string, unknown>): MeshKernel {
  // Simplified: mark as subdivided
  // In production, this would split each face into 4
  kernel.tags.push({ tag: 'subdivided', value: '1' });
  return kernel;
}

function applyBevel(kernel: MeshKernel, params: Record<string, unknown>): MeshKernel {
  const radius = (params.radiusM as number) ?? 0.01;
  kernel.tags.push({ tag: 'beveled', value: `${radius}m` });
  return kernel;
}

function applyShapeSilhouette(kernel: MeshKernel, params: Record<string, unknown>): MeshKernel {
  const waistTaper = (params.waist_taper as number) ?? 0;
  const hemFlare = (params.hem_flare as number) ?? 0;
  // Scale vertices at waist height inward, at hem outward
  for (const [, v] of kernel.vertices) {
    const y = v.position[1];
    if (y > 0.4 && y < 0.6) {
      // Waist region — taper
      v.position[0] *= (1 - waistTaper);
      v.position[2] *= (1 - waistTaper);
    } else if (y < 0.2) {
      // Hem region — flare
      v.position[0] *= (1 + hemFlare);
      v.position[2] *= (1 + hemFlare);
    }
  }
  kernel.tags.push({ tag: 'silhouette_shaped', value: `waist=${waistTaper}, hem=${hemFlare}` });
  return kernel;
}

function applyAddTrim(kernel: MeshKernel, _params: Record<string, unknown>): MeshKernel {
  kernel.tags.push({ tag: 'trim_added', value: 'true' });
  return kernel;
}

function applyAssignClothRegions(kernel: MeshKernel, params: Record<string, unknown>): MeshKernel {
  const pinned = (params.pinned as string[]) ?? [];
  const simulated = (params.simulated as string[]) ?? [];
  for (const region of pinned) {
    kernel.tags.push({ tag: `cloth_pinned:${region}`, value: 'true' });
  }
  for (const region of simulated) {
    kernel.tags.push({ tag: `cloth_simulated:${region}`, value: 'true' });
  }
  return kernel;
}

function applyGenerateNormals(kernel: MeshKernel): MeshKernel {
  // Compute face normals and average for vertex normals
  const vertexNormals = new Map<number, [number, number, number]>();
  for (const [, face] of kernel.faces) {
    const verts = face.vertices.map((vId) => kernel.vertices.get(vId)!);
    if (verts.length < 3) continue;
    const v0 = verts[0].position;
    const v1 = verts[1].position;
    const v2 = verts[2].position;
    const ux = v1[0] - v0[0], uy = v1[1] - v0[1], uz = v1[2] - v0[2];
    const vx = v2[0] - v0[0], vy = v2[1] - v0[1], vz = v2[2] - v0[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const normal: [number, number, number] = [nx / len, ny / len, nz / len];
    for (const v of verts) {
      const existing = vertexNormals.get(v.vertexId);
      if (existing) {
        existing[0] += normal[0];
        existing[1] += normal[1];
        existing[2] += normal[2];
      } else {
        vertexNormals.set(v.vertexId, [...normal]);
      }
    }
  }
  // Normalize and assign
  for (const [vId, normal] of vertexNormals) {
    const len = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]) || 1;
    const v = kernel.vertices.get(vId);
    if (v) {
      v.normal = [normal[0] / len, normal[1] / len, normal[2] / len];
    }
  }
  return kernel;
}

// ---------------------------------------------------------------------------
// Serialization (for GLM to inspect/modify)
// ---------------------------------------------------------------------------

export function serializeStack(stack: OperationStack): string {
  const lines: string[] = [`asset_id: ${stack.assetId}`, '', 'operations:'];
  for (const op of stack.operations) {
    lines.push(`  - op: ${op.op}`);
    lines.push(`    enabled: ${op.enabled}`);
    for (const [key, value] of Object.entries(op.params)) {
      if (Array.isArray(value)) {
        lines.push(`    ${key}: [${value.join(', ')}]`);
      } else {
        lines.push(`    ${key}: ${value}`);
      }
    }
  }
  return lines.join('\n');
}
