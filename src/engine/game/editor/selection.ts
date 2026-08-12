/**
 * game/editor/selection.ts — click / double-click / marquee selection with
 * Blender-style transform gizmos (three.js TransformControls).
 *
 * Edit mode (Tab): left-drag orbits nothing — the pointer is free. Click
 * selects the component under the cursor; double-click opens its panel;
 * drag with the gizmo moves/rotates/scales; drag on empty ground with the
 * right button draws a marquee that selects every component inside.
 */

import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { EditorRegistry, SelectableComponent } from './types';

export class SelectionManager {
  readonly selected: SelectableComponent[] = [];
  readonly gizmo: TransformControls;
  private highlight: THREE.LineSegments | null = null;
  private registry: EditorRegistry;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private marquee: THREE.Mesh | null = null;
  private marqueeStart: { x: number; y: number } | null = null;

  /** Edit mode is ON (Tab toggles). */
  enabled = false;

  constructor(registry: EditorRegistry, scene: THREE.Scene, camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.registry = registry;
    this.scene = scene;
    this.camera = camera;
    this.gizmo = new TransformControls(camera, dom);
    this.gizmo.addEventListener('dragging-changed', (e) => {
      if ((e as unknown as { value: boolean }).value && this.onDragging) this.onDragging(true);
    });
    this.gizmo.addEventListener('objectChange', () => {
      for (const c of this.selected) {
        this.registry.refreshBounds(c.id);
        c.onTransform?.();
      }
      if (this.onChanged) this.onChanged();
    });
  }

  /** Callbacks (panel + bootstrap wire these). */
  onSelectionChanged: (() => void) | null = null;
  onDragging: ((dragging: boolean) => void) | null = null;
  onChanged: (() => void) | null = null;

  /** Set edit mode: enable the gizmo + release the pointer. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) {
      if (this.selected.length === 1) this.gizmo.attach(this.selected[0].root);
    } else {
      this.gizmo.detach();
      this.clear();
    }
  }

  /** Click: select the component under the cursor (raycast). */
  click(ndcX: number, ndcY: number): SelectableComponent | null {
    if (!this.enabled) return null;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    if (hits.length === 0) return null;
    const comp = this.registry.resolve(hits[0].object);
    if (comp) this.select([comp]);
    return comp;
  }

  /** Select a set of components (marquee or click). */
  select(list: SelectableComponent[]): void {
    this.clear();
    this.selected.push(...list);
    this.gizmo.detach();
    if (list.length === 1) this.gizmo.attach(list[0].root);
    this.refreshHighlight();
    this.onSelectionChanged?.();
  }

  /** Clear the selection. */
  clear(): void {
    this.selected.length = 0;
    this.gizmo.detach();
    this.removeHighlight();
  }

  /** Start a marquee at a screen point. */
  startMarquee(sx: number, sy: number): void {
    if (!this.enabled) return;
    this.marqueeStart = { x: sx, y: sy };
    if (!this.marquee) {
      const geo = new THREE.PlaneGeometry(1, 1);
      this.marquee = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0x40e0a0, transparent: true, opacity: 0.25, depthTest: false, depthWrite: false }),
      );
      this.marquee.renderOrder = 999;
      this.scene.add(this.marquee);
    }
  }

  /** Update the marquee rect and live-select the enclosed components. */
  updateMarquee(sx: number, sy: number): void {
    if (!this.marqueeStart || !this.marquee) return;
    const x = Math.min(this.marqueeStart.x, sx);
    const y = Math.min(this.marqueeStart.y, sy);
    const w = Math.abs(sx - this.marqueeStart.x);
    const h = Math.abs(sy - this.marqueeStart.y);
    this.marquee.position.set(x + w / 2, y + h / 2, 0);
    this.marquee.scale.set(w, h, 1);
  }

  /** Finish the marquee: select everything inside the screen rect. */
  endMarquee(sx: number, sy: number): void {
    if (!this.marqueeStart || !this.marquee) return;
    const rect = {
      x: Math.min(this.marqueeStart.x, sx),
      y: Math.min(this.marqueeStart.y, sy),
      w: Math.abs(sx - this.marqueeStart.x),
      h: Math.abs(sy - this.marqueeStart.y),
    };
    this.marqueeStart = null;
    this.marquee.scale.set(0, 0, 1);
    if (rect.w < 4 && rect.h < 4) return; // a click, not a marquee
    // unproject the rect corners to world rays and gather the box
    const ndcMin = this.toNDC(rect.x, rect.y + rect.h);
    const ndcMax = this.toNDC(rect.x + rect.w, rect.y);
    const hits = this.raycastRect(ndcMin.x, ndcMin.y, ndcMax.x, ndcMax.y);
    const comps = [...new Set(hits.map((h) => this.registry.resolve(h)).filter((c): c is SelectableComponent => !!c))];
    if (comps.length) this.select(comps);
  }

  private toNDC(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx / window.innerWidth) * 2 - 1, y: -(sy / window.innerHeight) * 2 + 1 };
  }

  /** Cast a grid of rays across the rect (cheap) and return the objects. */
  private raycastRect(x0: number, y0: number, x1: number, y1: number): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    for (let gx = 0; gx <= 4; gx++) {
      for (let gy = 0; gy <= 4; gy++) {
        const nx = x0 + (x1 - x0) * (gx / 4);
        const ny = y0 + (y1 - y0) * (gy / 4);
        this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
        const hits = this.raycaster.intersectObjects(this.scene.children, true);
        if (hits[0]) out.push(hits[0].object);
      }
    }
    return out;
  }

  /** Gizmo mode: translate | rotate | scale. */
  setMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.gizmo.setMode(mode);
  }

  private refreshHighlight(): void {
    this.removeHighlight();
    if (this.selected.length === 0) return;
    const box = new THREE.Box3();
    for (const c of this.selected) box.union(c.bounds);
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z));
    this.highlight = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x40e0a0, depthTest: false }));
    this.highlight.position.copy(box.getCenter(new THREE.Vector3()));
    this.highlight.renderOrder = 998;
    this.highlight.frustumCulled = false;
    this.scene.add(this.highlight);
  }

  private removeHighlight(): void {
    if (this.highlight) {
      this.scene.remove(this.highlight);
      this.highlight.geometry.dispose();
      this.highlight = null;
    }
  }
}
