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
import { EPISODE_1, EPISODE_2, EPISODE_3, EPISODE_4 } from '@/lib/worldproduction/director-script';
import { residentPlacements } from '@/lib/worldproduction/residents';
import { herbPatches, animalPlacements, beastPlacements, buildHerb, buildAnimal, buildSpiritWolf } from '@/lib/worldproduction/wildlife';
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

/** Performers placed inside a room for room shots (E4: the cache chamber).
 *  ox/oz = offset from the room centre; yaw = facing rotation. */
const ROOM_PERFORMERS: Record<string, Array<{ profile: string; ox?: number; oz?: number; yaw?: number }>> = {
  'ep4.05': [{ profile: 'farmer', ox: 0.3, oz: 1.1, yaw: 0.3 }],          // Xu Erniu on the stone
  'ep4.06': [{ profile: 'cultivator', ox: -0.4, oz: 0.3, yaw: 1.2 }],     // Wang Lin sits to read
  'ep4.07': [{ profile: 'cultivator', ox: 0, oz: 0.2, yaw: 0.8 }],        // Wang Lin meditates
  'ep4.08': [{ profile: 'cultivator', ox: -0.5, oz: 0.6, yaw: 1.1 }],     // reading the node
  'ep4.09': [{ profile: 'cultivator', ox: 0, oz: 0.2, yaw: 0.6 }],        // eyes open
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
    // ?ep=3 the same town under recruitment-day light (E3),
    // ?ep=4 the village + Cangwu foothills / cache (E4)
    const ep = new URLSearchParams(window.location.search).get('ep');
    const noShadow = new URLSearchParams(window.location.search).get('shadow') === '0';
    const ep4 = ep === '4';
    const ep3 = ep === '3';
    const ep2 = ep === '2' || ep3;
    const episode = ep4 ? EPISODE_4 : ep3 ? EPISODE_3 : ep2 ? EPISODE_2 : EPISODE_1;
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
    const ambient = new THREE.AmbientLight(0xffffff, 0.22); // lower fill = shadows read
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

    // THE LIVING WORLD: canonical spirit herbs, the Cangwu wolf, animals.
    for (const herb of herbPatches()) scene.add(buildHerb(herb, village.palette));
    for (const beast of beastPlacements()) scene.add(buildSpiritWolf(beast, village.palette));
    for (const a of animalPlacements()) scene.add(buildAnimal(a, village.palette));

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

  // contact shadows: soft dark disc under every structure (grounding).
  // opacity 0.45 so shadows read as shadows — the examiner flagged 'flat
  // lighting, no shadows' (they rendered but were too subtle to perceive)
  const contactMat = new THREE.MeshBasicMaterial({ color: 0x0a0a14, transparent: true, opacity: 0.45, depthWrite: false });
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
      // E1: the NAMED residents at their houses (deterministic, from the
      // blueprint resident lists) — Wang Shouzheng's household, Widow Xu,
      // Master Hu, the tenant family, the school teacher.
      ...residentPlacements().map((r) => {
        const pos = village.structures.get(r.structureId)?.position;
        return { profile: r.role, x: (pos?.x ?? 0) + r.ox, z: (pos?.z ?? 0) + r.oz, clip: r.clip };
      }),
    ];
    const lifeGroup = new THREE.Group();
    for (const l of life) {
      const h = buildHumanoid(profileForRole(l.profile, 7));
      h.group.position.set(l.x, 0, l.z);
      lifeGroup.add(h.group);
    }
    scene.add(lifeGroup);

    // room performers: figures placed INSIDE furnished interior sets for room
    // shots (E4: Wang Lin meditating, Xu Erniu on the stone). Kept separate so
    // room shots can show them while the outer world is hidden. The seated
    // pose is the idle clip placed low enough to read as sitting.
    const roomPerformerGroup = new THREE.Group();
const roomMixers: THREE.AnimationMixer[] = [];
    scene.add(roomPerformerGroup);

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
        rs.userData = { roomH: room.h };
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
      const cam = camera.position;
      const roomCount = roomSets.size;
      const roomVisible = roomPerformerGroup.visible;
      return JSON.stringify({ structures: village.structures.size, meshes, visible, shadowCasters, fogFar, cam: [cam.x, cam.y, cam.z].map(n => +n.toFixed(1)), roomCount, roomVisible });
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
      // ep3 market-square shots: the subject is the recruitment stall + the
      // crowd line (~10 m wide), NOT the 60 m plaza — clamp the distance so
      // the people/stall fill the frame and the yamen reads secondary
      // (P07 perceptual hierarchy; VLM: 'stalls gargantuan vs buildings').
      // The dock's subject is the moored boats + cargo at the waterline
      // (~20 m band), not the 60 m deck — clamp it too so boats/barrows
      // read (VLM: 'the dock is a brown line, no boats').
      const ep3MarketShot = ep3 && shot.structureId === 'structure.qinghe.market_square';
      const dockShot = shot.structureId === 'structure.qinghe.dock';
      // subjects that are PEOPLE-sized (households, shrines, the gate) frame
      // closer so residents/figures read — a 46 m wide shot of a family
      // courtyard leaves the villagers sub-pixel (VLM: 'no humans')
      const residentShot = !ep2 && (
        ['household', 'workshop', 'school', 'shrine', 'well', 'gate'].includes(
          settlement.structures.find((x) => x.id === shot.structureId)?.kind ?? '') ||
        ['structure.tenant_household', 'structure.widow_house', 'structure.salt_merchant_house', 'structure.carpenter_house'].includes(shot.structureId ?? '')
      );
      const dist = Math.max(
        (ep3MarketShot || dockShot) ? Math.min(CUT_DISTANCE[shot.cut] ?? 20, 22)
          : residentShot ? Math.min(CUT_DISTANCE[shot.cut] ?? 20, 26)
          : CUT_DISTANCE[shot.cut] ?? 20,
        structureFootprint(shotId),
      );
      // ep3 crowd shots: the subject is PEOPLE at the line — frame close
      // enough that a 1.7 m figure fills a good fraction (a 9 m medium
      // shot leaves them ~40 px, read as 'cones'; 6 m reads the figures)
      const ep3CrowdShot = ep3MarketShot && ['close', 'medium', 'dolly', 'wide'].includes(shot.cut);
      const finalDist = ep3CrowdShot ? Math.min(dist, 6) : dist;
      const target = targetFor(shotId);
      // room shots: dedicated interior view — hide the world, show only the
      // furnished room against a warm-dark backdrop (clean, lit, readable),
      // plus the room's performers (E4: Wang Lin meditating, Xu Erniu).
      // clear any prior room performers, then add this shot's
      while (roomPerformerGroup.children.length > 0) roomPerformerGroup.remove(roomPerformerGroup.children[0]);
      roomMixers.length = 0;
      if (shot.roomId) {
        const rs = roomSets.get(shot.roomId);
        village.group.visible = false;
        lifeGroup.visible = false;
        if (skyRef) skyRef.visible = false;
        scene.background = new THREE.Color(0x1a1410);
        roomLight.position.copy(target).add(new THREE.Vector3(0, 0.6, 0));
        roomLight.intensity = 6.2;
        roomLight.distance = 20;
        ambient.intensity = 0.9;
        const inD = Math.min(rs?.d ?? 6, 6);
        // interior establishing view: 35mm wide lens, camera just above
        // furniture height, pulled back diagonally so floor + walls +
        // fixtures all read as one inhabited space (VLM: 'no detail')
        const rH = Math.min(rs?.group.userData?.roomH ?? 2.6, 3);
        // E4 meditate/cache shots: pull in tighter so the seated figure
        // fills more of the frame — a small performer reads as 'a cone'
        // (VLM: focal subject unrecognizable)
        const inset = ROOM_PERFORMERS[shotId]?.length ? 0.3 : 0.55;
        camera.position.copy(target).add(new THREE.Vector3(-inD * 0.34 * inset, rH * 0.12, -inD * 0.55 * inset));
        camera.lookAt(target.clone().add(new THREE.Vector3(0, -rH * 0.2, 0)));
        camera.fov = 58; // wide interior lens
        // place the shot's performers inside the room
        const performers = ROOM_PERFORMERS[shotId] ?? [];
        for (const p of performers) {
          const h = buildHumanoid(profileForRole(p.profile, 7));
          const hg = h.group;
          // seated pose applied DIRECTLY to the bones for the still frame
          // (the AnimationMixer needs a running loop; a single-shot render
          // won't advance it — VLM: 'a white conical object like a lamp
          // shade' because the figure stood at full height)
          const rootB = hg.getObjectByName('root') as THREE.Bone | null;
          const hipL = hg.getObjectByName('hip_l') as THREE.Bone | null;
          const hipR = hg.getObjectByName('hip_r') as THREE.Bone | null;
          const elbowL = hg.getObjectByName('elbow_l') as THREE.Bone | null;
          const elbowR = hg.getObjectByName('elbow_r') as THREE.Bone | null;
          const shoulderL = hg.getObjectByName('shoulder_l') as THREE.Bone | null;
          const shoulderR = hg.getObjectByName('shoulder_r') as THREE.Bone | null;
          if (rootB) rootB.position.y = -0.42;          // settle to sitting
          if (hipL) { hipL.rotation.x = 1.1; hipL.rotation.z = 0.25; } // leg folded
          if (hipR) { hipR.rotation.x = -1.1; hipR.rotation.z = -0.25; }
          if (shoulderL) { shoulderL.rotation.z = 0.5; shoulderL.rotation.x = -0.2; } // hands to knees
          if (shoulderR) { shoulderR.rotation.z = -0.5; shoulderR.rotation.x = -0.2; }
          if (elbowL) elbowL.rotation.z = -0.4;
          if (elbowR) elbowR.rotation.z = 0.4;
          hg.updateMatrixWorld(true);
          hg.position.set(target.x + (p.ox ?? 0), 0, target.z + (p.oz ?? 0.4));
          hg.rotation.y = p.yaw ?? 0;
          roomPerformerGroup.add(hg);
        }
        roomPerformerGroup.visible = true;
      } else {
        village.group.visible = true;
        lifeGroup.visible = true;
        roomPerformerGroup.visible = false;
        if (skyRef) skyRef.visible = true;
        scene.background = new THREE.Color(0x8fb8d8);
        roomLight.intensity = 0;
        ambient.intensity = 0.3;
      }
      if (!shot.roomId) {
        camera.fov = fovForLens(shot.camera.lensMm);
      }
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      // room shots keep their close interior camera (set above); only
      // exterior shots get the cut-distance framing
      if (!shot.roomId) {
        const aimY = target.y;
        const camH = Math.max(shot.camera.heightM, aimY * 0.72); // level-ish, never looking steeply up
        if (shot.cut === 'aerial' || shot.cut === 'extreme-wide') {
          // establishing aerials: look DOWN at the land so the river bend,
          // village, and fields fill the frame — a horizontal aerial at
          // height+dist points at the sky (VLM: 'void, flat polygons')
          camera.position.set(target.x + dist * 0.18, camH, target.z + dist * 0.18);
          camera.lookAt(target.clone().add(new THREE.Vector3(0, -camH * 0.6, 0)));
        } else {
          // use finalDist (ep3 crowd shots frame at 6 m so figures read)
          camera.position.set(target.x + finalDist * 0.7, camH, target.z + finalDist);
          camera.lookAt(target);
        }
        // sun azimuth follows the camera for ground shots (dolly lighting): the
        // visible facade gets key light instead of reading as a shadowed dark
        // mass (VLM: 'massive black monolith'). Elevation stays per-shot; only
        // the azimuth turns toward the camera so long shadows still read.
        const camDirX = camera.position.x - target.x;
        const camDirZ = camera.position.z - target.z;
        const camLen = Math.max(Math.hypot(camDirX, camDirZ), 0.001);
        const [, sy, sz] = sunElevationFor(shotId);
        sun.position.set(target.x - (camDirX / camLen) * sy, sy, target.z - (camDirZ / camLen) * sy);
      }
      // fog: close haze (40m) with a far that scales to the shot AND covers
      // the distant mountain ring (760-1020m) so it reads as atmospheric
      // haze, not crisp un-fogged monoliths (VLM: 'massive geometric blocks').
      // Village episodes get far >= 600 so the far buildings (gate at z=160,
      // cache at z=-235, village spans ~400 m) are not fogged into 'vague
      // white shapes' (VLM: distant structures invisible).
      scene.fog = new THREE.Fog(0x9ab8d0, 40, ep2 ? Math.max(1400, dist * 1.6) : Math.max(600, dist * 1.6));
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
