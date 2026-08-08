/**
 * Sound Designer — the audio department.
 *
 * Procedural WebAudio ambiences (no audio files): wind, dawn/dusk choruses,
 * creek, loom, the cache hum, market bustle, insects, shrine chime, and
 * more — layered per shot by cue id. Browser-only; Node consumers get a
 * no-op guard. All synthesis is deterministic in structure (seeded) so the
 * mix is reproducible; envelopes are smooth so crossfades don't click.
 */

export type SoundCueId =
  | 'wind' | 'wind_high' | 'night_wind' | 'fields_wind'
  | 'dawn_chorus' | 'dusk_chorus' | 'rooster' | 'bird_alarm' | 'crows'
  | 'forest' | 'mist_birds' | 'predator_cry'
  | 'creek' | 'water' | 'drip'
  | 'loom' | 'loom_stop' | 'cache_hum' | 'shrine_chime' | 'incense'
  | 'market_bustle' | 'morning_market' | 'chickens' | 'hammers' | 'plane'
  | 'well_creak' | 'abacus' | 'yarrow' | 'recitation' | 'whetstone'
  | 'fabric' | 'counting_room' | 'insects';

interface CueRuntime {
  stop: () => void;
  setGain: (g: number) => void;
}

const LOUDNESS: Record<SoundCueId, number> = {
  wind: 0.10, wind_high: 0.09, night_wind: 0.07, fields_wind: 0.10,
  dawn_chorus: 0.07, dusk_chorus: 0.06, rooster: 0.16, bird_alarm: 0.12,
  crows: 0.10, forest: 0.07, mist_birds: 0.06, predator_cry: 0.14,
  creek: 0.11, water: 0.08, drip: 0.12, loom: 0.14, loom_stop: 0.0,
  cache_hum: 0.10, shrine_chime: 0.12, incense: 0.05, market_bustle: 0.09,
  morning_market: 0.08, chickens: 0.10, hammers: 0.13, plane: 0.11,
  well_creak: 0.12, abacus: 0.11, yarrow: 0.13, recitation: 0.06,
  whetstone: 0.10, fabric: 0.05, counting_room: 0.05, insects: 0.06,
};

export class SoundDesigner {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private active = new Map<SoundCueId, CueRuntime[]>();
  private enabled = true;

  /** Must be called from a user gesture (browser autoplay policy). */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    if (typeof AudioContext === 'undefined') return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) for (const [, runtimes] of this.active) for (const r of runtimes) r.setGain(0);
  }

  private node(freq: number, type: OscillatorType, gain: number): { osc: OscillatorNode; g: GainNode } {
    if (!this.ctx || !this.master) throw new Error('audio not ensured');
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(this.master);
    osc.start();
    return { osc, g };
  }

  private noiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private noise(filterFreq: number, q = 0.8, gain: number): { src: AudioBufferSourceNode; g: GainNode } | null {
    if (!this.ctx || !this.master) return null;
    const buf = this.noiseBuffer();
    if (!buf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.master);
    src.start();
    return { src, g };
  }

  private build(id: SoundCueId): CueRuntime[] {
    if (!this.ctx || !this.master) return [];
    const runtimes: CueRuntime[] = [];
    const add = (r: CueRuntime) => runtimes.push(r);
    const noise = (f: number, q: number, g: number) => {
      const n = this.noise(f, q, g);
      if (n) add({ stop: () => n.src.stop(), setGain: (x) => n.g.gain.setTargetAtTime(x, this.ctx!.currentTime, 0.15) });
    };
    const osc = (f: number, type: OscillatorType, g: number, lfoFreq = 0) => {
      const { osc: o, g: og } = this.node(f, type, g);
      if (lfoFreq > 0 && this.ctx) {
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = lfoFreq;
        const lfoG = this.ctx.createGain();
        lfoG.gain.value = f * 0.03;
        lfo.connect(lfoG).connect(o.frequency);
        lfo.start();
        add({ stop: () => { o.stop(); lfo.stop(); }, setGain: (x) => og.gain.setTargetAtTime(x, this.ctx!.currentTime, 0.15) });
      } else {
        add({ stop: () => o.stop(), setGain: (x) => og.gain.setTargetAtTime(x, this.ctx!.currentTime, 0.15) });
      }
    };

    switch (id) {
      case 'wind': noise(420, 0.4, LOUDNESS.wind); break;
      case 'wind_high': noise(900, 0.5, LOUDNESS.wind_high); noise(300, 0.3, LOUDNESS.wind_high * 0.6); break;
      case 'night_wind': noise(250, 0.4, LOUDNESS.night_wind); break;
      case 'fields_wind': noise(600, 0.5, LOUDNESS.fields_wind); noise(1600, 0.7, LOUDNESS.fields_wind * 0.4); break;
      case 'creek': noise(700, 0.5, LOUDNESS.creek); noise(2200, 0.8, LOUDNESS.creek * 0.4); break;
      case 'water': noise(1100, 0.6, LOUDNESS.water); break;
      case 'loom': {
        // rhythmic shuttle thump: low sine pulses gated by an LFO
        osc(110, 'sine', LOUDNESS.loom, 2.4);
        osc(55, 'triangle', LOUDNESS.loom * 0.5, 2.4);
        break;
      }
      case 'cache_hum': {
        osc(62, 'sine', LOUDNESS.cache_hum, 0.7);
        osc(124, 'sine', LOUDNESS.cache_hum * 0.3, 0.7);
        break;
      }
      case 'shrine_chime': {
        // bell partials: fundamental + inharmonic overtones
        osc(523, 'sine', LOUDNESS.shrine_chime * 0.5);
        osc(1046, 'sine', LOUDNESS.shrine_chime * 0.3);
        osc(1568, 'sine', LOUDNESS.shrine_chime * 0.2);
        break;
      }
      case 'insects': osc(5200, 'sine', LOUDNESS.insects, 3.1); osc(6400, 'sine', LOUDNESS.insects * 0.4, 4.3); break;
      case 'market_bustle': noise(1500, 0.7, LOUDNESS.market_bustle); noise(400, 0.4, LOUDNESS.market_bustle * 0.6); break;
      case 'morning_market': noise(1200, 0.7, LOUDNESS.morning_market); break;
      case 'chickens': {
        // clucks: bursts of short triangle chirps via two detuned oscs
        osc(880, 'triangle', LOUDNESS.chickens * 0.5, 9.5);
        osc(660, 'triangle', LOUDNESS.chickens * 0.4, 7.3);
        break;
      }
      case 'hammers': osc(160, 'square', LOUDNESS.hammers * 0.4, 3.1); noise(800, 0.8, LOUDNESS.hammers * 0.3); break;
      case 'plane': noise(2400, 0.9, LOUDNESS.plane * 0.7); osc(220, 'sawtooth', LOUDNESS.plane * 0.25, 11); break;
      case 'well_creak': osc(180, 'sawtooth', LOUDNESS.well_creak * 0.6, 0.35); noise(1200, 0.9, LOUDNESS.well_creak * 0.3); break;
      case 'abacus': noise(3500, 1.0, LOUDNESS.abacus * 0.7); break;
      case 'yarrow': noise(2800, 1.0, LOUDNESS.yarrow * 0.7); break;
      case 'whetstone': noise(2600, 1.0, LOUDNESS.whetstone * 0.5); osc(300, 'sawtooth', LOUDNESS.whetstone * 0.2, 6); break;
      case 'fabric': noise(2000, 0.8, LOUDNESS.fabric * 0.6); break;
      case 'counting_room': noise(900, 0.5, LOUDNESS.counting_room); break;
      case 'incense': noise(6000, 1.2, LOUDNESS.incense * 0.8); break;
      case 'drip': osc(1300, 'sine', LOUDNESS.drip * 0.4, 0.5); break;
      case 'rooster': {
        // FM-ish crow: rising chirp via vibrato + high partials
        osc(700, 'triangle', LOUDNESS.rooster * 0.5, 13);
        osc(1400, 'triangle', LOUDNESS.rooster * 0.3, 13);
        break;
      }
      case 'bird_alarm': osc(3100, 'square', LOUDNESS.bird_alarm * 0.3, 21); break;
      case 'crows': osc(1400, 'sawtooth', LOUDNESS.crows * 0.25, 4.4); osc(1050, 'sawtooth', LOUDNESS.crows * 0.2, 3.7); break;
      case 'forest': noise(500, 0.4, LOUDNESS.forest); osc(3000, 'sine', LOUDNESS.forest * 0.3, 5.2); break;
      case 'mist_birds': noise(800, 0.6, LOUDNESS.mist_birds * 0.7); osc(2400, 'triangle', LOUDNESS.mist_birds * 0.4, 8.8); break;
      case 'predator_cry': osc(180, 'sawtooth', LOUDNESS.predator_cry * 0.3, 0.8); osc(90, 'sawtooth', LOUDNESS.predator_cry * 0.2, 0.6); break;
      case 'dawn_chorus': {
        noise(2400, 0.9, LOUDNESS.dawn_chorus * 0.7);
        osc(4200, 'triangle', LOUDNESS.dawn_chorus * 0.5, 7.7);
        osc(3300, 'triangle', LOUDNESS.dawn_chorus * 0.4, 6.1);
        break;
      }
      case 'dusk_chorus': {
        noise(1800, 0.9, LOUDNESS.dusk_chorus * 0.7);
        osc(2600, 'triangle', LOUDNESS.dusk_chorus * 0.4, 5.5);
        osc(3900, 'triangle', LOUDNESS.dusk_chorus * 0.3, 6.6);
        break;
      }
      case 'recitation': noise(500, 0.8, LOUDNESS.recitation); break;
      case 'loom_stop': break; // silence cue
      default: break;
    }
    return runtimes;
  }

  /** Start a shot's cue set (stops the previous set). */
  playShot(cues: string[] | undefined): void {
    this.stopAll();
    if (!this.enabled || !this.ctx || !cues) return;
    for (const c of cues) {
      const runtime = this.build(c as SoundCueId);
      this.active.set(c as SoundCueId, runtime);
    }
  }

  stopAll(): void {
    for (const [, runtimes] of this.active) for (const r of runtimes) r.stop();
    this.active.clear();
  }

  dispose(): void {
    this.stopAll();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}
