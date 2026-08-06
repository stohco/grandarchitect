/**
 * GLB Export — Binary glTF Writer
 * ================================
 *
 * Exports a MeshKernel to binary glTF (.glb) format. This is the runtime
 * asset compilation step — the final output before an asset enters the
 * World Fabric.
 *
 * GLB format:
 *   12-byte header (magic, version, length)
 *   JSON chunk (length + type + JSON)
 *   BIN chunk (length + type + binary data)
 *
 * This is a real, minimal GLB writer — not a stub.
 */

import type { MeshKernel } from './mesh-kernel';
import { toBufferGeometry } from './mesh-kernel';

// ---------------------------------------------------------------------------
// GLB Binary Writer
// ---------------------------------------------------------------------------

const GLB_MAGIC = 0x46546c67; // 'glTF'
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a; // 'JSON'
const BIN_CHUNK_TYPE = 0x004e4942; // 'BIN\0'

export interface GLBExportResult {
  /** The GLB file as a Uint8Array. */
  data: Uint8Array;
  /** Size in bytes. */
  sizeBytes: number;
  /** Number of vertices. */
  vertexCount: number;
  /** Number of triangles. */
  triangleCount: number;
  /** Number of material groups. */
  materialCount: number;
  /** Hash of the binary data. */
  hash: string;
}

export function exportToGLB(kernel: MeshKernel, assetName?: string): GLBExportResult {
  const buffer = toBufferGeometry(kernel);
  const name = assetName ?? kernel.meshId;

  // Build binary buffer: positions + normals + indices (+ UVs if present)
  const positionBytes = buffer.positions.byteLength;
  const normalBytes = buffer.normals.byteLength;
  const indexBytes = buffer.indices.byteLength;
  const uvBytes = buffer.uvs ? buffer.uvs.byteLength : 0;

  // Pad each buffer to 4-byte alignment
  const paddedPositionBytes = align4(positionBytes);
  const paddedNormalBytes = align4(normalBytes);
  const paddedIndexBytes = align4(indexBytes);
  const paddedUvBytes = align4(uvBytes);

  const totalBinBytes = paddedPositionBytes + paddedNormalBytes + paddedUvBytes + paddedIndexBytes;

  // Create binary buffer
  const binBuffer = new Uint8Array(totalBinBytes);
  const binView = new DataView(binBuffer.buffer);

  let offset = 0;

  // Positions
  binBuffer.set(new Uint8Array(buffer.positions.buffer), offset);
  const positionOffset = offset;
  offset += paddedPositionBytes;

  // Normals
  binBuffer.set(new Uint8Array(buffer.normals.buffer), offset);
  const normalOffset = offset;
  offset += paddedNormalBytes;

  // UVs (if present)
  let uvOffset = -1;
  if (buffer.uvs && uvBytes > 0) {
    binBuffer.set(new Uint8Array(buffer.uvs.buffer), offset);
    uvOffset = offset;
    offset += paddedUvBytes;
  }

  // Indices
  binBuffer.set(new Uint8Array(buffer.indices.buffer), offset);
  const indexOffset = offset;
  offset += paddedIndexBytes;

  // Build glTF JSON
  const vertexCount = buffer.positions.length / 3;
  const triangleCount = buffer.indices.length / 3;

  const accessors: unknown[] = [
    { bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', byteOffset: 0 }, // POSITION
    { bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3', byteOffset: 0 }, // NORMAL
  ];
  const bufferViews: unknown[] = [
    { buffer: 0, byteOffset: positionOffset, byteLength: positionBytes, target: 34962 }, // positions
    { buffer: 0, byteOffset: normalOffset, byteLength: normalBytes, target: 34962 }, // normals
  ];

  if (uvOffset >= 0) {
    accessors.push({ bufferView: 2, componentType: 5126, count: vertexCount, type: 'VEC2', byteOffset: 0 });
    bufferViews.push({ buffer: 0, byteOffset: uvOffset, byteLength: uvBytes, target: 34962 });
  }

  // Index accessor
  const indexAccessorIndex = accessors.length;
  accessors.push({
    bufferView: bufferViews.length,
    componentType: 5125, // UNSIGNED_INT
    count: buffer.indices.length,
    type: 'SCALAR',
    byteOffset: 0,
  });
  bufferViews.push({ buffer: 0, byteOffset: indexOffset, byteLength: indexBytes, target: 34963 });

  // Material
  const materials: unknown[] = [
    {
      name: `${name}_material`,
      pbrMetallicRoughness: {
        baseColorFactor: [0.8, 0.8, 0.8, 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 0.7,
      },
    },
  ];

  // Mesh
  const primitives = [{
    attributes: {
      POSITION: 0,
      NORMAL: 1,
      ...(uvOffset >= 0 ? { TEXCOORD_0: 2 } : {}),
    },
    indices: indexAccessorIndex,
    material: 0,
    mode: 4, // TRIANGLES
  }];

  const meshes = [{ name, primitives }];

  // Nodes
  const nodes = [{ name, mesh: 0 }];

  // Scenes
  const scenes = [{ nodes: [0] }];

  const gltfJson = {
    asset: {
      version: '2.0',
      generator: 'Live Studio MeshKernel → GLB',
      copyright: 'Xianxia Open-World RPG',
    },
    scene: 0,
    scenes,
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: totalBinBytes }],
  };

  // Serialize JSON
  const jsonStr = JSON.stringify(gltfJson);
  const jsonBytes = new TextEncoder().encode(jsonStr);
  const paddedJsonBytes = align4(jsonBytes.length);

  // Pad JSON with spaces
  const jsonBuffer = new Uint8Array(paddedJsonBytes);
  jsonBuffer.set(jsonBytes);
  for (let i = jsonBytes.length; i < paddedJsonBytes; i++) {
    jsonBuffer[i] = 0x20; // space
  }

  // Build GLB
  const totalLength = 12 + 8 + paddedJsonBytes + 8 + totalBinBytes;
  const glb = new Uint8Array(totalLength);
  const view = new DataView(glb.buffer);

  // Header
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, GLB_VERSION, true);
  view.setUint32(8, totalLength, true);

  // JSON chunk
  view.setUint32(12, paddedJsonBytes, true);
  view.setUint32(16, JSON_CHUNK_TYPE, true);
  glb.set(jsonBuffer, 20);

  // BIN chunk
  const binChunkOffset = 20 + paddedJsonBytes;
  view.setUint32(binChunkOffset, totalBinBytes, true);
  view.setUint32(binChunkOffset + 4, BIN_CHUNK_TYPE, true);
  glb.set(binBuffer, binChunkOffset + 8);

  // Hash
  let hash = 0;
  for (let i = 0; i < Math.min(glb.length, 4096); i++) {
    hash = ((hash << 5) - hash + glb[i]) | 0;
  }
  const hashStr = (hash >>> 0).toString(16).padStart(8, '0');

  return {
    data: glb,
    sizeBytes: totalLength,
    vertexCount,
    triangleCount,
    materialCount: 1,
    hash: hashStr,
  };
}

function align4(n: number): number {
  return (n + 3) & ~3;
}

// ---------------------------------------------------------------------------
// Node.js Buffer conversion (for file saving)
// ---------------------------------------------------------------------------

export function glbToBuffer(result: GLBExportResult): Buffer {
  return Buffer.from(result.data.buffer, result.data.byteOffset, result.data.byteLength);
}
