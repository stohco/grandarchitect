/**
 * Live Architect Studio — Director Player
 *
 * The cinematic tour player: the village tour renders in a live canvas,
 * driven by the director script (TOUR_SHOTS). Timeline slider scrubs any
 * point and plays from there; comments can be attached to any point on the
 * slider; the narrator or the MC speaks per shot; procedural sound plays
 * per shot; clicking any prop shows its interactions. Everything is
 * rendered before it is played.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, MessageSquare, Volume2, VolumeX, MousePointerClick } from 'lucide-react';
import { buildVillageScene, buildTownScene } from '@/lib/assets/factories/set-factory';
import { buildHumanoid, profileForRole } from '@/lib/assets/factories/character-factory';
import { SoundDesigner } from '@/lib/assets/sound/sound-designer';
import { TOUR_SHOTS, EPISODE_2, EPISODE_3 } from '@/lib/worldproduction/director-script';
import type { Shot } from '@/lib/worldproduction/director-script';
import { buildTourAnimation } from '@/lib/worldproduction/animation-controller';
import { attachFilmicGrade } from '@/lib/worldproduction/filmic-grade';
import { WANG_FAMILY_BEND } from '@/lib/worldproduction/set-blueprint';
import { QINGHE_MARKET_TOWN } from '@/lib/worldproduction/set-blueprint-2';
import { interactionsFor } from '@/lib/worldproduction/interactions';
import type { InteractionHint } from '@/lib/worldproduction/interactions';

const CUT_DISTANCE: Record<string, number> = {
  'extreme-wide': 260, wide: 46, medium: 9, close: 3.4,
  'extreme-close': 1.6, insert: 1.1, aerial: 820, crane: 60, dolly: 7, pov: 1.9,
};

function fovForLens(lensMm: number): number {
  return 2 * Math.atan(24 / (2 * lensMm)) * (180 / Math.PI);
}

const TOTAL_DURATION = TOUR_SHOTS.reduce((n, s) => n + s.durationSec, 0);

const COMMENT_KEY = 'tour-comments-v1';

function loadComments(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(COMMENT_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export default function DirectorPlayerPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [info, setInfo] = useState<{ id: string; name: string; kind: string; detail: string; hint: InteractionHint | null } | null>(null);
  const [comments, setComments] = useState<Record<string, string>>(loadComments);

  const stateRef = useRef({ playing: false, time: 0 });
  const soundRef = useRef<SoundDesigner | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const currentShotRef = useRef<Shot>(TOUR_SHOTS[0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.sortObjects = false;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fb8d8);
    // town episodes (E2/E3) need a deeper fog far or aerials are swallowed
    const ep = new URLSearchParams(window.location.search).get('ep');
    const ep3 = ep === '3';
    const ep2 = ep === '2' || ep3;
    scene.fog = new THREE.Fog(0x8fb8d8, 40, ep2 ? 1600 : 260);
    sceneRef.current = scene;

    const sun = new THREE.DirectionalLight(0xffe8c0, 2.2);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -300; sun.shadow.camera.right = 300;
    sun.shadow.camera.top = 300; sun.shadow.camera.bottom = -300;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 900;
    sun.shadow.camera.updateProjectionMatrix(); // bounds set AFTER creation — required or shadows never render
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x6a5a3a, 0.75));

    const village = ep2 ? buildTownScene() : buildVillageScene();
    scene.add(village.group);
    // episode-aware life: E3 = recruitment-day crowd; E2 = market bustle;
    // E1 = village tour cast (P18: NPCs must show activity)
    const life: Array<{ profile: string; x: number; z: number }> = ep3 ? [
      { profile: 'child', x: -2, z: 62 }, { profile: 'child', x: 0, z: 60 },
      { profile: 'child', x: 2, z: 58 }, { profile: 'child', x: 4, z: 60 },
      { profile: 'cultivator', x: 8, z: 56 },
      { profile: 'farmer', x: -6, z: 66 }, { profile: 'farmer', x: -8, z: 64 },
      { profile: 'elder', x: -10, z: 68 }, { profile: 'merchant', x: 6, z: 68 },
      { profile: 'elder', x: 10, z: 66 },
    ] : ep2 ? [
      { profile: 'merchant', x: 14, z: 58 }, { profile: 'farmer', x: -6, z: 64 },
      { profile: 'elder', x: 8, z: 42 }, { profile: 'child', x: -12, z: 52 },
      { profile: 'farmer', x: -70, z: 38 }, { profile: 'merchant', x: 42, z: -72 },
    ] : [
      { profile: 'farmer', x: 130, z: 95 }, { profile: 'elder', x: -14, z: -33 },
      { profile: 'elder', x: 28, z: -18 }, { profile: 'merchant', x: 22, z: 28 },
    ];
    const humanoids: Array<{ group: THREE.Group; clips: Record<string, THREE.AnimationClip>; role: string; x: number; z: number }> = [];
    for (const l of life) {
      const h = buildHumanoid(profileForRole(l.profile, 7));
      h.group.position.set(l.x, 0, l.z);
      scene.add(h.group);
      humanoids.push({ group: h.group, clips: h.clips, role: l.profile, x: l.x, z: l.z });
    }

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 4000);
    cameraRef.current = camera;

    // filmic grade baked into the pixels (OutputPass applies tone mapping +
    // sRGB — without it the whole frame renders ~4x dark; the studio player
    // had the same bug the render page had)
    let grade: ReturnType<typeof attachFilmicGrade> | null = null;
    try {
      grade = attachFilmicGrade(renderer, scene, camera);
    } catch { /* grade optional */ }

    // the animation controller: continuous camera, performers, day/night, world motion
    const controller = buildTourAnimation(scene, village.structures, humanoids, camera, { sun, hemi: scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined });

    // render loop
    let raf = 0;
    let last = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const s = stateRef.current;
      if (s.playing) {
        s.time += dt;
        if (s.time >= TOTAL_DURATION) { s.time = 0; s.playing = false; setPlaying(false); }
        setTime(s.time);
      }
      // controller drives camera + lighting + performers every frame (play or scrub)
      controller.update(s.time);
      const shot = controller.currentShot(s.time);
      if (currentShotRef.current.id !== shot.id) {
        currentShotRef.current = shot;
        soundRef.current?.playShot(shot.sound);
      }
      if (grade) grade.composer.render();
      else renderer.render(scene, camera);
    };
    loop();

    // click-to-inspect: raycast against tagged objects
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(scene.children, true).filter((h) => h.object.userData?.id);
      if (hits.length === 0) { setInfo(null); return; }
      const ud = hits[0].object.userData as { id: string; name: string; kind: string; detail?: string };
      const structure =
        WANG_FAMILY_BEND.structures.find((x) => x.id === ud.id) ??
        QINGHE_MARKET_TOWN.structures.find((x) => x.id === ud.id);
      setInfo({
        id: ud.id,
        name: ud.name ?? structure?.name ?? ud.id,
        kind: ud.kind ?? structure?.kind ?? 'detail',
        detail: ud.detail ?? structure?.artDirection ?? structure?.construction ?? '',
        hint: interactionsFor(ud.id),
      });
    };
    canvas.addEventListener('click', onClick);

    soundRef.current = new SoundDesigner();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('click', onClick);
      soundRef.current?.dispose();
      grade?.dispose();
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  // keep the UI time in sync with the loop
  useEffect(() => {
    stateRef.current.time = time;
  }, [time]);
  useEffect(() => {
    stateRef.current.playing = playing;
    if (playing) soundRef.current?.ensure();
  }, [playing]);

  const shotAt = (t: number): Shot => {
    let acc = 0;
    for (const shot of TOUR_SHOTS) {
      acc += shot.durationSec;
      if (t <= acc) return shot;
    }
    return TOUR_SHOTS[TOUR_SHOTS.length - 1];
  };

  const shot = shotAt(time);
  const speaker = shot.mcLine ? 'The Wanderer (MC)' : 'Narrator';
  const commentsFor = (id: string) => comments[id] ?? '';

  const setComment = (id: string, text: string) => {
    const next = { ...comments, [id]: text };
    setComments(next);
    try { localStorage.setItem(COMMENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-[#1a1a2e] px-2 py-1">
        <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8888aa]">Village Tour Player</span>
        <span className="text-[10px] text-[#5a5a7a]">— {TOUR_SHOTS.length} shots · {Math.round(TOTAL_DURATION)}s · shot {shot.id}</span>
        <button
          onClick={() => { setPlaying((p) => !p); }}
          className="ml-auto flex items-center gap-1 rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-0.5 text-[11px] text-[#c8c8e0] hover:bg-[#1a1a2e]"
        >
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />} {playing ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => { stateRef.current.time = time; setPlaying(true); soundRef.current?.ensure(); }}
          className="flex items-center gap-1 rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-0.5 text-[11px] text-[#a8e8c8] hover:bg-[#1a1a2e]"
          title="Play from the current slider position"
        >
          <Play className="h-3 w-3" /> Play from here
        </button>
        <button
          onClick={() => { const on = !soundOn; setSoundOn(on); soundRef.current?.setEnabled(on); }}
          className="flex items-center gap-1 rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-0.5 text-[11px] text-[#c8c8e0] hover:bg-[#1a1a2e]"
        >
          {soundOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />} {soundOn ? 'Sound' : 'Muted'}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_240px] gap-0">
        {/* stage */}
        <div className="relative min-h-0">
          <canvas ref={canvasRef} className="h-full w-full" />
          {info && (
            <div className="absolute left-2 top-2 w-56 rounded border border-[#2a4a7a] bg-[#0e0e24]/90 p-2 text-[10.5px] leading-4 text-[#c8c8e0]">
              <div className="mb-1 font-semibold text-white">{info.name} <span className="text-[#5a5a7a]">({info.kind})</span></div>
              {info.detail && <div className="mb-1 text-[#a8a8c8]">{info.detail}</div>}
              {info.hint && (
                <div className="text-[#8fd8b0]">
                  <div className="mb-0.5">Can: {info.hint.canDo.join(', ')}</div>
                  <div className="text-[#5a5a7a]">Systems: {info.hint.systems.join(', ')}</div>
                  {info.hint.diagnostic && <div className="text-[#d8a86a]">Watch: {info.hint.diagnostic}</div>}
                </div>
              )}
              <button onClick={() => setInfo(null)} className="mt-1 text-[#5a5a7a] hover:text-white">✕</button>
            </div>
          )}
          {!info && (
            <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded bg-[#0e0e24]/70 px-1.5 py-0.5 text-[9.5px] text-[#5a5a7a]">
              <MousePointerClick className="h-3 w-3" /> click any object to inspect
            </div>
          )}
        </div>

        {/* narration + comments */}
        <div className="flex min-h-0 flex-col border-l border-[#1a1a2e]">
          <div className="border-b border-[#1a1a2e] p-2">
            <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              {shot.id} · {shot.cut} · {shot.camera.lensMm}mm · {shot.camera.movement} · {Math.round(shot.durationSec)}s
            </div>
            <div className="mb-1 text-[10px] font-semibold text-amber-300">{speaker}</div>
            <div className="max-h-36 overflow-y-auto text-[11px] leading-4 text-[#c8c8e0]">
              {shot.narrator && <div className="mb-1">{shot.narrator}</div>}
              {shot.mcLine && <div className="mb-1 text-[#a8e8c8]">“{shot.mcLine}”</div>}
              <div className="mt-1 text-[9.5px] text-[#5a5a7a]">Audio: {shot.audio} · {shot.scaleNote ?? shot.location}</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider text-[#5a5a7a]">
              Director's note at this point on the timeline
            </div>
            <textarea
              value={commentsFor(shot.id)}
              onChange={(e) => setComment(shot.id, e.target.value)}
              placeholder="What should change in this scene? (saved per shot)"
              className="h-28 w-full resize-none rounded border border-[#2a2a4a] bg-[#12122a] p-1.5 text-[10.5px] text-[#c8c8e0] placeholder:text-[#5a5a7a]"
            />
            <div className="mt-1 text-[9px] text-[#5a5a7a]">Comments persist locally; every slider position is a noteable point.</div>
          </div>
        </div>
      </div>

      {/* timeline */}
      <div className="border-t border-[#1a1a2e] px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 font-mono text-[10px] text-[#5a5a7a]">
            {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')} / {Math.floor(TOTAL_DURATION / 60)}:{String(Math.floor(TOTAL_DURATION % 60)).padStart(2, '0')}
          </span>
          <input
            type="range"
            min={0}
            max={TOTAL_DURATION}
            step={0.1}
            value={time}
            onChange={(e) => setTime(parseFloat(e.target.value))}
            onDoubleClick={(e) => { setTime(parseFloat((e.target as HTMLInputElement).value)); setPlaying(true); soundRef.current?.ensure(); }}
            className="flex-1 accent-amber-400"
            title="Drag to any point; double-click to play from there"
          />
          <button
            onClick={() => setPlaying(false)}
            className="rounded border border-[#2a2a4a] bg-[#12122a] px-2 py-0.5 text-[11px] text-[#c8c8e0] hover:bg-[#1a1a2e]"
          >
            Stop
          </button>
        </div>
        <div className="mt-1 flex gap-0.5">
          {TOUR_SHOTS.map((s) => (
            <div key={s.id} title={`${s.id} — ${s.subject}`} className="flex-1">
              <div
                className={`h-1 rounded ${time >= shotStart(s.id) && time < shotStart(s.id) + s.durationSec ? 'bg-amber-400' : 'bg-[#2a2a4a]'}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function shotStart(id: string): number {
  let acc = 0;
  for (const s of TOUR_SHOTS) {
    if (s.id === id) return acc;
    acc += s.durationSec;
  }
  return 0;
}
