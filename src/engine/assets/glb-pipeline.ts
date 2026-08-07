/**
 * GLB Pipeline — multi-mesh GLB export + round-trip validation
 * ==============================================================
 *
 * Exports a SemanticAsset to a real binary GLB via @gltf-transform:
 *   - one mesh + primitive per semantic part (draw calls = part count),
 *   - per-part PBR materials from the asset's MaterialArtifacts,
 *   - POSITION / NORMAL / TEXCOORD_0 attributes,
 *   - no time/random dependence — identical asset → identical bytes,
 *   - artifact hash = SHA-256 of the produced buffer.
 *
 * Round-trip validation: the produced GLB is re-read with
 * io.readBinary() and structurally verified (mesh/primitive/triangle
 * counts against the source asset). The GLB is never trusted on write.
 */

import { Document, WebIO } from '@gltf-transform/core';
import type { SemanticAsset } from './semantic-asset';
import { sha256Hex } from './content-hash';
import { slicePartGeometry } from './geometry-slice';

export interface GLBArtifact {
  buffer: Uint8Array;
  sizeBytes: number;
  hash: string;
  meshCount: number;
  primitiveCount: number;
  triangleCount: number;
  vertexCount: number;
}

export interface GLBReadbackSummary {
  meshCount: number;
  primitiveCount: number;
  triangleCount: number;
  vertexCount: number;
  materialCount: number;
  ok: boolean;
}

let gltfIo: WebIO | null = null;

async function ensureIO(): Promise<WebIO> {
  if (!gltfIo) {
    const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
    gltfIo = new WebIO().registerExtensions(ALL_EXTENSIONS);
  }
  return gltfIo;
}

/** Build the glTF Document for an asset (no transforms — deterministic). */
export function documentFromSemanticAsset(asset: SemanticAsset): Document {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(asset.assetId);

  for (const part of asset.semanticParts.parts) {
    const partMesh = doc.createMesh(`${asset.assetId}.${part.partId}`);
    const prim = doc.createPrimitive();
    // Per-part SLICED geometry: each primitive references only its own
    // triangles (not the whole asset buffer).
    const slice = slicePartGeometry(asset, part.partId);

    const position = doc.createAccessor(`${part.partId}_pos`, buffer);
    position.setArray(slice.positions );
    position.setType('VEC3');
    prim.setAttribute('POSITION', position);

    if (slice.normals) {
      const normal = doc.createAccessor(`${part.partId}_nrm`, buffer);
      normal.setArray(slice.normals );
      normal.setType('VEC3');
      prim.setAttribute('NORMAL', normal);
    }

    if (slice.uvs) {
      const uv = doc.createAccessor(`${part.partId}_uv`, buffer);
      uv.setArray(slice.uvs );
      uv.setType('VEC2');
      prim.setAttribute('TEXCOORD_0', uv);
    }

    const indices = doc.createAccessor(`${part.partId}_idx`, buffer);
    indices.setArray(slice.indices );
    indices.setType('SCALAR');
    prim.setIndices(indices);

    // Per-part material.
    const matSpec = asset.materials[part.materialIndex ?? 0];
    const material = doc.createMaterial(part.name);
    if (matSpec?.baseColor) {
      material.setBaseColorFactor(matSpec.baseColor as unknown as [number, number, number, number]);
    }
    material.setMetallicFactor(matSpec?.metallic ?? 0);
    material.setRoughnessFactor(matSpec?.roughness ?? 0.8);
    material.setAlphaMode(matSpec?.alphaMode ?? 'OPAQUE');
    prim.setMaterial(material);

    partMesh.addPrimitive(prim);
    const node = doc.createNode(part.name);
    node.setMesh(partMesh);
    scene.addChild(node);
  }

  return doc;
}

/**
 * Export the asset to GLB and hash the buffer.
 */
export async function exportSemanticToGLB(asset: SemanticAsset): Promise<GLBArtifact> {
  const io = await ensureIO();
  const doc = documentFromSemanticAsset(asset);
  const buffer = await io.writeBinary(doc);
  const hash = sha256Hex(buffer);

  let triangleCount = 0;
  let vertexCount = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos) vertexCount += pos.getCount();
      const idx = prim.getIndices();
      if (idx) triangleCount += Math.floor(idx.getCount() / 3);
      else if (pos) triangleCount += Math.floor(pos.getCount() / 3);
    }
  }

  return {
    buffer,
    sizeBytes: buffer.byteLength,
    hash,
    meshCount: doc.getRoot().listMeshes().length,
    primitiveCount: doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().length, 0),
    triangleCount,
    vertexCount,
  };
}

/**
 * Round-trip: read the produced GLB back with @gltf-transform and verify
 * its structure against the source asset.
 */
export async function readbackGLB(
  glb: Uint8Array,
  expected: Pick<SemanticAsset['geometry'], 'triangleCount' | 'vertexCount'>,
  expectedParts: number,
): Promise<GLBReadbackSummary> {
  const io = await ensureIO();
  const doc = await io.readBinary(glb);

  let meshCount = 0;
  let primitiveCount = 0;
  let triangleCount = 0;
  let vertexCount = 0;
  const materials = new Set<string>();
  for (const mesh of doc.getRoot().listMeshes()) {
    meshCount++;
    for (const prim of mesh.listPrimitives()) {
      primitiveCount++;
      const pos = prim.getAttribute('POSITION');
      if (pos) vertexCount += pos.getCount();
      const idx = prim.getIndices();
      if (idx) triangleCount += Math.floor(idx.getCount() / 3);
      else if (pos) triangleCount += Math.floor(pos.getCount() / 3);
      if (prim.getMaterial()) materials.add(prim.getMaterial()!.getName());
    }
  }

  const ok =
    meshCount === expectedParts &&
    primitiveCount === expectedParts &&
    triangleCount === expected.triangleCount &&
    vertexCount === expected.vertexCount &&
    materials.size > 0;

  return {
    meshCount,
    primitiveCount,
    triangleCount,
    vertexCount,
    materialCount: materials.size,
    ok,
  };
}
