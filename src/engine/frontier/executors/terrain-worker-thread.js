/* eslint-disable @typescript-eslint/no-require-imports */
// Terrain Worker Thread — plain JavaScript (no TypeScript syntax)
// Runs in a Node.js worker_thread, separate from the main event loop.
const { parentPort, isMainThread, threadId } = require('worker_threads');
const { createHash } = require('crypto');

// CRITICAL: This script MUST run in a worker thread, not the main thread.
// If isMainThread is true, the worker was incorrectly loaded.
if (isMainThread) {
  throw new Error('Terrain worker started on the main thread — this should never happen');
}

class DetPRNG {
  constructor(seed) { this.state = seed >>> 0; }
  next() { this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 0x100000000; }
  range(min, max) { return min + this.next() * (max - min); }
}

function pseudoNoise(x, z, seed) {
  let h = (x * 374761393 + z * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

function generateTerrain(seed, resolution) {
  const startTime = Date.now();
  const bounds = { minX: 0, maxX: 128, minY: 0, maxY: 64, minZ: 0, maxZ: 128 };
  const voxelSize = (bounds.maxX - bounds.minX) / resolution;
  const total = resolution * resolution * resolution;
  const samples = new Float32Array(total);
  const materialIds = new Uint16Array(total);

  for (let x = 0; x < resolution; x++) {
    for (let z = 0; z < resolution; z++) {
      const wx = bounds.minX + (x / resolution) * (bounds.maxX - bounds.minX);
      const wz = bounds.minZ + (z / resolution) * (bounds.maxZ - bounds.minZ);
      const h1 = pseudoNoise(wx * 0.05, wz * 0.05, seed);
      const h2 = pseudoNoise(wx * 0.1, wz * 0.1, seed + 1) * 0.5;
      const h3 = pseudoNoise(wx * 0.2, wz * 0.2, seed + 2) * 0.25;
      const heightNorm = (h1 + h2 + h3) / 1.75;
      const groundHeight = bounds.minY + 20 + heightNorm * 15;
      for (let y = 0; y < resolution; y++) {
        const wy = bounds.minY + (y / resolution) * (bounds.maxY - bounds.minY);
        const density = wy - groundHeight;
        const i = x + y * resolution + z * resolution * resolution;
        samples[i] = density;
        if (density < 0 && density > -2) materialIds[i] = 1;
        else if (density < -2 && density > -8) materialIds[i] = 2;
        else if (density < -8) materialIds[i] = 3;
      }
    }
  }

  for (let x = 0; x < resolution; x++) {
    for (let z = 0; z < resolution; z++) {
      const wx = bounds.minX + (x / resolution) * (bounds.maxX - bounds.minX);
      const wz = bounds.minZ + (z / resolution) * (bounds.maxZ - bounds.minZ);
      const dx = wx - 64, dz = wz - 64;
      const horizDist = Math.sqrt(dx * dx + dz * dz);
      if (horizDist < 30) {
        const mountainHeight = 40 * (1 - horizDist / 30);
        for (let y = 0; y < resolution; y++) {
          const wy = bounds.minY + (y / resolution) * (bounds.maxY - bounds.minY);
          const i = x + y * resolution + z * resolution * resolution;
          if (wy < 20 + mountainHeight) {
            if (samples[i] > 0) { samples[i] = -(20 + mountainHeight - wy); materialIds[i] = 3; }
            else { samples[i] = Math.min(samples[i], -(20 + mountainHeight - wy)); }
          }
        }
      }
    }
  }

  const splinePoints = [[10, 25, 64], [64, 30, 64], [118, 25, 64]];
  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) {
      for (let z = 0; z < resolution; z++) {
        const wx = bounds.minX + (x / resolution) * (bounds.maxX - bounds.minX);
        const wy = bounds.minY + (y / resolution) * (bounds.maxY - bounds.minY);
        const wz = bounds.minZ + (z / resolution) * (bounds.maxZ - bounds.minZ);
        let minDist = Infinity;
        for (let s = 0; s < splinePoints.length - 1; s++) {
          const [ax, ay, az] = splinePoints[s];
          const [bx, by, bz] = splinePoints[s + 1];
          const ddx = bx - ax, ddy = by - ay, ddz = bz - az;
          const lenSq = ddx * ddx + ddy * ddy + ddz * ddz;
          let t = ((wx - ax) * ddx + (wy - ay) * ddy + (wz - az) * ddz) / lenSq;
          t = Math.max(0, Math.min(1, t));
          const px = ax + t * ddx, py = ay + t * ddy, pz = az + t * ddz;
          const dist = Math.sqrt((wx - px) ** 2 + (wy - py) ** 2 + (wz - pz) ** 2);
          if (dist < minDist) minDist = dist;
        }
        if (minDist < 3) {
          const i = x + y * resolution + z * resolution * resolution;
          if (samples[i] < 0) { samples[i] = 3 - minDist; materialIds[i] = 0; }
        }
      }
    }
  }

  for (let iter = 0; iter < 2; iter++) {
    const newSamples = new Float32Array(samples);
    for (let x = 1; x < resolution - 1; x++) {
      for (let y = 1; y < resolution - 1; y++) {
        for (let z = 1; z < resolution - 1; z++) {
          const i = x + y * resolution + z * resolution * resolution;
          const neighbors = [
            samples[(x + 1) + y * resolution + z * resolution * resolution],
            samples[(x - 1) + y * resolution + z * resolution * resolution],
            samples[x + (y + 1) * resolution + z * resolution * resolution],
            samples[x + (y - 1) * resolution + z * resolution * resolution],
            samples[x + y * resolution + (z + 1) * resolution * resolution],
            samples[x + y * resolution + (z - 1) * resolution * resolution],
          ];
          const avg = neighbors.reduce((a, b) => a + b, 0) / 6;
          newSamples[i] = samples[i] * 0.9 + avg * 0.1;
        }
      }
    }
    samples.set(newSamples);
  }

  const positions = [];
  const normals = [];
  const indices = [];
  const matIds = [];
  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) {
      for (let z = 0; z < resolution; z++) {
        const i = x + y * resolution + z * resolution * resolution;
        if (samples[i] >= 0) continue;
        const wx = bounds.minX + x * voxelSize;
        const wy = bounds.minY + y * voxelSize;
        const wz = bounds.minZ + z * voxelSize;
        const mid = materialIds[i];
        const faces = [
          { dx: 1, n: [1, 0, 0], v: [[voxelSize, 0, 0], [voxelSize, voxelSize, 0], [voxelSize, voxelSize, voxelSize], [voxelSize, 0, voxelSize]] },
          { dx: -1, n: [-1, 0, 0], v: [[0, 0, voxelSize], [0, voxelSize, voxelSize], [0, voxelSize, 0], [0, 0, 0]] },
          { dy: 1, n: [0, 1, 0], v: [[0, voxelSize, 0], [0, voxelSize, voxelSize], [voxelSize, voxelSize, voxelSize], [voxelSize, voxelSize, 0]] },
          { dy: -1, n: [0, -1, 0], v: [[voxelSize, 0, 0], [voxelSize, 0, voxelSize], [0, 0, voxelSize], [0, 0, 0]] },
          { dz: 1, n: [0, 0, 1], v: [[0, 0, voxelSize], [voxelSize, 0, voxelSize], [voxelSize, voxelSize, voxelSize], [0, voxelSize, voxelSize]] },
          { dz: -1, n: [0, 0, -1], v: [[0, 0, 0], [0, voxelSize, 0], [voxelSize, voxelSize, 0], [voxelSize, 0, 0]] },
        ];
        for (const face of faces) {
          const nx = x + (face.dx || 0), ny = y + (face.dy || 0), nz = z + (face.dz || 0);
          let neighborEmpty = false;
          if (nx < 0 || nx >= resolution || ny < 0 || ny >= resolution || nz < 0 || nz >= resolution) neighborEmpty = true;
          else neighborEmpty = samples[nx + ny * resolution + nz * resolution * resolution] >= 0;
          if (neighborEmpty) {
            const base = positions.length / 3;
            for (const v of face.v) { positions.push(wx + v[0], wy + v[1], wz + v[2]); normals.push(face.n[0], face.n[1], face.n[2]); matIds.push(mid); }
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
        }
      }
    }
  }

  let navPolygonCount = 0;
  for (let x = 0; x < resolution; x++) {
    for (let z = 0; z < resolution; z++) {
      for (let y = 0; y < resolution - 1; y++) {
        const i = x + y * resolution + z * resolution * resolution;
        const above = x + (y + 1) * resolution + z * resolution * resolution;
        if (samples[i] < 0 && samples[above] >= 0) navPolygonCount++;
      }
    }
  }

  const rng = new DetPRNG(seed);
  const vegTransforms = [];
  for (let x = 0; x < resolution; x++) {
    for (let z = 0; z < resolution; z++) {
      for (let y = 0; y < resolution - 1; y++) {
        const i = x + y * resolution + z * resolution * resolution;
        const above = x + (y + 1) * resolution + z * resolution * resolution;
        if (samples[i] < 0 && samples[above] >= 0) {
          const matId = materialIds[i];
          if (matId !== 1 && matId !== 2) continue;
          if (rng.next() < 0.3) {
            vegTransforms.push(
              bounds.minX + x * voxelSize + rng.range(0, voxelSize),
              bounds.minY + (y + 1) * voxelSize,
              bounds.minZ + z * voxelSize + rng.range(0, voxelSize),
              rng.range(0, 6.28318),
              rng.range(0.8, 1.2),
            );
          }
        }
      }
    }
  }

  const executionTimeMs = Date.now() - startTime;
  const renderHash = createHash('sha256').update(Buffer.from(new Float32Array(positions).buffer)).digest('hex');
  const vegHash = createHash('sha256').update(Buffer.from(new Float32Array(vegTransforms).buffer)).digest('hex');

  return {
    renderMesh: { positions, normals, indices, materialIds: matIds, vertexCount: positions.length / 3, triangleCount: indices.length / 3, artifactHash: renderHash },
    navigation: { polygonCount: navPolygonCount, pathLength: 0 },
    vegetation: { instanceCount: vegTransforms.length / 5, transforms: vegTransforms, artifactHash: vegHash },
    region: { resolution, solidVoxels: samples.filter(s => s < 0).length, densityHash: createHash('sha256').update(Buffer.from(samples.buffer)).digest('hex') },
    executionTimeMs,
    workerThreadId: threadId,
    workerPid: process.pid,
  };
}

if (parentPort && !isMainThread) {
  parentPort.on('message', (msg) => {
    if (msg.type === 'health-check') {
      parentPort.postMessage({ type: 'ready', protocolVersion: '1.0.0', threadId: threadId, isMainThread: isMainThread, pid: process.pid });
    } else if (msg.type === 'job') {
      try {
        const { seed = 42, resolution = 24 } = msg.input || {};
        const result = generateTerrain(seed, resolution);
        parentPort.postMessage({
          type: 'result', jobId: msg.jobId, output: result, outputHash: result.renderMesh.artifactHash,
          executionTimeMs: result.executionTimeMs, queueTimeMs: 0, transferTimeMs: 0,
          workerThreadId: threadId, workerPid: process.pid,
          workerIdentity: { pid: process.pid, threadId: threadId, isMainThread: isMainThread },
        });
      } catch (err) {
        parentPort.postMessage({ type: 'error', jobId: msg.jobId, message: err.message, stack: err.stack });
      }
    } else if (msg.type === 'cancel') {
      parentPort.postMessage({ type: 'result', jobId: msg.jobId, output: null, outputHash: '', cancelled: true, executionTimeMs: 0 });
    }
  });
  parentPort.postMessage({ type: 'ready', protocolVersion: '1.0.0', threadId: process.threadId, pid: process.pid });
}
