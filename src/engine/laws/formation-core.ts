/**
 * laws/formation-core.ts — FormationCore + TerritoryAnchor + ProtectedDomain
 * ==========================================================================
 *
 * Formations are geometric qi-circuits with explicit node/edge topology
 * (doc 16 §2). This file implements the *standing structure* side: a
 * FormationCore (nodes/lines/core, realm-gated, quality-rated) anchored to
 * a TerritoryAnchor, protecting a ProtectedDomain (bounded area of effect)
 * with per-domain restriction reinforcement multipliers.
 *
 * Geometry kinds (all deterministic, IEEE-754 only):
 *   - RadiusDomain:        sphere (analytic sphere-sphere intersection)
 *   - PolygonDomain:       2D polygon extruded vertically (deterministic
 *                           grid sampling for circle overlap)
 *   - VolumeMask:          explicit 3D cells (cell-center inclusion count)
 *   - ConformalSurfaceDomain: thin shell around a center (spherical-cap
 *                           approximation of the median sphere)
 *
 * FormationLoadEvent: incomingAuthority vs effectiveCapacity →
 *   stress = incoming / effectiveCapacity
 *   < 0.5   absorbed        (resisted = incoming, penetrated = 0)
 *   0.5–0.9 strained        (resisted = incoming, penetrated = 0)
 *   0.9–1.0 fractured       (at capacity — resisted = capacity)
 *   1.0–1.5 partial-breach  (penetrates past capacity)
 *   > 1.5   breached        (penetrated = incoming − capacity)
 *
 * effectiveCapacity = capacity × nodeQuality × coreCoherence × persistence
 * (each 0..1; defaults 1.0). [DERIVED] from doc 16 §2.5 quality factors.
 */

import type { Realm, Vec3Tuple } from './types';
import { LAW_DOMAINS } from './types';
import type { LawDomain } from './types';

/** The five phases (doc 00 §6) — defined locally to keep laws standalone. */
export type PhaseName = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

// ---------------------------------------------------------------------------
// Formation structure (doc 16 §2.2 — nodes, lines, core, boundary)
// ---------------------------------------------------------------------------

export type FormationTier = 'simple' | 'complex' | 'domain-level' | 'ancestral' | 'law-spatial';

export interface FormationNode {
  nodeId: string;
  position: Vec3Tuple;
  phase: PhaseName;
  /** Node material quality 0..1 (doc 16 §2.5 factor 3). */
  quality: number;
  /** Spirit-vein anchored nodes are effectively permanent. */
  veinAnchored: boolean;
}

export interface FormationLine {
  lineId: string;
  from: string;
  to: string;
  /** Line precision 0..1 (doc 16 §2.5 factor 2). */
  precision: number;
}

export interface FormationCore {
  formationId: string;
  name: string;
  tier: FormationTier;
  nodes: FormationNode[];
  lines: FormationLine[];
  phase: PhaseName;
  /** Realm required to inscribe (doc 16 §2.7). */
  inscriberRealm: Realm;
  /** Base authority capacity (arbitrary linear authority units). */
  capacity: number;
  /** 0..1 node quality aggregate. */
  nodeQuality: number;
  /** 0..1 core coherence (doc 16 §2.5 factor 5). */
  coreCoherence: number;
  /** 0..1 persistence (ambient-qi sustain, doc 16 §2.3 step 6). */
  persistence: number;
  /** Per-domain restriction reinforcement multipliers (>1 reinforces the
   *  local law stack of that category; e.g. a ward strengthens matter). */
  restrictionMultipliers: Partial<Record<LawDomain, number>>;
  /** Bounded load history (last N events). */
  loadHistory: FormationLoadEvent[];
}

export interface FormationLoadEvent {
  eventId: string;
  formationId: string;
  tick: number;
  incomingAuthority: number;
  resistedAuthority: number;
  penetratedAuthority: number;
  stress: number;
  result: FormationLoadResult;
}

export type FormationLoadResult =
  | 'absorbed'
  | 'strained'
  | 'fractured'
  | 'partial-breach'
  | 'breached';

export type FormationFailureMode =
  | 'disrupted-nodes'
  | 'conflicting-lines'
  | 'insufficient-ambient-qi'
  | 'contamination'
  | 'core-collapse';

export function createFormationCore(config: Partial<FormationCore> & { formationId: string; capacity: number }): FormationCore {
  return {
    formationId: config.formationId,
    name: config.name ?? config.formationId,
    tier: config.tier ?? 'simple',
    nodes: config.nodes ?? [],
    lines: config.lines ?? [],
    phase: config.phase ?? 'earth',
    inscriberRealm: config.inscriberRealm ?? 'foundation_establishment',
    capacity: config.capacity,
    nodeQuality: config.nodeQuality ?? 1,
    coreCoherence: config.coreCoherence ?? 1,
    persistence: config.persistence ?? 1,
    restrictionMultipliers: config.restrictionMultipliers ?? {},
    loadHistory: config.loadHistory ?? [],
  };
}

/** Effective capacity after doc 16 §2.5 quality factors. */
export function effectiveFormationCapacity(core: FormationCore): number {
  return core.capacity * core.nodeQuality * core.coreCoherence * core.persistence;
}

export function evaluateFormationLoad(
  core: FormationCore,
  incomingAuthority: number,
  tick: number,
): FormationLoadEvent {
  const cap = Math.max(effectiveFormationCapacity(core), 1e-9);
  const stress = incomingAuthority / cap;
  let result: FormationLoadResult;
  if (stress < 0.5) result = 'absorbed';
  else if (stress < 0.9) result = 'strained';
  else if (stress <= 1.0) result = 'fractured';
  else if (stress <= 1.5) result = 'partial-breach';
  else result = 'breached';

  const resisted = Math.min(incomingAuthority, cap);
  const penetrated = Math.max(0, incomingAuthority - cap);

  const event: FormationLoadEvent = {
    eventId: `${core.formationId}:${tick}`,
    formationId: core.formationId,
    tick,
    incomingAuthority,
    resistedAuthority: Math.round(resisted * 1000) / 1000,
    penetratedAuthority: Math.round(penetrated * 1000) / 1000,
    stress: Math.round(stress * 1000) / 1000,
    result,
  };
  const history = [...core.loadHistory, event];
  while (history.length > 64) history.shift();
  core.loadHistory = history;
  return event;
}

/**
 * [DERIVED] How much of the geometric protection a formation retains after
 * a load: absorbed/strained hold fully; fractured takes structural damage;
 * partial-breach leaks; breached retains only a residual.
 */
export function protectionRetention(result: FormationLoadResult): number {
  switch (result) {
    case 'absorbed': return 1.0;
    case 'strained': return 1.0;
    case 'fractured': return 0.9;
    case 'partial-breach': return 0.6;
    case 'breached': return 0.2;
  }
}

// ---------------------------------------------------------------------------
// Territory anchor
// ---------------------------------------------------------------------------

export interface TerritoryAnchor {
  anchorId: string;
  position: Vec3Tuple;
  formationId: string;
  /** 0..1 — a destroyed anchor seals the surface trace (doc 24 §2.7). */
  integrity: number;
}

// ---------------------------------------------------------------------------
// Protected domains (geometry)
// ---------------------------------------------------------------------------

export type ProtectedDomainGeometry =
  | { kind: 'radius'; center: Vec3Tuple; radius: number }
  | { kind: 'polygon'; vertices: Vec3Tuple[]; height: number }
  | { kind: 'volume-mask'; cells: Vec3Tuple[]; cellSize: number }
  | { kind: 'conformal-surface'; center: Vec3Tuple; radius: number; thickness: number };

export interface ProtectedDomain {
  domainId: string;
  formationId: string;
  geometry: ProtectedDomainGeometry;
}

/** Exact volume of the intersection of two spheres (IEEE-754). */
export function sphereIntersectionVolume(
  c1: Vec3Tuple,
  r1: number,
  c2: Vec3Tuple,
  r2: number,
): number {
  const dx = c1[0] - c2[0];
  const dy = c1[1] - c2[1];
  const dz = c1[2] - c2[2];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) {
    const small = Math.min(r1, r2);
    return (4 / 3) * Math.PI * small * small * small;
  }
  // Spherical-cap formula for partial overlap.
  const h1 = r1 - (d * d + r1 * r1 - r2 * r2) / (2 * d);
  const h2 = r2 - (d * d + r2 * r2 - r1 * r1) / (2 * d);
  const cap = (h: number, r: number) => (Math.PI * h * h * (3 * r - h)) / 3;
  return cap(Math.max(0, h1), r1) + cap(Math.max(0, h2), r2);
}

function sphereVolume(r: number): number {
  return (4 / 3) * Math.PI * r * r * r;
}

/** Point in polygon (ray-casting on the x/z plane; deterministic). */
function pointInPolygon(px: number, pz: number, vertices: Vec3Tuple[]): boolean {
  let inside = false;
  const n = vertices.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i][0];
    const zi = vertices[i][2];
    const xj = vertices[j][0];
    const zj = vertices[j][2];
    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Deterministic grid sampling of circle ∩ polygon (64×64 samples). */
function circlePolygonOverlapFraction(cx: number, cz: number, r: number, vertices: Vec3Tuple[]): number {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const v of vertices) {
    if (v[0] < minX) minX = v[0];
    if (v[0] > maxX) maxX = v[0];
    if (v[2] < minZ) minZ = v[2];
    if (v[2] > maxZ) maxZ = v[2];
  }
  const SAMPLES = 64;
  let hits = 0;
  let total = 0;
  for (let i = 0; i < SAMPLES; i++) {
    for (let j = 0; j < SAMPLES; j++) {
      const sx = minX + ((maxX - minX) * (i + 0.5)) / SAMPLES;
      const sz = minZ + ((maxZ - minZ) * (j + 0.5)) / SAMPLES;
      const dx = sx - cx;
      const dz = sz - cz;
      if (dx * dx + dz * dz <= r * r) {
        total++;
        if (pointInPolygon(sx, sz, vertices)) hits++;
      }
    }
  }
  return total > 0 ? hits / total : 0;
}

/**
 * Volume of a protected domain's intersection with a blast sphere, plus the
 * fraction of the blast sphere it covers. Fully deterministic.
 */
export function domainIntersectionWithSphere(
  domain: ProtectedDomain,
  center: Vec3Tuple,
  radius: number,
): { volumeM3: number; fractionOfSphere: number } {
  const blastVolume = sphereVolume(radius);
  let volume = 0;
  switch (domain.geometry.kind) {
    case 'radius': {
      volume = sphereIntersectionVolume(domain.geometry.center, domain.geometry.radius, center, radius);
      break;
    }
    case 'polygon': {
      const g = domain.geometry;
      const frac = circlePolygonOverlapFraction(center[0], center[2], radius, g.vertices);
      // Vertical overlap: domain extruded over [y0, y0+height]; blast sphere
      // vertically spans [cy−r, cy+r]. Fraction of that span inside the domain.
      const span = 2 * radius;
      const yMin = Math.max(center[1] - radius, g.vertices[0][1]);
      const yMax = Math.min(center[1] + radius, g.vertices[0][1] + g.height);
      const vFrac = span > 0 ? Math.max(0, (yMax - yMin) / span) : 0;
      volume = blastVolume * frac * Math.min(1, vFrac);
      break;
    }
    case 'volume-mask': {
      const g = domain.geometry;
      const cellVol = g.cellSize * g.cellSize * g.cellSize;
      let covered = 0;
      for (const cell of g.cells) {
        const dx = cell[0] - center[0];
        const dy = cell[1] - center[1];
        const dz = cell[2] - center[2];
        if (dx * dx + dy * dy + dz * dz <= radius * radius) covered += cellVol;
      }
      volume = covered;
      break;
    }
    case 'conformal-surface': {
      const g = domain.geometry;
      const medianVolume = sphereIntersectionVolume(g.center, g.radius, center, radius);
      const shellRatio = Math.min(1, g.thickness / Math.max(radius, 1e-9));
      volume = medianVolume * shellRatio;
      break;
    }
  }
  const fraction = blastVolume > 0 ? Math.min(1, volume / blastVolume) : 0;
  return { volumeM3: volume, fractionOfSphere: fraction };
}

/** Does a point lie inside a protected domain? */
export function domainContains(domain: ProtectedDomain, point: Vec3Tuple): boolean {
  switch (domain.geometry.kind) {
    case 'radius': {
      const dx = point[0] - domain.geometry.center[0];
      const dy = point[1] - domain.geometry.center[1];
      const dz = point[2] - domain.geometry.center[2];
      return dx * dx + dy * dy + dz * dz <= domain.geometry.radius * domain.geometry.radius;
    }
    case 'polygon': {
      const g = domain.geometry;
      const baseY = g.vertices[0][1];
      if (point[1] < baseY || point[1] > baseY + g.height) return false;
      return pointInPolygon(point[0], point[2], g.vertices);
    }
    case 'volume-mask': {
      const g = domain.geometry;
      const h = g.cellSize / 2;
      return g.cells.some((c) =>
        Math.abs(c[0] - point[0]) <= h && Math.abs(c[1] - point[1]) <= h && Math.abs(c[2] - point[2]) <= h,
      );
    }
    case 'conformal-surface': {
      const g = domain.geometry;
      const dx = point[0] - g.center[0];
      const dy = point[1] - g.center[1];
      const dz = point[2] - g.center[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      return Math.abs(dist - g.radius) <= g.thickness / 2;
    }
  }
}

/** Aggregate restriction reinforcement for a formation per domain. */
export function restrictionMultiplierFor(core: FormationCore, domain: LawDomain): number {
  return core.restrictionMultipliers[domain] ?? 1;
}

export function lawDomainKeys(): LawDomain[] {
  return [...LAW_DOMAINS];
}
