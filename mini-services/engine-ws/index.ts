/**
 * Engine WebSocket Server
 *
 * The fastest AI↔engine channel. The AI sends JSON commands, receives
 * JSON + base64 screenshots. No browser process, no DOM, no Playwright.
 *
 * Per the project's gateway rules:
 * - Port 3003 (fixed, not from PORT env)
 * - The gateway forwards ?XTransformPort=3003 to this service
 *
 * The server is a thin layer: it receives commands, calls the engine's
 * headless API (via a shared state bridge), and returns results.
 *
 * For the prototype, the engine state is in-memory. In production, the
 * engine runs in the browser and connects to this server as a client,
 * establishing a bidirectional channel.
 */

const PORT = 3003;

// ============================================================================
// In-memory engine state (prototype)
// In production, this is replaced by a bridge to the browser-based engine.
// ============================================================================

interface EngineState {
  tick: number;
  hash: string;
  plugins: Map<string, Record<string, unknown>>;
  bodies: Map<number, BodyState>;
  entities: Map<number, EntityInfo>;
  preset: Record<string, unknown>;
}

interface BodyState {
  id: number;
  position: [number, number, number];
  rotation: [number, number, number, number];
  linearVelocity: [number, number, number];
  angularVelocity: [number, number, number];
  bodyType: 'static' | 'dynamic' | 'kinematic';
  layer: number;
}

interface EntityInfo {
  id: number;
  name: string;
  type: string;
  components: string[];
  transform: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] };
}

const state: EngineState = {
  tick: 0,
  hash: '7fde855dc9d17c7ba11c7d40c1dda10535a10dd269af0b37149104c256213f75',
  plugins: new Map([
    ['ga:fog', { density: 0.035, heightFalloff: 0.0042, color: '#2a2a3e', near: 2.0, far: 45.0 }],
    ['ga:water', { absorptionRed: 0.6, absorptionGreen: 0.04, absorptionBlue: 0.01, waveAmplitude: 0.15, waveFrequency: 2.0, waveDirection: [1, 0], waveSpeed: 0.5, roughnessScale: 0.8, reflectionStrength: 0.6 }],
    ['ga:physics', { gravity: [0, -9.81, 0], solverIterations: 10, broadphaseCellSize: 5.0, contactTolerance: 0.01, restitution: 0.3, friction: 0.6 }],
    ['ga:lighting', { sunIntensity: 1.2, sunAngle: [-15, 6, 8], ambient: 0.4, exposure: 1.0, timeOfDay: 6.5 }],
    ['ga:npc-simulator', { npcCount: 180, scheduleGranularity: 'hour', fidelityTier: 'S4' }],
    ['ga:qi-perception', { intensity: 1.0, depthShift: 0.3, chromaticShift: 0.2, hazeDensity: 0.1, staminaDrain: 0.5, fallibilityThreshold: 0.3 }],
  ]),
  bodies: new Map(),
  entities: new Map([
    [1, { id: 1, name: 'Wang Shouzheng', type: 'NPC', components: ['NPCSchedule', 'Transform', 'QiState'], transform: { position: [0, 0, -1.5], rotation: [0, 0, 0], scale: [1, 1, 1] } }],
    [2, { id: 2, name: 'Lady Chen', type: 'NPC', components: ['NPCSchedule', 'Transform', 'QiState'], transform: { position: [3.5, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } }],
    [3, { id: 3, name: 'Bucket', type: 'Item', components: ['Transform', 'PhysicsBody'], transform: { position: [1.5, 0.125, 2], rotation: [0, 0, 0], scale: [1, 1, 1] } }],
    [4, { id: 4, name: 'Well', type: 'Structure', components: ['Transform'], transform: { position: [0, 0.4, 4], rotation: [0, 0, 0], scale: [1, 1, 1] } }],
  ]),
  preset: {},
};

// Initialize a few physics bodies
state.bodies.set(3, { id: 3, position: [1.5, 0.125, 2], rotation: [0, 0, 0, 1], linearVelocity: [0, 0, 0], angularVelocity: [0, 0, 0], bodyType: 'dynamic', layer: 0 });
state.bodies.set(4, { id: 4, position: [0, 0.4, 4], rotation: [0, 0, 0, 1], linearVelocity: [0, 0, 0], angularVelocity: [0, 0, 0], bodyType: 'static', layer: 0 });

// ============================================================================
// Command handlers
// ============================================================================

type CommandResult = { result?: unknown; error?: { code: number; message: string } };

function handleCommand(method: string, params: Record<string, unknown>): CommandResult {
  try {
    switch (method) {
      // Engine control
      case 'step': {
        const ticks = (params.ticks as number) || 1;
        state.tick += ticks;
        return { result: { tick: state.tick, hash: state.hash, duration: ticks * 0.1 } };
      }
      case 'reset': {
        state.tick = 0;
        return { result: { tick: 0, hash: state.hash } };
      }
      case 'getTick':
        return { result: { tick: state.tick } };
      case 'getHash':
        return { result: { hash: state.hash } };

      // Plugin management
      case 'listPlugins': {
        const plugins = Array.from(state.plugins.keys()).map(id => ({
          id,
          params: state.plugins.get(id),
        }));
        return { result: { plugins } };
      }
      case 'getPluginState': {
        const pluginId = params.pluginId as string;
        const pluginState = state.plugins.get(pluginId);
        if (!pluginState) return { error: { code: -32602, message: `Plugin not found: ${pluginId}` } };
        return { result: { state: pluginState } };
      }
      case 'setPluginParams': {
        const pluginId = params.pluginId as string;
        const newParams = params.params as Record<string, unknown>;
        const current = state.plugins.get(pluginId);
        if (!current) return { error: { code: -32602, message: `Plugin not found: ${pluginId}` } };
        state.plugins.set(pluginId, { ...current, ...newParams });
        return { result: { ok: true, state: state.plugins.get(pluginId) } };
      }

      // Entity inspection
      case 'listEntities': {
        const entities = Array.from(state.entities.values());
        return { result: { entities, count: entities.length } };
      }
      case 'getEntity': {
        const id = params.id as number;
        const entity = state.entities.get(id);
        if (!entity) return { error: { code: -32602, message: `Entity not found: ${id}` } };
        return { result: { entity } };
      }

      // Physics control
      case 'physics.step': {
        const ticks = (params.ticks as number) || 1;
        state.tick += ticks;
        return { result: { hash: state.hash } };
      }
      case 'physics.getBody': {
        const id = params.id as number;
        const body = state.bodies.get(id);
        if (!body) return { error: { code: -32602, message: `Body not found: ${id}` } };
        return { result: { body } };
      }
      case 'physics.getBodies': {
        const bodies = Array.from(state.bodies.values());
        return { result: { bodies, count: bodies.length } };
      }
      case 'physics.applyForce': {
        const id = params.id as number;
        const force = params.force as [number, number, number];
        const body = state.bodies.get(id);
        if (!body) return { error: { code: -32602, message: `Body not found: ${id}` } };
        body.linearVelocity = [
          body.linearVelocity[0] + force[0] * 0.016,
          body.linearVelocity[1] + force[1] * 0.016,
          body.linearVelocity[2] + force[2] * 0.016,
        ];
        return { result: { ok: true, newVelocity: body.linearVelocity } };
      }
      case 'physics.applyImpulse': {
        const id = params.id as number;
        const impulse = params.impulse as [number, number, number];
        const body = state.bodies.get(id);
        if (!body) return { error: { code: -32602, message: `Body not found: ${id}` } };
        body.linearVelocity = [
          body.linearVelocity[0] + impulse[0],
          body.linearVelocity[1] + impulse[1],
          body.linearVelocity[2] + impulse[2],
        ];
        return { result: { ok: true, newVelocity: body.linearVelocity } };
      }
      case 'physics.setParams': {
        const newParams = params.params as Record<string, unknown>;
        const current = state.plugins.get('ga:physics') || {};
        state.plugins.set('ga:physics', { ...current, ...newParams });
        return { result: { ok: true, state: state.plugins.get('ga:physics') } };
      }
      case 'physics.snapshot':
        return { result: { hash: state.hash } };

      // Visual
      case 'screenshot': {
        // In production, this captures the WebGL canvas.
        // For the prototype, return a placeholder describing the current scene state.
        return {
          result: {
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            width: 1,
            height: 1,
            note: 'Placeholder. In production, this is a real WebGL screenshot.',
            sceneState: {
              tick: state.tick,
              entities: state.entities.size,
              bodies: state.bodies.size,
              fog: state.plugins.get('ga:fog'),
            },
          },
        };
      }
      case 'debugRender':
        return { result: { ok: true, enabled: params.enable as boolean } };

      // Preset management
      case 'exportPreset': {
        const preset: Record<string, unknown> = {};
        for (const [id, params] of state.plugins) {
          preset[id] = params;
        }
        return { result: { preset: JSON.stringify(preset, null, 2) } };
      }
      case 'importPreset': {
        const presetJson = params.preset as string;
        try {
          const preset = JSON.parse(presetJson);
          for (const [id, p] of Object.entries(preset)) {
            state.plugins.set(id, p as Record<string, unknown>);
          }
          return { result: { ok: true } };
        } catch {
          return { error: { code: -32700, message: 'Invalid preset JSON' } };
        }
      }

      default:
        return { error: { code: -32601, message: `Method not found: ${method}` } };
    }
  } catch (e) {
    return { error: { code: -32603, message: e instanceof Error ? e.message : String(e) } };
  }
}

// ============================================================================
// WebSocket server
// ============================================================================

const server = Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',

  // Handle WebSocket upgrade
  fetch(req, server) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'engine-ws',
        port: PORT,
        tick: state.tick,
        plugins: state.plugins.size,
        entities: state.entities.size,
        bodies: state.bodies.size,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // WebSocket upgrade
    if (url.pathname === '/ws' || url.pathname === '/') {
      if (server.upgrade(req)) {
        return; // upgrade handled
      }
    }

    // HTTP API (same commands, via POST)
    if (url.pathname === '/api' && req.method === 'POST') {
      return req.json().then((body: { method: string; params: Record<string, unknown> }) => {
        const result = handleCommand(body.method, body.params || {});
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }).catch(() => {
        return new Response(JSON.stringify({ error: { code: -32700, message: 'Invalid JSON' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      });
    }

    return new Response('Not found', { status: 404 });
  },

  websocket: {
    open(ws) {
      console.log(`[engine-ws] Client connected. Total: ${server.subscriberCount + 1}`);
      ws.send(JSON.stringify({
        type: 'welcome',
        data: {
          service: 'engine-ws',
          tick: state.tick,
          hash: state.hash,
          plugins: Array.from(state.plugins.keys()),
        },
      }));
    },

    message(ws, message) {
      let msg: { id?: number; method: string; params?: Record<string, unknown> };
      try {
        msg = JSON.parse(message.toString());
      } catch {
        ws.send(JSON.stringify({ error: { code: -32700, message: 'Invalid JSON' } }));
        return;
      }

      const { id, method, params } = msg;
      const result = handleCommand(method, params || {});

      ws.send(JSON.stringify({
        id,
        ...result,
      }));
    },

    close(ws) {
      console.log(`[engine-ws] Client disconnected. Total: ${server.subscriberCount - 1}`);
    },
  },
});

console.log(`[engine-ws] WebSocket server running on port ${PORT}`);
console.log(`[engine-ws] WebSocket: ws://localhost:${PORT}/ws`);
console.log(`[engine-ws] HTTP API:   http://localhost:${PORT}/api`);
console.log(`[engine-ws] Health:     http://localhost:${PORT}/health`);
console.log(`[engine-ws] State: ${state.entities.size} entities, ${state.bodies.size} bodies, ${state.plugins.size} plugins`);
