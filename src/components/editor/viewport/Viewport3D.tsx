/**
 * Live Architect Studio — 3D Viewport
 *
 * React Three Fiber viewport with:
 * - StructureMesh for each settlement entity
 * - Ground plane, lights, grid, contact shadows, fog
 * - Click-to-select (shift for multi), hover highlighting
 * - Keyboard shortcuts for transform/camera
 * - Smooth camera controller with presets
 * - FPS counter and perf stats
 */

'use client';

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, ContactShadows, Html, PerspectiveCamera, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore, getEffective } from '@/lib/editor/store';
import { useRenderTracker } from '@/lib/editor/render-tracker';
import type { StructureKind, CameraPreset, RenderMode } from '@/lib/editor/types';

// ---------------------------------------------------------------------------
// Kind → Height / Color mappings
// ---------------------------------------------------------------------------

const KIND_HEIGHTS: Record<StructureKind, number> = {
  lineage_hall: 6, household: 3.5, well: 1.5, threshing_ground: 0.3,
  mill: 4, spirit_shrine: 5, dock: 1, path: 0.1, paddy: 0.2,
  dryland_garden: 0.4, graveyard: 1, levee: 2,
};

const KIND_COLORS: Record<StructureKind, string> = {
  lineage_hall: '#8B6914', household: '#6B4226', well: '#4A6670', threshing_ground: '#A08040',
  mill: '#706050', spirit_shrine: '#A02020', dock: '#505050', path: '#808060',
  paddy: '#3A7A3A', dryland_garden: '#5A8A40', graveyard: '#5A5060', levee: '#6A6050',
};

const SELECTED_COLOR = '#4488ff';
const HOVERED_COLOR = '#88aaff';

// ---------------------------------------------------------------------------
// Camera presets
// ---------------------------------------------------------------------------

const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
  perspective: { position: [40, 35, 40], target: [0, 0, 0] },
  top:         { position: [0, 60, 0.1], target: [0, 0, 0] },
  front:       { position: [0, 10, 50], target: [0, 0, 0] },
  side:        { position: [50, 10, 0], target: [0, 0, 0] },
};

// ---------------------------------------------------------------------------
// Camera Controller — smooth animated transitions
// ---------------------------------------------------------------------------

function CameraController() {
  const cameraPreset = useEditorStore((s) => s.cameraPreset);
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  // Track whether we're animating to a new preset. We only animate for a
  // limited number of frames after a preset change — we do NOT continuously
  // lerp every frame, because that would fight the user's zoom/pan/rotate.
  const animatingRef = useRef(false);
  const animFrameRef = useRef(0);
  const targetPos = useRef(new THREE.Vector3(40, 35, 40));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    const preset = CAMERA_PRESETS[cameraPreset];
    targetPos.current.set(...preset.position);
    targetLook.current.set(...preset.target);
    // Start a short animation (~60 frames ≈ 1s at 60fps) to ease into the
    // new preset. After the animation completes, OrbitControls owns the
    // camera and the user can freely zoom/pan/rotate.
    animatingRef.current = true;
    animFrameRef.current = 60;
  }, [cameraPreset]);

  useFrame(() => {
    if (!animatingRef.current) return;
    camera.position.lerp(targetPos.current, 0.08);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, 0.08);
      controlsRef.current.update();
    }
    animFrameRef.current--;
    if (animFrameRef.current <= 0) {
      animatingRef.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      minDistance={1}
      maxDistance={800}
      maxPolarAngle={Math.PI * 0.495}
      enableZoom={true}
      enablePan={true}
      zoomSpeed={3.0}
      panSpeed={1.5}
      rotateSpeed={1.2}
    />
  );
}

// ---------------------------------------------------------------------------
// Ground Plane
// ---------------------------------------------------------------------------

function GroundPlane() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.05} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#3B2F1E" roughness={1} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Structure Mesh
// ---------------------------------------------------------------------------

function StructureMesh({ entityId, position, rotation, width, depth, kind, name, isSelected, isHovered, groupRef }: {
  entityId: number; position: { x: number; z: number }; rotation: number;
  width: number; depth: number; kind: StructureKind; name: string;
  isSelected: boolean; isHovered: boolean;
  groupRef?: React.Ref<THREE.Group>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const height = KIND_HEIGHTS[kind];
  const baseColor = KIND_COLORS[kind];
  const color = isSelected ? SELECTED_COLOR : isHovered ? HOVERED_COLOR : baseColor;
  const rotRad = (rotation * Math.PI) / 180;
  const isShrine = kind === 'spirit_shrine';
  const isWell = kind === 'well';
  const isFlat = kind === 'path' || kind === 'paddy' || kind === 'threshing_ground';

  return (
    <group ref={groupRef} position={[position.x, 0, position.z]} rotation-y={rotRad}>
      <mesh
        ref={meshRef} castShadow={!isFlat} receiveShadow
        position-y={isFlat ? 0.01 : isWell ? 0 : isShrine ? 0 : height / 2}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          const store = useEditorStore.getState();
          if (e.shiftKey) { store.toggleSelectEntity(entityId); }
          else { store.selectEntity(entityId); }
        }}
        onPointerEnter={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          useEditorStore.getState().setHovered(entityId);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          useEditorStore.getState().setHovered(null);
          document.body.style.cursor = 'default';
        }}>
        {isShrine ? (<coneGeometry args={[Math.max(width, depth) / 2, height, 4]} />) :
         isWell ? (<cylinderGeometry args={[width / 2, width / 2, height, 16]} />) :
         (<boxGeometry args={[width, isFlat ? 0.1 : height, depth]} />)}
        <meshStandardMaterial color={color} roughness={isFlat ? 1 : 0.7} metalness={isWell ? 0.3 : 0} transparent={isFlat} opacity={isFlat ? 0.8 : 1} />
      </mesh>
      {isSelected && !isFlat && (
        <mesh position-y={isWell ? 0 : isShrine ? 0 : height / 2} scale={[1.05, 1.05, 1.05]}>
          {isShrine ? (<coneGeometry args={[Math.max(width, depth) / 2, height, 4]} />) :
           isWell ? (<cylinderGeometry args={[width / 2, width / 2, height, 16]} />) :
           (<boxGeometry args={[width, height, depth]} />)}
          <meshBasicMaterial color={SELECTED_COLOR} transparent opacity={0.15} side={THREE.BackSide} />
        </mesh>
      )}
      {isSelected && (
        <Html position={[0, height + 1.5, 0]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">{name}</div>
        </Html>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Transform Gizmo — wraps the selected structure with Drei TransformControls
// ---------------------------------------------------------------------------

function TransformGizmo() {
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const transformMode = useEditorStore((s) => s.transformMode);
  const showGizmos = useEditorStore((s) => s.showGizmos);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const groupRef = useRef<THREE.Group>(null);

  // Sync the group's transform to the selected entity's effective transform
  // whenever selection or edits change. This runs AFTER the StructureMesh
  // has been positioned, so the gizmo appears at the right place.
  const settlement = useEditorStore((s) => s.settlement);
  const edits = useEditorStore((s) => s.edits);

  useEffect(() => {
    const g = groupRef.current;
    if (!g || selectedEntityIds.length === 0) return;
    const id = selectedEntityIds[0];
    const effective = getEffective(settlement, edits, id);
    if (!effective) return;
    g.position.set(effective.position.x, 0, effective.position.z);
    g.rotation.y = (effective.rotation * Math.PI) / 180;
  }, [selectedEntityIds, settlement, edits]);

  if (!showGizmos || selectedEntityIds.length === 0) return null;

  const id = selectedEntityIds[0];
  const effective = getEffective(settlement, edits, id);
  if (!effective) return null;

  const commitTransform = () => {
    const g = groupRef.current;
    if (!g) return;
    // Read the gizmo's final transform and commit to store.
    const newX = g.position.x;
    const newZ = g.position.z;
    const newRotDeg = (g.rotation.y * 180) / Math.PI;
    const store = useEditorStore.getState();
    const base = store.settlement?.structures.find((s) => s.entityId === id);
    if (!base) return;
    // Scale: the group's scale represents the ratio of new width/depth to base.
    const newW = Math.max(0.5, base.width * g.scale.x);
    const newD = Math.max(0.5, base.depth * g.scale.z);

    // Snap if enabled
    let snapX = newX, snapZ = newZ, snapRot = newRotDeg, snapW = newW, snapD = newD;
    if (snapEnabled) {
      snapX = Math.round(newX * 4) / 4;
      snapZ = Math.round(newZ * 4) / 4;
      snapRot = Math.round(newRotDeg / 15) * 15;
      snapW = Math.round(newW * 10) / 10;
      snapD = Math.round(newD * 10) / 10;
    }

    // Validate finite values
    if (!Number.isFinite(snapX) || !Number.isFinite(snapZ) || !Number.isFinite(snapRot) ||
        !Number.isFinite(snapW) || !Number.isFinite(snapD)) return;

    store.applyEdits([
      { entityId: id, field: 'position.x', value: snapX },
      { entityId: id, field: 'position.z', value: snapZ },
      { entityId: id, field: 'rotation', value: snapRot },
      { entityId: id, field: 'width', value: snapW },
      { entityId: id, field: 'depth', value: snapD },
    ]);
  };

  return (
    <TransformControls
      object={groupRef}
      mode={transformMode}
      size={0.8}
      translationSnap={snapEnabled ? 0.25 : null}
      rotationSnap={snapEnabled ? (Math.PI / 12) : null}
      scaleSnap={snapEnabled ? 0.1 : null}
      onObjectChange={() => {
        // Live preview — the StructureMesh reads from the store, but during
        // drag we don't commit yet. The gizmo directly manipulates the group,
        // which is the StructureMesh's parent, so the user sees the drag.
      }}
      onMouseUp={commitTransform}
      onDraggingChange={(e: { value: boolean }) => {
        if (!e.value) {
          // Drag ended — commit
          commitTransform();
        }
      }}
    >
      {/* Invisible proxy group that the gizmo controls.
          The selected StructureMesh is rendered as a child so its transform
          follows the gizmo. */}
      <group ref={groupRef} position={[effective.position.x, 0, effective.position.z]} rotation-y={(effective.rotation * Math.PI) / 180}>
        <StructureMesh
          entityId={id}
          position={{ x: 0, z: 0 }}
          rotation={0}
          width={effective.width}
          depth={effective.depth}
          kind={settlement?.structures.find((s) => s.entityId === id)?.kind ?? 'household'}
          name={settlement?.structures.find((s) => s.entityId === id)?.name ?? ''}
          isSelected={true}
          isHovered={false}
        />
      </group>
    </TransformControls>
  );
}

// ---------------------------------------------------------------------------
// Scene Content
// ---------------------------------------------------------------------------

function SceneContent() {
  const settlement = useEditorStore((s) => s.settlement);
  const edits = useEditorStore((s) => s.edits);
  const hiddenEntityIds = useEditorStore((s) => s.hiddenEntityIds);
  const selectedEntityIds = useEditorStore((s) => s.selectedEntityIds);
  const hoveredEntityId = useEditorStore((s) => s.hoveredEntityId);
  const showGrid = useEditorStore((s) => s.showGrid);
  const showGizmos = useEditorStore((s) => s.showGizmos);
  const renderMode = useEditorStore((s) => s.renderMode);
  const setPerf = useEditorStore((s) => s.setPerf);
  const pushFps = useEditorStore((s) => s.pushFps);

  const frameCount = useRef(0);
  const lastFpsTime = useRef(performance.now());

  useFrame((state) => {
    frameCount.current++;
    const now = performance.now();
    const elapsed = now - lastFpsTime.current;
    if (elapsed >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / elapsed);
      pushFps(fps);
      setPerf({ fps, frameMs: elapsed / frameCount.current, drawCalls: state.gl.info.render.calls, triangles: state.gl.info.render.triangles, entities: settlement?.structures.length ?? 0 });
      frameCount.current = 0;
      lastFpsTime.current = now;
    }
  });

  const handleBackgroundClick = useCallback((_e: ThreeEvent<MouseEvent>) => {
    // Only deselect if clicking the background plane
    if (_e.eventObject.geometry?.type === 'PlaneGeometry' && _e.intersections.length <= 1) {
      useEditorStore.getState().clearSelection();
    }
  }, []);

  return (
    <>
      <ambientLight intensity={renderMode === 'solid' ? 1.2 : 0.4} />
      <directionalLight position={[30, 40, 20]} intensity={renderMode === 'solid' ? 0 : 1.2} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-near={0.5} shadow-camera-far={400}
        shadow-camera-left={-120} shadow-camera-right={120}
        shadow-camera-top={120} shadow-camera-bottom={-120} />
      <directionalLight position={[-20, 20, -10]} intensity={renderMode === 'solid' ? 0 : 0.3} />
      <hemisphereLight args={['#87CEEB', '#3B2F1E', renderMode === 'solid' ? 0 : 0.3]} />
      <fog attach="fog" args={['#1a1a2e', 200, 600]} />
      <color attach="background" args={['#1a1a2e']} />

      <GroundPlane />

      {showGrid && (
        <Grid position-y={0.01} args={[100, 100]} cellSize={2} cellThickness={0.5} cellColor="#2a2a4a"
          sectionSize={10} sectionThickness={1} sectionColor="#3a3a5a" fadeDistance={400} fadeStrength={1} infiniteGrid />
      )}

      <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={100} blur={2} far={20} />

      {settlement && settlement.structures
        .filter((s) => !hiddenEntityIds.has(s.entityId))
        .map((s) => {
          const effective = getEffective(settlement, edits, s.entityId);
          if (!effective) return null;
          const isSelected = selectedEntityIds.includes(s.entityId);
          return (
            <StructureMesh key={s.entityId} entityId={s.entityId} position={effective.position}
              rotation={effective.rotation} width={effective.width} depth={effective.depth}
              kind={s.kind} name={s.name}
              isSelected={isSelected}
              isHovered={hoveredEntityId === s.entityId} />
          );
        })}

      {/* Transform gizmo on the selected structure */}
      <TransformGizmo />

      <mesh position={[0, -0.1, 0]} rotation-x={-Math.PI / 2} visible={false} onClick={handleBackgroundClick}>
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>

      {showGizmos && (
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport axisColors={['#ff4060', '#40ff60', '#4060ff']} labelColor="white" />
        </GizmoHelper>
      )}

      <CameraController />
    </>
  );
}

// ---------------------------------------------------------------------------
// Keyboard Shortcuts
// ---------------------------------------------------------------------------

function useKeyboardShortcuts() {
  useEffect(() => {
    function isTyping(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target)) return;
      const s = useEditorStore.getState();
      if (e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      switch (k) {
        case 'w': s.setTransformMode('translate'); break;
        case 'e': s.setTransformMode('rotate'); break;
        case 'r': s.setTransformMode('scale'); break;
        case 'g': s.toggleGrid(); break;
        case 'x': s.toggleSnap(); break;
        case 'f5': e.preventDefault(); s.toggleSim(); break;
        case '.': e.preventDefault(); s.step('physics_tick', 1); break;
        case 'escape': s.clearSelection(); break;
        case '1': s.setCameraPreset('perspective'); break;
        case '7': s.setCameraPreset('top'); break;
        case '3': s.setCameraPreset('front'); break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

// ---------------------------------------------------------------------------
// Main Viewport3D Component
// ---------------------------------------------------------------------------

export default function Viewport3D() {
  // Render tracking — catches viewport render loops (e.g. selectors that
  // return new array references every call).
  void useRenderTracker('Viewport3D');

  const settlement = useEditorStore((s) => s.settlement);
  useKeyboardShortcuts();

  return (
    <div className="h-full w-full">
      {!settlement ? (
        <div className="flex h-full w-full items-center justify-center bg-[#1a1a2e]">
          <div className="flex flex-col items-center gap-3 text-[#5a5a8a]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-[#3a3a5a]">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <span className="text-sm font-medium">No world loaded</span>
            <span className="text-xs text-[#4a4a6a]">Generate a world using the seed bar above</span>
          </div>
        </div>
      ) : (
        <Canvas shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }} style={{ background: '#1a1a2e' }}>
          <PerspectiveCamera makeDefault position={[40, 35, 40]} fov={50} near={0.1} far={2000} />
          <SceneContent />
        </Canvas>
      )}
    </div>
  );
}
