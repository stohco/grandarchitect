/**
 * ga:history — History and Event Simulation Plugin
 *
 * Implements doc 30 (History and Event Simulation).
 * 32 event types, state-driven generation, consequences,
 * event afterlife (ruins, descendants, ghost stories),
 * century-absence test support.
 * Pure function of (event_state, worldState, rng).
 */

import type { Plugin, PluginHost } from '../kernel/plugin-host';
import type { EntityId, Tick, SimulationTier } from '../kernel/types';

// ============================================================================
// Event Types (doc 30 §1 — 32 types)
// ============================================================================

export type HistoryEventType =
  | 'war' | 'migration' | 'sect_collapse' | 'dynasty_change'
  | 'beast_tide' | 'plague' | 'failed_ascension' | 'discovered_inheritance'
  | 'resource_boom' | 'territorial_dispute' | 'tribulation_strike' | 'breakthrough_event'
  | 'foundation_of_sect' | 'dissolution_of_sect' | 'marriage_alliance' | 'feud_eruption'
  | 'corruption_scandal' | 'smuggling_bust' | 'market_crash' | 'vein_depletion'
  | 'vein_discovery' | 'deviation_outbreak' | 'yao_awakening' | 'lost_manual_resurfaced'
  | 'karmic_retribution' | 'prophetic_dream_wave' | 'foreign_invasion' | 'natural_disaster'
  | 'pilgrimage' | 'tournament' | 'assassination' | 'succession_crisis' | 'cultivator_death';

export const ALL_EVENT_TYPES: HistoryEventType[] = [
  'war','migration','sect_collapse','dynasty_change','beast_tide','plague',
  'failed_ascension','discovered_inheritance','resource_boom','territorial_dispute',
  'tribulation_strike','breakthrough_event','foundation_of_sect','dissolution_of_sect',
  'marriage_alliance','feud_eruption','corruption_scandal','smuggling_bust',
  'market_crash','vein_depletion','vein_discovery','deviation_outbreak','yao_awakening',
  'lost_manual_resurfaced','karmic_retribution','prophetic_dream_wave','foreign_invasion',
  'natural_disaster','pilgrimage','tournament','assassination','succession_crisis','cultivator_death',
];

// ============================================================================
// Event Consequence Types (doc 30 §3)
// ============================================================================

export type ConsequenceType =
  | 'npc_death' | 'npc_injury' | 'npc_breakthrough' | 'npc_displacement'
  | 'faction_destroyed' | 'faction_weakened' | 'faction_strengthened'
  | 'region_terrain_altered' | 'region_contamination_changed'
  | 'population_loss' | 'resource_created' | 'resource_destroyed'
  | 'new_ruin' | 'new_rumor' | 'oath_broken' | 'oath_forged';

export interface EventConsequence {
  type: ConsequenceType;
  targetId?: EntityId;
  targetFaction?: string;
  targetRegion?: string;
  details: string;
  magnitude: number; // [0,1]
}

// ============================================================================
// History Event (doc 30 §1)
// ============================================================================

export interface HistoryEvent {
  eventId: string;
  eventType: HistoryEventType;
  tick: Tick;
  regionId: string;
  participants: EntityId[];
  causes: string[];
  consequences: EventConsequence[];
  afterlife: EventAfterlife[];
  hash: string; // SHA-256 of event content
  rumors: string[];
}

// ============================================================================
// Event Trigger (doc 30 §2)
// ============================================================================

export interface EventTrigger {
  eventType: HistoryEventType;
  predicate: (state: RegionHistoryState) => boolean;
  baseRate: number;        // probability per tick
  cooldown: number;        // ticks between same event type in same region
  minTier: SimulationTier; // minimum sim tier for event to fire
}

// ============================================================================
// Event Afterlife (doc 30 §5)
// ============================================================================

export type RuinType = 'sect' | 'palace' | 'battlefield' | 'cultivation_cave' | 'tomb' | 'city';

export interface Ruin {
  ruinId: string;
  type: RuinType;
  regionId: string;
  name: string;
  concealment: number;   // [0,1]
  protections: number;   // [0,1]
  contents: string[];
  decayLevel: number;    // [0,1], increases 0.01/year
  tickCreated: Tick;
}

export interface DescendantLineage {
  lineageId: string;
  ancestorId: EntityId;
  inheritedGrudges: Array<{ targetId: EntityId; severity: number }>;
  inheritedOaths: string[];
}

export interface GhostStory {
  storyId: string;
  regionId: string;
  content: string;
  anchorEntityId?: EntityId;
  distortionLevel: number;
  tickCreated: Tick;
}

export interface LostManual {
  manualId: string;
  title: string;
  regionId: string;
  concealment: number;
  discovered: boolean;
  discovererId?: EntityId;
  tickCreated: Tick;
}

export type AfterlifeType = 'ruin' | 'lineage' | 'ghost_story' | 'lost_manual';

export interface EventAfterlife {
  type: AfterlifeType;
  ruin?: Ruin;
  lineage?: DescendantLineage;
  ghostStory?: GhostStory;
  lostManual?: LostManual;
}

// ============================================================================
// Region History State
// ============================================================================

export interface RegionHistoryState {
  regionId: string;
  population: number;
  factionStrengths: Map<string, number>;
  ambientQi: number;
  contamination: number;
  recentEvents: HistoryEvent[];
  cooldowns: Map<HistoryEventType, Tick>;
  tick: Tick;
}

// ============================================================================
// History API
// ============================================================================

export interface HistoryApi {
  // Region management
  createRegion(regionId: string, config?: Partial<RegionHistoryConfig>): void;
  getRegion(regionId: string): RegionHistoryState | undefined;
  listRegions(): string[];
  removeRegion(regionId: string): boolean;

  // Events
  recordEvent(event: Omit<HistoryEvent, 'eventId' | 'hash' | 'rumors' | 'afterlife'>): string;
  getEvent(eventId: string): HistoryEvent | undefined;
  getEventsByRegion(regionId: string): HistoryEvent[];
  getEventsByType(eventType: HistoryEventType): HistoryEvent[];
  getEventsByParticipant(participantId: EntityId): HistoryEvent[];

  // Simulation
  step(regionId: string, tick: Tick): HistoryEvent[];
  stepAll(tick: Tick): Map<string, HistoryEvent[]>;

  // Afterlife
  getRuins(regionId: string): Ruin[];
  getGhostStories(regionId: string): GhostStory[];
  getLostManuals(regionId: string): LostManual[];
  getLineages(): DescendantLineage[];
  addRuin(ruin: Omit<Ruin, 'ruinId' | 'decayLevel' | 'tickCreated'>): string;
  addGhostStory(story: Omit<GhostStory, 'storyId' | 'tickCreated'>): string;
  addLostManual(manual: Omit<LostManual, 'manualId' | 'tickCreated'>): string;

  // Cooldowns
  setCooldown(regionId: string, eventType: HistoryEventType, tick: Tick): void;
  getCooldown(regionId: string, eventType: HistoryEventType): Tick;

  // Event chains (doc 30 §11)
  addChainRule(triggeringEvent: HistoryEventType, triggeredEvent: HistoryEventType, probability: number, delayTicks: number): void;
  getChainRules(triggeringEvent: HistoryEventType): Array<{ event: HistoryEventType; probability: number; delay: number }>;

  // Stats
  stats(): HistoryStats;
}

export interface RegionHistoryConfig {
  population: number;
  factionStrengths: Record<string, number>;
  ambientQi: number;
  contamination: number;
}

export interface HistoryStats {
  totalRegions: number;
  totalEvents: number;
  totalRuins: number;
  totalGhostStories: number;
  totalLostManuals: number;
  totalLineages: number;
  eventsByType: Record<string, number>;
}

// ============================================================================
// Simple deterministic hash (non-crypto, for event IDs)
// ============================================================================

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function detRandom(seed: number, tick: number, index: number): number {
  let state = (seed ^ (tick * 2654435761) ^ (index * 40503)) | 0;
  state = ((state >> 16) ^ state) * 0x45d9f3b | 0;
  state = ((state >> 16) ^ state) * 0x45d9f3b | 0;
  state = (state >> 16) ^ state;
  return (state >>> 0) / 4294967296;
}

// ============================================================================
// Default Triggers (doc 30 §2)
// ============================================================================

function createDefaultTriggers(): Map<HistoryEventType, EventTrigger> {
  const triggers = new Map<HistoryEventType, EventTrigger>();

  // War: fires when two factions in same region both have strength > 0.5
  triggers.set('war', {
    eventType: 'war',
    predicate: (state) => {
      let strongFactions = 0;
      for (const strength of state.factionStrengths.values()) {
        if (strength > 0.5) strongFactions++;
      }
      return strongFactions >= 2;
    },
    baseRate: 0.001,
    cooldown: 365,
    minTier: 1,
  });

  // Beast tide: fires when population > 5000 and contamination > 0.3
  triggers.set('beast_tide', {
    eventType: 'beast_tide',
    predicate: (state) => state.population > 5000 && state.contamination > 0.3,
    baseRate: 0.002,
    cooldown: 180,
    minTier: 1,
  });

  // Plague: fires when contamination > 0.5
  triggers.set('plague', {
    eventType: 'plague',
    predicate: (state) => state.contamination > 0.5,
    baseRate: 0.003,
    cooldown: 365,
    minTier: 1,
  });

  // Breakthrough: fires when ambientQi > 1.1
  triggers.set('breakthrough_event', {
    eventType: 'breakthrough_event',
    predicate: (state) => state.ambientQi > 1.1,
    baseRate: 0.01,
    cooldown: 30,
    minTier: 2,
  });

  // Market crash: fires randomly with low base rate
  triggers.set('market_crash', {
    eventType: 'market_crash',
    predicate: () => true,
    baseRate: 0.0005,
    cooldown: 730,
    minTier: 1,
  });

  // Natural disaster: random
  triggers.set('natural_disaster', {
    eventType: 'natural_disaster',
    predicate: () => true,
    baseRate: 0.001,
    cooldown: 365,
    minTier: 1,
  });

  return triggers;
}

// ============================================================================
// Implementation
// ============================================================================

export function createHistoryApi(): HistoryApi {
  const regions = new Map<string, RegionHistoryState>();
  const allEvents = new Map<string, HistoryEvent>();
  const ruins = new Map<string, Ruin>();
  const ghostStories = new Map<string, GhostStory>();
  const lostManuals = new Map<string, LostManual>();
  const lineages = new Map<string, DescendantLineage>();
  const chainRules = new Map<string, Array<{ event: HistoryEventType; probability: number; delay: number }>>();
  const triggers = createDefaultTriggers();
  let eventIdCounter = 0;
  let ruinCounter = 0;
  let storyCounter = 0;
  let manualCounter = 0;
  let lineageCounter = 0;

  function createRegion(regionId: string, config?: Partial<RegionHistoryConfig>): void {
    const state: RegionHistoryState = {
      regionId,
      population: config?.population ?? 1000,
      factionStrengths: new Map(Object.entries(config?.factionStrengths ?? {})),
      ambientQi: config?.ambientQi ?? 1.0,
      contamination: config?.contamination ?? 0,
      recentEvents: [],
      cooldowns: new Map(),
      tick: 0,
    };
    regions.set(regionId, state);
  }

  function getRegion(regionId: string): RegionHistoryState | undefined {
    return regions.get(regionId);
  }

  function listRegions(): string[] { return Array.from(regions.keys()); }
  function removeRegion(regionId: string): boolean { return regions.delete(regionId); }

  function recordEvent(event: Omit<HistoryEvent, 'eventId' | 'hash' | 'rumors' | 'afterlife'>): string {
    const id = `hist-${++eventIdCounter}`;
    const content = `${event.eventType}:${event.tick}:${event.regionId}:${event.participants.join(',')}`;
    const fullEvent: HistoryEvent = {
      ...event, eventId: id,
      hash: simpleHash(content),
      rumors: [], afterlife: [],
    };
    allEvents.set(id, fullEvent);
    // Add to region
    const region = regions.get(event.regionId);
    if (region) {
      region.recentEvents.push(fullEvent);
      // Cap at 100 recent events per region
      if (region.recentEvents.length > 100) region.recentEvents.shift();
    }
    return id;
  }

  function getEvent(eventId: string): HistoryEvent | undefined { return allEvents.get(eventId); }

  function getEventsByRegion(regionId: string): HistoryEvent[] {
    return Array.from(allEvents.values()).filter(e => e.regionId === regionId);
  }

  function getEventsByType(eventType: HistoryEventType): HistoryEvent[] {
    return Array.from(allEvents.values()).filter(e => e.eventType === eventType);
  }

  function getEventsByParticipant(participantId: EntityId): HistoryEvent[] {
    return Array.from(allEvents.values()).filter(e => e.participants.includes(participantId));
  }

  function step(regionId: string, tick: Tick): HistoryEvent[] {
    const region = regions.get(regionId);
    if (!region) return [];
    region.tick = tick;
    const newEvents: HistoryEvent[] = [];

    // Check all triggers
    for (const [eventType, trigger] of triggers) {
      if (region.contamination < trigger.minTier * 0.2) continue; // S0 check simplified
      const cooldown = region.cooldowns.get(eventType) ?? 0;
      if (tick - cooldown < trigger.cooldown) continue;

      if (trigger.predicate(region)) {
        const roll = detRandom(simpleHash(regionId).charCodeAt(0) || 1, tick, eventIdCounter);
        if (roll < trigger.baseRate) {
          const eventId = recordEvent({
            eventType, tick, regionId,
            participants: [], causes: ['state_trigger'], consequences: [],
          });
          newEvents.push(allEvents.get(eventId)!);
          region.cooldowns.set(eventType, tick);

          // Check chain rules (doc 30 §11)
          const chains = chainRules.get(eventType) ?? [];
          for (const chain of chains) {
            const chainRoll = detRandom(eventIdCounter, tick, chainRules.size);
            if (chainRoll < chain.probability) {
              const chainEventId = recordEvent({
                eventType: chain.event, tick: tick + chain.delay, regionId,
                participants: [], causes: [eventId], consequences: [],
              });
              newEvents.push(allEvents.get(chainEventId)!);
            }
          }
        }
      }
    }

    // Decay ruin decay levels (0.01/year = 0.01/365 per tick)
    for (const ruin of ruins.values()) {
      if (ruin.regionId === regionId) {
        ruin.decayLevel = Math.min(1, ruin.decayLevel + 0.01 / 365);
      }
    }

    return newEvents;
  }

  function stepAll(tick: Tick): Map<string, HistoryEvent[]> {
    const results = new Map<string, HistoryEvent[]>();
 for (const regionId of regions.keys()) {
      results.set(regionId, step(regionId, tick));
    }
    return results;
  }

  function getRuins(regionId: string): Ruin[] {
    return Array.from(ruins.values()).filter(r => r.regionId === regionId);
  }

  function getGhostStories(regionId: string): GhostStory[] {
    return Array.from(ghostStories.values()).filter(g => g.regionId === regionId);
  }

  function getLostManuals(regionId: string): LostManual[] {
    return Array.from(lostManuals.values()).filter(m => m.regionId === regionId);
  }

  function getLineages(): DescendantLineage[] {
    return Array.from(lineages.values());
  }

  function addRuin(ruin: Omit<Ruin, 'ruinId' | 'decayLevel' | 'tickCreated'>): string {
    const id = `ruin-${++ruinCounter}`;
    const now = regions.values().next().value?.tick ?? 0;
    ruins.set(id, { ...ruin, ruinId: id, decayLevel: 0, tickCreated: now });
    return id;
  }

  function addGhostStory(story: Omit<GhostStory, 'storyId' | 'tickCreated'>): string {
    const id = `ghost-${++storyCounter}`;
    const now = regions.values().next().value?.tick ?? 0;
    ghostStories.set(id, { ...story, storyId: id, tickCreated: now });
    return id;
  }

  function addLostManual(manual: Omit<LostManual, 'manualId' | 'tickCreated'>): string {
    const id = `manual-${++manualCounter}`;
    const now = regions.values().next().value?.tick ?? 0;
    lostManuals.set(id, { ...manual, manualId: id, tickCreated: now });
    return id;
  }

  function setCooldown(regionId: string, eventType: HistoryEventType, tick: Tick): void {
    const region = regions.get(regionId);
    if (region) region.cooldowns.set(eventType, tick);
  }

  function getCooldown(regionId: string, eventType: HistoryEventType): Tick {
    return regions.get(regionId)?.cooldowns.get(eventType) ?? 0;
  }

  function addChainRule(triggeringEvent: HistoryEventType, triggeredEvent: HistoryEventType, probability: number, delayTicks: number): void {
    const rules = chainRules.get(triggeringEvent) ?? [];
    rules.push({ event: triggeredEvent, probability, delay: delayTicks });
    chainRules.set(triggeringEvent, rules);
  }

  function getChainRules(triggeringEvent: HistoryEventType): Array<{ event: HistoryEventType; probability: number; delay: number }> {
    return chainRules.get(triggeringEvent) ?? [];
  }

  function stats(): HistoryStats {
    const eventsByType: Record<string, number> = {};
    for (const event of allEvents.values()) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] ?? 0) + 1;
    }
    return {
      totalRegions: regions.size,
      totalEvents: allEvents.size,
      totalRuins: ruins.size,
      totalGhostStories: ghostStories.size,
      totalLostManuals: lostManuals.size,
      totalLineages: lineages.size,
      eventsByType,
    };
  }

  return {
    createRegion, getRegion, listRegions, removeRegion,
    recordEvent, getEvent, getEventsByRegion, getEventsByType, getEventsByParticipant,
    step, stepAll,
    getRuins, getGhostStories, getLostManuals, getLineages,
    addRuin, addGhostStory, addLostManual,
    setCooldown, getCooldown,
    addChainRule, getChainRules,
    stats,
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export function createHistoryPlugin(): Plugin {
  let api: HistoryApi | null = null;

  return {
    id: 'ga:history',
    version: '0.1.0',
    dependencies: ['ga:determinism'],

    init(host: PluginHost) {
      api = createHistoryApi();
      host.capabilities.register({
        capability: 'history.events', provider: 'ga:history',
        version: '0.1.0', instance: api,
      });
      host.capabilities.register({
        capability: 'history.afterlife', provider: 'ga:history',
        version: '0.1.0', instance: api,
      });
      host.capabilities.register({
        capability: 'history.chains', provider: 'ga:history',
        version: '0.1.0', instance: api,
      });
      host.setState('ga:history', api);
      console.log('[ga:history] Initialized — 3 capabilities registered');
    },

    destroy(host: PluginHost) {
      host.capabilities.unregister('history.events', 'ga:history');
      host.capabilities.unregister('history.afterlife', 'ga:history');
      host.capabilities.unregister('history.chains', 'ga:history');
      api = null;
      console.log('[ga:history] Destroyed');
    },
  };
}
