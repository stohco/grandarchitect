/**
 * Mesh Kernel — Engine-Independent Authoring Representation
 * ==========================================================
 *
 * This is NOT Three.js BufferGeometry. Three.js meshes are generated FROM
 * this authoritative model. The Mesh Kernel is the editable authoring layer
 * that supplies Blender-like production capabilities within the Live Studio.
 *
 * The kernel knows about:
 *   - Vertices with positions, normals, tangents
 *   - Half-edge adjacency (for topology queries)
 *   - Faces with material groups
 *   - UV sets (multiple)
 *   - Skin weights (bone influences)
 *   - Morph targets (blend shapes)
 *   - Named regions (body-hide zones, equipment slots)
 *   - Attachment sockets
 *   - Destruction regions
 *   - Semantic tags
 *
 * Three.js BufferGeometry is a DERIVED artifact from this model, not the
 * source of truth. The source of truth is editable, structured, and
 * inspectable by GLM.
 */

// ---------------------------------------------------------------------------
// Core Geometry Types
// ---------------------------------------------------------------------------

export interface Vertex {
  vertexId: number;
  position: [number, number, number];
  normal?: [number, number, number];
  tangent?: [number, number, number, number];
  /** Half-edge originating from this vertex. */
  halfEdge?: number;
  /** Named regions this vertex belongs to (e.g. 'SHOULDER_L'). */
  regions?: string[];
  /** Skin weights for this vertex. */
  skinWeights?: SkinWeight[];
}

export interface SkinWeight {
  boneName: string;
  weight: number;
}

export interface HalfEdge {
  halfEdgeId: number;
  /** Origin vertex. */
  origin: number;
  /** Destination vertex. */
  destination: number;
  /** Face this half-edge belongs to (-1 if boundary). */
  face: number;
  /** Twin half-edge (reverse direction). */
  twin: number;
  /** Next half-edge in the face. */
  next: number;
  /** Previous half-edge in the face. */
  prev: number;
}

export interface Face {
  faceId: number;
  /** Vertices of this face (counter-clockwise). */
  vertices: number[];
  /** Half-edge for this face. */
  halfEdge: number;
  /** Material group index. */
  materialGroup: number;
  /** UV indices for this face (per UV set). */
  uvIndices?: number[][];
}

export interface UVSet {
  setId: number;
  name: string;
  /** UV coordinates [u, v] indexed by UV id. */
  coords: [number, number][];
}

export interface MaterialGroup {
  groupId: number;
  name: string;
  materialId: string;
}

export interface MorphTarget {
  targetId: string;
  name: string;
  /** Vertex deltas: [vertexId, [dx, dy, dz]]. */
  deltas: Map<number, [number, number, number]>;
}

export interface NamedRegion {
  regionId: string;
  name: string;
  /** Vertex IDs in this region. */
  vertexIds: Set<number>;
  /** Whether this region is a body-hide zone. */
  isBodyHideZone?: boolean;
}

export interface AttachmentSocket {
  socketId: string;
  name: string;
  /** Vertex this socket is anchored to. */
  vertexId: number;
  /** Local offset from the vertex. */
  offset: [number, number, number];
  /** Rotation (quaternion). */
  rotation: [number, number, number, number];
}

export interface DestructionRegion {
  regionId: string;
  name: string;
  /** Vertices in this destruction region. */
  vertexIds: Set<number>;
  /** Faces in this destruction region. */
  faceIds: Set<number>;
  /** Material to expose when destroyed. */
  exposedMaterialId?: string;
}

export interface SemanticTag {
  tag: string;
  value: string;
}

// ---------------------------------------------------------------------------
// The Authoritative Mesh
// ---------------------------------------------------------------------------

export interface MeshKernel {
  /** Unique mesh ID. */
  meshId: string;
  /** Human-readable name. */
  name: string;

  /** Vertices indexed by vertexId. */
  vertices: Map<number, Vertex>;
  /** Half-edges indexed by halfEdgeId. */
  halfEdges: Map<number, HalfEdge>;
  /** Faces indexed by faceId. */
  faces: Map<number, Face>;
  /** UV sets. */
  uvSets: UVSet[];
  /** Material groups. */
  materialGroups: MaterialGroup[];
  /** Morph targets (blend shapes). */
  morphTargets: MorphTarget[];
  /** Named regions (body-hide zones, equipment areas). */
  regions: Map<string, NamedRegion>;
  /** Attachment sockets. */
  sockets: Map<string, AttachmentSocket>;
  /** Destruction regions. */
  destructionRegions: Map<string, DestructionRegion>;
  /** Semantic tags. */
  tags: SemanticTag[];

  /** Next available IDs. */
  nextVertexId: number;
  nextHalfEdgeId: number;
  nextFaceId: number;

  /** Bounding box. */
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

// ---------------------------------------------------------------------------
// Mesh Kernel Operations (basic CRUD)
// ---------------------------------------------------------------------------

export function createMeshKernel(meshId: string, name: string): MeshKernel {
  return {
    meshId,
    name,
    vertices: new Map(),
    halfEdges: new Map(),
    faces: new Map(),
    uvSets: [],
    materialGroups: [],
    morphTargets: [],
    regions: new Map(),
    sockets: new Map(),
    destructionRegions: new Map(),
    tags: [],
    nextVertexId: 0,
    nextHalfEdgeId: 0,
    nextFaceId: 0,
    bounds: { min: [0, 0, 0], max: [0, 0, 0] },
  };
}

export function addVertex(kernel: MeshKernel, position: [number, number, number]): number {
  const id = kernel.nextVertexId++;
  kernel.vertices.set(id, { vertexId: id, position });
  updateBounds(kernel, position);
  return id;
}

export function addFace(kernel: MeshKernel, vertexIds: number[], materialGroup = 0): number {
  const faceId = kernel.nextFaceId++;
  const face: Face = {
    faceId,
    vertices: vertexIds,
    halfEdge: -1,
    materialGroup,
  };
  kernel.faces.set(faceId, face);

  // Create half-edges for this face
  const n = vertexIds.length;
  const halfEdgeIds: number[] = [];
  for (let i = 0; i < n; i++) {
    const heId = kernel.nextHalfEdgeId++;
    const origin = vertexIds[i];
    const destination = vertexIds[(i + 1) % n];
    kernel.halfEdges.set(heId, {
      halfEdgeId: heId,
      origin,
      destination,
      face: faceId,
      twin: -1,
      next: -1,
      prev: -1,
    });
    halfEdgeIds.push(heId);
  }

  // Link next/prev
  for (let i = 0; i < n; i++) {
    const he = kernel.halfEdges.get(halfEdgeIds[i])!;
    he.next = halfEdgeIds[(i + 1) % n];
    he.prev = halfEdgeIds[(i - 1 + n) % n];
  }

  face.halfEdge = halfEdgeIds[0];

  // Link twins (find existing half-edges with reverse direction)
  for (const heId of halfEdgeIds) {
    const he = kernel.halfEdges.get(heId)!;
    for (const [otherId, other] of kernel.halfEdges) {
      if (otherId === heId) continue;
      if (other.origin === he.destination && other.destination === he.origin && other.twin === -1) {
        he.twin = otherId;
        other.twin = heId;
        break;
      }
    }
  }

  return faceId;
}

export function addRegion(kernel: MeshKernel, regionId: string, name: string, vertexIds: number[]): NamedRegion {
  const region: NamedRegion = {
    regionId,
    name,
    vertexIds: new Set(vertexIds),
  };
  kernel.regions.set(regionId, region);
  // Tag vertices with region
  for (const vId of vertexIds) {
    const v = kernel.vertices.get(vId);
    if (v) {
      if (!v.regions) v.regions = [];
      v.regions.push(regionId);
    }
  }
  return region;
}

export function addSocket(kernel: MeshKernel, socketId: string, name: string, vertexId: number, offset: [number, number, number], rotation: [number, number, number, number]): AttachmentSocket {
  const socket: AttachmentSocket = { socketId, name, vertexId, offset, rotation };
  kernel.sockets.set(socketId, socket);
  return socket;
}

// ---------------------------------------------------------------------------
// Convert MeshKernel → Three.js-compatible buffer data
// ---------------------------------------------------------------------------

export interface BufferGeometryData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array | null;
  indices: Uint32Array;
  /** Material group ranges [start, count, materialIndex]. */
  groups: Array<{ start: number; count: number; materialIndex: number }>;
  /** Skin weights (if present). */
  skinWeights?: Float32Array;
  skinIndices?: Float32Array;
}

export function toBufferGeometry(kernel: MeshKernel): BufferGeometryData {
  const vertexCount = kernel.vertices.size;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);

  // Map vertex IDs to sequential indices
  const vertexIndexMap = new Map<number, number>();
  let idx = 0;
  for (const [vId, v] of kernel.vertices) {
    vertexIndexMap.set(vId, idx);
    positions[idx * 3] = v.position[0];
    positions[idx * 3 + 1] = v.position[1];
    positions[idx * 3 + 2] = v.position[2];
    if (v.normal) {
      normals[idx * 3] = v.normal[0];
      normals[idx * 3 + 1] = v.normal[1];
      normals[idx * 3 + 2] = v.normal[2];
    }
    idx++;
  }

  // Build indices from faces (triangulate quads/ngons)
  const indices: number[] = [];
  const groups: Array<{ start: number; count: number; materialIndex: number }> = [];
  let currentGroup = -1;
  let groupStart = 0;
  let groupCount = 0;

  for (const [, face] of kernel.faces) {
    const matGroup = face.materialGroup;
    if (matGroup !== currentGroup) {
      if (groupCount > 0) {
        groups.push({ start: groupStart, count: groupCount, materialIndex: currentGroup });
      }
      currentGroup = matGroup;
      groupStart = indices.length;
      groupCount = 0;
    }

    // Triangulate (fan triangulation for simplicity)
    if (face.vertices.length === 3) {
      indices.push(vertexIndexMap.get(face.vertices[0])!, vertexIndexMap.get(face.vertices[1])!, vertexIndexMap.get(face.vertices[2])!);
      groupCount += 3;
    } else {
      // Fan triangulation for polygons
      const v0 = vertexIndexMap.get(face.vertices[0])!;
      for (let i = 1; i < face.vertices.length - 1; i++) {
        indices.push(v0, vertexIndexMap.get(face.vertices[i])!, vertexIndexMap.get(face.vertices[i + 1])!);
        groupCount += 3;
      }
    }
  }
  if (groupCount > 0) {
    groups.push({ start: groupStart, count: groupCount, materialIndex: currentGroup });
  }

  // UVs (from first UV set if present)
  let uvs: Float32Array | null = null;
  if (kernel.uvSets.length > 0) {
    const uvSet = kernel.uvSets[0];
    uvs = new Float32Array(vertexCount * 2);
    // Map UV coords to vertices (simplified — in production, use face UV indices)
    for (let i = 0; i < Math.min(uvSet.coords.length, vertexCount); i++) {
      uvs[i * 2] = uvSet.coords[i][0];
      uvs[i * 2 + 1] = uvSet.coords[i][1];
    }
  }

  // Skin weights (if present)
  let skinWeights: Float32Array | undefined;
  let skinIndices: Float32Array | undefined;
  let hasSkinWeights = false;
  for (const [, v] of kernel.vertices) {
    if (v.skinWeights && v.skinWeights.length > 0) {
      hasSkinWeights = true;
      break;
    }
  }
  if (hasSkinWeights) {
    skinWeights = new Float32Array(vertexCount * 4);
    skinIndices = new Float32Array(vertexCount * 4);
    // Build bone name → index map
    const boneNameMap = new Map<string, number>();
    let boneIdx = 0;
    for (const [, v] of kernel.vertices) {
      if (v.skinWeights) {
        for (const sw of v.skinWeights) {
          if (!boneNameMap.has(sw.boneName)) {
            boneNameMap.set(sw.boneName, boneIdx++);
          }
        }
      }
    }
    // Fill weights (max 4 per vertex)
    let vIdx = 0;
    for (const [, v] of kernel.vertices) {
      const weights = (v.skinWeights ?? []).slice(0, 4);
      for (let i = 0; i < 4; i++) {
        if (i < weights.length) {
          skinWeights[vIdx * 4 + i] = weights[i].weight;
          skinIndices[vIdx * 4 + i] = boneNameMap.get(weights[i].boneName) ?? 0;
        } else {
          skinWeights[vIdx * 4 + i] = 0;
          skinIndices[vIdx * 4 + i] = 0;
        }
      }
      vIdx++;
    }
  }

  return {
    positions,
    normals,
    uvs,
    indices: new Uint32Array(indices),
    groups,
    skinWeights,
    skinIndices,
  };
}

// ---------------------------------------------------------------------------
// Bounds
// ---------------------------------------------------------------------------

function updateBounds(kernel: MeshKernel, pos: [number, number, number]): void {
  kernel.bounds.min[0] = Math.min(kernel.bounds.min[0], pos[0]);
  kernel.bounds.min[1] = Math.min(kernel.bounds.min[1], pos[1]);
  kernel.bounds.min[2] = Math.min(kernel.bounds.min[2], pos[2]);
  kernel.bounds.max[0] = Math.max(kernel.bounds.max[0], pos[0]);
  kernel.bounds.max[1] = Math.max(kernel.bounds.max[1], pos[1]);
  kernel.bounds.max[2] = Math.max(kernel.bounds.max[2], pos[2]);
}

export function getMeshStats(kernel: MeshKernel): {
  vertexCount: number;
  faceCount: number;
  halfEdgeCount: number;
  uvSetCount: number;
  materialGroupCount: number;
  regionCount: number;
  socketCount: number;
  destructionRegionCount: number;
  morphTargetCount: number;
} {
  return {
    vertexCount: kernel.vertices.size,
    faceCount: kernel.faces.size,
    halfEdgeCount: kernel.halfEdges.size,
    uvSetCount: kernel.uvSets.length,
    materialGroupCount: kernel.materialGroups.length,
    regionCount: kernel.regions.size,
    socketCount: kernel.sockets.size,
    destructionRegionCount: kernel.destructionRegions.size,
    morphTargetCount: kernel.morphTargets.length,
  };
}
