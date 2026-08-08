/**
 * Live Architect Studio — 3D Viewport
 *
 * React Three Fiber viewport with:
 * - StructureMesh for each settlement entity
 * - Ground plane, lights, grid, contact shadows, fog
 * - Click-to-select (shift for multi), hover highlighting
 * - Keyboard shortcuts for transform/camera (ALL dispatched through the
 *   canonical UI Action Registry — including Ctrl+Z / Ctrl+Shift+Z)
 * - Right-click context menu (registry-backed actions) on structures and
 *   the viewport background
 * - Smooth camera controller with presets
 * - FPS counter and perf stats
 */

'use client';

import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree, invalidate, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, ContactShadows, Html, PerspectiveCamera, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore, getEffective } from '@/lib/editor/store';
import { useRenderTracker } from '@/lib/editor/render-tracker';
import { dispatchAction } from '@/lib/studio-ui/action-dispatch';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { PlaytestCharacter } from '@/components/editor/viewport/PlaytestCharacter';
import { TerrainMesh } from '@/components/editor/viewport/TerrainMesh';
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

/** Entity right-clicked last — read by the viewport context menu items. */
const pendingContextEntity = { current: null as number | null };

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
  const playtestMode = useEditorStore((s) => s.playtestMode);
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
      enabled={!playtestMode}
      enableDamping
      dampingFactor={0.1}
      minDistance={2}
      maxDistance={500}
      maxPolarAngle={Math.PI * 0.495}
      enableZoom={true}
      enablePan={true}
      zoomSpeed={1.2}
      panSpeed={0.8}
      rotateSpeed={0.8}
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

function StructureMesh({ entityId, position, rotation, width, depth, kind, name, isSelected, isHovered, registerGroup }: {
  entityId: number; position: { x: number; z: number }; rotation: number;
  width: number; depth: number; kind: StructureKind; name: string;
  isSelected: boolean; isHovered: boolean;
  registerGroup?: (g: THREE.Group | null) => void;
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
    <group ref={(g) => registerGroup?.(g)} position={[position.x, 0, position.z]} rotation-y={rotRad}>
      <mesh
        ref={meshRef} castShadow={!isFlat} receiveShadow
        position-y={isFlat ? 0.01 : isWell ? 0 : isShrine ? 0 : height / 2}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          // Canonical action path: viewport click-to-select dispatches the
          // same registered action the outliner and command palette use.
          void dispatchAction('global.select', {
            entityId,
            mode: e.shiftKey ? 'toggle' : 'replace',
          });
        }}
        onContextMenu={(e: ThreeEvent<MouseEvent>) => {
          // Remember which entity was right-clicked; the DOM contextmenu
          // bubbles to the ContextMenuTrigger wrapper, which opens the
          // registry-backed menu for it.
          pendingContextEntity.current = entityId;
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
  const transformMode = useEditorStore((s) => s.transformMode);
  const structureGroups = useRef<Map<number, THREE.Group>>(new Map());
  const renderMode = useEditorStore((s) => s.renderMode);
  const playtestMode = useEditorStore((s) => s.playtestMode);
  const setPerf = useEditorStore((s) => s.setPerf);
  const pushFps = useEditorStore((s) => s.pushFps);

  // Wake the R3F frame loop while playtest is active. Firefox can fail to
  // start the loop on its own (canvas stays DOM-only, no frames, no
  // useFrame); periodic invalidate() requests make the loop begin/continue.
  useEffect(() => {
    if (!playtestMode) return;
    const id = setInterval(() => invalidate(), 200);
    return () => clearInterval(id);
  }, [playtestMode]);

  useFrame(() => {
    // no-op: keep this component subscribed so the invalidate wakeup above
    // has a frame target even before the character mounts.
  });

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
    const geo = (_e.eventObject as THREE.Mesh).geometry;
    if (geo?.type === 'PlaneGeometry' && _e.intersections.length <= 1) {
      void dispatchAction('global.deselect');
    }
  }, []);

  return (
    <>
      <ambientLight intensity={renderMode === 'solid' ? 1.2 : 0.4} />
      <directionalLight position={[30, 40, 20]} intensity={renderMode === 'solid' ? 0 : 1.2} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-near={0.5} shadow-camera-far={150}
        shadow-camera-left={-60} shadow-camera-right={60}
        shadow-camera-top={60} shadow-camera-bottom={-60} />
      <directionalLight position={[-20, 20, -10]} intensity={renderMode === 'solid' ? 0 : 0.3} />
      <hemisphereLight args={['#87CEEB', '#3B2F1E', renderMode === 'solid' ? 0 : 0.3]} />
      <fog attach="fog" args={['#1a1a2e', 60, 150]} />
      <color attach="background" args={['#1a1a2e']} />

      <GroundPlane />

      {/* Frontier terrain (density field + mountain + tunnel). Additive —
          shares the settlement seed with playtest collision, so what the
          player walks on is exactly what renders. */}
      <TerrainMesh seed={settlement?.seed ?? null} />

      {showGrid && (
        <Grid position-y={0.01} args={[100, 100]} cellSize={2} cellThickness={0.5} cellColor="#2a2a4a"
          sectionSize={10} sectionThickness={1} sectionColor="#3a3a5a" fadeDistance={80} fadeStrength={1} infiniteGrid />
      )}

      <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={100} blur={2} far={20} />

      {settlement && settlement.structures
        .filter((s) => !hiddenEntityIds.has(s.entityId))
        .map((s) => {
          const effective = getEffective(settlement, edits, s.entityId);
          if (!effective) return null;
          return (
            <StructureMesh key={s.entityId} entityId={s.entityId} position={effective.position}
              rotation={effective.rotation} width={effective.width} depth={effective.depth}
              kind={s.kind} name={s.name}
              isSelected={selectedEntityIds.includes(s.entityId)}
              isHovered={hoveredEntityId === s.entityId}
              registerGroup={(g) => {
                if (g) structureGroups.current.set(s.entityId, g);
                else structureGroups.current.delete(s.entityId);
              }} />
          );
        })}

      {/* per-object transform gizmo (translate/rotate/scale on the selected
          structure), committed through the canonical edit action */}
      {showGizmos && selectedEntityIds.length === 1 && (() => {
        const target = structureGroups.current.get(selectedEntityIds[0]);
        if (!target) return null;
        return (
          <TransformControls
            object={target}
            mode={transformMode}
            size={0.9}
            onObjectChange={() => {
              const id = selectedEntityIds[0];
              const p = target.position;
              const deg = (target.rotation.y * 180) / Math.PI;
              void dispatchAction('world.applyEntityEdit', { entityId: id, field: 'position.x', value: p.x });
              void dispatchAction('world.applyEntityEdit', { entityId: id, field: 'position.z', value: p.z });
              void dispatchAction('world.applyEntityEdit', { entityId: id, field: 'rotation', value: deg });
            }}
          />
        );
      })()}

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

      {/* Playtest mode — real embodied character (Rapier KCC + collision).
          Always mounted; stepping is gated on the store value read directly
          inside useFrame (subscription-free hot path). */}
      <PlaytestCharacter />
    </>
  );
}

// ---------------------------------------------------------------------------
// Keyboard Shortcuts — ALL through the canonical action registry
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
      const k = e.key.toLowerCase();

      // Ctrl/Meta combos — the registry's declared shortcuts. Previously the
      // handler bailed on ALL ctrl keys, which silently ignored the declared
      // Ctrl+Z (undo) and Ctrl+Shift+Z (redo) shortcuts.
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z' && e.shiftKey) { e.preventDefault(); void dispatchAction('global.redo'); return; }
        if (k === 'z') { e.preventDefault(); void dispatchAction('global.undo'); return; }
        if (k === 'g') { e.preventDefault(); void dispatchAction('world.generate'); return; }
        if (k === 'a') { e.preventDefault(); void dispatchAction('global.selectAll'); return; }
        if (k === 'k') return; // Architect Presence owns Ctrl+K
        return;
      }

      // In playtest mode only playtest keys matter — editor transform,
      // camera preset, grid and simulation shortcuts must not fight the
      // embodied camera.
      if (s.playtestMode) {
        switch (k) {
          case 'p': void dispatchAction('playtest.toggle'); break;
          case 'escape': void dispatchAction('playtest.toggle', { mode: false }); void dispatchAction('global.deselect'); break;
        }
        return;
      }
      switch (k) {
        case 'w': void dispatchAction('global.translateMode'); break;
        case 'e': void dispatchAction('global.rotateMode'); break;
        case 'r': void dispatchAction('global.scaleMode'); break;
        case 'g': void dispatchAction('global.toggleGrid'); break;
        case 'x': void dispatchAction('global.toggleSnap'); break;
        case 'q': void dispatchAction('global.toggleGizmos'); break;
        case 'b': if (e.shiftKey) void dispatchAction('asset.createBox'); break;
        case 'p': void dispatchAction('playtest.toggle'); break;
        case ' ': e.preventDefault(); void dispatchAction('simulation.start'); break;
        case 'f5': e.preventDefault(); void dispatchAction(s.simRunning ? 'simulation.stop' : 'simulation.start'); break;
        case '.': e.preventDefault(); void dispatchAction('simulation.step'); break;
        case 'escape': void dispatchAction('global.deselect'); break;
        case '1': void dispatchAction('viewport.setCameraPreset', { preset: 'perspective' }); break;
        case '7': void dispatchAction('viewport.setCameraPreset', { preset: 'top' }); break;
        case '3': void dispatchAction('viewport.setCameraPreset', { preset: 'front' }); break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

// ---------------------------------------------------------------------------
// Viewport context menu — registry-backed actions
// ---------------------------------------------------------------------------

function ViewportContextMenu({ children }: { children: React.ReactNode }) {
  // Re-render when the menu opens so `disabled` reflects the entity that was
  // just right-clicked (the ref changes without a React state update).
  const [, setMenuTick] = useState(0);
  const pending = pendingContextEntity.current;
  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) setMenuTick((t) => t + 1);
        else pendingContextEntity.current = null;
      }}
    >
      <ContextMenuTrigger asChild>
        <div className="h-full w-full">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[190px] border-[#2a2a4a] bg-[#12122a] text-[#c8c8e0]">
        <ContextMenuItem
          className="text-[11px]"
          disabled={pending == null}
          onSelect={() => { const id = pendingContextEntity.current; if (id != null) void dispatchAction('global.select', { entityId: id }); }}
        >
          Select Entity
        </ContextMenuItem>
        <ContextMenuItem
          className="text-[11px]"
          disabled={pending == null}
          onSelect={() => { const id = pendingContextEntity.current; if (id != null) void dispatchAction('world.toggleVisibility', { entityId: id }); }}
        >
          Toggle Visibility
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#2a2a4a]" />
        <ContextMenuItem className="text-[11px]" onSelect={() => void dispatchAction('global.deselect')}>
          Deselect All
        </ContextMenuItem>
        <ContextMenuItem className="text-[11px]" onSelect={() => void dispatchAction('world.resetEdits')}>
          Reset Local Edits
        </ContextMenuItem>
        <ContextMenuItem className="text-[11px]" onSelect={() => void dispatchAction('world.fork')}>
          Fork World
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#2a2a4a]" />
        <ContextMenuItem className="text-[11px]" onSelect={() => void dispatchAction('global.toggleGrid')}>
          Toggle Grid (G)
        </ContextMenuItem>
        <ContextMenuItem className="text-[11px]" onSelect={() => void dispatchAction('global.toggleGizmos')}>
          Toggle Gizmos (Q)
        </ContextMenuItem>
        <ContextMenuItem className="text-[11px]" onSelect={() => void dispatchAction('playtest.toggle')}>
          Enter Playtest (P)
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ---------------------------------------------------------------------------
// Playtest HUD — plain DOM overlay (no drei Html: works in every browser,
// readable by automated evidence harnesses via [data-hud]).
// ---------------------------------------------------------------------------

function PlaytestHud() {
  const [line, setLine] = useState<string | null>('Initializing Rapier physics…');
  useEffect(() => {
    // Subscription-free: reads the store + runtime directly each tick, so
    // visibility never depends on React update scheduling (Firefox can
    // stall subscription-driven re-renders).
    const id = setInterval(() => {
      const store = useEditorStore.getState();
      if (!store.playtestMode) { setLine(null); return; }
      const w = window as unknown as {
        __physicsRuntime?: {
          ready: boolean; running: boolean; error: string | null;
          getCharacterSnapshot?: () => {
            movementMode: string; position: { x: number; y: number; z: number };
            grounded: boolean; horizontalVelocity: { x: number; z: number };
            verticalVelocity: number; slopeAngle: number;
          } | null;
          getDiagnostics?: () => { colliderCount: number; stepCount: number };
        };
      };
      const rt = w.__physicsRuntime;
      if (!rt) { setLine('Initializing Rapier physics…'); return; }
      if (!rt.ready) { setLine(rt.error ? `Physics error: ${rt.error}` : 'Initializing Rapier physics…'); return; }
      const s = rt.getCharacterSnapshot?.();
      const d = rt.getDiagnostics?.();
      if (!s || !d) { setLine('Building physics world…'); return; }
      setLine(
        `${s.movementMode} | pos=(${s.position.x.toFixed(1)},${s.position.z.toFixed(1)}) ` +
        `y=${s.position.y.toFixed(1)} ${s.grounded ? 'GROUND' : 'AIR'} ` +
        `vel=(${s.horizontalVelocity.x.toFixed(1)},${s.horizontalVelocity.z.toFixed(1)}) ` +
        `vy=${s.verticalVelocity.toFixed(1)} ` +
        `slope=${(s.slopeAngle * 180 / Math.PI).toFixed(0)}° ` +
        `| ${d.colliderCount} colliders, ${d.stepCount} steps`,
      );
    }, 150);
    return () => clearInterval(id);
  }, []);
  if (line === null) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-[10px] text-emerald-300 backdrop-blur-sm">
      <div className="whitespace-nowrap">WASD move · Space jump · Shift sprint · RMB look · Esc → Editor</div>
      <div data-hud className="whitespace-nowrap font-mono text-[9px] text-[#aaaacc]">{line}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Viewport3D Component
// ---------------------------------------------------------------------------

export default function Viewport3D() {
  // Render tracking — catches viewport render loops (e.g. selectors that
  // return new array references every call).
  void useRenderTracker('Viewport3D');

  const settlement = useEditorStore((s) => s.settlement);
  const playtestMode = useEditorStore((s) => s.playtestMode);
  useKeyboardShortcuts();

  const canvas = (
    <Canvas shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }} style={{ background: '#1a1a2e' }}>
      <PerspectiveCamera makeDefault position={[40, 35, 40]} fov={50} near={0.1} far={500} />
      <SceneContent />
    </Canvas>
  );

  return (
    <div className="relative h-full w-full">
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
      ) : playtestMode ? (
        // Playtest: right-click is camera look — no editor context menu.
        canvas
      ) : (
        <ViewportContextMenu>{canvas}</ViewportContextMenu>
      )}
      {/* Always mounted; the HUD polls the store and returns null when not
          in playtest — visibility is subscription-free. */}
      <PlaytestHud />
    </div>
  );
}
