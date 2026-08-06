/**
 * Action Registrations
 * ====================
 *
 * Registers all existing Studio capabilities into the canonical UI Action
 * Registry. Every action has: id, label, description, workspace, maturity,
 * availability check, invoke function, shortcut, keywords.
 *
 * This is what makes capabilities discoverable by:
 *   - buttons (reference action ID)
 *   - command palette (search by keywords)
 *   - keyboard shortcuts
 *   - Grand Architect (capability discovery)
 *   - automated testing (invoke by ID)
 */

import { getUiActionRegistry } from './action-registry';
import type { UiActionDefinition, ActionContext, UiActionResult } from './action-registry';

// ---------------------------------------------------------------------------
// Helper: create a simple action
// ---------------------------------------------------------------------------

function createAction(partial: {
  id: string;
  label: string;
  description: string;
  category: string;
  workspace: UiActionDefinition['workspace'];
  maturity: UiActionDefinition['maturity'];
  shortcut?: string;
  keywords: string[];
  apiRoute?: string;
  undoable?: boolean;
  dangerous?: boolean;
}): UiActionDefinition {
  return {
    icon: undefined,
    capabilityId: partial.id,
    documentationRef: undefined,
    shortLabel: undefined,
    requiresConfirmation: partial.dangerous,
    supportsPreview: false,
    availability: (ctx: ActionContext) => {
      // Most actions require a world to be loaded
      if (!ctx.worldLoaded && partial.workspace !== 'diagnostics' && partial.workspace !== 'global') {
        return { available: false, reason: 'No world loaded', remediation: 'Generate a world first' };
      }
      return { available: true };
    },
    invoke: async (_ctx: ActionContext, _signal: AbortSignal): Promise<UiActionResult> => {
      // In production, this would call the API route
      // For now, return a placeholder result
      const response = await fetch(partial.apiRoute ?? `/api/studio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: partial.id.split('.')[1] ?? partial.id, assetId: 'action-test' }),
        signal: _signal,
      });
      if (!response.ok) {
        return {
          status: 'failed',
          message: `API returned ${response.status}`,
          error: { code: 'API_ERROR', message: `HTTP ${response.status}`, retryable: true },
        };
      }
      const data = await response.json();
      return {
        status: 'completed',
        message: data.ok ? `${partial.label} completed` : 'Action returned without ok flag',
        revision: data.worldRevision,
      };
    },
    undoable: partial.undoable ?? false,
    dangerous: partial.dangerous ?? false,
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// Register all actions
// ---------------------------------------------------------------------------

const registry = getUiActionRegistry();

// --- WORLD workspace ---

registry.register(createAction({
  id: 'world.generate',
  label: 'Generate World',
  description: 'Generate a settlement from a seed',
  category: 'world',
  workspace: 'world',
  maturity: 'integrated',
  shortcut: 'Ctrl+G',
  keywords: ['generate', 'world', 'settlement', 'seed', 'village'],
  apiRoute: '/api/editor/world',
  undoable: false,
}));

registry.register(createAction({
  id: 'terrain.createMountain',
  label: 'Create Mountain',
  description: 'Generate a mountain density field with material layers',
  category: 'terrain',
  workspace: 'world',
  maturity: 'prototype',
  keywords: ['terrain', 'mountain', 'density', 'field', 'generate'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'terrain.carveTunnel',
  label: 'Carve Tunnel',
  description: 'Carve a tunnel through the terrain density field',
  category: 'terrain',
  workspace: 'world',
  maturity: 'prototype',
  keywords: ['terrain', 'tunnel', 'carve', 'cave', 'subtract'],
  apiRoute: '/api/studio',
  undoable: true,
}));

registry.register(createAction({
  id: 'terrain.brush',
  label: 'Terrain Brush',
  description: 'Apply a density brush (add, subtract, smooth, flatten, paint)',
  category: 'terrain',
  workspace: 'world',
  maturity: 'prototype',
  keywords: ['terrain', 'brush', 'sculpt', 'paint', 'density'],
  apiRoute: '/api/studio',
  undoable: true,
}));

registry.register(createAction({
  id: 'terrain.extractSurface',
  label: 'Extract Surface',
  description: 'Run surface extraction on the density field',
  category: 'terrain',
  workspace: 'world',
  maturity: 'prototype',
  keywords: ['terrain', 'surface', 'extract', 'mesh', 'marching'],
  apiRoute: '/api/studio',
}));

// --- ASSETS workspace ---

registry.register(createAction({
  id: 'asset.createBox',
  label: 'Create Box',
  description: 'Create a box primitive mesh',
  category: 'primitives',
  workspace: 'assets',
  maturity: 'integrated',
  shortcut: 'Shift+B',
  keywords: ['create', 'box', 'primitive', 'mesh', 'cube'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'asset.createCylinder',
  label: 'Create Cylinder',
  description: 'Create a cylinder primitive mesh',
  category: 'primitives',
  workspace: 'assets',
  maturity: 'integrated',
  keywords: ['create', 'cylinder', 'primitive', 'mesh'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'asset.createSphere',
  label: 'Create Sphere',
  description: 'Create a sphere primitive mesh',
  category: 'primitives',
  workspace: 'assets',
  maturity: 'integrated',
  keywords: ['create', 'sphere', 'primitive', 'mesh'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'asset.createSectHall',
  label: 'Create Sect Hall',
  description: 'Generate a sect hall structure from grammar (7×5 bays, double eave hip roof)',
  category: 'structures',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['structure', 'sect', 'hall', 'building', 'grammar', 'generate'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'asset.createCottage',
  label: 'Create Cottage',
  description: 'Generate a mortal cottage structure from grammar (3×2 bays, thatch gable roof)',
  category: 'structures',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['structure', 'cottage', 'building', 'grammar', 'generate', 'mortal'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'asset.exportGlb',
  label: 'Export GLB',
  description: 'Export the current mesh kernel to binary glTF',
  category: 'export',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['export', 'glb', 'gltf', 'binary', 'file'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'asset.projectUVs',
  label: 'Project UVs',
  description: 'Apply projection-based UV mapping (planar, box, cylindrical, spherical)',
  category: 'uv',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['uv', 'project', 'unwrap', 'mapping', 'texture'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'asset.generateLOD',
  label: 'Generate LOD (Experimental)',
  description: 'Generate a simplified LOD using area-based face deletion (EXPERIMENTAL — not production-safe)',
  category: 'lod',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['lod', 'simplify', 'decimate', 'level', 'detail'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'asset.generateCollisionProxy',
  label: 'Generate Collision Proxy (Experimental)',
  description: 'Generate a simplified collision proxy (EXPERIMENTAL — not validated collision)',
  category: 'collision',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['collision', 'proxy', 'simplify', 'physics'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'asset.placeInWorld',
  label: 'Place Asset in World',
  description: 'Register asset revision and place entity instance in a world cell via executeCommand',
  category: 'placement',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['place', 'world', 'instance', 'entity', 'cell', 'runtime'],
  apiRoute: '/api/studio',
  undoable: true,
}));

// --- CHARACTERS workspace ---

registry.register(createAction({
  id: 'character.generateMale',
  label: 'Generate Male Character',
  description: 'Generate a complete male base body with underwear and basic equipment',
  category: 'character',
  workspace: 'characters',
  maturity: 'prototype',
  keywords: ['character', 'male', 'body', 'generate', 'player', 'base'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'character.generateFemale',
  label: 'Generate Female Character',
  description: 'Generate a complete female base body with underwear and basic equipment',
  category: 'character',
  workspace: 'characters',
  maturity: 'prototype',
  keywords: ['character', 'female', 'body', 'generate', 'player', 'base'],
  apiRoute: '/api/studio',
}));

// --- ANIMATION workspace ---

registry.register(createAction({
  id: 'animation.createWalkCycle',
  label: 'Create Walk Cycle',
  description: 'Generate a walk cycle animation clip with pelvis bob, leg swing, and footstep events',
  category: 'animation',
  workspace: 'animation',
  maturity: 'prototype',
  keywords: ['animation', 'walk', 'cycle', 'clip', 'locomotion'],
  apiRoute: '/api/studio/animation',
}));

registry.register(createAction({
  id: 'animation.evaluate',
  label: 'Evaluate Animation',
  description: 'Evaluate an animation clip at a specific time and return bone transforms',
  category: 'animation',
  workspace: 'animation',
  maturity: 'prototype',
  keywords: ['animation', 'evaluate', 'sample', 'bone', 'transform'],
  apiRoute: '/api/studio/animation',
}));

registry.register(createAction({
  id: 'animation.retarget',
  label: 'Retarget Animation',
  description: 'Retarget an animation clip to a different skeleton via bone name mapping',
  category: 'animation',
  workspace: 'animation',
  maturity: 'prototype',
  keywords: ['animation', 'retarget', 'skeleton', 'bone', 'mapping'],
  apiRoute: '/api/studio/animation',
}));

// --- SIMULATION workspace ---

registry.register(createAction({
  id: 'simulation.start',
  label: 'Start Simulation',
  description: 'Start the world simulation scheduler',
  category: 'simulation',
  workspace: 'simulation',
  maturity: 'prototype',
  shortcut: 'Space',
  keywords: ['simulation', 'start', 'run', 'play', 'tick'],
  apiRoute: '/api/engine/runtime',
}));

registry.register(createAction({
  id: 'simulation.stop',
  label: 'Stop Simulation',
  description: 'Stop the world simulation scheduler',
  category: 'simulation',
  workspace: 'simulation',
  maturity: 'prototype',
  keywords: ['simulation', 'stop', 'pause', 'freeze'],
  apiRoute: '/api/engine/runtime',
}));

registry.register(createAction({
  id: 'simulation.step',
  label: 'Step One Tick',
  description: 'Advance the simulation by one tick',
  category: 'simulation',
  workspace: 'simulation',
  maturity: 'prototype',
  shortcut: '.',
  keywords: ['simulation', 'step', 'tick', 'advance', 'debug'],
  apiRoute: '/api/engine/runtime',
}));

// --- ARCHITECT workspace ---

registry.register(createAction({
  id: 'architect.discover',
  label: 'Discover Capabilities',
  description: 'List all capabilities available to the Grand Architect',
  category: 'architect',
  workspace: 'architect',
  maturity: 'prototype',
  keywords: ['architect', 'discover', 'capabilities', 'tools', 'ai'],
  apiRoute: '/api/architect/rlm',
}));

registry.register(createAction({
  id: 'architect.refine',
  label: 'Refine Harness',
  description: 'Review trajectory and apply evidence-backed harness refinements (mock)',
  category: 'architect',
  workspace: 'architect',
  maturity: 'prototype',
  keywords: ['architect', 'refine', 'harness', 'learn', 'improve'],
  apiRoute: '/api/architect/rlm',
}));

// --- DIAGNOSTICS workspace ---

registry.register(createAction({
  id: 'diagnostics.runtimeStatus',
  label: 'Runtime Status',
  description: 'Show Engine Runtime status (revision, cells, coordinator, command types)',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['runtime', 'status', 'engine', 'revision', 'coordinator'],
  apiRoute: '/api/studio',
}));

registry.register(createAction({
  id: 'diagnostics.destructionMilestone',
  label: 'Run Destruction Milestone',
  description: 'Run the 13-step destruction milestone test (6 real assertions, 7 not-implemented)',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'prototype',
  keywords: ['destruction', 'milestone', 'test', 'terrain', 'tunnel'],
  apiRoute: '/api/world/destruction-milestone',
}));

registry.register(createAction({
  id: 'diagnostics.collisionTests',
  label: 'Run Collision Tests',
  description: 'Run all collision fixture tests (5 fixtures, deterministic)',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['collision', 'test', 'fixture', 'bvh', 'capsule'],
  apiRoute: '/api/frontier/collision-tests',
}));

registry.register(createAction({
  id: 'diagnostics.buildInfo',
  label: 'Build Info',
  description: 'Show build provenance (commit SHA, branch, dirty status, build timestamp)',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['build', 'info', 'provenance', 'commit', 'sha'],
  apiRoute: '/api/build-info',
}));

registry.register(createAction({
  id: 'diagnostics.crashReports',
  label: 'Crash Reports',
  description: 'List crash reports captured by the Crash Observatory',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['crash', 'report', 'error', 'observatory', 'diagnostic'],
  apiRoute: '/api/editor/crash-report',
}));

registry.register(createAction({
  id: 'diagnostics.frontierTechniques',
  label: 'Frontier Techniques',
  description: 'List all registered frontier techniques (19 techniques)',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['frontier', 'techniques', 'registry', 'research'],
  apiRoute: '/api/frontier/techniques',
}));

// --- GLOBAL actions ---

registry.register(createAction({
  id: 'global.undo',
  label: 'Undo',
  description: 'Undo the last transaction',
  category: 'global',
  workspace: 'global',
  maturity: 'prototype',
  shortcut: 'Ctrl+Z',
  keywords: ['undo', 'revert', 'history', 'transaction'],
  apiRoute: '/api/engine/runtime',
  undoable: false, // Undo itself is not undoable (redo is)
}));

registry.register(createAction({
  id: 'global.redo',
  label: 'Redo',
  description: 'Redo the last undone transaction',
  category: 'global',
  workspace: 'global',
  maturity: 'prototype',
  shortcut: 'Ctrl+Shift+Z',
  keywords: ['redo', 'reapply', 'history', 'transaction'],
  apiRoute: '/api/engine/runtime',
}));

registry.register(createAction({
  id: 'global.deselect',
  label: 'Deselect',
  description: 'Clear the current selection',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'Escape',
  keywords: ['deselect', 'clear', 'selection', 'escape'],
}));

registry.register(createAction({
  id: 'global.translateMode',
  label: 'Translate Mode',
  description: 'Switch the transform gizmo to translate mode',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'W',
  keywords: ['translate', 'move', 'gizmo', 'mode', 'transform'],
}));

registry.register(createAction({
  id: 'global.rotateMode',
  label: 'Rotate Mode',
  description: 'Switch the transform gizmo to rotate mode',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'E',
  keywords: ['rotate', 'gizmo', 'mode', 'transform'],
}));

registry.register(createAction({
  id: 'global.scaleMode',
  label: 'Scale Mode',
  description: 'Switch the transform gizmo to scale mode',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'R',
  keywords: ['scale', 'gizmo', 'mode', 'transform'],
}));

registry.register(createAction({
  id: 'global.toggleGrid',
  label: 'Toggle Grid',
  description: 'Show or hide the viewport grid',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'G',
  keywords: ['grid', 'toggle', 'show', 'hide', 'viewport'],
}));

registry.register(createAction({
  id: 'global.toggleGizmos',
  label: 'Toggle Gizmos',
  description: 'Show or hide transform gizmos',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'Q',
  keywords: ['gizmo', 'toggle', 'show', 'hide', 'transform'],
}));

// Export the registry for use
export { getUiActionRegistry };
