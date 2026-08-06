/**
 * UI/UX System — Production Types
 * ===============================
 *
 * Implements the UI specification from the production bible
 * (Section 23-28). Clean modern cultivation-survival HUD with
 * dark translucent glass/ink panels, jade/bronze/silver/spirit-blue accents.
 *
 * Key requirements:
 *   - Stable DOM IDs for every HUD element
 *   - 12-slot technique wheel (categories + sub-wheels)
 *   - Equipment paper doll with 8 accessory slots
 *   - Inventory with grid, loot, comparison, drag/drop
 *   - Compass, minimap, quest tracker, buff feed
 *   - Accessibility: 4.5:1 contrast, color-blind-safe icons, UI scale 80-150%
 */

// ---------------------------------------------------------------------------
// HUD Layout (Section 24) — stable DOM IDs at 1920×1080
// ---------------------------------------------------------------------------

export interface HUDElementSpec {
  domId: string;
  anchor: string;
  nominalSize: string;
  contents: string;
  parentId: string;
  pivot: string;
  zOrder: number;
  visibilityCondition: string;
  inputAction?: string;
  dataBinding?: string;
  accessibilityLabel: string;
}

export const HUD_ELEMENTS: readonly HUDElementSpec[] = [
  { domId: 'HUD_ROOT', anchor: 'full-screen', nominalSize: '1920×1080', contents: 'Root overlay', parentId: 'none', pivot: 'center', zOrder: 0, visibilityCondition: 'always', accessibilityLabel: 'Game HUD root' },
  { domId: 'HUD_PLAYER_STATUS', anchor: 'top-left', nominalSize: '360×132', contents: 'portrait, realm level, health, qi, stamina', parentId: 'HUD_ROOT', pivot: 'top-left', zOrder: 10, visibilityCondition: 'always', accessibilityLabel: 'Player status' },
  { domId: 'HUD_QUEST_TRACKER', anchor: 'left', nominalSize: '380×220 max', contents: 'current objective and sub-objectives', parentId: 'HUD_ROOT', pivot: 'top-left', zOrder: 10, visibilityCondition: 'quest active', accessibilityLabel: 'Quest tracker' },
  { domId: 'HUD_COMPASS', anchor: 'top-center', nominalSize: '620×46', contents: 'direction, marked targets, distance', parentId: 'HUD_ROOT', pivot: 'top-center', zOrder: 10, visibilityCondition: 'always', accessibilityLabel: 'Compass' },
  { domId: 'HUD_MINIMAP', anchor: 'top-right', nominalSize: '236×236', contents: 'terrain, icons, player arrow, zoom', parentId: 'HUD_ROOT', pivot: 'top-right', zOrder: 10, visibilityCondition: 'always', accessibilityLabel: 'Minimap' },
  { domId: 'HUD_TARGET_STATUS', anchor: 'top-center', nominalSize: '420×76', contents: 'target name, realm, health, status', parentId: 'HUD_ROOT', pivot: 'top-center', zOrder: 10, visibilityCondition: 'target selected', accessibilityLabel: 'Target status' },
  { domId: 'HUD_TECHNIQUE_QUICKBAR', anchor: 'bottom-center', nominalSize: '620×104', contents: '6-8 techniques, cooldowns, qi costs', parentId: 'HUD_ROOT', pivot: 'bottom-center', zOrder: 10, visibilityCondition: 'always', accessibilityLabel: 'Technique quickbar' },
  { domId: 'HUD_CONTEXT_ACTIONS', anchor: 'bottom-right', nominalSize: '300×150', contents: 'interact, loot, talk, contextual commands', parentId: 'HUD_ROOT', pivot: 'bottom-right', zOrder: 10, visibilityCondition: 'context available', accessibilityLabel: 'Context actions' },
  { domId: 'HUD_BUFFS', anchor: 'right-beneath-minimap', nominalSize: '260×180', contents: 'buffs/debuffs with timers', parentId: 'HUD_ROOT', pivot: 'top-right', zOrder: 10, visibilityCondition: 'buffs active', accessibilityLabel: 'Active buffs' },
  { domId: 'HUD_NOTIFICATION_FEED', anchor: 'right-center', nominalSize: '420×220', contents: 'loot, discoveries, warnings', parentId: 'HUD_ROOT', pivot: 'center-right', zOrder: 10, visibilityCondition: 'notifications', accessibilityLabel: 'Notification feed' },
  { domId: 'HUD_CROSSHAIR', anchor: 'center', nominalSize: '48×48', contents: 'context-sensitive reticle', parentId: 'HUD_ROOT', pivot: 'center', zOrder: 20, visibilityCondition: 'always', accessibilityLabel: 'Crosshair' },
  { domId: 'HUD_WORLD_PROMPT', anchor: 'center-bottom', nominalSize: '520×72', contents: 'interaction or location prompt', parentId: 'HUD_ROOT', pivot: 'bottom-center', zOrder: 15, visibilityCondition: 'prompt available', accessibilityLabel: 'World prompt' },
] as const;

// ---------------------------------------------------------------------------
// DOM Tree (Section 28)
// ---------------------------------------------------------------------------

export const HUD_DOM_TREE = {
  HUD_ROOT: {
    HUD_PLAYER_STATUS: ['PLAYER_PORTRAIT', 'PLAYER_REALM_BADGE', 'PLAYER_HEALTH_BAR', 'PLAYER_QI_BAR', 'PLAYER_STAMINA_BAR'],
    HUD_QUEST_TRACKER: ['QUEST_TITLE', 'QUEST_OBJECTIVE_LIST'],
    HUD_COMPASS: ['COMPASS_MARKERS'],
    HUD_MINIMAP: ['MINIMAP_TERRAIN', 'MINIMAP_PLAYER_ARROW', 'MINIMAP_ICONS', 'MINIMAP_FRAME'],
    HUD_TARGET_STATUS: null,
    HUD_TECHNIQUE_QUICKBAR: ['TECHNIQUE_SLOT_01', 'TECHNIQUE_SLOT_02', 'TECHNIQUE_SLOT_03', 'TECHNIQUE_SLOT_04', 'TECHNIQUE_SLOT_05', 'TECHNIQUE_SLOT_06', 'TECHNIQUE_SLOT_07', 'TECHNIQUE_SLOT_08'],
    HUD_CONTEXT_ACTIONS: null,
    HUD_BUFFS: null,
    HUD_NOTIFICATION_FEED: null,
    HUD_CROSSHAIR: null,
    HUD_WORLD_PROMPT: null,
  },
} as const;

// ---------------------------------------------------------------------------
// Technique Wheel (Section 26) — 12 categories
// ---------------------------------------------------------------------------

export type TechniqueCategory =
  | 'cultivator_attack' | 'cultivator_defense' | 'body_arts'
  | 'movement' | 'divine_sense' | 'sword_arts' | 'flying_swords'
  | 'artifacts' | 'formations' | 'talismans' | 'alchemy_utilities' | 'summons_beasts';

export const TECHNIQUE_WHEEL_CATEGORIES: readonly TechniqueCategory[] = [
  'cultivator_attack', 'cultivator_defense', 'body_arts',
  'movement', 'divine_sense', 'sword_arts', 'flying_swords',
  'artifacts', 'formations', 'talismans', 'alchemy_utilities', 'summons_beasts',
] as const;

// ---------------------------------------------------------------------------
// Typography (Section 25)
// ---------------------------------------------------------------------------

export interface TypographySpec {
  primaryBodyPx: [number, number];    // 18-22 at 1080p
  secondaryTextPx: [number, number];  // 16-18
  headingsPx: [number, number];       // 24-32
  majorTitlePx: [number, number];     // 38-56
  minIconPx: number;                  // 40×40
  normalQuickSlotIconPx: [number, number]; // 56-64
  contrastRatio: number;              // 4.5:1 minimum
  uiScaleRange: [number, number];     // 80%-150%
}

export const TYPOGRAPHY: TypographySpec = {
  primaryBodyPx: [18, 22],
  secondaryTextPx: [16, 18],
  headingsPx: [24, 32],
  majorTitlePx: [38, 56],
  minIconPx: 40,
  normalQuickSlotIconPx: [56, 64],
  contrastRatio: 4.5,
  uiScaleRange: [0.8, 1.5],
};

// ---------------------------------------------------------------------------
// UI Visual Language
// ---------------------------------------------------------------------------

export interface UIVisualLanguage {
  panelStyle: 'dark_translucent_glass_ink';
  accents: ('bronze' | 'jade' | 'silver' | 'spirit_blue')[];
  borders: 'thin';
  ornament: 'sparse_corners';
  contrast: 'high';
  clutter: 'low_during_exploration';
  contextualExpansion: 'combat_or_deep_interaction';
}

export const UI_VISUAL_LANGUAGE: UIVisualLanguage = {
  panelStyle: 'dark_translucent_glass_ink',
  accents: ['bronze', 'jade', 'silver', 'spirit_blue'],
  borders: 'thin',
  ornament: 'sparse_corners',
  contrast: 'high',
  clutter: 'low_during_exploration',
  contextualExpansion: 'combat_or_deep_interaction',
};
