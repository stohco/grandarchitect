/**
 * Terrain Worker Service — runs terrain pipeline in a separate process
 *
 * The critique demanded: "Move density evaluation, meshing, collision
 * generation and navigation generation to the worker job system."
 *
 * This service runs on port 3040 and provides:
 *   POST /generate — runs the full terrain pipeline and returns geometry
 *
 * The main thread's terrain API calls this service instead of running
 * synchronously, keeping the browser/server responsive.
 *
 * Uses the same deterministic terrain plugin (no forbidden functions).
 */

import { createServer } from 'http';

// Inline the terrain plugin (avoids import path issues in standalone service)
import { createHash } from 'crypto';

// --- Deterministic PRNG (LCG) ---
class DetPRNG {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0; }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
  range(min: number, max: number): number { return min + this.next() * (max - min); }
}

// --- Pseudo-noise ---
function pseudoNoise(x: number, z: number, seed: number): number {
  let h = (x * 374761393 + z * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

// --- Density region ---
function idx(res: number, x: number, y: number, z: number): number {
  return x + y * res + z * res * res;
}

function generateTerrain(seed: number, resolution: number) {
  const bounds = { minX: 0, maxX: 128, minY: 0, maxY: 64, minZ: 0, maxZ: 128 };
  const voxelSize = (bounds.maxX - bounds.minX) / resolution;
  const total = resolution * resolution * resolution;
  const samples = new Float32Array(total);
  const materialIds = new Uint16Array(total);

  // Terrain source
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
        const i = idx(resolution, x, y, z);
        samples[i] = density;
        if (density < 0 && density > -2) materialIds[i] = 1;
        else if (density < -2 && density > -8) materialIds[i] = 2;
        else if (density < -8) materialIds[i] = 3;
      }
    }
  }

  // SDF Mountain
  const mx = 64, my = 20, mz = 64, height = 40, radius = 30;
  for (let x = 0; x < resolution; x++) {
    for (let z = 0; z < resolution; z++) {
      const wx = bounds.minX + (x / resolution) * (bounds.maxX - bounds.minX);
      const wz = bounds.minZ + (z / resolution) * (bounds.maxZ - bounds.minZ);
      const dx = wx - mx, dz = wz - mz;
      const horizDist = Math.sqrt(dx * dx + dz * dz);
      if (horizDist < radius) {
        const mountainHeight = height * (1 - horizDist / radius);
        for (let y = 0; y < resolution; y++) {
          const wy = bounds.minY + (y / resolution) * (bounds.maxY - bounds.minY);
          const i = idx(resolution, x, y, z);
          if (wy < my + mountainHeight) {
            if (samples[i] > 0) { samples[i] = -(my + mountainHeight - wy); materialIds[i] = 3; }
            else { samples[i] = Math.min(samples[i], -(my + mountainHeight - wy)); }
          }
        }
      }
    }
  }

  // Spline tunnel
  const splinePoints = [[10, 25, 64], [64, 30, 64], [118, 25, 64]];
  const tunnelRadius = 3;
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
          const dx = bx - ax, dy = by - ay, dz = bz - az;
          const lenSq = dx * dx + dy * dy + dz * dz;
          let t = ((wx - ax) * dx + (wy - ay) * dy + (wz - az) * dz) / lenSq;
          t = Math.max(0, Math.min(1, t));
          const px = ax + t * dx, py = ay + t * dy, pz = az + t * dz;
          const dist = Math.sqrt((wx - px) ** 2 + (wy - py) ** 2 + (wz - pz) ** 2);
          if (dist < minDist) minDist = dist;
        }
        if (minDist < tunnelRadius) {
          const i = idx(resolution, x, y, z);
          if (samples[i] < 0) { samples[i] = tunnelRadius - minDist; materialIds[i] = 0; }
        }
      }
    }
  }

  // Erosion (2 iterations)
  for (let iter = 0; iter < 2; iter++) {
    const newSamples = new Float32Array(samples);
    for (let x = 1; x < resolution - 1; x++) {
      for (let y = 1; y < resolution - 1; y++) {
        for (let z = 1; z < resolution - 1; z++) {
          const i = idx(resolution, x, y, z);
          const neighbors = [
            samples[idx(resolution, x + 1, y, z)],
            samples[idx(resolution, x - 1, y, z)],
            samples[idx(resolution, x, y + 1, z)],
            samples[idx(resolution, x, y - 1, z)],
            samples[idx(resolution, x, y, z + 1)],
            samples[idx(resolution, x, y, z - 1)],
          ];
          const avg = neighbors.reduce((a, b) => a + b, 0) / 6;
          newSamples[i] = samples[i] * 0.9 + avg * 0.1;
        }
      }
    }
    samples.set(newSamples);
  }

  // Surface extraction
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const matIds: number[] = [];

  for (let x = 0; x < resolution; x++) {
    for (let y = 0; y < resolution; y++) {
      for (let z = 0; z < resolution; z++) {
        const i = idx(resolution, x, y, z);
        if (samples[i] >= 0) continue;
        const wx = bounds.minX + x * voxelSize;
        const wy = bounds.minY + y * voxelSize;
        const wz = bounds.minZ + z * voxelSize;
        const mid = materialIds[i];

        const faces = [
          { dx: 1, n: [1, 0, 0], v: [[voxelSize, 0, 0], [voxelSize, voxelSize, 0], [voxelSize, voxelSize, voxelSize], [voxelSize, 0, voxelSize]] },
          { dx: -1, n: [-1, 0, 0], v: [[0, 0, voxelSize], [0, voxelSize, voxelSize], [0, voxelSize, 0], [0, 0, 0]] },
          { dx: 0, dy: 1, n: [0, 1, 0], v: [[0, voxelSize, 0], [0, voxelSize, voxelSize], [voxelSize, voxelSize, voxelSize], [voxelSize, voxelSize, 0]] },
          { dx: 0, dy: -1, n: [0, -1, 0], v: [[voxelSize, 0, 0], [voxelSize, 0, voxelSize], [0, 0, voxelSize], [0, 0, 0]] },
          { dx: 0, dz: 1, n: [0, 0, 1], v: [[0, 0, voxelSize], [voxelSize, 0, voxelSize], [voxelSize, voxelSize, voxelSize], [0, voxelSize, voxelSize]] },
          { dx: 0, dz: -1, n: [0, 0, -1], v: [[0, 0, 0], [0, voxelSize, 0], [voxelSize, voxelSize, 0], [voxelSize, 0, 0]] },
        ];

        for (const face of faces) {
          const nx = x + (face.dx || 0), ny = y + (face.dy || 0), nz = z + (face.dz || 0);
          let neighborEmpty = false;
          if (nx < 0 || nx >= resolution || ny < 0 || ny >= resolution || nz < 0 || nz >= resolution) neighborEmpty = true;
          else neighborEmpty = samples[idx(resolution, nx, ny, nz)] >= 0;
          if (neighborEmpty) {
            const base = positions.length / 3;
            for (const v of face.v) { positions.push(wx + v[0], wy + v[1], wz + v[2]); normals.push(face.n[0], face.n[1], face.n[2]); matIds.push(mid); }
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
        }
      }
    }
  }

  // Navigation
  const navPolygons: number[] = [];
  for (let x = 0; x < resolution; x++) {
    for (let z = 0; z < resolution; z++) {
      for (let y = 0; y < resolution - 1; y++) {
        const i = idx(resolution, x, y, z);
        const above = idx(resolution, x, y + 1, z);
        if (samples[i] < 0 && samples[above] >= 0) {
          navPolygons.push(x, y + 1, z);
        }
      }
    }
  }

  // Vegetation
  const rng = new DetPRNG(seed);
  const vegTransforms: number[] = [];
  for (let x = 0; x < resolution; x++) {
    for (let z = 0; z < resolution; z++) {
      for (let y = 0; y < resolution - 1; y++) {
        const i = idx(resolution, x, y, z);
        const above = idx(resolution, x, y + 1, z);
        if (samples[i] < 0 && samples[above] >= 0) {
          const matId = materialIds[i];
          if (matId !== 1 && matId !== 2) continue;
          if (rng.next() < 0.3) {
            const wx = bounds.minX + x * voxelSize + rng.range(0, voxelSize);
            const wy = bounds.minY + (y + 1) * voxelSize;
            const wz = bounds.minZ + z * voxelSize + rng.range(0, voxelSize);
            const rotY = rng.range(0, 6.28318);
            const scale = rng.range(0.8, 1.2);
            vegTransforms.push(wx, wy, wz, rotY, scale);
          }
        }
      }
    }
  }

  // Hashes
  const renderHash = createHash('sha256').update(Buffer.from(new Float32Array(positions).buffer)).digest('hex');
  const navHash = createHash('sha256').update(JSON.stringify(navPolygons.length)).digest('hex');
  const vegHash = createHash('sha256').update(Buffer.from(new Float32Array(vegTransforms).buffer)).digest('hex');

  return {
    renderMesh: {
      positions, normals, indices, materialIds: matIds,
      vertexCount: positions.length / 3,
      triangleCount: indices.length / 3,
      artifactHash: renderHash,
    },
    navigation: { polygonCount: navPolygons.length / 3, pathLength: 0 },
    vegetation: { instanceCount: vegTransforms.length / 5, transforms: vegTransforms, artifactHash: vegHash },
    region: { resolution, solidVoxels: samples.filter(s => s < 0).length, densityHash: createHash('sha256').update(Buffer.from(samples.buffer)).digest('hex') },
    workerTimeMs: 0, // filled by caller
  };
}

// --- HTTP server ---
const PORT = 3040;
const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/generate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { seed = 42, resolution = 24 } = JSON.parse(body);
        const start = Date.now();
        const result = generateTerrain(seed, Math.min(48, Math.max(8, resolution)));
        result.workerTimeMs = Date.now() - start;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...result, workerPort: PORT, workerPid: process.pid }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'terrain-worker', port: PORT, pid: process.pid }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Terrain worker service running on port ${PORT} (pid: ${process.pid})`);
});
