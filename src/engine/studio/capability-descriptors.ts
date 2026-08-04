/**
 * Capability Descriptor Registry
 *
 * Implements doc 50 §8. Every plugin registers an Architect
 * Capability Descriptor describing what it can inspect, select,
 * preview, modify, generate, validate, and undo. The Grand
 * Architect dynamically discovers these capabilities.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  ArchitectCapabilityDescriptor,
  ArchitectToolDescriptor,
  CapabilityId,
  EditablePropertySchema,
  ConstraintSchema,
  DiagnosticDescriptor,
  SelectionShapeType,
  SemanticTypeId,
  PermissionClass,
} from './types';

// ============================================================================
// Registry
// ============================================================================

export interface CapabilityDescriptorRegistry {
  register(descriptor: ArchitectCapabilityDescriptor): boolean;
  unregister(capabilityId: CapabilityId): boolean;
  get(capabilityId: CapabilityId): ArchitectCapabilityDescriptor | undefined;
  list(): ArchitectCapabilityDescriptor[];
  listBySelectionType(shape: SelectionShapeType): ArchitectCapabilityDescriptor[];
  listBySemanticType(type: SemanticTypeId): ArchitectCapabilityDescriptor[];
  listByPermissionClass(permissionClass: PermissionClass): ArchitectCapabilityDescriptor[];
  findTool(toolId: string): { descriptor: ArchitectCapabilityDescriptor; tool: ArchitectToolDescriptor } | null;
  listAllTools(): { capabilityId: CapabilityId; tool: ArchitectToolDescriptor }[];
  listToolsByCategory(category: 'inspect' | 'preview' | 'mutation' | 'generation'): { capabilityId: CapabilityId; tool: ArchitectToolDescriptor }[];
}

export function createCapabilityRegistry(): CapabilityDescriptorRegistry {
  const descriptors = new Map<CapabilityId, ArchitectCapabilityDescriptor>();

  function toolList(d: ArchitectCapabilityDescriptor, category: 'inspect' | 'preview' | 'mutation' | 'generation'): ArchitectToolDescriptor[] {
    switch (category) {
      case 'inspect': return d.inspectTools;
      case 'preview': return d.previewTools;
      case 'mutation': return d.mutationTools;
      case 'generation': return d.generationTools;
    }
  }

  return {
    register(descriptor: ArchitectCapabilityDescriptor): boolean {
      if (descriptors.has(descriptor.capabilityId)) return false;
      descriptors.set(descriptor.capabilityId, descriptor);
      return true;
    },

    unregister(capabilityId: CapabilityId): boolean {
      return descriptors.delete(capabilityId);
    },

    get(capabilityId: CapabilityId): ArchitectCapabilityDescriptor | undefined {
      return descriptors.get(capabilityId);
    },

    list(): ArchitectCapabilityDescriptor[] {
      return Array.from(descriptors.values());
    },

    listBySelectionType(shape: SelectionShapeType): ArchitectCapabilityDescriptor[] {
      return Array.from(descriptors.values()).filter(d => d.supportedSelections.includes(shape));
    },

    listBySemanticType(type: SemanticTypeId): ArchitectCapabilityDescriptor[] {
      return Array.from(descriptors.values()).filter(d => d.selectableTypes.includes(type));
    },

    listByPermissionClass(permissionClass: PermissionClass): ArchitectCapabilityDescriptor[] {
      return Array.from(descriptors.values()).filter(d => d.permissionClass === permissionClass);
    },

    findTool(toolId: string): { descriptor: ArchitectCapabilityDescriptor; tool: ArchitectToolDescriptor } | null {
      for (const d of descriptors.values()) {
        const allTools = [...d.inspectTools, ...d.previewTools, ...d.mutationTools, ...d.generationTools];
        const tool = allTools.find(t => t.toolId === toolId);
        if (tool) return { descriptor: d, tool };
      }
      return null;
    },

    listAllTools(): { capabilityId: CapabilityId; tool: ArchitectToolDescriptor }[] {
      const result: { capabilityId: CapabilityId; tool: ArchitectToolDescriptor }[] = [];
      for (const d of descriptors.values()) {
        for (const t of [...d.inspectTools, ...d.previewTools, ...d.mutationTools, ...d.generationTools]) {
          result.push({ capabilityId: d.capabilityId, tool: t });
        }
      }
      return result;
    },

    listToolsByCategory(category: 'inspect' | 'preview' | 'mutation' | 'generation'): { capabilityId: CapabilityId; tool: ArchitectToolDescriptor }[] {
      const result: { capabilityId: CapabilityId; tool: ArchitectToolDescriptor }[] = [];
      for (const d of descriptors.values()) {
        for (const t of toolList(d, category)) {
          result.push({ capabilityId: d.capabilityId, tool: t });
        }
      }
      return result;
    },
  };
}

// ============================================================================
// Default descriptors for existing engine capabilities
// ============================================================================

export function createDefaultDescriptors(): ArchitectCapabilityDescriptor[] {
  return [
    // Terrain
    {
      capabilityId: 'terrain.field' as CapabilityId,
      description: 'Voxel terrain density field with chunking and destruction',
      selectableTypes: ['terrain.chunk', 'terrain.surface'],
      supportedSelections: ['surface_brush', 'box', 'sphere', 'flood_fill', 'terrain_height_range', 'path_corridor'],
      inspectTools: [
        { toolId: 'terrain.inspectDensity', description: 'Inspect density at a point', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: false, supportsUndo: false },
        { toolId: 'terrain.compareCollider', description: 'Compare collider to density field', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: false, supportsUndo: false },
      ],
      previewTools: [
        { toolId: 'terrain.previewRaise', description: 'Preview terrain raise', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
        { toolId: 'terrain.previewCarve', description: 'Preview terrain carve', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
      ],
      mutationTools: [
        { toolId: 'terrain.raise', description: 'Raise terrain', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
        { toolId: 'terrain.lower', description: 'Lower terrain', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
        { toolId: 'terrain.flatten', description: 'Flatten terrain', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
        { toolId: 'terrain.smooth', description: 'Smooth terrain', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
        { toolId: 'terrain.erode', description: 'Erode terrain', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
        { toolId: 'terrain.carve', description: 'Carve terrain', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
        { toolId: 'terrain.paintMaterial', description: 'Paint terrain material', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: true, supportsUndo: true },
      ],
      generationTools: [
        { toolId: 'terrain.generateRiver', description: 'Generate a river', inputSchema: {}, outputSchema: {}, permissionClass: 'simulation_semantic', supportsPreview: true, supportsUndo: true },
        { toolId: 'terrain.generateCave', description: 'Generate a cave', inputSchema: {}, outputSchema: {}, permissionClass: 'simulation_semantic', supportsPreview: true, supportsUndo: true },
      ],
      editableProperties: [
        { name: 'density', type: 'number', range: [0, 1], editable: true },
        { name: 'material', type: 'enum', options: ['rock', 'soil', 'sand', 'water'], editable: true },
      ],
      constraints: [
        { name: 'budget', description: 'Terrain edits must stay within entity budget', enforced: true },
      ],
      diagnostics: [
        { name: 'orphaned_chunks', description: 'Chunks with no density', severity: 'warning' },
      ],
      supportsUndo: true,
      supportsLiveEdit: true,
      supportsPreviewFork: true,
      permissionClass: 'local_physical',
    },

    // Ecology
    {
      capabilityId: 'ecology.populations' as CapabilityId,
      description: 'Spirit beasts, herbs, food web, seasonal cycles',
      selectableTypes: ['ecology.population', 'ecology.species', 'ecology.spirit_vein'],
      supportedSelections: ['surface_brush', 'box', 'sphere', 'semantic_query'],
      inspectTools: [
        { toolId: 'ecology.inspectPopulation', description: 'Inspect population state', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: false, supportsUndo: false },
      ],
      previewTools: [],
      mutationTools: [
        { toolId: 'ecology.populate', description: 'Populate area with species', inputSchema: {}, outputSchema: {}, permissionClass: 'simulation_semantic', supportsPreview: true, supportsUndo: true },
        { toolId: 'ecology.thin', description: 'Thin population', inputSchema: {}, outputSchema: {}, permissionClass: 'simulation_semantic', supportsPreview: true, supportsUndo: true },
        { toolId: 'ecology.age', description: 'Age population', inputSchema: {}, outputSchema: {}, permissionClass: 'simulation_semantic', supportsPreview: true, supportsUndo: true },
        { toolId: 'ecology.rebalance', description: 'Rebalance food web', inputSchema: {}, outputSchema: {}, permissionClass: 'simulation_semantic', supportsPreview: true, supportsUndo: true },
      ],
      generationTools: [
        { toolId: 'ecology.generateBiome', description: 'Generate biome', inputSchema: {}, outputSchema: {}, permissionClass: 'historical_rule', supportsPreview: true, supportsUndo: true },
      ],
      editableProperties: [
        { name: 'populationSize', type: 'number', range: [0, 10000], editable: true },
        { name: 'growthRate', type: 'number', range: [0, 1], editable: true },
      ],
      constraints: [
        { name: 'food_web_balance', description: 'Must preserve food web balance', enforced: true },
      ],
      diagnostics: [
        { name: 'extinction_risk', description: 'Species at risk of extinction', severity: 'warning' },
      ],
      supportsUndo: true,
      supportsLiveEdit: true,
      supportsPreviewFork: true,
      permissionClass: 'simulation_semantic',
    },

    // Assets
    {
      capabilityId: 'assets.registry' as CapabilityId,
      description: 'Content-addressed asset registry with bundles',
      selectableTypes: ['asset.instance', 'asset.source'],
      supportedSelections: ['point', 'rectangle', 'lasso', 'semantic_query', 'hierarchy'],
      inspectTools: [
        { toolId: 'assets.inspectMetadata', description: 'Inspect asset metadata', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: false, supportsUndo: false },
      ],
      previewTools: [
        { toolId: 'assets.previewPlace', description: 'Preview asset placement', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: true, supportsUndo: true },
      ],
      mutationTools: [
        { toolId: 'assets.place', description: 'Place asset in world', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
        { toolId: 'assets.move', description: 'Move asset instance', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
        { toolId: 'assets.scale', description: 'Scale asset instance', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: true, supportsUndo: true },
        { toolId: 'assets.rotate', description: 'Rotate asset instance', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: true, supportsUndo: true },
        { toolId: 'assets.remove', description: 'Remove asset instance', inputSchema: {}, outputSchema: {}, permissionClass: 'local_physical', supportsPreview: true, supportsUndo: true },
      ],
      generationTools: [
        { toolId: 'assets.assemble', description: 'Assemble new asset from modules', inputSchema: {}, outputSchema: {}, permissionClass: 'historical_rule', supportsPreview: true, supportsUndo: true },
      ],
      editableProperties: [
        { name: 'transform', type: 'vec3', editable: true },
        { name: 'scale', type: 'number', range: [0.01, 100], editable: true },
        { name: 'rotation', type: 'number', range: [0, 6.283], editable: true },
      ],
      constraints: [
        { name: 'collision', description: 'Must not overlap existing colliders', enforced: true },
        { name: 'budget', description: 'Must stay within triangle budget', enforced: true },
      ],
      diagnostics: [
        { name: 'orphaned_assets', description: 'Assets with no references', severity: 'info' },
      ],
      supportsUndo: true,
      supportsLiveEdit: true,
      supportsPreviewFork: false,
      permissionClass: 'local_physical',
    },

    // NPC
    {
      capabilityId: 'npc.cognition' as CapabilityId,
      description: 'NPC cognition, traits, memory, schedules',
      selectableTypes: ['npc.villager', 'npc.cultivator', 'npc.beast'],
      supportedSelections: ['point', 'rectangle', 'lasso', 'semantic_query', 'hierarchy'],
      inspectTools: [
        { toolId: 'npc.inspectState', description: 'Inspect NPC state', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: false, supportsUndo: false },
        { toolId: 'npc.inspectSchedule', description: 'Inspect NPC schedule', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: false, supportsUndo: false },
        { toolId: 'npc.inspectMemory', description: 'Inspect NPC memory', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: false, supportsUndo: false },
      ],
      previewTools: [],
      mutationTools: [
        { toolId: 'npc.editTraits', description: 'Edit NPC traits', inputSchema: {}, outputSchema: {}, permissionClass: 'simulation_semantic', supportsPreview: true, supportsUndo: true },
        { toolId: 'npc.editSchedule', description: 'Edit NPC schedule', inputSchema: {}, outputSchema: {}, permissionClass: 'simulation_semantic', supportsPreview: true, supportsUndo: true },
        { toolId: 'npc.spawn', description: 'Spawn new NPC', inputSchema: {}, outputSchema: {}, permissionClass: 'simulation_semantic', supportsPreview: true, supportsUndo: true },
        { toolId: 'npc.despawn', description: 'Despawn NPC', inputSchema: {}, outputSchema: {}, permissionClass: 'simulation_semantic', supportsPreview: true, supportsUndo: true },
      ],
      generationTools: [
        { toolId: 'npc.generate', description: 'Generate NPC from template', inputSchema: {}, outputSchema: {}, permissionClass: 'historical_rule', supportsPreview: true, supportsUndo: true },
      ],
      editableProperties: [
        { name: 'name', type: 'string', editable: true },
        { name: 'age', type: 'number', range: [0, 1000], editable: true },
        { name: 'realm', type: 'enum', options: ['mortal', 'qi_induction', 'qi_condensation', 'foundation_establishment', 'core_formation', 'nascent_soul', 'spirit_severance', 'void_amalgamation', 'tribulation_crossing', 'mahayana'], editable: true },
      ],
      constraints: [
        { name: 'faction_membership', description: 'NPC must belong to a valid faction', enforced: true },
      ],
      diagnostics: [
        { name: 'broken_schedule', description: 'NPC with unreachable schedule target', severity: 'warning' },
      ],
      supportsUndo: true,
      supportsLiveEdit: true,
      supportsPreviewFork: true,
      permissionClass: 'simulation_semantic',
    },

    // Settlement (generator)
    {
      capabilityId: 'gen.settlement' as CapabilityId,
      description: 'Settlement generator (Wang Family Bend from seed)',
      selectableTypes: ['settlement.village', 'settlement.household'],
      supportedSelections: ['point', 'box', 'semantic_query'],
      inspectTools: [
        { toolId: 'gen.settlement.inspect', description: 'Inspect generated settlement', inputSchema: {}, outputSchema: {}, permissionClass: 'presentation_only', supportsPreview: false, supportsUndo: false },
      ],
      previewTools: [
        { toolId: 'gen.settlement.preview', description: 'Preview settlement generation', inputSchema: {}, outputSchema: {}, permissionClass: 'historical_rule', supportsPreview: true, supportsUndo: true },
      ],
      mutationTools: [],
      generationTools: [
        { toolId: 'gen.settlement.generate', description: 'Generate settlement from seed', inputSchema: {}, outputSchema: {}, permissionClass: 'historical_rule', supportsPreview: true, supportsUndo: true },
        { toolId: 'gen.settlement.regenerate', description: 'Regenerate settlement with new seed', inputSchema: {}, outputSchema: {}, permissionClass: 'historical_rule', supportsPreview: true, supportsUndo: true },
      ],
      editableProperties: [
        { name: 'seed', type: 'string', editable: true },
        { name: 'householdCount', type: 'number', range: [5, 200], editable: true },
        { name: 'paddyCount', type: 'number', range: [10, 1000], editable: true },
      ],
      constraints: [
        { name: 'determinism', description: 'Same seed must produce same output', enforced: true },
      ],
      diagnostics: [
        { name: 'overlapping_structures', description: 'Structures overlapping', severity: 'error' },
      ],
      supportsUndo: true,
      supportsLiveEdit: false,  // regeneration is a historical_rule change
      supportsPreviewFork: true,
      permissionClass: 'historical_rule',
    },
  ];
}
