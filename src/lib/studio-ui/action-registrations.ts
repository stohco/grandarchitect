/**
 * Action Registrations
 * ====================
 *
 * Registers all Studio capabilities into the canonical UI Action Registry.
 * Every action has ONE implementation — its `invoke` resolves to a real
 * handler from action-handlers.ts (API or store transition) or an honest
 * DISABLED_WITH_REASON (no backend exists). There are NO silent no-ops.
 *
 * This is what makes capabilities discoverable by:
 *   - buttons (dispatch by action ID)
 *   - command palette (search by keywords)
 *   - keyboard shortcuts (registry shortcut table)
 *   - Grand Architect (capability discovery)
 *   - automated testing (invoke by ID)
 */

import { getUiActionRegistry } from './action-registry';
import type { UiActionDefinition, ActionContext, UiActionResult } from './action-registry';
import { actionHandlers, blockedResult, type ActionHandler } from './action-handlers';

// ---------------------------------------------------------------------------
// Registration helper
// ---------------------------------------------------------------------------

interface ActionSpec {
  id: string;
  label: string;
  description: string;
  category: string;
  workspace: UiActionDefinition['workspace'];
  maturity: UiActionDefinition['maturity'];
  shortcut?: string;
  keywords: string[];
  undoable?: boolean;
  dangerous?: boolean;
  /** Optional per-action availability override (default: world must be loaded). */
  availability?: (ctx: ActionContext) => { available: boolean; reason?: string; remediation?: string };
  /** When set, the action is honestly disabled with this reason. */
  disabledReason?: string;
}

function registerAction(spec: ActionSpec): void {
  const handler: ActionHandler | undefined = actionHandlers[spec.id];
  const hasHandler = Object.prototype.hasOwnProperty.call(actionHandlers, spec.id);
  const disabledReason = spec.disabledReason ?? (hasHandler ? undefined : `No handler registered for action "${spec.id}".`);

  const def: UiActionDefinition = {
    id: spec.id,
    label: spec.label,
    description: spec.description,
    category: spec.category,
    workspace: spec.workspace,
    maturity: spec.maturity,
    shortcut: spec.shortcut,
    keywords: spec.keywords,
    undoable: spec.undoable ?? false,
    dangerous: spec.dangerous ?? false,
    requiresConfirmation: spec.dangerous,
    supportsPreview: false,
    icon: undefined,
    capabilityId: spec.id,
    documentationRef: undefined,
    shortLabel: undefined,
    disabledReason,
    availability:
      spec.availability ??
      ((ctx: ActionContext) => {
        if (spec.workspace !== 'diagnostics' && spec.workspace !== 'global' && !ctx.worldLoaded) {
          return { available: false, reason: 'No world loaded', remediation: 'Generate a world first' };
        }
        return { available: true };
      }),
    invoke: (ctx: ActionContext, signal: AbortSignal): Promise<UiActionResult> => {
      if (disabledReason) return Promise.resolve(blockedResult(disabledReason));
      return handler!(ctx, signal);
    },
  };

  getUiActionRegistry().register(def);
}

// ---------------------------------------------------------------------------
// Register all actions
// ---------------------------------------------------------------------------

// --- WORLD workspace ---

registerAction({
  id: 'world.generate',
  label: 'Generate World',
  description: 'Generate a settlement from a seed',
  category: 'world',
  workspace: 'world',
  maturity: 'integrated',
  shortcut: 'Ctrl+G',
  keywords: ['generate', 'world', 'settlement', 'seed', 'village'],
});

registerAction({
  id: 'terrain.createMountain',
  label: 'Create Mountain',
  description: 'Generate a mountain density field with material layers',
  category: 'terrain',
  workspace: 'world',
  maturity: 'prototype',
  keywords: ['terrain', 'mountain', 'density', 'field', 'generate'],
});

registerAction({
  id: 'terrain.carveTunnel',
  label: 'Carve Tunnel',
  description: 'Carve a tunnel through the terrain density field',
  category: 'terrain',
  workspace: 'world',
  maturity: 'prototype',
  keywords: ['terrain', 'tunnel', 'carve', 'cave', 'subtract'],
  undoable: true,
});

registerAction({
  id: 'terrain.brush',
  label: 'Terrain Brush',
  description: 'Apply a density brush (add, subtract, smooth, flatten, paint)',
  category: 'terrain',
  workspace: 'world',
  maturity: 'prototype',
  keywords: ['terrain', 'brush', 'sculpt', 'paint', 'density'],
  undoable: true,
});

registerAction({
  id: 'terrain.extractSurface',
  label: 'Extract Surface',
  description: 'Run surface extraction on the density field',
  category: 'terrain',
  workspace: 'world',
  maturity: 'prototype',
  keywords: ['terrain', 'surface', 'extract', 'mesh', 'marching'],
});

// --- ASSETS workspace ---

registerAction({
  id: 'asset.createBox',
  label: 'Create Box',
  description: 'Create a box primitive mesh',
  category: 'primitives',
  workspace: 'assets',
  maturity: 'integrated',
  shortcut: 'Shift+B',
  keywords: ['create', 'box', 'primitive', 'mesh', 'cube'],
});

registerAction({
  id: 'asset.createCylinder',
  label: 'Create Cylinder',
  description: 'Create a cylinder primitive mesh',
  category: 'primitives',
  workspace: 'assets',
  maturity: 'integrated',
  keywords: ['create', 'cylinder', 'primitive', 'mesh'],
});

registerAction({
  id: 'asset.createSphere',
  label: 'Create Sphere',
  description: 'Create a sphere primitive mesh',
  category: 'primitives',
  workspace: 'assets',
  maturity: 'integrated',
  keywords: ['create', 'sphere', 'primitive', 'mesh'],
});

registerAction({
  id: 'asset.createSectHall',
  label: 'Create Sect Hall',
  description: 'Generate a sect hall structure from grammar (7×5 bays, double eave hip roof)',
  category: 'structures',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['structure', 'sect', 'hall', 'building', 'grammar', 'generate'],
});

registerAction({
  id: 'asset.createCottage',
  label: 'Create Cottage',
  description: 'Generate a mortal cottage structure from grammar (3×2 bays, thatch gable roof)',
  category: 'structures',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['structure', 'cottage', 'building', 'grammar', 'generate', 'mortal'],
});

registerAction({
  id: 'asset.exportGlb',
  label: 'Export GLB',
  description: 'Export the current mesh kernel to binary glTF',
  category: 'export',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['export', 'glb', 'gltf', 'binary', 'file'],
});

registerAction({
  id: 'asset.projectUVs',
  label: 'Project UVs',
  description: 'Apply projection-based UV mapping (planar, box, cylindrical, spherical)',
  category: 'uv',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['uv', 'project', 'unwrap', 'mapping', 'texture'],
});

registerAction({
  id: 'asset.generateLOD',
  label: 'Generate LOD (Experimental)',
  description: 'Generate a simplified LOD using area-based face deletion (EXPERIMENTAL — not production-safe)',
  category: 'lod',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['lod', 'simplify', 'decimate', 'level', 'detail'],
  disabledReason:
    'No backend: /api/studio has no generate_lod POST case (the operation-stack engine op exists but no transport handler; adding one is outside this worktree).',
});

registerAction({
  id: 'asset.generateCollisionProxy',
  label: 'Generate Collision Proxy (Experimental)',
  description: 'Generate a simplified collision proxy (EXPERIMENTAL — not validated collision)',
  category: 'collision',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['collision', 'proxy', 'simplify', 'physics'],
  disabledReason:
    'No backend: /api/studio has no generate_collision_proxy POST case (engine op exists but no transport handler; adding one is outside this worktree).',
});

registerAction({
  id: 'asset.placeInWorld',
  label: 'Place Asset in World',
  description: 'Register asset revision and place entity instance in a world cell via executeCommand',
  category: 'placement',
  workspace: 'assets',
  maturity: 'prototype',
  keywords: ['place', 'world', 'instance', 'entity', 'cell', 'runtime'],
  undoable: true,
});

// --- CHARACTERS workspace ---

registerAction({
  id: 'character.generateMale',
  label: 'Generate Male Character',
  description: 'Generate a complete male base body with underwear and basic equipment',
  category: 'character',
  workspace: 'characters',
  maturity: 'prototype',
  keywords: ['character', 'male', 'body', 'generate', 'player', 'base'],
});

registerAction({
  id: 'character.generateFemale',
  label: 'Generate Female Character',
  description: 'Generate a complete female base body with underwear and basic equipment',
  category: 'character',
  workspace: 'characters',
  maturity: 'prototype',
  keywords: ['character', 'female', 'body', 'generate', 'player', 'base'],
});

// --- ANIMATION workspace ---

registerAction({
  id: 'animation.createWalkCycle',
  label: 'Create Walk Cycle',
  description: 'Generate a walk cycle animation clip with pelvis bob, leg swing, and footstep events',
  category: 'animation',
  workspace: 'animation',
  maturity: 'prototype',
  keywords: ['animation', 'walk', 'cycle', 'clip', 'locomotion'],
});

registerAction({
  id: 'animation.evaluate',
  label: 'Evaluate Animation',
  description: 'Evaluate an animation clip at a specific time and return bone transforms',
  category: 'animation',
  workspace: 'animation',
  maturity: 'prototype',
  keywords: ['animation', 'evaluate', 'sample', 'bone', 'transform'],
});

registerAction({
  id: 'animation.retarget',
  label: 'Retarget Animation',
  description: 'Retarget an animation clip to a different skeleton via bone name mapping',
  category: 'animation',
  workspace: 'animation',
  maturity: 'prototype',
  keywords: ['animation', 'retarget', 'skeleton', 'bone', 'mapping'],
});

// --- SIMULATION workspace ---

registerAction({
  id: 'simulation.start',
  label: 'Start Simulation',
  description: 'Start the engine runtime scheduler and enter full_simulation',
  category: 'simulation',
  workspace: 'simulation',
  maturity: 'prototype',
  shortcut: 'Space',
  keywords: ['simulation', 'start', 'run', 'play', 'tick'],
});

registerAction({
  id: 'simulation.stop',
  label: 'Stop Simulation',
  description: 'Stop the engine runtime scheduler and return to generation_freeze via legal transitions',
  category: 'simulation',
  workspace: 'simulation',
  maturity: 'prototype',
  keywords: ['simulation', 'stop', 'pause', 'freeze'],
});

registerAction({
  id: 'simulation.step',
  label: 'Step One Tick',
  description: 'Advance the engine runtime scheduler by one tick',
  category: 'simulation',
  workspace: 'simulation',
  maturity: 'prototype',
  shortcut: '.',
  keywords: ['simulation', 'step', 'tick', 'advance', 'debug'],
});

// --- ARCHITECT workspace ---

registerAction({
  id: 'architect.discover',
  label: 'Discover Capabilities',
  description: 'List all capabilities available to the Grand Architect (RLM provider info)',
  category: 'architect',
  workspace: 'architect',
  maturity: 'prototype',
  keywords: ['architect', 'discover', 'capabilities', 'tools', 'ai'],
});

registerAction({
  id: 'architect.refine',
  label: 'Refine Harness',
  description: 'Review trajectory and apply evidence-backed harness refinements (mock RLM)',
  category: 'architect',
  workspace: 'architect',
  maturity: 'prototype',
  keywords: ['architect', 'refine', 'harness', 'learn', 'improve'],
});

// --- FIBERLAB (under Diagnostics) ---

registerAction({
  id: 'prototype.create',
  label: 'Create Experiment',
  description: 'Create a new FiberLab SceneCapsule for code-driven R3F experimentation',
  category: 'fiberlab',
  workspace: 'diagnostics',
  maturity: 'prototype',
  keywords: ['prototype', 'experiment', 'fiberlab', 'capsule', 'r3f', 'shader', 'create'],
});

registerAction({
  id: 'prototype.run',
  label: 'Run Experiment',
  description: 'Run a SceneCapsule in the sandboxed FiberLab environment',
  category: 'fiberlab',
  workspace: 'diagnostics',
  maturity: 'prototype',
  keywords: ['prototype', 'run', 'execute', 'fiberlab', 'capsule'],
});

registerAction({
  id: 'prototype.capture',
  label: 'Capture Experiment',
  description: 'Capture a screenshot or performance data from a running experiment',
  category: 'fiberlab',
  workspace: 'diagnostics',
  maturity: 'prototype',
  keywords: ['prototype', 'capture', 'screenshot', 'evidence', 'fiberlab'],
});

registerAction({
  id: 'prototype.fork',
  label: 'Fork Experiment',
  description: 'Fork a SceneCapsule to create a variant for comparison (real FiberLab fork)',
  category: 'fiberlab',
  workspace: 'diagnostics',
  maturity: 'prototype',
  keywords: ['prototype', 'fork', 'variant', 'compare', 'fiberlab'],
});

registerAction({
  id: 'prototype.benchmark',
  label: 'Benchmark Experiment',
  description: 'Run performance benchmark on a SceneCapsule (frame time, draw calls, memory)',
  category: 'fiberlab',
  workspace: 'diagnostics',
  maturity: 'prototype',
  keywords: ['prototype', 'benchmark', 'performance', 'fps', 'fiberlab'],
});

registerAction({
  id: 'prototype.promote',
  label: 'Promote Experiment',
  description: 'Promote a benchmarked SceneCapsule to a production engine capability',
  category: 'fiberlab',
  workspace: 'diagnostics',
  maturity: 'prototype',
  keywords: ['prototype', 'promote', 'production', 'capability', 'fiberlab'],
});

registerAction({
  id: 'prototype.reject',
  label: 'Reject Experiment',
  description: 'Reject a SceneCapsule experiment',
  category: 'fiberlab',
  workspace: 'diagnostics',
  maturity: 'prototype',
  keywords: ['prototype', 'reject', 'discard', 'fiberlab'],
});

// --- DIAGNOSTICS workspace ---

registerAction({
  id: 'diagnostics.runtimeStatus',
  label: 'Runtime Status',
  description: 'Show Engine Runtime status (revision, cells, coordinator, command types)',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['runtime', 'status', 'engine', 'revision', 'coordinator'],
});

registerAction({
  id: 'diagnostics.destructionMilestone',
  label: 'Run Destruction Milestone',
  description: 'Run the 13-step destruction milestone test (6 real assertions, 7 not-implemented)',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'prototype',
  keywords: ['destruction', 'milestone', 'test', 'terrain', 'tunnel'],
});

registerAction({
  id: 'diagnostics.collisionTests',
  label: 'Run Collision Tests',
  description: 'Run all collision fixture tests (5 fixtures, deterministic)',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['collision', 'test', 'fixture', 'bvh', 'capsule'],
});

registerAction({
  id: 'diagnostics.buildInfo',
  label: 'Build Info',
  description: 'Show build provenance (commit SHA, branch, dirty status, build timestamp)',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['build', 'info', 'provenance', 'commit', 'sha'],
});

registerAction({
  id: 'diagnostics.crashReports',
  label: 'Crash Reports',
  description: 'List crash reports captured by the Crash Observatory',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['crash', 'report', 'error', 'observatory', 'diagnostic'],
});

registerAction({
  id: 'diagnostics.frontierTechniques',
  label: 'Frontier Techniques',
  description: 'List all registered frontier techniques (19 techniques)',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['frontier', 'techniques', 'registry', 'research'],
});

registerAction({
  id: 'diagnostics.clearLogs',
  label: 'Clear Console',
  description: 'Clear the editor console log',
  category: 'diagnostics',
  workspace: 'diagnostics',
  maturity: 'integrated',
  keywords: ['console', 'clear', 'logs', 'diagnostic'],
});

// --- GLOBAL actions ---

registerAction({
  id: 'global.undo',
  label: 'Undo',
  description: 'Undo the last transaction (engine authorial undo, falling back to editor transaction history)',
  category: 'global',
  workspace: 'global',
  maturity: 'prototype',
  shortcut: 'Ctrl+Z',
  keywords: ['undo', 'revert', 'history', 'transaction'],
});

registerAction({
  id: 'global.redo',
  label: 'Redo',
  description: 'Redo the last undone transaction',
  category: 'global',
  workspace: 'global',
  maturity: 'prototype',
  shortcut: 'Ctrl+Shift+Z',
  keywords: ['redo', 'reapply', 'history', 'transaction'],
  disabledReason:
    'No redo backend exists: the engine runtime has no redo stack, there is no authorial redo endpoint, and the editor store has no redo action.',
});

registerAction({
  id: 'global.select',
  label: 'Select Entity',
  description: 'Select an entity (replace, add, or toggle)',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  keywords: ['select', 'entity', 'choose', 'click'],
});

registerAction({
  id: 'global.deselect',
  label: 'Deselect',
  description: 'Clear the current selection',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'Escape',
  keywords: ['deselect', 'clear', 'selection', 'escape'],
});

registerAction({
  id: 'global.selectAll',
  label: 'Select All',
  description: 'Select every entity in the settlement',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'Ctrl+A',
  keywords: ['select', 'all', 'every', 'entity'],
});

registerAction({
  id: 'global.translateMode',
  label: 'Translate Mode',
  description: 'Switch the transform gizmo to translate mode',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'W',
  keywords: ['translate', 'move', 'gizmo', 'mode', 'transform'],
});

registerAction({
  id: 'global.rotateMode',
  label: 'Rotate Mode',
  description: 'Switch the transform gizmo to rotate mode',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'E',
  keywords: ['rotate', 'gizmo', 'mode', 'transform'],
});

registerAction({
  id: 'global.scaleMode',
  label: 'Scale Mode',
  description: 'Switch the transform gizmo to scale mode',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'R',
  keywords: ['scale', 'gizmo', 'mode', 'transform'],
});

registerAction({
  id: 'global.toggleGrid',
  label: 'Toggle Grid',
  description: 'Show or hide the viewport grid',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'G',
  keywords: ['grid', 'toggle', 'show', 'hide', 'viewport'],
});

registerAction({
  id: 'global.toggleGizmos',
  label: 'Toggle Gizmos',
  description: 'Show or hide transform gizmos',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'Q',
  keywords: ['gizmo', 'toggle', 'show', 'hide', 'transform'],
});

registerAction({
  id: 'global.toggleSnap',
  label: 'Toggle Snapping',
  description: 'Show or hide snapping',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  shortcut: 'X',
  keywords: ['snap', 'toggle', 'snapping', 'grid'],
});

registerAction({
  id: 'global.toggleStats',
  label: 'Toggle Stats Overlay',
  description: 'Show or hide the FPS/draw-call stats overlay',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  keywords: ['stats', 'fps', 'toggle', 'overlay', 'performance'],
});

registerAction({
  id: 'global.togglePhysics',
  label: 'Toggle Physics',
  description: 'Toggle the Rapier physics indicator',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  keywords: ['physics', 'toggle', 'rapier', 'collision'],
});

registerAction({
  id: 'global.toggleBottomDock',
  label: 'Toggle Console Dock',
  description: 'Show or hide the bottom dock',
  category: 'global',
  workspace: 'global',
  maturity: 'integrated',
  keywords: ['console', 'dock', 'toggle', 'bottom'],
});

// --- PLAYTEST workspace ---

registerAction({
  id: 'playtest.toggle',
  label: 'Toggle Playtest',
  description: 'Enter or exit embodied playtest mode (Rapier character controller)',
  category: 'playtest',
  workspace: 'playtest',
  maturity: 'browser-proven',
  shortcut: 'P',
  keywords: ['playtest', 'play', 'embodied', 'toggle', 'game'],
});

// --- WORLD lifecycle (fork / edits / visibility) ---

registerAction({
  id: 'world.fork',
  label: 'Fork World',
  description: 'Create a real world branch (transaction history fork) at the current tick',
  category: 'world',
  workspace: 'world',
  maturity: 'integrated',
  keywords: ['fork', 'branch', 'world', 'temporary'],
  dangerous: true,
});

registerAction({
  id: 'world.resetEdits',
  label: 'Reset Edits',
  description: 'Discard all local transform edits (revert to generated state)',
  category: 'world',
  workspace: 'world',
  maturity: 'integrated',
  keywords: ['reset', 'edits', 'revert', 'discard', 'transform'],
});

registerAction({
  id: 'world.toggleVisibility',
  label: 'Toggle Visibility',
  description: 'Hide or show an entity in the viewport',
  category: 'world',
  workspace: 'world',
  maturity: 'integrated',
  keywords: ['visibility', 'hide', 'show', 'entity', 'viewport'],
});

registerAction({
  id: 'world.applyEntityEdit',
  label: 'Apply Entity Edit',
  description: 'Apply a transform edit (position/rotation/size) to an entity',
  category: 'world',
  workspace: 'world',
  maturity: 'integrated',
  keywords: ['edit', 'transform', 'entity', 'position', 'rotation', 'size'],
  undoable: true,
});

// --- VIEWPORT ---

registerAction({
  id: 'viewport.setCameraPreset',
  label: 'Set Camera Preset',
  description: 'Set the viewport camera preset (perspective, top, front, side)',
  category: 'viewport',
  workspace: 'world',
  maturity: 'integrated',
  keywords: ['camera', 'preset', 'view', 'viewport', 'top', 'front', 'side'],
});

// Export the registry for use
export { getUiActionRegistry };
