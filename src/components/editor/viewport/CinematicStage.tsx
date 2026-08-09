/**
 * CinematicStage — the animated world in the studio's main viewport.
 *
 * The director's cut IS the world: the full scene (village, town, cache,
 * mountain ring, crowd, props) renders here, driven by the tour animation
 * controller (camera cuts, day/night, performer clips, world motion) — the
 * same data that produces the evidence frames. A control bar overlays the
 * stage: play/pause, timeline scrub, current shot readout, episode switch.
 *
 * This is the answer to "the animation should dictate everything on the
 * map": the stage IS the animation, and everything visible comes from the
 * deterministic scene + director script.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, SkipBack, SkipForward, Clapperboard, Volume2, VolumeX } from 'lucide-react';
import { buildVillageScene, buildTownScene } from '@/lib/assets/factories/set-factory';
import { buildHumanoid, profileForRole } from '@/lib/assets/factories/character-factory';
import { buildTourAnimation } from '@/lib/worldproduction/animation-controller';
import { TOUR_SHOTS, EPISODE_2, EPISODE_3, EPISODE_4 } from '@/lib/worldproduction/director-script';
import { residentPlacements } from '@/lib/worldproduction/residents';
import { herbPatches, animalPlacements, beastPlacements, buildHerb, buildAnimal, buildSpiritWolf } from '@/lib/worldproduction/wildlife';
import { SoundDesigner } from '@/lib/assets/sound/sound-designer';
import { useEditorStore } from '@/lib/editor/store';

interface EpisodeOption {
  key: string;
  label: string;
  shots: Array<{
    id: string;
    durationSec: number;
    subject: string;
    cut?: string;
    structureId?: string;
    camera?: { lensMm: number; heightM: number; movement: string };
    narrator?: string;
    mcLine?: string;
    sound?: string[];
  }>;
  scene: 'village' | 'town';
  life: Array<{ profile: string; x: number; z: number }>;
  /** E1 uses the NAMED residents at their houses. */
  useResidents?: boolean;
}

const CUT_DISTANCE: Record<string, number> = {
  'extreme-wide': 260, wide: 46, medium: 9, close: 3.4,
  'extreme-close': 1.6, insert: 1.1, aerial: 820, crane: 60, dolly: 7, pov: 1.9,
};

const EPISODES: EpisodeOption[] = [
  {
    key: '1', label: 'E1 · Dawn at Wang Bend', shots: TOUR_SHOTS,
    scene: 'village', useResidents: true,
    life: [],
  },
  {
    key: '2', label: 'E2 · Salt & Smoke', shots: EPISODE_2.shots,
    scene: 'town',
    life: [
      { profile: 'merchant', x: 14, z: 58 }, { profile: 'farmer', x: -6, z: 64 },
      { profile: 'elder', x: 8, z: 42 }, { profile: 'child', x: -12, z: 52 },
      { profile: 'farmer', x: -70, z: 38 }, { profile: 'merchant', x: 42, z: -72 },
    ],
  },
  {
    key: '3', label: 'E3 · Recruitment Day', shots: EPISODE_3.shots,
    scene: 'town',
    life: [
      { profile: 'child', x: -2, z: 62 }, { profile: 'child', x: 0, z: 60 },
      { profile: 'child', x: 2, z: 58 }, { profile: 'child', x: 4, z: 60 },
      { profile: 'cultivator', x: 8, z: 56 },
      { profile: 'farmer', x: -6, z: 66 }, { profile: 'farmer', x: -8, z: 64 },
      { profile: 'elder', x: -10, z: 68 }, { profile: 'merchant', x: 6, z: 68 },
      { profile: 'elder', x: 10, z: 66 },
    ],
  },
  {
    key: '4', label: 'E4 · The Cache and the Wolf', shots: EPISODE_4.shots,
    scene: 'village',
    life: [
      { profile: 'farmer', x: 130, z: 95 }, { profile: 'cultivator', x: -14, z: -33 },
      { profile: 'elder', x: 28, z: -18 }, { profile: 'merchant', x: 22, z: 28 },
    ],
  },
];

export default function CinematicStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(14); // start at tour.02 (the gate) so the village is in frame immediately
  const [epKey, setEpKey] = useState('1');
  const [shotLabel, setShotLabel] = useState(TOUR_SHOTS[0].id);
  const [narration, setNarration] = useState<{ speaker: string; text: string } | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controllerRef = useRef<ReturnType<typeof buildTourAnimation> | null>(null);
  const playingRef = useRef(true);
  const timeRef = useRef(14);
  const narrationRef = useRef<{ speaker: string; text: string } | null>(null);
  const soundRef = useRef<SoundDesigner | null>(null);
  const soundOnRef = useRef(true);
  const epKeyRef = useRef('1');
  const setRenderMode = useEditorStore((s) => s.setRenderMode);

  const ep = EPISODES.find((e) => e.key === epKey) ?? EPISODES[0];
  const TOTAL = ep.shots.reduce((n, s) => n + s.durationSec, 0);

  // rebuild the stage when the episode changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const epNow = EPISODES.find((e) => e.key === epKeyRef.current) ?? EPISODES[0];

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth || 900, canvas.clientHeight || 500);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.55;
    renderer.sortObjects = false;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fb8d8);
    scene.fog = new THREE.Fog(0x9ab8d0, 40, epNow.scene === 'town' ? 1600 : 260);

    const sun = new THREE.DirectionalLight(0xffe8c0, 2.2);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -300; sun.shadow.camera.right = 300;
    sun.shadow.camera.top = 300; sun.shadow.camera.bottom = -300;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 900;
    sun.shadow.camera.updateProjectionMatrix();
    scene.add(sun);
    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6a5a3a, 0.85);
    scene.add(hemi);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const village = epNow.scene === 'town' ? buildTownScene() : buildVillageScene();
    scene.add(village.group);

    // THE LIVING WORLD: canonical spirit herbs at their patches, the
    // Cangwu spirit wolf in the foothills, chickens/ducks around the
    // houses, the gate dog. Everything deterministic, from canon.
    for (const herb of herbPatches()) scene.add(buildHerb(herb, village.palette));
    for (const beast of beastPlacements()) scene.add(buildSpiritWolf(beast, village.palette));
    for (const a of animalPlacements()) scene.add(buildAnimal(a, village.palette));

    // life: E1 shows the NAMED residents at their houses (Wang Shouzheng at
    // the senior household, Widow Xu at her house, Master Hu...); town
    // episodes use their market/recruitment crowds.
    const lifeList = epNow.useResidents
      ? residentPlacements().map((r) => {
          const pos = village.structures.get(r.structureId)?.position;
          return { profile: r.role, x: (pos?.x ?? 0) + r.ox, z: (pos?.z ?? 0) + r.oz, clip: r.clip };
        })
      : epNow.life;

    const humanoids: Array<{ group: THREE.Group; clips: Record<string, THREE.AnimationClip>; role: string; x: number; z: number }> = [];
    for (const l of lifeList) {
      const h = buildHumanoid(profileForRole(l.profile, 7));
      h.group.position.set(l.x, 0, l.z);
      scene.add(h.group);
      humanoids.push({ group: h.group, clips: h.clips, role: l.profile, x: l.x, z: l.z });
    }

    const camera = new THREE.PerspectiveCamera(50, (canvas.clientWidth || 900) / (canvas.clientHeight || 500), 0.1, 4000);

    // EPISODE CAMERA DRIVER — every episode's cuts dictate the camera:
    // keyframes built from the episode's own shots (target = structure
    // position + visual centre, distance by cut size, per-shot movement
    // offsets, 0.9s ease between cuts). The tour controller is only used
    // for its performer/day-night/world-motion behaviour; camera is ours.
    const epShotsNow = epNow.shots;
    const starts: number[] = [];
    let accT = 0;
    for (const s of epShotsNow) { starts.push(accT); accT += s.durationSec; }
    const EP_TOTAL = accT;
    const kf = (s: { cut: string; structureId?: string; camera: { lensMm: number; heightM: number; movement: string } }) => {
      const target = s.structureId
        ? (village.structures.get(s.structureId)?.position.clone() ?? new THREE.Vector3(0, 0, 0))
        : new THREE.Vector3(0, 0, 0);
      const bp = village.structures.get(s.structureId ?? '');
      target.y += bp ? Math.min((bp.userData?.h ?? 4) * 0.42, 5) : 2;
      const dist = (CUT_DISTANCE[s.cut] ?? 20) + 0; // footprint-aware below
      const sD = s as unknown as { structureId?: string };
      const bpS = sD.structureId ? village.structures.get(sD.structureId) : undefined;
      const fp = bpS?.userData ? Math.max((bpS.userData as { w?: number; d?: number }).w ?? 0, (bpS.userData as { w?: number; d?: number }).d ?? 0) * 0.9 + 8 : 0;
      const d = Math.max(dist, Math.min(fp, 160));
      return {
        pos: new THREE.Vector3(target.x + d * 0.7, Math.max(s.camera.heightM, target.y * 0.72), target.z + d),
        target,
        fov: 2 * Math.atan(24 / (2 * s.camera.lensMm)) * (180 / Math.PI),
        movement: s.camera.movement,
        dur: (s as unknown as { durationSec: number }).durationSec,
      };
    };
    const keyframes = epShotsNow.map((s) => ({
      shot: s,
      kf: kf(s as { cut: string; structureId?: string; camera: { lensMm: number; heightM: number; movement: string }; durationSec: number }),
    }));

    // performers via the tour controller (clips + world motion), camera ours
    const controller = buildTourAnimation(scene, village.structures, humanoids, camera, { sun, hemi });
    controllerRef.current = controller;
    let currentKfIdx = -1;
    let blendFrom: { pos: THREE.Vector3; target: THREE.Vector3; fov: number } | null = null;
    let blendStart = 0;

    const driveCamera = (t: number) => {
      const tt = t % EP_TOTAL;
      let idx = 0;
      for (let i = 0; i < starts.length; i++) if (tt >= starts[i]) idx = i;
      const { kf: k } = keyframes[idx];
      const local = tt - starts[idx];
      if (idx !== currentKfIdx) {
        blendFrom = { pos: camera.position.clone(), target: k.target.clone(), fov: camera.fov };
        blendStart = local;
        currentKfIdx = idx;
      }
      const e = blendFrom ? Math.min(Math.max((local - blendStart) / 0.9, 0), 1) : 1;
      const ease = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
      const mvOffsets: Record<string, [number, number, number]> = {
        'dolly-in': [0.4, 0, 1], 'dolly-out': [-0.4, 0, -1], 'push-in': [0, 0.2, 1.2],
        'track': [1, 0, 0.6], 'crane-down': [0, -1, 0], 'crane-up': [0, 1, 0],
        'pan': [1, 0, 0], 'tilt': [0, 0.5, 0], 'orbital': [1.2, 0, 1.2],
      };
      const mv = mvOffsets[k.movement] ?? [0, 0, 0];
      const kt = Math.min(local / Math.max(k.dur, 1), 1);
      const base = blendFrom ? new THREE.Vector3().lerpVectors(blendFrom.pos, k.pos, ease) : k.pos.clone();
      const tgt = blendFrom ? new THREE.Vector3().lerpVectors(blendFrom.target, k.target, ease) : k.target.clone();
      camera.position.copy(base).add(new THREE.Vector3(mv[0] * kt * 2, mv[1] * kt, mv[2] * kt));
      camera.lookAt(tgt);
      camera.fov = blendFrom ? blendFrom.fov + (k.fov - blendFrom.fov) * ease : k.fov;
      camera.updateProjectionMatrix();
    };

    const sound = new SoundDesigner();
    soundRef.current = sound;
    let lastEpShotId = '';

    let raf = 0;
    let last = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (playingRef.current) {
        timeRef.current += dt;
        if (timeRef.current >= TOTAL) timeRef.current = 0;
        setTime(timeRef.current);
      }
      controller.update(timeRef.current); // performers + day/night + world motion
      driveCamera(timeRef.current);        // the episode's cuts own the camera
      // the current EPISODE shot (camera + narration + sound all agree)
      const epShots = EPISODES.find((e) => e.key === epKeyRef.current)?.shots ?? TOUR_SHOTS;
      let acc = 0;
      let epShot = epShots[epShots.length - 1];
      for (const s of epShots) {
        if (timeRef.current < acc + s.durationSec) { epShot = s; break; }
        acc += s.durationSec;
      }
      setShotLabel((epShot as { id?: string }).id ?? '');
      // narration/dialogue: the current episode's shot carries narrator +
      // MC lines — show them as subtitles (speaker-labelled).
      const line = (epShot as { mcLine?: string }).mcLine
        ? { speaker: 'The Wanderer', text: (epShot as { mcLine?: string }).mcLine ?? '' }
        : (epShot as { narrator?: string }).narrator
          ? { speaker: 'Narrator', text: (epShot as { narrator?: string }).narrator ?? '' }
          : null;
      if (line && line.text !== narrationRef.current?.text) {
        narrationRef.current = line;
        setNarration(line);
      }
      // sound: play this shot's cues once on shot change (dawn chorus,
      // loom, cache hum... the world's voice)
      const epShotId = (epShot as { id?: string }).id ?? '';
      if (epShotId !== lastEpShotId) {
        lastEpShotId = epShotId;
        if (soundOnRef.current) {
          sound.ensure();
          sound.playShot((epShot as { sound?: string[] }).sound ?? []);
        }
      }
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      sound.dispose();
      renderer.dispose();
      rendererRef.current = null;
      controllerRef.current = null;
    };
  }, [epKey]);

  const toggle = () => {
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
  };
  const scrub = (t: number) => {
    timeRef.current = t;
    setTime(t);
  };
  const jump = (dir: 1 | -1) => {
    const shots = ep.shots;
    let acc = 0;
    let idx = 0;
    for (let i = 0; i < shots.length; i++) {
      if (timeRef.current >= acc) idx = i;
      acc += shots[i].durationSec;
    }
    const next = Math.max(0, Math.min(shots.length - 1, idx + dir));
    let start = 0;
    for (let i = 0; i < next; i++) start += shots[i].durationSec;
    scrub(start);
  };

  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* narration / dialogue subtitles — the xianxia plot on screen */}
      {narration && (
        <div className="pointer-events-none absolute left-0 right-0 bottom-12 flex justify-center px-6">
          <div className="max-w-[80%] rounded-lg border border-[#3a3a5a]/60 bg-[#0e0e24]/80 px-3 py-2 backdrop-blur-sm">
            <div className={`mb-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${narration.speaker === 'The Wanderer' ? 'text-[#8fd8b0]' : 'text-[#d8a86a]'}`}>
              {narration.speaker}
            </div>
            <div className="text-[11.5px] leading-4 text-[#e0e0f0]">{narration.text}</div>
          </div>
        </div>
      )}
      {/* control bar: play/pause, timeline, episode switch */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 border-t border-[#2a2a4a] bg-[#0e0e24]/85 px-2 py-1.5">
        <select
          value={epKey}
          onChange={(e) => { setEpKey(e.target.value); epKeyRef.current = e.target.value; timeRef.current = 0; setTime(0); }}
          className="rounded border border-[#2a2a4a] bg-[#12122a] px-1.5 py-0.5 text-[10.5px] text-[#c8c8e0]"
          title="Episode — the animation dictates the world"
        >
          {EPISODES.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
        </select>
        <button onClick={() => jump(-1)} className="rounded border border-[#2a2a4a] bg-[#12122a] p-1 text-[#c8c8e0] hover:bg-[#1a1a2e]" title="Previous shot"><SkipBack className="h-3 w-3" /></button>
        <button onClick={toggle} className="rounded border border-[#2a2a4a] bg-[#12122a] p-1 text-[#a8e8c8] hover:bg-[#1a1a2e]" title={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
        <button onClick={() => jump(1)} className="rounded border border-[#2a2a4a] bg-[#12122a] p-1 text-[#c8c8e0] hover:bg-[#1a1a2e]" title="Next shot"><SkipForward className="h-3 w-3" /></button>
        <input
          type="range" min={0} max={TOTAL} step={0.1} value={time}
          onChange={(e) => scrub(parseFloat(e.target.value))}
          className="h-1 flex-1 accent-[#4a9a7a]" title="Timeline — scrub to any moment"
        />
        <span className="whitespace-nowrap text-[9.5px] text-[#8888aa]">{fmt(time)} / {fmt(TOTAL)}</span>
        <span className="flex items-center gap-1 whitespace-nowrap rounded bg-[#1a1a3a] px-1.5 py-0.5 text-[9.5px] text-[#8fd8b0]">
          <Clapperboard className="h-3 w-3" /> {shotLabel}
        </span>
        <button
          onClick={() => { const on = !soundOn; setSoundOn(on); soundOnRef.current = on; soundRef.current?.setEnabled(on); }}
          className="rounded border border-[#2a2a4a] bg-[#12122a] p-1 text-[#c8c8e0] hover:bg-[#1a1a2e]"
          title={soundOn ? 'Sound on' : 'Sound muted'}
        >
          {soundOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
        </button>
        <button
          onClick={() => setRenderMode('shaded')}
          className="rounded border border-[#2a2a4a] bg-[#12122a] px-1.5 py-0.5 text-[9.5px] text-[#5a5a7a] hover:text-[#c8c8e0]"
          title="Back to the simulation editor view"
        >
          Sim View
        </button>
      </div>
    </div>
  );
}
