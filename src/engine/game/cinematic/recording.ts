/**
 * game/cinematic/recording.ts — the draft film: canvas capture to WebM.
 *
 * The renderer's canvas streams to a MediaRecorder while the cinematic
 * flies the shots. The output WebM is the LOW-FIDELITY DRAFT — the input
 * for a video model to make the world feel real. Also exports the shot
 * manifest (names + times) so the model knows what each scene is.
 * While recording, FRAME SAMPLES are collected — the director's dailies.
 */

import type { GameHandle } from '../bootstrap';
import type { Cinematic } from './cinematic';
import type { Shot } from './cinematic';
import type { FrameSample } from './director';

export interface TrailerManifest {
  title: string;
  fps: number;
  shots: Array<{ id: string; name: string; duration: number; timeOfDay: number; action?: string }>;
}

export function buildManifest(shots: Shot[], fps: number): TrailerManifest {
  return {
    title: 'Planet Suzaku — the draft panoramic',
    fps,
    shots: shots.map((s) => ({ id: s.id, name: s.name, duration: s.duration, timeOfDay: s.timeOfDay, action: s.action })),
  };
}

/** Sample the current canvas into a director's FrameSample. */
export function sampleFrame(canvas: HTMLCanvasElement, shotId: string, t: number): FrameSample {
  const w = Math.min(320, canvas.width);
  const h = Math.min(180, canvas.height);
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const ctx = off.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let skyLum = 0, horizonR = 0, horizonB = 0, dark = 0, blue = 0, pale = 0;
  const n = w * h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (y < h * 0.25) {
        skyLum += lum;
        if (y > h * 0.15) { horizonR += r; horizonB += b; }
      }
      if (lum < 0.06) dark++;
      if (b > r + 0.05 && b > 0.2) blue++;
      if (r > 0.75 && g > 0.7 && b > 0.6) pale++;
    }
  }
  const skyCount = Math.max(1, Math.floor(h * 0.25) * w);
  return {
    t,
    shotId,
    skyLum: skyLum / skyCount,
    horizonRoverB: (horizonR + 1) / (horizonB + 1),
    darkFrac: dark / n,
    blueFrac: blue / n,
    paleFrac: pale / n,
  };
}

/**
 * Record the trailer. Drives the cinematic to completion, capturing the
 * canvas to a WebM blob and collecting the director's dailies.
 * Returns { blob, manifest, samples }.
 */
export async function recordTrailer(
  engine: GameHandle,
  cinematic: Cinematic,
  fps = 30,
): Promise<{ blob: Blob; manifest: TrailerManifest; samples: FrameSample[] }> {
  const canvas = engine.renderer.domElement;
  const samples: FrameSample[] = [];
  let frame = 0;
  cinematic.onFrame = (shotId, u) => {
    // sample every 3rd frame — the director needs dailies, not rushes
    if (frame++ % 3 !== 0) return;
    samples.push(sampleFrame(canvas, shotId, u));
  };
  const stream = canvas.captureStream(fps);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  const stopped = new Promise<void>((res) => { recorder.onstop = () => res(); });

  recorder.start(200);
  const done = new Promise<void>((res) => cinematic.play(engine, res));
  await done;
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  cinematic.onFrame = null;
  return { blob: new Blob(chunks, { type: mime }), manifest: buildManifest(cinematic.shots, fps), samples };
}

/** Download a blob (the trailer + its manifest). */
export function downloadTrailer(blob: Blob, manifest: TrailerManifest, notes?: unknown): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'suzaku-trailer.webm';
  a.click();
  URL.revokeObjectURL(url);
  const payload = notes ? { manifest, director: notes } : { manifest };
  const mUrl = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const m = document.createElement('a');
  m.href = mUrl;
  m.download = 'suzaku-trailer-manifest.json';
  m.click();
  URL.revokeObjectURL(mUrl);
}
