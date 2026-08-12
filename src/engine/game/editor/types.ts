/**
 * game/editor/types.ts — the editor's component model.
 *
 * Every authored thing in the world (house, well, villager, ground strip,
 * water ribbon, chunk, sky, sun) registers as a SELECTABLE COMPONENT with
 * a parameter schema — the Blender model: pick it, edit its parameters,
 * move it with gizmos, and the change is real. Component edits are plain
 * data (the editor never mutates the deterministic field unless told to),
 * so the world stays lawful and replayable.
 */

import * as THREE from 'three';

export type ParamKind = 'number' | 'color' | 'toggle' | 'select' | 'label';

export interface ParamDef {
  id: string;
  label: string;
  kind: ParamKind;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  /** Read the current value for the panel. */
  get: () => number | string | boolean;
  /** Apply a new value. */
  set: (value: number | string | boolean) => void;
}

export interface SelectableComponent {
  /** Stable id, e.g. "house_wang_ergou". */
  id: string;
  /** Component type: house | well | shrine | gate | ground | water | villager | terrain | sky | sun. */
  type: string;
  /** Human label. */
  label: string;
  /** The object the gizmos attach to (a Group or the Mesh). */
  root: THREE.Object3D;
  /** World-space bounds (for marquee selection). */
  bounds: THREE.Box3;
  /** Editable parameters. */
  params: ParamDef[];
  /** Called when a transform gizmo moves the component (persist hook). */
  onTransform?: () => void;
}

/** The registry of every selectable component in the world. */
export class EditorRegistry {
  readonly components = new Map<string, SelectableComponent>();
  /** Mesh → component id (raycast resolution). */
  private meshOwner = new Map<THREE.Object3D, string>();

  register(c: SelectableComponent): void {
    this.components.set(c.id, c);
    c.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) this.meshOwner.set(o, c.id);
    });
  }

  unregister(id: string): void {
    const c = this.components.get(id);
    if (!c) return;
    this.components.delete(id);
    for (const [mesh, owner] of this.meshOwner) {
      if (owner === id) this.meshOwner.delete(mesh);
    }
  }

  /** Resolve a raycast hit to its component (walk up to the registered root). */
  resolve(hit: THREE.Object3D): SelectableComponent | null {
    let o: THREE.Object3D | null = hit;
    while (o) {
      const id = this.meshOwner.get(o);
      if (id) return this.components.get(id) ?? null;
      o = o.parent;
    }
    return null;
  }

  /** All components of a type. */
  ofType(type: string): SelectableComponent[] {
    return [...this.components.values()].filter((c) => c.type === type);
  }

  /** Recompute a component's world bounds (after a transform). */
  refreshBounds(id: string): void {
    const c = this.components.get(id);
    if (!c) return;
    c.bounds = new THREE.Box3().setFromObject(c.root);
  }

  /** Components whose bounds intersect an axis-aligned box (marquee). */
  inBox(box: THREE.Box3): SelectableComponent[] {
    const out: SelectableComponent[] = [];
    for (const c of this.components.values()) {
      if (c.bounds.intersectsBox(box)) out.push(c);
    }
    return out;
  }
}
