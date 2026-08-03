/**
 * Scheduler
 *
 * Manages the frame loop and timing domains.
 * The game simulation never depends on render frame rate.
 * A 35 FPS player and a 144 FPS player get the same outcomes.
 */

import type { Tick, TimeDomain } from './types';

type SystemFn = (dt: number, tick: Tick) => void;

interface ScheduledSystem {
  name: string;
  fn: SystemFn;
  priority: number;
  domain: TimeDomain;
}

export interface Scheduler {
  /** Register a system to run at a given priority in a given time domain. */
  registerSystem(name: string, fn: SystemFn, priority: number, domain: TimeDomain): () => void;

  /** Unregister a system. */
  unregisterSystem(name: string): void;

  /** Run one complete frame. Called by the host (requestAnimationFrame or equivalent). */
  frame(deltaMs: number): void;

  /** Get the current tick. */
  getTick(): Tick;

  /** Get the current time domain being executed. */
  getCurrentDomain(): TimeDomain | null;

  /** Pause the simulation (render continues). */
  pause(): void;

  /** Resume the simulation. */
  resume(): void;

  /** Check if paused. */
  isPaused(): boolean;

  /** Set the time scale (for slow-motion or fast-forward). */
  setTimeScale(scale: number): void;

  /** Get the time scale. */
  getTimeScale(): number;

  /** Get the fixed timestep in ms. */
  getFixedStep(): number;

  /** Get the accumulated frame time stats. */
  getStats(): SchedulerStats;
}

export interface SchedulerStats {
  tick: Tick;
  fps: number;
  fixedStepsPerFrame: number;
  lastFrameMs: number;
  avgFrameMs: number;
  paused: boolean;
}

export function createScheduler(fixedStepMs = 16.6667): Scheduler {
  const systems = new Map<string, ScheduledSystem>();
  let tick = 0;
  let accumulator = 0;
  let paused = false;
  let timeScale = 1.0;
  let currentDomain: TimeDomain | null = null;
  let lastFrameMs = 0;
  let frameCount = 0;
  let fpsAccumulator = 0;
  let fps = 0;

  // Sort systems by priority within each domain
  function getSortedSystems(domain: TimeDomain): ScheduledSystem[] {
    return Array.from(systems.values())
      .filter(s => s.domain === domain)
      .sort((a, b) => a.priority - b.priority);
  }

  function frame(deltaMs: number): void {
    lastFrameMs = deltaMs;
    frameCount++;
    fpsAccumulator += deltaMs;
    if (fpsAccumulator >= 1000) {
      fps = Math.round((frameCount * 1000) / fpsAccumulator);
      frameCount = 0;
      fpsAccumulator = 0;
    }

    // 1. Real time (input, UI) — handled by host
    currentDomain = 'real';

    if (!paused) {
      // 2. Fixed game time (simulation)
      currentDomain = 'fixed';
      accumulator += deltaMs * timeScale;
      const maxSteps = 5; // Prevent spiral of death
      let steps = 0;

      while (accumulator >= fixedStepMs && steps < maxSteps) {
        const fixedDt = fixedStepMs / 1000; // seconds
        tick++;

        const fixedSystems = getSortedSystems('fixed');
        for (const sys of fixedSystems) {
          sys.fn(fixedDt, tick);
        }

        accumulator -= fixedStepMs;
        steps++;
      }

      // If we hit maxSteps, drop the remaining accumulator to prevent spiral
      if (accumulator >= fixedStepMs) {
        accumulator = 0;
      }

      // 3. Strategic time (economy, factions, ecology)
      // Runs every Nth tick (e.g., every 60th tick = ~1 second)
      currentDomain = 'strategic';
      if (tick % 60 === 0) {
        const strategicDt = 1.0; // 1 second of strategic time
        const strategicSystems = getSortedSystems('strategic');
        for (const sys of strategicSystems) {
          sys.fn(strategicDt, tick);
        }
      }

      // 4. Historical time (years, generations, cosmic changes)
      // Runs every Nth tick (e.g., every 3600th tick = ~1 minute)
      currentDomain = 'historical';
      if (tick % 3600 === 0) {
        const historicalDt = 60.0; // 1 minute of historical time
        const historicalSystems = getSortedSystems('historical');
        for (const sys of historicalSystems) {
          sys.fn(historicalDt, tick);
        }
      }
    }

    // 5. Render time (interpolation, animation, rendering)
    // This is where the host would call the renderer.
    // The scheduler just sets the domain; the host does the actual render.
    currentDomain = 'render';
    const renderSystems = getSortedSystems('render');
    for (const sys of renderSystems) {
      sys.fn(deltaMs / 1000, tick);
    }

    currentDomain = null;
  }

  return {
    registerSystem(name, fn, priority, domain) {
      systems.set(name, { name, fn, priority, domain });
      return () => this.unregisterSystem(name);
    },

    unregisterSystem(name) {
      systems.delete(name);
    },

    frame,

    getTick() {
      return tick;
    },

    getCurrentDomain() {
      return currentDomain;
    },

    pause() {
      paused = true;
    },

    resume() {
      paused = false;
    },

    isPaused() {
      return paused;
    },

    setTimeScale(scale) {
      timeScale = scale;
    },

    getTimeScale() {
      return timeScale;
    },

    getFixedStep() {
      return fixedStepMs;
    },

    getStats() {
      return {
        tick,
        fps,
        fixedStepsPerFrame: Math.floor(accumulator / fixedStepMs),
        lastFrameMs,
        avgFrameMs: fps > 0 ? 1000 / fps : 0,
        paused,
      };
    },
  };
}
