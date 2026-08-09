'use client';

/**
 * Director Render Stage — renders director-script shots of the set.
 *
 * Builds the Wang Family Bend scene from the set factory (structures +
 * humanoids), then exposes window.__directorShot(shotId) so the puppeteer
 * shot renderer (scripts/render-director-shots.ts) can capture each shot
 * with the camera specified in the director script (cut, lens, height).
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildVillageScene, buildTownScene } from '@/lib/assets/factories/set-factory';
import { buildHumanoid, profileForRole } from '@/lib/assets/factories/character-factory';
import { EPISODE_1, EPISODE_2, EPISODE_3 } from '@/lib/worldproduction/director-script';
import { WANG_FAMILY_BEND } from '@/lib/worldproduction/set-blueprint';
import { QINGHE_MARKET_TOWN } from '@/lib/worldproduction/set-blueprint-2';
import { buildRoomSet } from '@/lib/assets/factories/set-factory';
import type { SetRoom } from '@/lib/worldproduction/set-blueprint';
import { applyZhumengStyle, zhumengCss } from '@/lib/worldproduction/zhumeng-style';
import { attachFilmicGrade } from '@/lib/worldproduction/filmic-grade';
import type { FilmicGrade } from '@/lib/worldproduction/filmic-grade';

declare global {
  interface Window {
    __directorShot: (shotId: string) => string | null;
    __directorShots: () => string[];
    __directorStats: () => string;
  }
}

const CUT_DISTANCE: Record<string, number> = {
  'extreme-wide': 260, wide: 46, medium: 9, close: 3.4,
  'extreme-close': 1.6, insert: 1.1, aerial: 820, crane: 60, dolly: 7, pov: 1.9,
};

function fovForLens(lensMm: number): number {
  return 2 * Math.atan(24 / (2 * lensMm)) * (180 / Math.PI);
}

export default function DirectorRenderPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    // sortObjects computes bounding spheres on every mesh (including
    // skinned meshes, whose sphere math trips on the dual three build in
    // this browser bundle) — we control draw order explicitly.
    renderer.sortObjects = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fb8d8);

    // the set — episode switch: ?ep=2 renders Qinghe Market Town (Episode 2),
    // ?ep=3 renders the same town under recruitment-day light (Episode 3)
    const ep = new URLSearchParams(window.location.search).get('ep');
    const noShadow = new URLSearchParams(window.location.search).get('shadow') === '0';
    const ep3 = ep === '3';
    const ep2 = ep === '2' || ep3;
    const episode = ep3 ? EPISODE_3 : ep2 ? EPISODE_2 : EPISODE_1;
    const village = ep2 ? buildTownScene() : buildVillageScene();

    // debug: ?shadow=0 disables sun shadow casting (A/B shadow verification)
    if (noShadow) renderer.shadowMap.enabled = false;

    // blue haze close in: mid-ground reads cool against warm-lit subjects
    // (town episodes get a deeper fog far so aerial/wide shots are not swallowed)
    const fogFar = ep2 ? 1600 : 260;
    scene.fog = new THREE.Fog(0x9ab8d0, 40, fogFar);

    // warm painterly sun
    const sun = new THREE.DirectionalLight(0xffe8c0, 2.2);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -300; sun.shadow.camera.right = 300;
    sun.shadow.camera.top = 300; sun.shadow.camera.bottom = -300;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 900;
    sun.shadow.camera.updateProjectionMatrix(); // bounds set AFTER creation — required or shadows never render
    scene.add(sun);
    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6a5a3a, 0.85);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    // Zhumeng donghua style pass: warm key, cool fill, rim separation
    const rim = new THREE.DirectionalLight(0xffd8a8, 1.1);
    rim.position.set(-90, 60, -120);
    scene.add(rim);
    const coolFill = new THREE.DirectionalLight(0x9ab8d8, 0.55);
    coolFill.position.set(-60, 25, -80);
    scene.add(coolFill);
    applyZhumengStyle(renderer, sun, hemi, () => rim);

    // ground variation: soft blotches so the valley floor is not one flat color
    const blotchMat = new THREE.MeshBasicMaterial({ color: 0x2c4a2a, transparent: true, opacity: 0.35, depthWrite: false });
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.CircleGeometry(30 + (i % 3) * 22, 18), blotchMat);
      b.rotation.x = -Math.PI / 2;
      b.position.set(-160 + (i % 4) * 120, 0.01, -140 + Math.floor(i / 4) * 160);
      scene.add(b);
    }

    // per-shot sun: dawn shots get a LOW warm sun (long shadows = form)
    const sunElevationFor = (shotId: string): [number, number, number] => {
      const early = /1[A-D]/.test(shotId);
      const late = /1[L-N]/.test(shotId);
      if (early) return [60, 22, 50];     // low dawn sun
      if (late) return [90, 30, 40];      // golden-hour sun
      return [120, 55, 45];               // morning sun
    };

    // the set — episode switch handled above (episode/village chosen with the scene)
    scene.add(village.group);

    // painterly gradient sky dome (blue-teal family, warm gold only at the
    // sun — the donghua warm/cool split: warm-lit ground vs blue sky/haze)
    const skyGeo = new THREE.SphereGeometry(1800, 16, 12);
    const skyPos = skyGeo.attributes.position as THREE.BufferAttribute;
    const skyColors = new Float32Array(skyPos.count * 3);
    for (let i = 0; i < skyPos.count; i++) {
      const y = skyPos.getY(i) / 1800;
      const t = Math.max(0, Math.min(1, (y + 0.12) / 1.12));
      const c = new THREE.Color(0x2a4a6a).lerp(new THREE.Color(0xa8c8d8), t);
      skyColors[i * 3] = c.r; skyColors[i * 3 + 1] = c.g; skyColors[i * 3 + 2] = c.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
    const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
    scene.add(sky);
    let skyRef: THREE.Mesh | null = sky;

    // contact shadows: soft dark disc under every structure (grounding)
    const contactMat = new THREE.MeshBasicMaterial({ color: 0x0a0a14, transparent: true, opacity: 0.28, depthWrite: false });
    for (const [, sg] of village.structures) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 20), contactMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(sg.position.x, 0.02, sg.position.z);
      const scale = Math.max(sg.userData?.w ?? 12, 10) / 2;
      disc.scale.set(scale, scale, 1);
      scene.add(disc);
    }

    // village life: a few humanoids (episode-aware — the E2/E3 shots are in
    // the market square, tea house, dock; P18: NPCs must show activity).
    // E3 is recruitment day: a CROWD — children in line, parents watching.
    const life: Array<{ profile: string; x: number; z: number; clip: string }> = ep3 ? [
      // children lining up (the queue) at the square centre
      { profile: 'child', x: -2, z: 62, clip: 'idle' },
      { profile: 'child', x: 0, z: 60, clip: 'idle' },
      { profile: 'child', x: 2, z: 58, clip: 'idle' },
      { profile: 'child', x: 4, z: 60, clip: 'idle' },
      // the recruiter at the stall (a cultivator in white robe, red lining)
      { profile: 'cultivator', x: 8, z: 56, clip: 'bow' },
      // parents watching from the side
      { profile: 'farmer', x: -6, z: 66, clip: 'idle' },
      { profile: 'farmer', x: -8, z: 64, clip: 'idle' },
      { profile: 'elder', x: -10, z: 68, clip: 'idle' },
      { profile: 'merchant', x: 6, z: 68, clip: 'walk' },
      { profile: 'elder', x: 10, z: 66, clip: 'idle' },
    ] : ep2 ? [
      { profile: 'merchant', x: 14, z: 58, clip: 'walk' },
      { profile: 'farmer', x: -6, z: 64, clip: 'idle' },
      { profile: 'elder', x: 8, z: 42, clip: 'bow' },
      { profile: 'child', x: -12, z: 52, clip: 'idle' },
      { profile: 'farmer', x: -70, z: 38, clip: 'walk' },
      { profile: 'merchant', x: 42, z: -72, clip: 'walk' },
    ] : [
      { profile: 'farmer', x: 130, z: 95, clip: 'idle' },
      { profile: 'elder', x: -14, z: -33, clip: 'bow' },
      { profile: 'elder', x: 28, z: -18, clip: 'idle' },
      { profile: 'merchant', x: 22, z: 28, clip: 'walk' },
    ];
    for (const l of life) {
      const h = buildHumanoid(profileForRole(l.profile, 7));
      h.group.position.set(l.x, 0, l.z);
      scene.add(h.group);
    }

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 4000);

    // filmic grade baked INTO the pixels (vignette + saturation + warmth)
    let grade: FilmicGrade | null = null;
    try {
      if (new URLSearchParams(window.location.search).get('grade') !== '0') {
        grade = attachFilmicGrade(renderer, scene, camera);
      }
    } catch { /* grade optional */ }

    // furnished interior sets (critic fix: buildings read as inhabited)
    const roomSets = new Map<string, { group: THREE.Group; center: THREE.Vector3; d: number }>();
    const settlement = ep2 ? QINGHE_MARKET_TOWN as unknown as { structures: Array<{ id: string; rooms: SetRoom[]; w: number; d: number; h: number; kind: string }> } : WANG_FAMILY_BEND;
    for (const s of settlement.structures) {
      const sg = village.structures.get(s.id);
      if (!sg) continue;
      for (const room of s.rooms) {
        const rs = buildRoomSet(room, village.palette);
        rs.position.copy(sg.position);
        scene.add(rs);
        roomSets.set(room.id, {
          group: rs,
          center: sg.position.clone().add(new THREE.Vector3(0, room.h * 0.55, room.d * 0.25)),
          d: room.d,
        });
      }
    }
    // warm interior light for room shots
    const roomLight = new THREE.PointLight(0xffc078, 0, 10);
    roomLight.position.set(0, -100, 0);
    scene.add(roomLight);

    const targetFor = (shotId: string): THREE.Vector3 => {
      const shot = episode.shots.find((s) => s.id === shotId);
      if (!shot?.structureId) return new THREE.Vector3(0, 0, 0);
      const g = village.structures.get(shot.structureId);
      if (!g) return new THREE.Vector3(0, 0, 0);
      if (shot.roomId) {
        const rs = roomSets.get(shot.roomId);
        if (rs) return rs.center.clone();
      }
      // ep3 market-square shots aim at the recruitment-day CROWD (the queue
      // line at the stall), not the plaza centre — the stall, recruiter and
      // children then fill the frame (P18/P22 readable instead of a 60 m
      // empty plaza read).
      if (ep3 && shot.structureId === 'structure.qinghe.market_square') {
        return new THREE.Vector3(g.position.x + 2, 1.4, g.position.z + 2);
      }
      // aim at the structure's VISUAL CENTER, not y=2 — a 1.6 m camera
      // looking at y=2 on an 8 m yamen reads as a steep low angle where the
      // roof underside dominates the frame (VLM: 'roof reads as a floating
      // slab'). Visual center = ~40% of blueprint height.
      const bp = settlement.structures.find((x) => x.id === shot.structureId);
      const aimY = bp ? Math.min(bp.h * 0.42, 5) : 2;
      return g.position.clone().add(new THREE.Vector3(0, aimY, 0));
    };

    window.__directorShots = () => episode.shots.map((s) => s.id);
    window.__directorStats = (): string => {
      let meshes = 0, visible = 0, shadowCasters = 0;
      village.group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          meshes++;
          if (o.visible) visible++;
          if (o.castShadow) shadowCasters++;
        }
      });
      return JSON.stringify({ structures: village.structures.size, meshes, visible, shadowCasters, fogFar });
    };
    // structure footprint (from the blueprint) so the camera never ends up
    // inside a large building (e.g. the 30x45 m yamen at 7 m dolly distance)
    // AND so the whole facade fits the frame: distance scales with the longer
    // side (~0.9x fits a 45 m facade at 50 deg fov), not just half-depth.
    // Open plazas (market) get NO footprint override — the director's cut
    // distance stands, so close shots of the crowd/stall actually close in
    // (VLM: people unreadable at 62 m in 'close' shots).
    const structureFootprint = (shotId: string): number => {
      const shot = episode.shots.find((s) => s.id === shotId);
      if (!shot?.structureId) return 0;
      const s = settlement.structures.find((x) => x.id === shot.structureId);
      if (!s) return 0;
      if (s.kind === 'market' || s.kind === 'field' || s.kind === 'dock') return 0;
      const facadeFit = Math.max(s.w, s.d) * 0.9 + 8;
      return Math.min(Math.max(facadeFit, 12), 160);
    };
    window.__directorShot = (shotId: string): string | null => {
      const shot = episode.shots.find((s) => s.id === shotId);
      if (!shot) return null;
      const [sx, sy, sz] = sunElevationFor(shotId);
      sun.position.set(sx, sy, sz);
      const dist = Math.max(CUT_DISTANCE[shot.cut] ?? 20, structureFootprint(shotId));
      const target = targetFor(shotId);
      // room shots: dedicated interior view — hide the world, show only the
      // furnished room against a warm-dark backdrop (clean, lit, readable)
      if (shot.roomId) {
        const rs = roomSets.get(shot.roomId);
        village.group.visible = false;
        if (skyRef) skyRef.visible = false;
        scene.background = new THREE.Color(0x1a1410);
        roomLight.position.copy(target).add(new THREE.Vector3(0, 0.6, 0));
        roomLight.intensity = 4.2;
        roomLight.distance = 16;
        ambient.intensity = 0.6;
        const inD = Math.min(rs?.d ?? 6, 6);
        camera.position.copy(target).add(new THREE.Vector3(0, 0.2, -inD * 0.34));
      } else {
        village.group.visible = true;
        if (skyRef) skyRef.visible = true;
        scene.background = new THREE.Color(0x8fb8d8);
        roomLight.intensity = 0;
        ambient.intensity = 0.3;
      }
      camera.fov = fovForLens(shot.camera.lensMm);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      const aimY = target.y;
      const camH = Math.max(shot.camera.heightM, aimY * 0.72); // level-ish, never looking steeply up
      camera.position.set(target.x + dist * 0.7, camH, target.z + dist);
      camera.lookAt(target);
      // sun azimuth follows the camera for ground shots (dolly lighting): the
      // visible facade gets key light instead of reading as a shadowed dark
      // mass (VLM: 'massive black monolith'). Elevation stays per-shot; only
      // the azimuth turns toward the camera so long shadows still read.
      if (!shot.roomId) {
        const camDirX = camera.position.x - target.x;
        const camDirZ = camera.position.z - target.z;
        const camLen = Math.max(Math.hypot(camDirX, camDirZ), 0.001);
        const [, sy, sz] = sunElevationFor(shotId);
        sun.position.set(target.x - (camDirX / camLen) * sy, sy, target.z - (camDirZ / camLen) * sy);
      }
      // fog: close haze (40m) with a far that scales to the shot AND covers
      // the distant mountain ring (760-1020m) so it reads as atmospheric
      // haze, not crisp un-fogged monoliths (VLM: 'massive geometric blocks')
      scene.fog = new THREE.Fog(0x9ab8d0, 40, ep2 ? Math.max(1400, dist * 1.6) : Math.max(260, dist * 1.6));
      scene.updateMatrixWorld(true);
      if (grade) grade.composer.render();
      else renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    };

    // default: first shot
    try {
      window.__directorShot(episode.shots[0].id);
    } catch (e) {
      console.error('[director] default render failed', (e as Error).message);
      let diag = '';
      scene.traverse((o) => {
        const m = o as THREE.SkinnedMesh;
        if (m.isSkinnedMesh) {
          diag += `mesh=${m.name} fc=${m.frustumCulled} bones=${m.skeleton?.bones?.length} attrs=${Object.keys(m.geometry.attributes).join(',')} | `;
        }
      });
      console.error('[director] skinned diag: ' + diag);
    }

    return () => {
      renderer.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black" style={{ filter: zhumengCss() }}>
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* filmic vignette grade */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 62%, rgba(10,6,2,0.3) 100%)' }} />
    </div>
  );
}
