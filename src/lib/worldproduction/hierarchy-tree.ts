/**
 * World Hierarchy Tree — the deep collapsible world model.
 *
 * Levels: World -> Region -> Settlement -> Structure -> Room -> Fixture/Prop
 * (with NPC, material, and scale leaves). The studio sidebar renders this
 * as a deeply collapsible tree; the production pipeline consumes it as the
 * authoritative organization of the set.
 */

import { WANG_FAMILY_BEND } from './set-blueprint';
import type { SetSettlement } from './set-blueprint';
import { ALL_DEFINITIONS } from '../engine/definitions/index';
import type { Definition } from '../engine/definitions';
import { scaleById } from './scale-registry';

export type TreeNodeKind =
  | 'world' | 'region' | 'settlement' | 'structure' | 'room' | 'fixture'
  | 'prop' | 'npc' | 'material' | 'scale' | 'system' | 'eco' | 'qi';

export interface TreeNode {
  id: string;
  name: string;
  kind: TreeNodeKind;
  /** Deep-link ids for the outliner (structure/room/prop ids). */
  refId?: string;
  /** canonical scale id when the node is dimensional. */
  scaleId?: string;
  children: TreeNode[];
  meta?: Record<string, string>;
}

function defName(id: string): string {
  const d = ALL_DEFINITIONS.find((x: Definition) => x.id === id);
  return d ? d.name : id;
}

function scaleNote(scaleId: string | undefined): string | undefined {
  if (!scaleId || scaleId === 'scale.custom') return undefined;
  const s = scaleById(scaleId);
  return s ? `${s.name} ${s.min}-${s.max} m` : undefined;
}

/** Build the full tree from the set blueprint + the definition database. */
export function buildWorldTree(): TreeNode {
  const world: TreeNode = {
    id: 'world.cangwu', name: 'Cangwu World (Planet Suzaku)', kind: 'world', children: [],
  };

  const region: TreeNode = {
    id: 'region.cangli_riverlands', name: 'Cangli Riverlands', kind: 'region', children: [],
  };
  world.children.push(region);

  const settlement: TreeNode = {
    id: WANG_FAMILY_BEND.id,
    name: WANG_FAMILY_BEND.name,
    kind: 'settlement',
    scaleId: WANG_FAMILY_BEND.scaleId,
    meta: {
      population: `${WANG_FAMILY_BEND.population}`,
      extent: `${WANG_FAMILY_BEND.w} × ${WANG_FAMILY_BEND.d} m`,
      qi: WANG_FAMILY_BEND.qi,
      geography: WANG_FAMILY_BEND.geography,
      ecology: WANG_FAMILY_BEND.ecology,
    },
    children: [],
  };
  region.children.push(settlement);

  // systems + ecology + qi as collapsible groups
  settlement.children.push({
    id: 'sys.world-rule', name: 'World Rules & Laws', kind: 'system', children: [
      { id: 'sys.law-stack', name: 'Local Law Stack', kind: 'system', children: [], meta: { note: 'realm law + world law + regional anomaly + formation domains (law-interaction-solver)' } },
      { id: 'sys.tiers', name: 'Simulation Tiers S0-S4', kind: 'system', children: [], meta: { note: 'aggregate -> embodied truth; transitions conservation-checked' } },
    ],
  });
  settlement.children.push({
    id: 'eco.cangwu', name: 'Ecology (Cangwu roster)', kind: 'eco',
    children: ALL_DEFINITIONS.filter((d) => d.kind === 'beast' || d.kind === 'herb').map((d) => ({
      id: `eco.${d.id}`, name: d.name, kind: d.kind === 'beast' ? 'eco' : 'eco', refId: d.id,
      children: [], meta: { source: d.source },
    })),
  });
  settlement.children.push({
    id: 'qi.spirit-veins', name: 'Spirit Veins & Qi Field', kind: 'qi', children: [
      { id: 'qi.green-mirror', name: 'Green Mirror Vein (Cangwu Sect, 100 li west)', kind: 'qi', children: [], meta: { note: 'yin-dominant, water-phase primary, wood secondary (doc 31 §1)' } },
      { id: 'qi.cache-residue', name: 'Cache Formation Residue (foothill)', kind: 'qi', children: [], meta: { note: 'failed concealment restriction; hum audible (doc 28 §2.2)' } },
    ],
  });

  // structures
  for (const s of WANG_FAMILY_BEND.structures) {
    const structureNode: TreeNode = {
      id: s.id, name: s.name, kind: 'structure', refId: s.id,
      scaleId: s.scaleId,
      meta: {
        kind: s.kind,
        dimensions: `${s.w} × ${s.d} × ${s.h} m`,
        construction: s.construction,
        condition: s.condition,
        art: s.artDirection,
        camera: s.cameraNotes,
      },
      children: [],
    };

    // residents (npc leaf group)
    if (s.residents.length > 0) {
      structureNode.children.push({
        id: `${s.id}.residents`, name: 'Residents', kind: 'npc',
        children: s.residents.map((r) => ({
          id: r, name: defName(r), kind: 'npc', refId: r, children: [],
        })),
      });
    }

    // rooms with fixtures
    for (const room of s.rooms) {
      const roomNode: TreeNode = {
        id: room.id, name: room.name, kind: 'room', refId: room.id, scaleId: room.scaleId,
        meta: {
          purpose: room.purpose,
          dimensions: `${room.w} × ${room.d} × ${room.h} m`,
          lighting: room.lighting, smell: room.smell, sound: room.sound, detail: room.detail,
        },
        children: [],
      };
      for (const f of room.fixtures) {
        roomNode.children.push({
          id: f.id, name: f.name, kind: 'fixture', refId: f.id, scaleId: f.scaleId,
          children: [],
          meta: { dimensions: `${f.w} × ${f.d} × ${f.h} m`, material: f.material, detail: f.detail },
        });
      }
      structureNode.children.push(roomNode);
    }

    // exterior props
    const exteriorGroup: TreeNode = {
      id: `${s.id}.exterior`, name: 'Exterior & Props', kind: 'prop', children: [],
    };
    for (const p of s.exterior) {
      exteriorGroup.children.push({
        id: p.id, name: p.name, kind: 'prop', refId: p.id, scaleId: p.scaleId,
        children: [],
        meta: { dimensions: `${p.w} × ${p.d} × ${p.h} m`, material: p.material, detail: p.detail },
      });
    }
    if (exteriorGroup.children.length > 0) structureNode.children.push(exteriorGroup);

    // materials leaf
    structureNode.children.push({
      id: `${s.id}.materials`, name: 'Materials', kind: 'material',
      children: s.materials.map((m) => ({ id: `${s.id}.mat.${m}`, name: m, kind: 'material', children: [] })),
    });

    // scale leaf
    const sn = scaleNote(s.scaleId);
    if (sn) {
      structureNode.children.push({ id: `${s.id}.scale`, name: `Scale: ${sn}`, kind: 'scale', children: [] });
    }

    settlement.children.push(structureNode);
  }

  return world;
}

/** Flatten the tree for search/filter. */
export function flattenTree(node: TreeNode): TreeNode[] {
  return [node, ...node.children.flatMap(flattenTree)];
}

export function treeStats(root: TreeNode): { nodes: number; leaves: number; maxDepth: number; byKind: Record<string, number> } {
  let leaves = 0;
  let maxDepth = 0;
  const byKind: Record<string, number> = {};
  const walk = (n: TreeNode, depth: number): void => {
    byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
    maxDepth = Math.max(maxDepth, depth);
    if (n.children.length === 0) leaves++;
    for (const c of n.children) walk(c, depth + 1);
  };
  walk(root, 1);
  return { nodes: flattenTree(root).length, leaves, maxDepth, byKind };
}
