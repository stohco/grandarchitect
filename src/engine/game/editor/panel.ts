/**
 * game/editor/panel.ts — the edit-mode parameter panel (Blender-like).
 *
 * Tab toggles edit mode. With edit mode on: click selects a component
 * (gizmos appear), double-click opens this panel, W/E/R switch
 * translate/rotate/scale, drag on empty ground draws a marquee. The panel
 * lists every editable parameter of the selection as inputs/sliders/color
 * pickers. Terrain edits use the brush row (mode, radius, strength) —
 * click-drag on the ground with the left button paints the stroke.
 */

import * as THREE from 'three';
import type { EditorRegistry, SelectableComponent } from './types';
import type { SelectionManager } from './selection';
import type { TerrainEditStore, BrushMode } from './terrain-edit';
import type { PlanetMount } from '../planet/planet-mount';
import type { WorldValidator, BurialLedger, ValidatorReport } from './world-validator';

export class EditorPanel {
  private el: HTMLDivElement;
  private status: HTMLDivElement;
  private selection: SelectionManager;
  private registry: EditorRegistry;
  private terrain: TerrainEditStore;
  private planet: PlanetMount;
  private camera: THREE.PerspectiveCamera;
  private dom: HTMLElement;
  private brushMode: BrushMode = 'raise';
  private brushRadius = 8;
  private brushStrength = 1.5;
  private painting = false;
  private validator: WorldValidator | null = null;
  private ledger: BurialLedger | null = null;

  /** Attach the law-checker (bootstrap wires this). */
  setValidator(v: WorldValidator, l: BurialLedger): void {
    this.validator = v;
    this.ledger = l;
  }

  /** Render the validation report (F5) in the panel. */
  showValidation(report: ValidatorReport): void {
    const lines: string[] = ['<b style="color:#e6c98f">WORLD LAWS</b>'];
    const rows: string[] = [];
    for (const v of report.grounded) rows.push(`<span style="color:#ff8a6a">FLOATING/CLIPPING: ${v.diagnosis}</span>`);
    for (const v of report.water) rows.push(`<span style="color:#ffb860">WATER: ${v.diagnosis}</span>`);
    for (const v of report.terrain) rows.push(`<span style="color:#ffb860">TERRAIN: ${v.diagnosis}</span>`);
    for (const s of report.semantic) rows.push(`<span style="color:#ffd080">SEMANTIC: ${s}</span>`);
    if (rows.length === 0) rows.push('<span style="color:#80e0a0">The world obeys the laws.</span>');
    rows.push(`<div style="opacity:0.6;margin-top:4px">F5 re-check · B: bury selection (emergence) · Ctrl+S: export world</div>`);
    this.el.innerHTML = lines.concat(rows).join('<br>');
    this.el.style.display = 'block';
  }

  constructor(
    selection: SelectionManager,
    registry: EditorRegistry,
    terrain: TerrainEditStore,
    planet: PlanetMount,
    camera: THREE.PerspectiveCamera,
    dom: HTMLElement,
  ) {
    this.selection = selection;
    this.registry = registry;
    this.terrain = terrain;
    this.planet = planet;
    this.camera = camera;
    this.dom = dom;

    this.el = document.createElement('div');
    this.el.style.cssText = 'position:fixed;right:8px;top:8px;width:280px;max-height:80vh;overflow:auto;background:rgba(18,20,24,0.92);border:1px solid rgba(230,201,143,0.25);border-radius:8px;padding:10px;font:12px/1.5 monospace;color:#e0d8c8;display:none;z-index:2000;';
    this.status = document.createElement('div');
    this.status.style.cssText = 'position:fixed;left:8px;top:8px;font:12px monospace;color:rgba(230,220,200,0.85);background:rgba(18,20,24,0.7);padding:4px 8px;border-radius:4px;display:none;z-index:2000;pointer-events:none;';
    document.body.appendChild(this.status);
    document.body.appendChild(this.el);

    selection.onSelectionChanged = () => this.render();
    selection.onDragging = (d) => { this.painting = false; };
    selection.onChanged = () => this.render();
  }

  /** Toggle edit mode UI. */
  setEditMode(on: boolean): void {
    this.status.style.display = on ? 'block' : 'none';
    if (!on) this.el.style.display = 'none';
    this.status.textContent = 'EDIT MODE — click: select · double-click: panel · W/E/R: move/rotate/scale · drag on ground: brush · right-drag: marquee · Tab: exit';
  }

  setBrush(mode: BrushMode, radius: number, strength: number): void {
    this.brushMode = mode;
    this.brushRadius = radius;
    this.brushStrength = strength;
  }

  /** Terrain brush stroke at a screen point. */
  paintAt(sx: number, sy: number): void {
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects([...this.planet.chunks.values()], false);
    if (!hits[0]) return;
    const p = hits[0].point;
    this.terrain.stroke(p.x, p.z, this.brushRadius, this.brushStrength, this.brushMode);
    this.status.textContent = `EDIT MODE — brush: ${this.brushMode} r=${this.brushRadius} s=${this.brushStrength} @ (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) · U: undo`;
  }

  /** Render the panel for the current selection. */
  render(): void {
    const sel = this.selection.selected;
    if (sel.length === 0) { this.el.style.display = 'none'; return; }
    this.el.style.display = 'block';
    const rows: string[] = [];
    for (const c of sel) {
      rows.push(`<b style="color:#e6c98f">${c.label}</b> <span style="opacity:0.6">[${c.type}]</span>`);
      for (const p of c.params) {
        const cur = p.get();
        if (p.kind === 'color') {
          rows.push(`<label>${p.label} <input type="color" data-c="${c.id}" data-p="${p.id}" value="${cur}"></label>`);
        } else if (p.kind === 'toggle') {
          rows.push(`<label>${p.label} <input type="checkbox" data-c="${c.id}" data-p="${p.id}" ${cur ? 'checked' : ''}></label>`);
        } else if (p.kind === 'select') {
          rows.push(`<label>${p.label} <select data-c="${c.id}" data-p="${p.id}">${(p.options ?? []).map((o) => `<option ${o === cur ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`);
        } else if (p.kind === 'label') {
          rows.push(`<div style="opacity:0.6">${p.label}: ${cur}</div>`);
        } else {
          rows.push(`<label>${p.label} <input type="range" data-c="${c.id}" data-p="${p.id}" min="${p.min ?? 0}" max="${p.max ?? 100}" step="${p.step ?? 0.1}" value="${cur}"> <span data-v="${p.id}">${cur}</span></label>`);
        }
      }
    }
    // the terrain brush row
    rows.push('<hr style="border-color:rgba(230,201,143,0.2)">');
    rows.push(`<label>Brush <select id="editor-brush-mode"><option ${this.brushMode === 'raise' ? 'selected' : ''}>raise</option><option ${this.brushMode === 'lower' ? 'selected' : ''}>lower</option><option ${this.brushMode === 'flatten' ? 'selected' : ''}>flatten</option><option ${this.brushMode === 'smooth' ? 'selected' : ''}>smooth</option></select></label>`);
    rows.push(`<label>Radius <input type="range" id="editor-brush-r" min="2" max="40" step="1" value="${this.brushRadius}"> <span>${this.brushRadius}</span></label>`);
    rows.push(`<label>Strength <input type="range" id="editor-brush-s" min="0.1" max="10" step="0.1" value="${this.brushStrength}"> <span>${this.brushStrength}</span></label>`);
    rows.push('<div style="opacity:0.6;margin-top:4px">U — undo brush · click ground to paint</div>');
    this.el.innerHTML = rows.join('<br>');

    // wire the inputs
    this.el.querySelectorAll('input[type=color]').forEach((i) => {
      const input = i as HTMLInputElement;
      input.addEventListener('input', () => {
        const c = input.getAttribute('data-c')!, p = input.getAttribute('data-p')!;
        const comp = this.findComponent(c);
        comp?.params.find((x) => x.id === p)?.set(input.value);
      });
    });
    this.el.querySelectorAll('input[type=range]').forEach((i) => {
      const input = i as HTMLInputElement;
      input.addEventListener('input', () => {
        const c = input.getAttribute('data-c')!, p = input.getAttribute('data-p')!;
        if (c === '__brush') {
          if (p === 'r') { this.brushRadius = Number(input.value); }
          else { this.brushStrength = Number(input.value); }
          this.render();
          return;
        }
        const comp = this.findComponent(c);
        comp?.params.find((x) => x.id === p)?.set(Number(input.value));
        const span = input.parentElement?.querySelector<HTMLSpanElement>(`[data-v="${p}"]`);
        if (span) span.textContent = input.value;
      });
    });
    this.el.querySelectorAll('select').forEach((s) => {
      const sel = s as HTMLSelectElement;
      sel.addEventListener('change', () => {
        if (sel.id === 'editor-brush-mode') { this.brushMode = sel.value as BrushMode; return; }
        const c = sel.getAttribute('data-c')!, p = sel.getAttribute('data-p')!;
        this.findComponent(c)?.params.find((x) => x.id === p)?.set(sel.value);
      });
    });
  }

  private findComponent(id: string): SelectableComponent | undefined {
    return this.registry.components.get(id);
  }
}
