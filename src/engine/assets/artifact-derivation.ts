/**
 * Artifact Derivation — LOD chain + collision hierarchy
 * =======================================================
 *
 * Derived artifacts are produced FROM a validated SemanticAsset and are
 * always revisioned against the source revision (engine rule: "Record
 * source revision on derived artifacts").
 *
 * LOD chain:
 *   - REAL triangle reduction via meshoptimizer (glTF-Transform simplify),
 *     not "delete smallest faces". Each non-protected part is simplified
 *     independently at the requested ratio; protected semantic parts are
 *     skipped and keep their exact triangle count.
 *   - Each LOD level is content-hashed (positions + indices), so level
 *     hashes are comparable and stable.
 *
 * Collision hierarchy:
 *   - Deterministic AABB tree over triangle centroids (median split on the
 *     widest axis). A box hierarchy (not a hull solver) — honest and
 *     sufficient for pagoda-scale structures.
 */

import { Document, WebIO } from '@gltf-transform/core';
import { weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import type { SemanticAsset, GeometryArtifact } from './semantic-asset';
import { hashGeometry, hashJson } from './content-hash';
import { slicePartGeometry } from './geometry-slice';

// ---------------------------------------------------------------------------
// LOD chain
// ---------------------------------------------------------------------------

export interface LODPartResult {
  partId: string;
  before: number;
  after: number;
  protected: boolean;
  hash: string;
}

export interface LODLevelResult {
  level: number;
  ratio: number;
  totalBefore: number;
  totalAfter: number;
  parts: LODPartResult[];
}

export interface LODChainResult {
  sourceTriangleCount: number;
  sourceHash: string;
  protectedPartIds: string[];
  levels: LODLevelResult[];
}

let gltfIo: WebIO | null = null;
let meshoptReady: Promise<void> | null = null;

async function ensureTooling(): Promise<WebIO> {
  if (!meshoptReady) {
    meshoptReady = MeshoptSimplifier.ready;
  }
  await meshoptReady;
  if (!gltfIo) {
    const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
    gltfIo = new WebIO().registerExtensions(ALL_EXTENSIONS);
  }
  return gltfIo;
}

/** Hash one part's geometry as a content-addressed artifact. */
function partGeometryHash(asset: SemanticAsset, partId: string): string {
  const sliced = slicePartGeometry(asset, partId);
  return hashGeometry({
    positions: sliced.positions,
    uvs: sliced.uvs,
    normals: sliced.normals,
    indices: sliced.indices,
  });
}

/** Build a one-primitive glTF document from sliced part geometry. */
function docFromPart(
  part: { positions: Float32Array<ArrayBuffer>; normals: Float32Array<ArrayBuffer> | null; uvs: Float32Array<ArrayBuffer> | null; indices: Uint32Array<ArrayBuffer> },
  name: string,
): Document {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const mesh = doc.createMesh(name);
  const position = doc.createAccessor(`${name}_pos`, buffer);
  position.setArray(part.positions );
  position.setType('VEC3');
  const primitive = doc.createPrimitive();
  primitive.setAttribute('POSITION', position);
  if (part.normals) {
    const normal = doc.createAccessor(`${name}_nrm`, buffer);
    normal.setArray(part.normals );
    normal.setType('VEC3');
    primitive.setAttribute('NORMAL', normal);
  }
  if (part.uvs) {
    const uv = doc.createAccessor(`${name}_uv`, buffer);
    uv.setArray(part.uvs );
    uv.setType('VEC2');
    primitive.setAttribute('TEXCOORD_0', uv);
  }
  const index = doc.createAccessor(`${name}_idx`, buffer);
  index.setArray(part.indices );
  index.setType('SCALAR');
  primitive.setIndices(index);
  mesh.addPrimitive(primitive);
  const node = doc.createNode(name);
  node.setMesh(mesh);
  doc.createScene().addChild(node);
  return doc;
}

function countTriangles(doc: Document): number {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      if (idx) tris += Math.floor(idx.getCount() / 3);
      else {
        const pos = prim.getAttribute('POSITION');
        if (pos) tris += Math.floor(pos.getCount() / 3);
      }
    }
  }
  return tris;
}

function readGeometryBytes(doc: Document, name: string): { positions: Float32Array; indices: Uint32Array } {
  const mesh = doc.getRoot().listMeshes()[0]!;
  const prim = mesh.listPrimitives()[0]!;
  const pos = prim.getAttribute('POSITION')!;
  const idx = prim.getIndices()!;
  const positions = new Float32Array(pos.getCount() * 3);
  for (let i = 0; i < pos.getCount() * 3; i++) positions[i] = pos.getArray()![i]!;
  const indices = new Uint32Array(idx.getCount());
  const src = idx.getArray()!;
  for (let i = 0; i < idx.getCount(); i++) indices[i] = src[i]!;
  return { positions, indices };
}

/**
 * Derive an LOD chain with REAL meshoptimizer reduction.
 *
 * @param ratios fraction-of-triangles targets for LOD1, LOD2, ...
 * @param protectedPartIds parts exempt from reduction (kept bit-identical)
 */
export async function deriveLODChain(
  asset: SemanticAsset,
  ratios: number[],
  protectedPartIds: string[] = [],
): Promise<LODChainResult> {
  await ensureTooling();
  const protectedSet = new Set(protectedPartIds);
  const parts = asset.semanticParts.parts;
  const sourceHash = asset.geometry.hash;
  const sourceTriangleCount = asset.geometry.triangleCount;
  const levels: LODLevelResult[] = [];

  for (let li = 0; li < ratios.length; li++) {
    const ratio = ratios[li]!;
    const partResults: LODPartResult[] = [];
    let totalBefore = 0;
    let totalAfter = 0;

    for (const part of parts) {
      const before = part.triangleIndices.length;
      totalBefore += before;
      if (protectedSet.has(part.partId)) {
        partResults.push({
          partId: part.partId,
          before,
          after: before,
          protected: true,
          hash: partGeometryHash(asset, part.partId),
        });
        totalAfter += before;
        continue;
      }
      const sliced = slicePartGeometry(asset, part.partId);
      const doc = docFromPart(sliced, `${asset.assetId}.${part.partId}.LOD${li + 1}`);
      try {
        await doc.transform(
          weld(),
          simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 }),
        );
      } catch {
        // Simplification failed for this part — keep it intact rather than
        // corrupting the chain.
        partResults.push({
          partId: part.partId,
          before,
          after: before,
          protected: false,
          hash: partGeometryHash(asset, part.partId),
        });
        totalAfter += before;
        continue;
      }
      const after = countTriangles(doc);
      const { positions, indices } = readGeometryBytes(doc, part.partId);
      const hash = hashGeometry({ positions, uvs: null, normals: null, indices });
      partResults.push({ partId: part.partId, before, after, protected: false, hash });
      totalAfter += after;
    }

    levels.push({
      level: li + 1,
      ratio,
      totalBefore,
      totalAfter,
      parts: partResults,
    });
  }

  return { sourceTriangleCount, sourceHash, protectedPartIds, levels };
}

// ---------------------------------------------------------------------------
// Collision hierarchy (AABB tree)
// ---------------------------------------------------------------------------

export interface CollisionBox {
  min: [number, number, number];
  max: [number, number, number];
  triangleCount: number;
}

export interface CollisionHierarchyResult {
  boxes: CollisionBox[];
  triangleCount: number;
  hash: string;
  maxTrisPerBox: number;
  maxBoxes: number;
}

export interface CollisionOptions {
  maxBoxes?: number;
  maxTrisPerBox?: number;
}

/**
 * Deterministic AABB hierarchy: recursively split the triangle list on the
 * widest axis at the centroid median until box limits are met.
 * Deterministic because the triangle order is fixed by the source asset.
 */
export function deriveCollisionHierarchy(
  geometry: GeometryArtifact,
  opts: CollisionOptions = {},
): CollisionHierarchyResult {
  const maxBoxes = opts.maxBoxes ?? 16;
  const maxTrisPerBox = opts.maxTrisPerBox ?? 64;
  const { positions, indices } = geometry;
  const triCount = indices.length / 3;

  const centroid = (t: number): [number, number, number] => {
    let x = 0, y = 0, z = 0;
    for (let c = 0; c < 3; c++) {
      const v = indices[t * 3 + c]! * 3;
      x += positions[v]!;
      y += positions[v + 1]!;
      z += positions[v + 2]!;
    }
    return [x / 3, y / 3, z / 3];
  };

  const boxOfTris = (tris: number[]): CollisionBox => {
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const t of tris) {
      for (let c = 0; c < 3; c++) {
        const v = indices[t * 3 + c]! * 3;
        for (let a = 0; a < 3; a++) {
          min[a] = Math.min(min[a], positions[v + a]!);
          max[a] = Math.max(max[a], positions[v + a]!);
        }
      }
    }
    return { min, max, triangleCount: tris.length };
  };

  const boxes: CollisionBox[] = [];
  const split = (tris: number[]): void => {
    if (boxes.length >= maxBoxes || tris.length <= maxTrisPerBox) {
      boxes.push(boxOfTris(tris));
      return;
    }
    const ext = boxOfTris(tris);
    const axis = ext.max[0] - ext.min[0] >= ext.max[1] - ext.min[1]
      ? (ext.max[0] - ext.min[0] >= ext.max[2] - ext.min[2] ? 0 : 2)
      : (ext.max[1] - ext.min[1] >= ext.max[2] - ext.min[2] ? 1 : 2);
    const sorted = tris.slice().sort((a, b) => centroid(a)[axis]! - centroid(b)[axis]!);
    const mid = Math.floor(sorted.length / 2);
    split(sorted.slice(0, mid));
    split(sorted.slice(mid));
  };

  const all = new Array<number>(triCount);
  for (let t = 0; t < triCount; t++) all[t] = t;
  split(all);

  // Canonical order for hashing: lexicographic by (minX, minY, minZ).
  boxes.sort((a, b) =>
    a.min[0] - b.min[0] || a.min[1] - b.min[1] || a.min[2] - b.min[2] ||
    a.max[0] - b.max[0] || a.max[1] - b.max[1] || a.max[2] - b.max[2]);

  const quantized = boxes.map((b) => ({
    min: b.min.map((v) => Math.round(v * 1e4)),
    max: b.max.map((v) => Math.round(v * 1e4)),
    triangleCount: b.triangleCount,
  }));

  return {
    boxes,
    triangleCount: triCount,
    hash: hashJson(quantized),
    maxTrisPerBox,
    maxBoxes,
  };
}
