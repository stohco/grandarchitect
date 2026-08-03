/**
 * Phase 3 (Reference Plugins) Conformance Test
 *
 * Tests all 8 reference plugins:
 *   ga:determinism, ga:persistence, ga:content-schema (existing),
 *   ga:renderer, ga:physics, ga:terrain, ga:animation, ga:vfx, ga:assets (new).
 */

import { createPluginHost } from '../../kernel/plugin-host';
import { DeterminismPlugin } from '../ga-determinism';
import { PersistencePlugin } from './ga-persistence';
import { ContentSchemaPlugin } from './ga-content-schema';
import { RendererPlugin } from './ga-renderer';
import { PhysicsPlugin } from './ga-physics';
import { TerrainPlugin } from './ga-terrain';
import { AnimationPlugin } from './ga-animation';
import { VfxPlugin } from './ga-vfx';
import { AssetPlugin } from './ga-assets';
import { getFingerprint } from '../../../lib/determinism/fingerprint';
import type { SaveEnvelope } from './ga-persistence';
import type { DefinitionService, TemplateService, RuleService } from './ga-content-schema';
import type { RenderBackend, MaterialRegistry, LightingSystem, PostStack, RendererStats, PostEffectType } from './ga-renderer';
import type { PhysicsApi, PhysicsMaterialRegistry } from './ga-physics';
import type { TerrainField, TerrainQuery } from './ga-terrain';
import type { AnimationController, ClipRegistry } from './ga-animation';
import type { VfxDirector, RecipeRegistry } from './ga-vfx';
import type { AssetStream, AssetRegistry } from './ga-assets';

let P = 0, F = 0;
function a(c: boolean, m: string) { if (c) { P++; console.log('  ✅ ' + m); } else { F++; console.error('  ❌ ' + m); } }

async function run() {
  console.log('=== Phase 3 Reference Plugins Conformance Test ===\n');
  console.log('Setup: boot kernel + all 8 plugins');

  const host = createPluginHost(getFingerprint());
  let r = host.registerPlugin(DeterminismPlugin);
  a(r.ok, 'ga:determinism registered');
  r = host.registerPlugin(PersistencePlugin);
  a(r.ok, 'ga:persistence registered');
  r = host.registerPlugin(ContentSchemaPlugin);
  a(r.ok, 'ga:content-schema registered');
  r = host.registerPlugin(RendererPlugin);
  a(r.ok, 'ga:renderer registered');
  r = host.registerPlugin(PhysicsPlugin);
  a(r.ok, 'ga:physics registered');
  r = host.registerPlugin(TerrainPlugin);
  a(r.ok, 'ga:terrain registered');
  r = host.registerPlugin(AnimationPlugin);
  a(r.ok, 'ga:animation registered');
  r = host.registerPlugin(VfxPlugin);
  a(r.ok, 'ga:vfx registered');
  r = host.registerPlugin(AssetPlugin);
  a(r.ok, 'ga:assets registered');
  a(host.listPlugins().length === 9, 'Nine plugins registered');

  // ====================================================================
  // Test 1: ga:persistence (carried from previous, condensed)
  // ====================================================================
  console.log('\nTest 1: ga:persistence capabilities');
  a(host.capabilities.has('persistence.save'), 'persistence.save registered');
  a(host.capabilities.has('persistence.load'), 'persistence.load registered');
  a(host.capabilities.has('persistence.checkpoint'), 'persistence.checkpoint registered');
  a(host.capabilities.has('persistence.slice'), 'persistence.slice registered');
  a(host.capabilities.has('persistence.branch'), 'persistence.branch registered');

  const sv = host.capabilities.resolve<{save:(label:string,branchId?:string)=>SaveEnvelope}>('persistence.save');
  if (sv.ok) {
    const env = sv.value.save('iter3-save');
    a(env.formatVersion === '1.0.0', 'Save version correct');
    a(env.hash.length > 0, 'Save has hash');
  }

  // ====================================================================
  // Test 2: ga:content-schema (carried from previous, condensed)
  // ====================================================================
  console.log('\nTest 2: ga:content-schema capabilities');
  a(host.capabilities.has('content-schema.definitions'), 'content-schema.definitions registered');
  a(host.capabilities.has('content-schema.templates'), 'content-schema.templates registered');
  a(host.capabilities.has('content-schema.rules'), 'content-schema.rules registered');

  const dr = host.capabilities.resolve<DefinitionService>('content-schema.definitions');
  if (dr.ok) {
    a(dr.value.size() >= 37, '>= 37 definitions (got ' + dr.value.size() + ')');
    const qi = dr.value.get('essence.qi');
    a(qi !== undefined && qi!.name === 'Qi', 'essence.qi correct');
    const rels = dr.value.queryRelations('essence.qi', 'TRANSFORMS');
    a(rels.length >= 1, 'qi has TRANSFORMS');
  }

  // ====================================================================
  // Test 3: ga:renderer
  // ====================================================================
  console.log('\nTest 3: ga:renderer capabilities');
  a(host.capabilities.has('renderer.backend'), 'renderer.backend registered');
  a(host.capabilities.has('renderer.materials'), 'renderer.materials registered');
  a(host.capabilities.has('renderer.lighting'), 'renderer.lighting registered');
  a(host.capabilities.has('renderer.post-stack'), 'renderer.post-stack registered');
  a(host.capabilities.has('renderer.stats'), 'renderer.stats registered');

  const rb = host.capabilities.resolve<RenderBackend>('renderer.backend');
  a(rb.ok, 'renderer.backend resolved');
  if (rb.ok) {
    const backend = rb.value;
    a(backend.id === 'headless-test', 'Backend is headless-test');
    a(backend.api === 'none', 'API is none');

    const caps = backend.capabilities();
    a(caps.api === 'none', 'Caps api is none');
    a(caps.maxSamplesPerPixel === 1, 'Caps maxSamples is 1');
    a(!caps.supportsComputeParticles, 'No compute particles in headless');
    a(!caps.timestampQuery, 'No timestamp query in headless');

    // Initialize
    const initResult = await backend.initialize({});
    a(initResult.api === 'none', 'Init result api is none');
    a(initResult.rendererInfo.includes('headless'), 'Init result info mentions headless');

    // Frame lifecycle
    const frame = {
      tick: 1, dt: 0.016, totalTime: 0.016,
      viewMatrix: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
      projectionMatrix: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
      cameraPosition: [0, 5, 10],
      viewportWidth: 1280, viewportHeight: 720,
    };
    backend.beginFrame(frame);
    backend.submitScene({ opaqueMeshes: [], transparentMeshes: [], lights: [] });
    backend.executePassGraph({ passes: [{ id: 'test', passType: 'opaque', inputs: [], outputs: [] }] });
    const stats = backend.endFrame();
    a(stats.drawCalls === 0, 'Headless frame: 0 draw calls');
    a(stats.triangles === 0, 'Headless frame: 0 triangles');

    // Resources
    const h1 = backend.createResource({ type: 'mesh', name: 'test-cube', params: {} });
    a(typeof h1 === 'bigint', 'Resource handle is bigint');
    a(h1 > 0n, 'Resource handle > 0');
    const h2 = backend.createResource({ type: 'texture', name: 'test-tex', params: {} });
    a(h2 > h1, 'Second handle > first');
    backend.disposeResource(h1);

    // Read pixels
    const pixels = await backend.readPixels({ x: 0, y: 0, width: 2, height: 2 });
    a(pixels.length === 16, 'ReadPixels returns 16 bytes (2x2 RGBA)');

    const depth = await backend.readDepth({ x: 0, y: 0, width: 2, height: 2 });
    a(depth.length === 4, 'ReadDepth returns 4 floats (2x2)');

    // Resize
    backend.resize(1920, 1080, 2);

    backend.dispose();
  }

  // Materials
  const mr = host.capabilities.resolve<MaterialRegistry>('renderer.materials');
  a(mr.ok, 'renderer.materials resolved');
  if (mr.ok) {
    const mat = mr.value;
    a(mat.size() === 0, 'Materials start empty');
    mat.register({ id: 'mat:pbr-stone', label: 'PBR Stone', type: 'pbr', params: { roughness: 0.8 }, tags: ['natural'] });
    a(mat.size() === 1, '1 material after register');
    const m = mat.get('mat:pbr-stone');
    a(m !== undefined && m.label === 'PBR Stone', 'Material retrieved correctly');
    a(mat.resolveReference('mat:pbr-stone') !== undefined, 'resolveReference works');
    a(mat.resolveReference('nonexistent') === undefined, 'resolveReference returns undefined for missing');
    const pbr = mat.list({ type: 'pbr' });
    a(pbr.length === 1, 'List by type returns 1');
    const tagged = mat.list({ tag: 'natural' });
    a(tagged.length === 1, 'List by tag returns 1');
  }

  // Lighting
  const lr = host.capabilities.resolve<LightingSystem>('renderer.lighting');
  a(lr.ok, 'renderer.lighting resolved');
  if (lr.ok) {
    const light = lr.value;
    const state = light.getState();
    a(state.timeOfDay === 'noon', 'Default time is noon');
    a(state.shadowCascadeCount === 3, 'Default 3 shadow cascades');
    light.setTimeOfDay('dusk');
    a(light.getState().timeOfDay === 'dusk', 'Time changed to dusk');
    light.setSunIntensity(0.5);
    a(light.getState().sunIntensity === 0.5, 'Sun intensity updated');
    light.setAmbientIntensity(0.8);
    a(light.getState().ambientIntensity === 0.8, 'Ambient intensity updated');
    light.setShadowCascades(4, 4096);
    a(light.getState().shadowCascadeCount === 4, 'Shadow cascades updated');
    a(light.getState().shadowMapSize === 4096, 'Shadow map size updated');
  }

  // Post-processing
  const ps = host.capabilities.resolve<PostStack>('renderer.post-stack');
  a(ps.ok, 'renderer.post-stack resolved');
  if (ps.ok) {
    const post = ps.value;
    a(post.size() === 0, 'Post stack starts empty');
    post.addEffect({ type: 'bloom' as PostEffectType, enabled: true, params: { intensity: 0.5 } });
    a(post.size() === 1, '1 effect after add');
    a(post.getEffect('bloom') !== undefined, 'bloom effect exists');
    a(post.getEffect('bloom')!.enabled === true, 'bloom is enabled');
    post.setEnabled('bloom', false);
    a(post.getEffect('bloom')!.enabled === false, 'bloom disabled');
    post.setParam('bloom', 'intensity', 1.0);
    a(post.getEffect('bloom')!.params.intensity === 1.0, 'bloom param updated');
    post.addEffect({ type: 'fog' as PostEffectType, enabled: true, params: { density: 0.01 } });
    a(post.size() === 2, '2 effects after add fog');
    a(post.listEffects().length === 2, 'listEffects returns 2');
    post.removeEffect('bloom');
    a(post.size() === 1, '1 effect after remove bloom');
    a(post.getEffect('bloom') === undefined, 'bloom removed');
  }

  // Stats
  const rs = host.capabilities.resolve<RendererStats>('renderer.stats');
  a(rs.ok, 'renderer.stats resolved');
  if (rs.ok) {
    a(rs.value.getBackendId() === 'headless-test', 'Stats backendId is headless-test');
    a(rs.value.getApiType() === 'none', 'Stats apiType is none');
  }

  // ====================================================================
  // Test 4: ga:physics
  // ====================================================================
  console.log('\nTest 4: ga:physics capabilities');
  a(host.capabilities.has('physics.api'), 'physics.api registered');
  a(host.capabilities.has('physics.materials'), 'physics.materials registered');

  const pa = host.capabilities.resolve<PhysicsApi>('physics.api');
  a(pa.ok, 'physics.api resolved');
  if (pa.ok) {
    const api = pa.value;
    a(api.getBodyCount() === 0, 'No bodies initially');

    // Create body
    const handle = api.createBody({
      bodyType: 'dynamic',
      transform: { position: { x: 0, y: 10, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
      shape: { type: 'box', halfExtents: { x: 1, y: 1, z: 1 } },
      mass: 1.0,
    });
    a(handle.valid, 'Body handle is valid');
    a(handle.id.startsWith('phys-'), 'Handle ID starts with phys-');
    a(api.bodyExists(handle), 'Body exists');
    a(api.getBodyCount() === 1, '1 body after create');

    // Transform
    const t = api.getTransform(handle);
    a(t.position.y === 10, 'Body Y position is 10');

    api.setLinearVelocity(handle, { x: 1, y: 0, z: 0 });
    const vel = api.getLinearVelocity(handle);
    a(vel.x === 1, 'Linear velocity X is 1');
    a(vel.y === 0, 'Linear velocity Y is 0');

    // Set transform
    api.setTransform(handle, { position: { x: 5, y: 20, z: 3 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } });
    const t2 = api.getTransform(handle);
    a(t2.position.x === 5, 'Transform X updated to 5');
    a(t2.position.y === 20, 'Transform Y updated to 20');

    // Queries (headless: no-op, return empty/null)
    a(api.isGrounded(handle) === false, 'Not grounded in headless');
    a(api.getContacts(handle).length === 0, 'No contacts in headless');
    a(api.raycast({ x: 0, y: 100, z: 0 }, { x: 0, y: -1, z: 0 }, 100) === null, 'Raycast returns null in headless');
    a(api.shapecast({ type: 'sphere', radius: 1 }, t2, t2).length === 0, 'Shapecast returns empty in headless');
    a(api.overlap({ type: 'box', halfExtents: { x: 1, y: 1, z: 1 } }, t2).length === 0, 'Overlap returns empty in headless');

    // Snapshot
    const snap = api.snapshot();
    a(snap.length > 0, 'Snapshot produces hash');
    a(api.verify(snap), 'Snapshot verifies against itself');
    a(!api.verify('wrong-hash'), 'Verify fails for wrong hash');

    // Step (headless: no-op)
    api.step(0.016, 4);
    a(api.getBodyCount() === 1, 'Still 1 body after step');

    // Destroy
    api.destroyBody(handle);
    a(!api.bodyExists(handle), 'Body no longer exists');
    a(api.getBodyCount() === 0, '0 bodies after destroy');

    // Second body for multi-body snapshot
    const h1 = api.createBody({ bodyType: 'static', transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } } });
    const h2 = api.createBody({ bodyType: 'dynamic', transform: { position: { x: 0, y: 5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } } });
    a(api.getBodyCount() === 2, '2 bodies after second batch');
    const snap2 = api.snapshot();
    a(snap !== snap2, 'Different body count produces different snapshot');
  }

  // Physics materials
  const pm = host.capabilities.resolve<PhysicsMaterialRegistry>('physics.materials');
  a(pm.ok, 'physics.materials resolved');
  if (pm.ok) {
    const matReg = pm.value;
    a(matReg.size() === 0, 'Materials start empty');
    matReg.register({ id: 'pmat:stone', label: 'Stone', realmTier: 'mortal', friction: 0.6, restitution: 0.1, density: 2500 });
    matReg.register({ id: 'pmat:qi-crystal', label: 'Qi Crystal', realmTier: 'core', friction: 0.3, restitution: 0.8, density: 800 });
    a(matReg.size() === 2, '2 materials after register');
    a(matReg.get('pmat:stone') !== undefined, 'stone material retrieved');
    a(matReg.list().length === 2, 'list returns 2');
    const coreMats = matReg.getByRealm('core');
    a(coreMats.length === 1, '1 material in core realm tier');
    a(coreMats[0].id === 'pmat:qi-crystal', 'Core material is qi-crystal');
  }

  // ====================================================================
  // Test 5: ga:terrain
  // ====================================================================
  console.log('\nTest 5: ga:terrain capabilities');
  a(host.capabilities.has('terrain.field'), 'terrain.field registered');
  a(host.capabilities.has('terrain.query'), 'terrain.query registered');

  const tf = host.capabilities.resolve<TerrainField>('terrain.field');
  a(tf.ok, 'terrain.field resolved');
  if (tf.ok) {
    const field = tf.value;
    a(field.chunkCount() === 0, 'No chunks initially');

    // Create chunk
    const chunk = field.createChunk(0, 0, 0);
    a(chunk.id === '0_0_0', 'Chunk ID is 0_0_0');
    a(chunk.initialized === true, 'Chunk is initialized');
    a(field.chunkCount() === 1, '1 chunk after create');

    // Get chunk
    const retrieved = field.getChunk('0_0_0');
    a(retrieved !== undefined, 'Chunk retrieved by ID');
    a(retrieved!.x === 0 && retrieved!.y === 0 && retrieved!.z === 0, 'Chunk coordinates correct');

    // Get chunk at
    const atChunk = field.getChunkAt(0, 0, 0);
    a(atChunk !== undefined, 'getChunkAt returns chunk');
    a(field.getChunkAt(1, 2, 3) === undefined, 'getChunkAt returns undefined for missing');

    // Density/material operations
    a(field.getDensity(0, 0, 0) === 0, 'Default density is 0 (air)');
    field.setDensity(0, 0, 0, -0.5);
    a(field.getDensity(0, 0, 0) === -0.5, 'Density updated to -0.5');

    a(field.getMaterial(0, 0, 0) === 0, 'Default material is 0');
    field.setMaterial(0, 0, 0, 3);
    a(field.getMaterial(0, 0, 0) === 3, 'Material updated to 3');

    // Chunk gets dirty on write
    const dirtyList = field.listDirtyChunks();
    a(dirtyList.length === 1, '1 dirty chunk after write');
    a(dirtyList[0].id === '0_0_0', 'Dirty chunk is 0_0_0');

    // Revision incremented
    a(chunk.revision > 0, 'Chunk revision > 0 after write');

    // Mark clean
    field.markClean('0_0_0');
    a(field.listDirtyChunks().length === 0, 'No dirty chunks after markClean');
    a(!chunk.dirty, 'Chunk not dirty after markClean');

    // Mark dirty
    field.markDirty('0_0_0');
    a(chunk.dirty === true, 'Chunk dirty after markDirty');

    // Stats
    const stats = field.getStats();
    a(stats.chunkCount === 1, 'Stats chunkCount is 1');
    a(stats.dirtyChunkCount === 1, 'Stats dirtyChunkCount is 1');
    a(stats.totalVoxels === 4096, 'Stats totalVoxels is 4096 (16^3)');
    a(stats.solidVoxels >= 1, 'Stats solidVoxels >= 1 (we set one solid)');

    // Cross-chunk write (auto-creates chunk)
    field.setDensity(17, 0, 0, -1.0);
    a(field.chunkCount() === 2, '2 chunks after cross-chunk write');

    // List all chunks
    a(field.listChunks().length === 2, 'listChunks returns 2');

    // Destroy chunk
    a(field.destroyChunk('0_0_0'), 'Destroy returns true');
    a(field.chunkCount() === 1, '1 chunk after destroy');
    a(!field.destroyChunk('nonexistent'), 'Destroy nonexistent returns false');

    // Clear dirty
    field.setDensity(20, 0, 0, -0.8);
    field.clearDirty();
    a(field.listDirtyChunks().length === 0, 'No dirty after clearDirty');
  }

  // Terrain query
  const tq = host.capabilities.resolve<TerrainQuery>('terrain.query');
  a(tq.ok, 'terrain.query resolved');
  if (tq.ok) {
    const query = tq.value;
    // Set up some terrain for queries
    const fieldRef = tf.ok ? tf.value : undefined;
    if (fieldRef) {
      fieldRef.setDensity(5, 10, 5, -0.5); // solid at (5, 10, 5)
      a(query.isSolid(5, 10, 5), 'isSolid returns true for solid voxel');
      a(!query.isSolid(5, 20, 5), 'isSolid returns false for air');
      const height = query.sampleHeight(5, 5);
      a(height === 10, 'sampleHeight finds solid at y=10');
      a(query.sampleHeight(100, 100) === null, 'sampleHeight returns null for empty column');

      // Region query
      const region = query.getRegion(4, 9, 4, 6, 11, 6);
      a(region.length === 27, 'Region 3x3x3 = 27 voxels');
      const center = region[13]; // center of 3x3x3
      a(center.density === -0.5, 'Center voxel has density -0.5');
    }
  }

  // ====================================================================
  // Test 6: ga:animation
  // ====================================================================
  console.log('\nTest 6: ga:animation capabilities');
  a(host.capabilities.has('animation.controller'), 'animation.controller registered');
  a(host.capabilities.has('animation.clips'), 'animation.clips registered');

  const ac = host.capabilities.resolve<AnimationController>('animation.controller');
  a(ac.ok, 'animation.controller resolved');
  if (ac.ok) {
    const ctrl = ac.value;
    a(ctrl.getState() === 'idle', 'Default state is idle');

    // Set state
    ctrl.setState('walk');
    a(ctrl.getState() === 'walk', 'State changed to walk');

    // Parameters
    ctrl.setParam('speed', 3.0);
    const speed = ctrl.getParam('speed') as number;
    a(speed === 3.0, 'Float param speed is 3.0');

    ctrl.setParam('direction', { x: 0, y: 0, z: 1 });
    const dir = ctrl.getParam('direction') as { x: number; y: number; z: number };
    a(dir.z === 1, 'Vec3 param direction z is 1');

    // Additive layers
    ctrl.playAdditive('breath', 'breath-idle', 0.5);
    ctrl.setAdditiveWeight('breath', 0.8);
    ctrl.removeAdditiveLayer('breath');

    // IK targets
    ctrl.setIkTarget('left-hand', { jointName: 'leftForeArm', targetPosition: { x: 1, y: 1, z: 1 }, weight: 1.0 });
    ctrl.removeIkTarget('left-hand');

    // Procedural overlays
    ctrl.setProceduralOverlay('head-look', { jointName: 'head', type: 'look-at', params: { targetX: 5 } });
    ctrl.removeProceduralOverlay('head-look');

    // Root motion
    ctrl.setRootMotionMode('lock');
    ctrl.setRootMotionMode('extract');

    // Warp
    ctrl.warpTo({ x: 10, y: 0, z: 20 }, 500);

    // Update
    const result = ctrl.update(0.016);
    a(result.pose instanceof Map, 'Update returns Map pose');
    a(result.rootMotionDelta.translation.x === 0, 'Root motion translation x is 0 in headless');
    a(result.events.length >= 0, 'Events array exists');
    a(result.transitions.length === 0, 'No transitions');

    // State graph
    const graph = {
      states: new Map<string, any>([
        ['idle', { id: 'idle', isDefault: true }],
        ['walk', { id: 'walk' }],
        ['run', { id: 'run' }],
      ]),
      transitions: [
        { from: 'idle', to: 'walk', durationMs: 200, canInterrupt: true },
        { from: 'walk', to: 'run', durationMs: 150, canInterrupt: true },
      ],
      params: new Map<string, any>([
        ['speed', { name: 'speed', type: 'float', defaultValue: 0 }],
      ]),
      defaultState: 'idle',
    };
    ctrl.loadGraph(graph);
    a(ctrl.getState() === 'idle', 'State graph loaded, default is idle');
    a(ctrl.getCurrentGraph() !== undefined, 'getCurrentGraph returns graph');
  }

  // Clip registry
  const cr = host.capabilities.resolve<ClipRegistry>('animation.clips');
  a(cr.ok, 'animation.clips resolved');
  if (cr.ok) {
    const clips = cr.value;
    a(clips.size() === 0, 'Clips start empty');
    clips.register({
      id: 'clip:walk', label: 'Walk Forward', durationMs: 1000,
      frameCount: 30, fps: 30, skeletonProfile: 'humanoid',
      tags: ['locomotion'], events: [{ name: 'footstep', time: 500 }], loop: true,
    });
    a(clips.size() === 1, '1 clip after register');
    a(clips.has('clip:walk'), 'Has clip:walk');
    const clip = clips.get('clip:walk');
    a(clip !== undefined, 'Clip retrieved');
    a(clip!.label === 'Walk Forward', 'Clip label correct');
    a(clip!.skeletonProfile === 'humanoid', 'Skeleton profile correct');
    a(clip!.loop === true, 'Clip loops');

    const locomotion = clips.list({ tag: 'locomotion' });
    a(locomotion.length === 1, '1 clip with locomotion tag');
    const humanoid = clips.list({ skeletonProfile: 'humanoid' });
    a(humanoid.length === 1, '1 clip with humanoid profile');
  }

  // ====================================================================
  // Test 7: ga:vfx
  // ====================================================================
  console.log('\nTest 7: ga:vfx capabilities');
  a(host.capabilities.has('vfx.director'), 'vfx.director registered');
  a(host.capabilities.has('vfx.recipes'), 'vfx.recipes registered');

  const vd = host.capabilities.resolve<VfxDirector>('vfx.director');
  a(vd.ok, 'vfx.director resolved');
  if (vd.ok) {
    const dir = vd.value;
    const stats0 = dir.getStats();
    a(stats0.activeCount === 0, 'No active presentations initially');
    a(stats0.totalSpawned === 0, 'None spawned');

    // Spawn
    const recipe = {
      id: 'recipe:fireball',
      techniqueId: 'technique:projectile',
      scaleTier: 'tier-2' as const,
      qualityTier: 'high' as const,
      stages: [
        { name: 'windup', startMs: 0, endMs: 200, components: [] },
        { name: 'cast', startMs: 200, endMs: 800, components: [{ id: 'c1', kind: 'gpu-particles' as const, params: { count: 50 }, cost: { budgetMs: 2, estimatedParticles: 50, passCount: 1 } }] },
        { name: 'impact', startMs: 800, endMs: 1200, components: [] },
      ],
    };
    const anchor = {
      techniqueId: 'technique:projectile',
      casterEntity: 1,
      targetEntity: 2,
      targetPosition: [10, 5, 0] as [number, number, number],
      castStartTick: 100,
      castTimeMs: 800,
      releaseTimeMs: 200,
      impactTimeMs: 0,
      cosmeticSeed: 42,
    };
    const handle = dir.spawn(recipe, anchor);
    a(handle.active === true, 'Presentation is active after spawn');
    a(handle.id.startsWith('vfx-'), 'Handle ID starts with vfx-');
    a(handle.recipeId === 'recipe:fireball', 'Recipe ID correct');

    const stats1 = dir.getStats();
    a(stats1.activeCount === 1, '1 active presentation');
    a(stats1.totalSpawned === 1, '1 total spawned');
    a(dir.isActive(handle), 'isActive returns true');

    // Update (within stage time)
    dir.update(0.1); // 100ms
    a(handle.active, 'Still active after 100ms update');

    // Update past all stages
    dir.update(1.2); // 1200ms more = 1300ms total, past maxEndMs 1200
    a(!handle.active, 'Inactive after stages complete');

    const stats2 = dir.getStats();
    a(stats2.activeCount === 0, '0 active after completion');

    // Cancel
    const recipe2 = {
      id: 'recipe:shield',
      techniqueId: 'technique:barrier',
      scaleTier: 'tier-3' as const,
      qualityTier: 'medium' as const,
      stages: [
        { name: 'cast', startMs: 0, endMs: 5000, components: [] },
      ],
    };
    const handle2 = dir.spawn(recipe2, { ...anchor, castTimeMs: 5000 });
    a(handle2.active, 'Shield presentation active');
    dir.cancel(handle2, 300);
    a(!handle2.active, 'Shield inactive after cancel');

    const stats3 = dir.getStats();
    a(stats3.totalCancelled === 1, '1 total cancelled');
    a(stats3.totalSpawned === 2, '2 total spawned');
  }

  // Recipe registry
  const vr = host.capabilities.resolve<RecipeRegistry>('vfx.recipes');
  a(vr.ok, 'vfx.recipes resolved');
  if (vr.ok) {
    const reg = vr.value;
    a(reg.size() === 0, 'Recipes start empty');
    const recipe = {
      id: 'recipe:heal', techniqueId: 'technique:restore',
      scaleTier: 'tier-1' as const, qualityTier: 'medium' as const,
      stages: [{ name: 'cast', startMs: 0, endMs: 1500, components: [] }],
    };
    reg.register(recipe);
    a(reg.size() === 1, '1 recipe after register');
    a(reg.has('recipe:heal'), 'Has recipe:heal');
    a(reg.get('recipe:heal') !== undefined, 'Recipe retrieved');
    a(reg.list().length === 1, 'list returns 1');
    a(reg.list({ scaleTier: 'tier-1' }).length === 1, 'Filter by scaleTier');
    a(reg.list({ qualityTier: 'high' }).length === 0, 'Filter by qualityTier: none match');
  }

  // ====================================================================
  // Test 8: ga:assets
  // ====================================================================
  console.log('\nTest 8: ga:assets capabilities');
  a(host.capabilities.has('assets.stream'), 'assets.stream registered');
  a(host.capabilities.has('assets.registry'), 'assets.registry registered');

  const areg = host.capabilities.resolve<AssetRegistry>('assets.registry');
  a(areg.ok, 'assets.registry resolved');
  if (areg.ok) {
    const reg = areg.value;
    a(reg.size() === 0, 'Registry starts empty');

    // Register assets
    reg.register({
      id: 'a'.repeat(64), // SHA-256 hex (dummy)
      type: 'mesh', source: '/models/tree.glb', version: '1.0.0',
      dependencies: [], variants: [], tags: ['nature', 'tree'],
      memoryBudget: 102400, license: 'CC-BY-4.0',
    });
    reg.register({
      id: 'b'.repeat(64),
      type: 'texture', source: '/textures/bark.png', version: '1.0.0',
      dependencies: [], variants: [{ id: 'mobile', name: 'mobile', sizeBytes: 51200 }],
      tags: ['nature'], memoryBudget: 51200, license: 'CC-BY-4.0',
    });
    a(reg.size() === 2, '2 assets after register');
    a(reg.has('a'.repeat(64)), 'Has asset a...');

    const mesh = reg.get('a'.repeat(64));
    a(mesh !== undefined, 'Asset retrieved');
    a(mesh!.type === 'mesh', 'Asset type is mesh');
    a(mesh!.tags.includes('nature'), 'Asset has nature tag');

    const natureAssets = reg.list({ tag: 'nature' });
    a(natureAssets.length === 2, '2 assets with nature tag');

    const meshAssets = reg.list({ type: 'mesh' });
    a(meshAssets.length === 1, '1 mesh asset');

    a(reg.getDependencies('a'.repeat(64)).length === 0, 'No dependencies');

    // Bundles
    reg.registerBundle({
      id: 'bundle:cangli-riverlands',
      region: 'cangli-riverlands',
      version: '1.0.0',
      hashes: ['a'.repeat(64)],
      totalBytes: 102400,
      dependencies: [],
    });
    a(reg.getBundle('bundle:cangli-riverlands') !== undefined, 'Bundle retrieved');
    a(reg.listBundles().length === 1, '1 bundle registered');
  }

  // Asset stream
  const ast = host.capabilities.resolve<AssetStream>('assets.stream');
  a(ast.ok, 'assets.stream resolved');
  if (ast.ok) {
    const stream = ast.value;
    a(stream.loadedCount() === 0, 'Nothing loaded initially');

    // Request unknown asset
    const unknownHandle = await stream.request('z'.repeat(64));
    a(unknownHandle.loaded === false, 'Unknown asset not loaded');
    a(unknownHandle.error !== null, 'Unknown asset has error');

    // Register and request known asset
    if (areg.ok) {
      areg.value.register({
        id: 'c'.repeat(64), type: 'mesh', source: '/models/rock.glb',
        version: '1.0.0', dependencies: [], variants: [], tags: ['nature'],
        memoryBudget: 50000, license: 'CC-BY-4.0',
      });
      const handle = await stream.request('c'.repeat(64));
      a(handle.loaded === true, 'Known asset loaded');
      a(handle.error === null, 'No error for known asset');
      a(stream.loadedCount() === 1, '1 loaded asset');
      a(stream.getLoaded('c'.repeat(64)) !== undefined, 'getLoaded returns handle');
    }

    // Prefetch
    stream.prefetch(['x'.repeat(64), 'y'.repeat(64)]);
    // Prefetch doesn't actually load in headless

    // Eviction
    let evicted = false;
    stream.onEviction((hash) => { evicted = true; });
    stream.evict('c'.repeat(64));
    a(evicted === true, 'Eviction handler called');
    a(stream.loadedCount() === 2, 'Prefetched entries remain after eviction');
    a(stream.getLoaded('c'.repeat(64)) === undefined, 'Evicted asset not in loaded');
  }

  // ====================================================================
  // Test 9: Clean unload (all new plugins)
  // ====================================================================
  console.log('\nTest 9: Clean unload (reverse order)');
  const unloadOrder = ['ga:assets', 'ga:vfx', 'ga:animation', 'ga:terrain', 'ga:physics', 'ga:renderer', 'ga:content-schema', 'ga:persistence'];
  const capsPerPlugin: Record<string, string[]> = {
    'ga:assets': ['assets.stream', 'assets.registry'],
    'ga:vfx': ['vfx.director', 'vfx.recipes'],
    'ga:animation': ['animation.controller', 'animation.clips'],
    'ga:terrain': ['terrain.field', 'terrain.query'],
    'ga:physics': ['physics.api', 'physics.materials'],
    'ga:renderer': ['renderer.backend', 'renderer.materials', 'renderer.lighting', 'renderer.post-stack', 'renderer.stats'],
    'ga:content-schema': ['content-schema.definitions', 'content-schema.templates', 'content-schema.rules'],
    'ga:persistence': ['persistence.save', 'persistence.load', 'persistence.checkpoint', 'persistence.slice', 'persistence.branch'],
  };

  for (const pid of unloadOrder) {
    r = host.unregisterPlugin(pid);
    a(r.ok, pid + ' unloaded');
    const caps = capsPerPlugin[pid] ?? [];
    for (const cap of caps) {
      a(!host.capabilities.has(cap), cap + ' capability removed');
    }
  }

  // ga:determinism remains
  a(host.listPlugins().length === 1, 'Only ga:determinism remains');
  a(host.capabilities.has('determinism.rng'), 'determinism.rng still registered');

  // === Summary ===
  console.log('\n=== Results ===');
  console.log('Passed: ' + P);
  console.log('Failed: ' + F);
  console.log(F === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ ' + F + ' TESTS FAILED');
  return F === 0;
}

run().then(s => process.exit(s ? 0 : 1)).catch(e => { console.error('Crash:', e); process.exit(1); });
