/**
 * Live Architect Studio — 3D Viewport
 *
 * Three.js scene rendering the generated settlement with orbit navigation,
 * click selection, hover highlight, transform gizmo, render modes, grid,
 * camera presets, and a live stats overlay.
 */

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { useEditorStore, getEffective } from '@/lib/editor/store';
import type { SerializableStructure, StructureKind } from '@/lib/editor/types';

const COLORS: Record<StructureKind, { wall: number; roof: number; accent: number }> = {
  lineage_hall: { wall: 0x6b4423, roof: 0x9c3a2e, accent: 0xd4a017 },
  household: { wall: 0x7a5c3e, roof: 0x4a3a2a, accent: 0xb8915a },
  well: { wall: 0x8a8a82, roof: 0x5a5a52, accent: 0x3aa0a0 },
  threshing_ground: { wall: 0xc9a96a, roof: 0xc9a96a, accent: 0xc9a96a },
  mill: { wall: 0x6b4423, roof: 0x4a3a2a, accent: 0x8b6f47 },
  spirit_shrine: { wall: 0x9c3a2e, roof: 0x6b2a1e, accent: 0xd4a017 },
  dock: { wall: 0x6b5a4a, roof: 0x6b5a4a, accent: 0x8a7a6a },
  path: { wall: 0x9a8b6a, roof: 0x9a8b6a, accent: 0x9a8b6a },
  paddy: { wall: 0x4a7c3a, roof: 0x4a7c3a, accent: 0x2a5a5a },
  dryland_garden: { wall: 0x8a7a3a, roof: 0x8a7a3a, accent: 0x6a5a2a },
  graveyard: { wall: 0x6a6a6a, roof: 0x4a4a4a, accent: 0x8a8a8a },
  levee: { wall: 0x7a6a4a, roof: 0x7a6a4a, accent: 0x7a6a4a },
};

const GROUND_COLOR = 0x1a1f1a;
const GRID_COLOR = 0x2a3328;
const GRID_CENTER_COLOR = 0x3a4a38;
const WATER_COLOR = 0x2a6a6a;
const SELECTED_EMISSIVE = 0x10b981;
const HOVER_EMISSIVE = 0xf59e0b;

function makeMaterial(color: number, renderMode: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
  if (renderMode === 'wireframe') { mat.wireframe = true; mat.emissive = new THREE.Color(0x10b981); mat.emissiveIntensity = 0.15; }
  else if (renderMode === 'solid') { mat.flatShading = true; mat.color = new THREE.Color(0x5a6a58); }
  else if (renderMode === 'lit') { mat.roughness = 0.4; mat.metalness = 0.1; }
  return mat;
}

function buildStructureMesh(s: SerializableStructure, renderMode: string): THREE.Group {
  const group = new THREE.Group();
  group.userData.entityId = s.entityId;
  group.userData.kind = s.kind;
  const c = COLORS[s.kind];
  const w = Math.max(0.5, s.width);
  const d = Math.max(0.5, s.depth);

  switch (s.kind) {
    case 'lineage_hall': {
      const walls = new THREE.Mesh(new THREE.BoxGeometry(w, 6, d), makeMaterial(c.wall, renderMode));
      walls.position.y = 3; walls.castShadow = true; walls.receiveShadow = true; group.add(walls);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 2.4, d + 1.2), makeMaterial(c.roof, renderMode));
      roof.position.y = 7.2; roof.castShadow = true; group.add(roof);
      const step = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, 1.5), makeMaterial(c.accent, renderMode));
      step.position.set(0, 0.15, d / 2 + 0.6); group.add(step);
      break;
    }
    case 'household': {
      const walls = new THREE.Mesh(new THREE.BoxGeometry(w, 3.5, d), makeMaterial(c.wall, renderMode));
      walls.position.y = 1.75; walls.castShadow = true; walls.receiveShadow = true; group.add(walls);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 1.6, d + 0.8), makeMaterial(c.roof, renderMode));
      roof.position.y = 4.3; roof.castShadow = true; group.add(roof);
      break;
    }
    case 'mill': {
      const walls = new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), makeMaterial(c.wall, renderMode));
      walls.position.y = 2; walls.castShadow = true; group.add(walls);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, 2, 4), makeMaterial(c.roof, renderMode));
      roof.position.y = 5; roof.rotation.y = Math.PI / 4; group.add(roof);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.4, 12), makeMaterial(c.accent, renderMode));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(w / 2 + 0.8, 1.4, 0); group.add(wheel);
      break;
    }
    case 'spirit_shrine': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), makeMaterial(c.wall, renderMode));
      base.position.y = 0.3; group.add(base);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 1.8, d * 0.7), makeMaterial(c.wall, renderMode));
      body.position.y = 1.5; body.castShadow = true; group.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.6, 1, 4), makeMaterial(c.roof, renderMode));
      roof.position.y = 3; roof.rotation.y = Math.PI / 4; group.add(roof);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), makeMaterial(c.accent, renderMode));
      lantern.position.set(0, 2.4, d / 2 * 0.7); group.add(lantern);
      break;
    }
    case 'well': {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 1.2, 16), makeMaterial(c.wall, renderMode));
      ring.position.y = 0.6; group.add(ring);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(w / 2 - 0.2, w / 2 - 0.2, 0.2, 16), makeMaterial(c.accent, renderMode));
      water.position.y = 0.9; group.add(water);
      break;
    }
    case 'threshing_ground': {
      const ground = new THREE.Mesh(new THREE.CircleGeometry(Math.max(w, d) / 2, 24), makeMaterial(c.wall, renderMode));
      ground.rotation.x = -Math.PI / 2; ground.position.y = 0.04; ground.receiveShadow = true; group.add(ground);
      break;
    }
    case 'paddy': {
      const base = new THREE.Mesh(new THREE.PlaneGeometry(w, d), makeMaterial(c.accent, renderMode));
      base.rotation.x = -Math.PI / 2; base.position.y = 0.015; group.add(base);
      const rice = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, d * 0.92), makeMaterial(c.wall, renderMode));
      rice.rotation.x = -Math.PI / 2; rice.position.y = 0.03; group.add(rice);
      break;
    }
    case 'dryland_garden': {
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(w, d), makeMaterial(c.wall, renderMode));
      ground.rotation.x = -Math.PI / 2; ground.position.y = 0.015; group.add(ground);
      break;
    }
    case 'path': {
      const isRiver = s.name === 'Cangli River' || (s.metadata && s.metadata.fordable === true && s.depth > 10);
      if (isRiver) {
        const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: WATER_COLOR, transparent: true, opacity: 0.82, roughness: 0.3, metalness: 0.2 }));
        water.rotation.x = -Math.PI / 2; water.position.y = 0.01; water.receiveShadow = true; group.add(water);
      } else {
        const path = new THREE.Mesh(new THREE.PlaneGeometry(w, d), makeMaterial(c.wall, renderMode));
        path.rotation.x = -Math.PI / 2; path.position.y = 0.02; path.receiveShadow = true; group.add(path);
      }
      break;
    }
    case 'dock': {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), makeMaterial(c.wall, renderMode));
      plank.position.y = 0.4; plank.receiveShadow = true; group.add(plank);
      break;
    }
    case 'graveyard': {
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(w, d), makeMaterial(c.wall, renderMode));
      ground.rotation.x = -Math.PI / 2; ground.position.y = 0.015; ground.receiveShadow = true; group.add(ground);
      const count = 5 + (s.entityId % 4);
      for (let i = 0; i < count; i++) {
        const seed = (s.entityId * 31 + i * 7) % 100;
        const hx = ((seed % 10) / 10 - 0.5) * w * 0.7;
        const hz = (((seed * 3) % 10) / 10 - 0.5) * d * 0.7;
        const stone = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.2), makeMaterial(c.roof, renderMode));
        stone.position.set(hx, 0.4, hz); stone.castShadow = true; group.add(stone);
      }
      break;
    }
    case 'levee': {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), makeMaterial(c.wall, renderMode));
      bank.position.y = 0.6; bank.receiveShadow = true; group.add(bank);
      break;
    }
  }
  return group;
}

export default function Viewport3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const structGroupRef = useRef<THREE.Group | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const meshMapRef = useRef<Map<number, THREE.Group>>(new Map());
  const highlightRef = useRef<{ selected: THREE.LineSegments | null; hovered: THREE.LineSegments | null }>({ selected: null, hovered: null });
  const rafRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastFpsReportRef = useRef(0);
  const frameCountRef = useRef(0);
  const renderModeRef = useRef<string>('shaded');
  const currentSelRef = useRef<number | null>(null);

  const settlement = useEditorStore((s) => s.settlement);
  const edits = useEditorStore((s) => s.edits);
  const hiddenEntityIds = useEditorStore((s) => s.hiddenEntityIds);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const hoveredEntityId = useEditorStore((s) => s.hoveredEntityId);
  const transformMode = useEditorStore((s) => s.transformMode);
  const renderMode = useEditorStore((s) => s.renderMode);
  const showGrid = useEditorStore((s) => s.showGrid);
  const cameraPreset = useEditorStore((s) => s.cameraPreset);
  const cameraFocusEntity = useEditorStore((s) => s.cameraFocusEntity);
  const showStats = useEditorStore((s) => s.showStats);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);

  function handleGizmoCommit() {
    const tc = transformRef.current;
    if (!tc || currentSelRef.current === null) return;
    const obj = tc.object;
    if (!obj) return;
    const store = useEditorStore.getState();
    const id = currentSelRef.current;
    const base = getEffective(store.settlement, store.edits, id);
    if (!base) return;
    const mode = store.transformMode;
    if (mode === 'translate') {
      store.applyEdits([
        { entityId: id, field: 'position.x', value: Math.round(obj.position.x * 100) / 100 },
        { entityId: id, field: 'position.z', value: Math.round(obj.position.z * 100) / 100 },
      ]);
    } else if (mode === 'rotate') {
      store.applyEdits([{ entityId: id, field: 'rotation', value: Math.round(obj.rotation.y * 1000) / 1000 }]);
    } else if (mode === 'scale') {
      const newW = Math.max(0.5, Math.round(base.width * obj.scale.x * 100) / 100);
      const newD = Math.max(0.5, Math.round(base.depth * obj.scale.z * 100) / 100);
      store.applyEdits([{ entityId: id, field: 'width', value: newW }, { entityId: id, field: 'depth', value: newD }]);
    }
  }

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0f0e);
    scene.fog = new THREE.Fog(0x0e0f0e, 180, 420);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 2000);
    camera.position.set(120, 110, 150);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const hemi = new THREE.HemisphereLight(0x8a9a8a, 0x1a1a14, 0.55);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe9c4, 1.15);
    sun.position.set(80, 140, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -200; sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 500;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6a8aa0, 0.25);
    fill.position.set(-60, 50, -80);
    scene.add(fill);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: GROUND_COLOR, roughness: 0.96, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(400, 80, GRID_CENTER_COLOR, GRID_COLOR);
    (grid.material as THREE.Material).opacity = 0.5;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);
    gridRef.current = grid;

    const structGroup = new THREE.Group();
    scene.add(structGroup);
    structGroupRef.current = structGroup;

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true; orbit.dampingFactor = 0.08;
    orbit.minDistance = 8; orbit.maxDistance = 600;
    orbit.maxPolarAngle = Math.PI * 0.495;
    orbit.target.set(0, 4, 0);
    orbitRef.current = orbit;

    const tc = new TransformControls(camera, renderer.domElement);
    tc.setSize(0.85);
    tc.addEventListener('dragging-changed', (e: { value: boolean }) => { isDraggingRef.current = e.value; orbit.enabled = !e.value; });
    tc.addEventListener('mouseUp', () => { handleGizmoCommit(); });
    // In three r0.169+, TransformControls is not an Object3D — add its helper.
    scene.add(tc.getHelper());
    transformRef.current = tc;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos: { x: number; y: number } | null = null;

    function pickStruct(clientX: number, clientY: number): THREE.Group | null {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes: THREE.Object3D[] = [];
      structGroup.children.forEach((g) => { g.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o); }); });
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length === 0) return null;
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && obj.userData.entityId === undefined) obj = obj.parent;
      return (obj as THREE.Group) ?? null;
    }
    function onPointerDown(e: PointerEvent) { if (!isDraggingRef.current) pointerDownPos = { x: e.clientX, y: e.clientY }; }
    function onPointerUp(e: PointerEvent) {
      if (isDraggingRef.current || !pointerDownPos) { pointerDownPos = null; return; }
      const moved = Math.abs(e.clientX - pointerDownPos.x) + Math.abs(e.clientY - pointerDownPos.y);
      pointerDownPos = null;
      if (moved > 5) return;
      const hit = pickStruct(e.clientX, e.clientY);
      const store = useEditorStore.getState();
      if (!hit) { store.clearSelection(); return; }
      const id = hit.userData.entityId as number;
      if (e.shiftKey) store.toggleSelectEntity(id); else store.selectEntity(id);
    }
    function onPointerMove(e: PointerEvent) {
      if (isDraggingRef.current) return;
      const hit = pickStruct(e.clientX, e.clientY);
      const store = useEditorStore.getState();
      const id = hit ? (hit.userData.entityId as number) : null;
      if (id !== store.hoveredEntityId) store.setHovered(id);
      renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    renderer.setAnimationLoop(() => {
      orbit.update();
      const t = performance.now() * 0.0005;
      structGroup.children.forEach((g) => {
        const kind = g.userData.kind as StructureKind | undefined;
        if (kind === 'path') {
          g.children.forEach((c) => {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
            if (m && m.transparent) m.opacity = 0.78 + Math.sin(t + g.position.x * 0.1) * 0.04;
          });
        }
      });
      renderer.render(scene, camera);
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsReportRef.current > 500) {
        const fps = (frameCountRef.current * 1000) / (now - lastFpsReportRef.current);
        const store = useEditorStore.getState();
        store.pushFps(Math.round(fps));
        store.setPerf({
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          entities: structGroup.children.length,
          frameMs: Math.round((now - lastFpsReportRef.current) / Math.max(1, frameCountRef.current) * 100) / 100,
          memMb: Math.round(((performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize ?? 0) / 1048576),
        });
        frameCountRef.current = 0;
        lastFpsReportRef.current = now;
      }
    });

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      tc.detach(); tc.dispose();
      orbit.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      sceneRef.current = null; rendererRef.current = null;
    };
  }, []);

  // rebuild structures when settlement changes
  useEffect(() => {
    const structGroup = structGroupRef.current;
    if (!structGroup) return;
    while (structGroup.children.length) {
      const child = structGroup.children[0];
      child.traverse((o) => {
        const m = (o as THREE.Mesh).material; if (Array.isArray(m)) m.forEach((mm) => mm.dispose()); else if (m) (m as THREE.Material).dispose();
        const g = (o as THREE.Mesh).geometry; if (g) g.dispose();
      });
      structGroup.remove(child);
    }
    meshMapRef.current.clear();
    if (!settlement) return;
    for (const s of settlement.structures) {
      const eff = getEffective(settlement, edits, s.entityId) ?? s;
      const mesh = buildStructureMesh(eff, renderModeRef.current);
      mesh.position.set(eff.position.x, 0, eff.position.z);
      mesh.rotation.y = eff.rotation;
      structGroup.add(mesh);
      meshMapRef.current.set(s.entityId, mesh);
    }
    currentSelRef.current = null;
  }, [settlement]);

  // sync edits
  useEffect(() => {
    if (!settlement) return;
    for (const s of settlement.structures) {
      const mesh = meshMapRef.current.get(s.entityId);
      if (!mesh) continue;
      const eff = getEffective(settlement, edits, s.entityId) ?? s;
      if (isDraggingRef.current && currentSelRef.current === s.entityId) continue;
      const curW = mesh.userData.effW as number | undefined;
      const curD = mesh.userData.effD as number | undefined;
      if (curW !== eff.width || curD !== eff.depth) {
        const parent = mesh.parent;
        if (parent) {
          const idx = parent.children.indexOf(mesh);
          mesh.traverse((o) => { const m = (o as THREE.Mesh).material; if (Array.isArray(m)) m.forEach((mm) => mm.dispose()); else if (m) (m as THREE.Material).dispose(); const g = (o as THREE.Mesh).geometry; if (g) g.dispose(); });
          const fresh = buildStructureMesh(eff, renderModeRef.current);
          fresh.position.set(eff.position.x, 0, eff.position.z);
          fresh.rotation.y = eff.rotation;
          parent.children[idx] = fresh;
          meshMapRef.current.set(s.entityId, fresh);
        }
      } else {
        mesh.position.set(eff.position.x, 0, eff.position.z);
        mesh.rotation.y = eff.rotation;
      }
      mesh.userData.effW = eff.width;
      mesh.userData.effD = eff.depth;
    }
  }, [edits, settlement]);

  // hidden
  useEffect(() => {
    meshMapRef.current.forEach((mesh, id) => { mesh.visible = !hiddenEntityIds.has(id); });
  }, [hiddenEntityIds]);

  // selection
  useEffect(() => {
    const tc = transformRef.current;
    if (!tc) return;
    const selId = selectedEntityIds.length > 0 ? selectedEntityIds[0] : null;
    currentSelRef.current = selId;
    if (highlightRef.current.selected) {
      highlightRef.current.selected.parent?.remove(highlightRef.current.selected);
      highlightRef.current.selected.geometry.dispose();
      (highlightRef.current.selected.material as THREE.Material).dispose();
      highlightRef.current.selected = null;
    }
    if (selId === null) { if (tc.object) tc.detach(); return; }
    const mesh = meshMapRef.current.get(selId);
    if (!mesh) { if (tc.object) tc.detach(); return; }
    tc.attach(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const helper = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x + 0.4, size.y + 0.4, size.z + 0.4)),
      new THREE.LineBasicMaterial({ color: SELECTED_EMISSIVE, transparent: true, opacity: 0.9 })
    );
    helper.position.copy(center);
    mesh.parent?.add(helper);
    highlightRef.current.selected = helper;
  }, [selectedEntityIds, settlement, edits]);

  // hover
  useEffect(() => {
    if (highlightRef.current.hovered) {
      highlightRef.current.hovered.parent?.remove(highlightRef.current.hovered);
      highlightRef.current.hovered.geometry.dispose();
      (highlightRef.current.hovered.material as THREE.Material).dispose();
      highlightRef.current.hovered = null;
    }
    if (hoveredEntityId === null || hoveredEntityId === currentSelRef.current) return;
    const mesh = meshMapRef.current.get(hoveredEntityId);
    if (!mesh) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const helper = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x + 0.3, size.y + 0.3, size.z + 0.3)),
      new THREE.LineBasicMaterial({ color: HOVER_EMISSIVE, transparent: true, opacity: 0.55 })
    );
    helper.position.copy(center);
    mesh.parent?.add(helper);
    highlightRef.current.hovered = helper;
  }, [hoveredEntityId, selectedEntityIds, settlement, edits]);

  // transform mode + snap
  useEffect(() => {
    const tc = transformRef.current;
    if (!tc) return;
    tc.setMode(transformMode);
    if (snapEnabled) { tc.setTranslationSnap(1); tc.setRotationSnap(THREE.MathUtils.degToRad(15)); tc.setScaleSnap(0.25); }
    else { tc.setTranslationSnap(null); tc.setRotationSnap(null); tc.setScaleSnap(null); }
  }, [transformMode, snapEnabled]);

  // render mode
  useEffect(() => {
    renderModeRef.current = renderMode;
    const scene = sceneRef.current;
    if (scene) scene.background = new THREE.Color(renderMode === 'wireframe' ? 0x070907 : 0x0e0f0e);
    const store = useEditorStore.getState();
    if (!store.settlement) return;
    const structGroup = structGroupRef.current!;
    const ids: number[] = [];
    structGroup.children.forEach((g) => ids.push(g.userData.entityId as number));
    ids.forEach((id) => {
      const old = meshMapRef.current.get(id);
      if (!old) return;
      const eff = getEffective(store.settlement, store.edits, id);
      if (!eff) return;
      const fresh = buildStructureMesh(eff, renderMode);
      fresh.position.set(eff.position.x, 0, eff.position.z);
      fresh.rotation.y = eff.rotation;
      fresh.userData.effW = eff.width; fresh.userData.effD = eff.depth;
      const idx = structGroup.children.indexOf(old);
      old.traverse((o) => { const m = (o as THREE.Mesh).material; if (Array.isArray(m)) m.forEach((mm) => mm.dispose()); else if (m) (m as THREE.Material).dispose(); const g = (o as THREE.Mesh).geometry; if (g) g.dispose(); });
      structGroup.children[idx] = fresh;
      meshMapRef.current.set(id, fresh);
    });
    const tc = transformRef.current;
    if (tc && currentSelRef.current !== null) { const m = meshMapRef.current.get(currentSelRef.current); if (m) tc.attach(m); }
  }, [renderMode]);

  // grid
  useEffect(() => { if (gridRef.current) gridRef.current.visible = showGrid; }, [showGrid]);

  // camera preset
  useEffect(() => {
    const cam = cameraRef.current; const orbit = orbitRef.current;
    if (!cam || !orbit) return;
    const D = 180;
    switch (cameraPreset) {
      case 'top': cam.position.set(0, 260, 0.01); orbit.target.set(0, 0, 0); break;
      case 'front': cam.position.set(0, 20, D); orbit.target.set(0, 4, 0); break;
      case 'side': cam.position.set(D, 20, 0); orbit.target.set(0, 4, 0); break;
      default: cam.position.set(120, 110, 150); orbit.target.set(0, 4, 0); break;
    }
    cam.lookAt(orbit.target); orbit.update();
  }, [cameraPreset]);

  // focus entity
  useEffect(() => {
    if (cameraFocusEntity === null) return;
    const cam = cameraRef.current; const orbit = orbitRef.current;
    const mesh = meshMapRef.current.get(cameraFocusEntity);
    if (!cam || !orbit || !mesh) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3(); box.getCenter(center);
    const size = new THREE.Vector3(); box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 6);
    const dist = maxDim * 2.4;
    cam.position.set(center.x + dist, center.y + dist * 0.8, center.z + dist);
    orbit.target.copy(center); orbit.update();
    useEditorStore.getState().setCameraFocus(null);
  }, [cameraFocusEntity]);

  const fps = useEditorStore((s) => s.perf.fps);
  const drawCalls = useEditorStore((s) => s.perf.drawCalls);
  const triangles = useEditorStore((s) => s.perf.triangles);
  const entities = useEditorStore((s) => s.perf.entities);
  const frameMs = useEditorStore((s) => s.perf.frameMs);
  const loadingWorld = useEditorStore((s) => s.loadingWorld);

  return (
    <div className="dark relative h-full w-full overflow-hidden bg-zinc-950">
      <div ref={mountRef} className="absolute inset-0" />
      {showStats && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 font-mono text-[11px] leading-relaxed text-emerald-300/90">
          <div className="rounded border border-emerald-500/20 bg-zinc-950/70 px-2 py-1.5 backdrop-blur">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">FPS</span>
              <span className={fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400'}>{fps}</span>
              <span className="text-zinc-600">·</span><span className="text-zinc-500">{frameMs}ms</span>
            </div>
            <div className="text-zinc-400"><span className="text-zinc-600">draws</span> {drawCalls} <span className="text-zinc-600">tris</span> {triangles.toLocaleString()}</div>
            <div className="text-zinc-400"><span className="text-zinc-600">entities</span> {entities}</div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 font-mono text-[10px]">
        <span className="text-rose-400">X</span> <span className="text-emerald-400">Y</span> <span className="text-cyan-400">Z</span>
      </div>
      {!settlement && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60"><span className="text-2xl">🏯</span></div>
            <p className="text-sm font-medium text-zinc-300">No world loaded</p>
            <p className="mt-1 text-xs text-zinc-600">Open the <span className="text-emerald-400">World</span> tab on the left and click <span className="text-emerald-400">Generate</span>.</p>
          </div>
        </div>
      )}
      {loadingWorld && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-emerald-300">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
            <span className="font-mono text-xs">seeding deterministic world…</span>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 font-mono text-[10px] text-zinc-600">
        LMB orbit · RMB pan · Wheel zoom · Click select · Shift+Click multi
      </div>
    </div>
  );
}
