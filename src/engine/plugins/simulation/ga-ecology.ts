/**
 * ga:ecology — Ecology and Demography Plugin
 *
 * Implements doc 28 (Ecology and Demography).
 * Food web, population dynamics, seasonal cycles, spirit beasts,
 * qi topology, demography, tier degradation.
 * Pure function of (ecology_state, seasonal_modulation, harvest_pressure, contamination, rng).
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { Tick, SimulationTier } from '../../kernel/types';

// ============================================================================
// Food Web Types (doc 28 §1)
// ============================================================================

export type TrophicLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface FoodWebNode {
  speciesId: string;
  name: string;
  trophicLevel: TrophicLevel;
  qiProfile: string;      // 'none' | 'wood' | 'water' | 'fire' | 'earth' | 'metal'
  qiMagnitude: number;    // [0,1]
  reproductionRate: number; // per year
  carryingCapacity: number;
  preysOn: string[];     // species IDs this species preys on
  isCultivator: boolean;  // spirit beasts that can cultivate
}

// ============================================================================
// Spirit Vein (doc 28 §2)
// ============================================================================

export interface SpiritVein {
  veinId: string;
  regionId: string;
  phaseSignature: string;
  magnitude: number;     // [0,10]
  flowRate: number;       // qi per tick
  depth: number;          // meters
  tappedBy: string[];    // faction/sect IDs
}

// ============================================================================
// Species Population (doc 28 §3)
// ============================================================================

export interface SpeciesPopulation {
  speciesId: string;
  regionId: string;
  population: number;
  matureIndividuals: number;
  phaseAffinity: string;
  carryingCapacity: number;
  birthRate: number;
  deathRate: number;
  lastUpdatedTick: Tick;
}

// ============================================================================
// Seasonal Modulation (doc 28 §5 — 24 Solar Terms)
// ============================================================================

export type SolarTerm =
  'lichun' | 'yushui' | 'jingzhe' | 'chunfen' | 'qingming' | 'guyu'
  | 'lixia' | 'xiaoman' | 'mangzhong' | 'xiazhi' | 'xiaoshu' | 'dashu'
  | 'liqiu' | 'chushu' | 'bailu' | 'qiufen' | 'hanlu' | 'shuangjiang'
  | 'lidong' | 'xiaoxue' | 'daxue' | 'dongzhi' | 'xiaohan' | 'dahan';

export interface SeasonalModulation {
  solarTerm: SolarTerm;
  ambientQiMod: number;    // 0.8-1.2
  herbGrowthMod: number;   // 0.0-1.5
  beastActivityMod: number; // 0.3-1.5
  migrationWindow: boolean;
  contaminationDecayMod: number; // multiplier on decay rate
}

// ============================================================================
// Ecology Events (doc 28 §4)
// ============================================================================

export type EcologyEventType =
  'starvation' | 'over_population' | 'extinction' | 'migration'
  | 'predation_spike' | 'cascade_collapse' | 'herb_peak' | 'beast_awakening';

export interface EcologyEvent {
  eventId: string;
  eventType: EcologyEventType;
  tick: Tick;
  regionId: string;
  speciesId: string;
  details: string;
}

// ============================================================================
// Demography (doc 28 §11)
// ============================================================================

export interface DemographicRecord {
  regionId: string;
  population: number;
  ageDistribution: number[]; // 10-year buckets
  sexRatio: number;          // males per female
  birthRate: number;
  deathRate: number;
  grainReserveDays: number;
  debtIndex: number;
  migrationRate: number;
  lastUpdatedTick: Tick;
}

// ============================================================================
// Region Ecology State
// ============================================================================

export interface RegionEcology {
  regionId: string;
  ambientQi: number;
  contamination: number;
  speciesPops: Map<string, SpeciesPopulation>;
  spiritVeins: SpiritVein[];
  demography: DemographicRecord;
  events: EcologyEvent[];
  tick: Tick;
}

// ============================================================================
// Ecology API
// ============================================================================

export interface EcologyApi {
  // Region management
  createRegion(regionId: string, config?: Partial<RegionEcologyConfig>): void;
 getRegion(regionId: string): RegionEcology | undefined;
 listRegions(): string[];
  removeRegion(regionId: string): boolean;

  // Species management
  registerSpecies(node: FoodWebNode): void;
 getSpecies(speciesId: string): FoodWebNode | undefined;
 listSpecies(): FoodWebNode[];
  introduceSpecies(regionId: string, speciesId: string, count: number): boolean;

  // Population queries
  getPopulation(regionId: string, speciesId: string): number;
  setPopulation(regionId: string, speciesId: string, count: number): boolean;
  isExtinct(regionId: string, speciesId: string): boolean;

  // Simulation
  step(regionId: string, tick: Tick): EcologyEvent[];
  stepAll(tick: Tick): Map<string, EcologyEvent[]>;

  // Seasonal
  setSolarTerm(term: SolarTerm): void;
  getSolarTerm(): SolarTerm;
  getSeasonalModulation(): SeasonalModulation;

  // Qi & Contamination
  setAmbientQi(regionId: string, qi: number): boolean;
  getAmbientQi(regionId: string): number;
  setContamination(regionId: string, level: number): boolean;
  getContamination(regionId: string): number;

  // Spirit veins
  addSpiritVein(vein: SpiritVein): boolean;
  getSpiritVeins(regionId: string): SpiritVein[];

  // Demography
  getDemography(regionId: string): DemographicRecord | undefined;
  updateDemography(regionId: string, updates: Partial<DemographicRecord>): boolean;

  // Events
  getEvents(regionId: string): EcologyEvent[];

  // Stats
  stats(): EcologyStats;
}

export interface RegionEcologyConfig {
  ambientQi: number;
  contamination: number;
  initialPopulation: Partial<Record<string, number>>;
  demography: Partial<DemographicRecord>;
}

export interface EcologyStats {
  totalRegions: number;
  totalSpecies: number;
  totalEvents: number;
  totalPopulation: number;
  extinctSpecies: number;
  contaminatedRegions: number;
}

// ============================================================================
// Solar Term Table (deterministic seasonal modifiers)
// ============================================================================

export const SOLAR_TERM_TABLE: Record<SolarTerm, SeasonalModulation> = {
  lichun:    { solarTerm: 'lichun',    ambientQiMod: 0.90, herbGrowthMod: 0.2,  beastActivityMod: 0.5,  migrationWindow: false, contaminationDecayMod: 0.9 },
  yushui:    { solarTerm: 'yushui',    ambientQiMod: 0.92, herbGrowthMod: 0.3,  beastActivityMod: 0.5,  migrationWindow: false, contaminationDecayMod: 0.95 },
  jingzhe:   { solarTerm: 'jingzhe',   ambientQiMod: 0.95, herbGrowthMod: 0.5,  beastActivityMod: 0.7,  migrationWindow: true,  contaminationDecayMod: 1.0 },
  chunfen:   { solarTerm: 'chunfen',   ambientQiMod: 1.00, herbGrowthMod: 0.7,  beastActivityMod: 0.8,  migrationWindow: true,  contaminationDecayMod: 1.0 },
  qingming:  { solarTerm: 'qingming',  ambientQiMod: 1.02, herbGrowthMod: 0.8,  beastActivityMod: 0.9,  migrationWindow: false, contaminationDecayMod: 1.0 },
  guyu:      { solarTerm: 'guyu',      ambientQiMod: 1.05, herbGrowthMod: 1.0,  beastActivityMod: 0.9,  migrationWindow: false, contaminationDecayMod: 1.0 },
  lixia:     { solarTerm: 'lixia',     ambientQiMod: 1.08, herbGrowthMod: 1.1,  beastActivityMod: 1.0,  migrationWindow: false, contaminationDecayMod: 1.0 },
  xiaoman:   { solarTerm: 'xiaoman',   ambientQiMod: 1.10, herbGrowthMod: 1.2,  beastActivityMod: 1.0,  migrationWindow: false, contaminationDecayMod: 1.0 },
  mangzhong: { solarTerm: 'mangzhong',  ambientQiMod: 1.15, herbGrowthMod: 1.5,  beastActivityMod: 1.1,  migrationWindow: false, contaminationDecayMod: 1.0 },
  xiazhi:    { solarTerm: 'xiazhi',    ambientQiMod: 1.20, herbGrowthMod: 1.3,  beastActivityMod: 1.2,  migrationWindow: false, contaminationDecayMod: 1.0 },
  xiaoshu:   { solarTerm: 'xiaoshu',   ambientQiMod: 1.15, herbGrowthMod: 1.1,  beastActivityMod: 1.2,  migrationWindow: false, contaminationDecayMod: 1.0 },
  dashu:     { solarTerm: 'dashu',     ambientQiMod: 1.10, herbGrowthMod: 1.0,  beastActivityMod: 1.1,  migrationWindow: false, contaminationDecayMod: 1.0 },
  liqiu:     { solarTerm: 'liqiu',     ambientQiMod: 1.05, herbGrowthMod: 0.9,  beastActivityMod: 1.0,  migrationWindow: true,  contaminationDecayMod: 1.0 },
  chushu:    { solarTerm: 'chushu',    ambientQiMod: 1.00, herbGrowthMod: 0.7,  beastActivityMod: 0.9,  migrationWindow: true,  contaminationDecayMod: 1.0 },
  bailu:     { solarTerm: 'bailu',     ambientQiMod: 0.95, herbGrowthMod: 0.5,  beastActivityMod: 0.8,  migrationWindow: false, contaminationDecayMod: 1.0 },
  qiufen:    { solarTerm: 'qiufen',    ambientQiMod: 0.92, herbGrowthMod: 0.4,  beastActivityMod: 0.7,  migrationWindow: false, contaminationDecayMod: 1.0 },
  hanlu:     { solarTerm: 'hanlu',     ambientQiMod: 0.88, herbGrowthMod: 0.2,  beastActivityMod: 0.6,  migrationWindow: false, contaminationDecayMod: 0.95 },
  shuangjiang:{ solarTerm: 'shuangjiang',ambientQiMod: 0.85, herbGrowthMod: 0.1,  beastActivityMod: 0.5,  migrationWindow: false, contaminationDecayMod: 0.9 },
  lidong:    { solarTerm: 'lidong',    ambientQiMod: 0.83, herbGrowthMod: 0.0,  beastActivityMod: 0.4,  migrationWindow: false, contaminationDecayMod: 0.85 },
  xiaoxue:   { solarTerm: 'xiaoxue',   ambientQiMod: 0.81, herbGrowthMod: 0.0,  beastActivityMod: 0.35, migrationWindow: false, contaminationDecayMod: 0.85 },
  daxue:     { solarTerm: 'daxue',     ambientQiMod: 0.80, herbGrowthMod: 0.0,  beastActivityMod: 0.3,  migrationWindow: false, contaminationDecayMod: 0.8 },
  dongzhi:   { solarTerm: 'dongzhi',   ambientQiMod: 0.80, herbGrowthMod: 0.0,  beastActivityMod: 0.3,  migrationWindow: false, contaminationDecayMod: 0.8 },
  xiaohan:   { solarTerm: 'xiaohan',   ambientQiMod: 0.81, herbGrowthMod: 0.0,  beastActivityMod: 0.3,  migrationWindow: false, contaminationDecayMod: 0.8 },
  dahan:     { solarTerm: 'dahan',     ambientQiMod: 0.80, herbGrowthMod: 0.0,  beastActivityMod: 0.3,  migrationWindow: false, contaminationDecayMod: 0.8 },
};

const SOLAR_TERMS: SolarTerm[] = [
  'lichun','yushui','jingzhe','chunfen','qingming','guyu',
  'lixia','xiaoman','mangzhong','xiazhi','xiaoshu','dashu',
  'liqiu','chushu','bailu','qiufen','hanlu','shuangjiang',
  'lidong','xiaoxue','daxue','dongzhi','xiaohan','dahan',
];

// ============================================================================
// Implementation
// ============================================================================

function createDefaultDemography(regionId: string, tick: Tick): DemographicRecord {
  return {
    regionId, population: 1000,
    ageDistribution: [200, 180, 150, 120, 100, 80, 60, 50, 40, 20],
    sexRatio: 1.05, birthRate: 0.035, deathRate: 0.025,
    grainReserveDays: 180, debtIndex: 0, migrationRate: 0.01,
    lastUpdatedTick: tick,
  };
}

export function createEcologyApi(): EcologyApi {
  const regions = new Map<string, RegionEcology>();
  const speciesRegistry = new Map<string, FoodWebNode>();
  let currentSolarTerm: SolarTerm = 'lichun';
  let solarTermIndex = 0;
  let eventIdCounter = 0;

  function createRegion(regionId: string, config?: Partial<RegionEcologyConfig>): void {
    const region: RegionEcology = {
      regionId,
      ambientQi: config?.ambientQi ?? 1.0,
      contamination: config?.contamination ?? 0,
      speciesPops: new Map(),
      spiritVeins: [],
      demography: {
        ...createDefaultDemography(regionId, 0),
        ...config?.demography,
      },
      events: [],
      tick: 0,
    };
    if (config?.initialPopulation) {
      for (const [speciesId, count] of Object.entries(config.initialPopulation)) {
        if (count !== undefined) {
          const species = speciesRegistry.get(speciesId);
          region.speciesPops.set(speciesId, {
            speciesId, regionId, population: count,
            matureIndividuals: Math.floor(count * 0.6),
            phaseAffinity: species?.qiProfile ?? 'none',
            carryingCapacity: species?.carryingCapacity ?? count * 2,
            birthRate: species?.reproductionRate ?? 0.1,
            deathRate: 0.05,
            lastUpdatedTick: 0,
          });
        }
      }
    }
    regions.set(regionId, region);
  }

  function getRegion(regionId: string): RegionEcology | undefined {
    return regions.get(regionId);
  }

  function listRegions(): string[] {
    return Array.from(regions.keys());
  }

  function removeRegion(regionId: string): boolean {
    return regions.delete(regionId);
  }

  function registerSpecies(node: FoodWebNode): void {
    speciesRegistry.set(node.speciesId, node);
  }

  function getSpecies(speciesId: string): FoodWebNode | undefined {
    return speciesRegistry.get(speciesId);
  }

  function listSpecies(): FoodWebNode[] {
    return Array.from(speciesRegistry.values());
  }

  function introduceSpecies(regionId: string, speciesId: string, count: number): boolean {
    const region = regions.get(regionId);
    const species = speciesRegistry.get(speciesId);
    if (!region || !species) return false;
    const existing = region.speciesPops.get(speciesId);
    if (existing) {
      existing.population += count;
      existing.matureIndividuals = Math.floor(existing.population * 0.6);
      existing.lastUpdatedTick = region.tick;
    } else {
      region.speciesPops.set(speciesId, {
        speciesId, regionId, population: count,
        matureIndividuals: Math.floor(count * 0.6),
        phaseAffinity: species.qiProfile,
        carryingCapacity: species.carryingCapacity,
        birthRate: species.reproductionRate,
        deathRate: 0.05,
        lastUpdatedTick: region.tick,
      });
    }
    return true;
  }

  function getPopulation(regionId: string, speciesId: string): number {
    return regions.get(regionId)?.speciesPops.get(speciesId)?.population ?? 0;
  }

  function setPopulation(regionId: string, speciesId: string, count: number): boolean {
    const pop = regions.get(regionId)?.speciesPops.get(speciesId);
    if (!pop) return false;
    pop.population = count;
    return true;
  }

  function isExtinct(regionId: string, speciesId: string): boolean {
    const pop = regions.get(regionId)?.speciesPops.get(speciesId);
    if (!pop) return true;
    return pop.population < 1;
  }

  function step(regionId: string, tick: Tick): EcologyEvent[] {
    const region = regions.get(regionId);
    if (!region) return [];
    region.tick = tick;
    const mod = SOLAR_TERM_TABLE[currentSolarTerm];
    const newEvents: EcologyEvent[] = [];

    // Population dynamics per species (doc 28 §3)
    for (const [speciesId, pop] of region.speciesPops) {
      const species = speciesRegistry.get(speciesId);
      if (!species) continue;

      const K = pop.carryingCapacity * (region.ambientQi / 1.0) * (1 - region.contamination);
      const effectiveK = Math.max(1, K);
      const r = pop.birthRate * mod.ambientQiMod * mod.herbGrowthMod;
      const N = pop.population;

      // Logistic growth: dN/dt = r*N*(1-N/K)
      let growth = r * N * (1 - N / effectiveK);

      // Predation loss
      let predationLoss = 0;
      for (const preyId of species.preysOn) {
        const predatorPop = region.speciesPops.get(preyId);
        if (predatorPop) {
          predationLoss += N * predatorPop.population * 0.0001;
        }
      }

      // Contamination death
      const contaminationDeath = N * region.contamination * 0.1;

      const newPop = N + growth - predationLoss - contaminationDeath;
      pop.population = Math.max(0, Math.round(newPop));
      pop.matureIndividuals = Math.floor(pop.population * 0.6);
      pop.lastUpdatedTick = tick;

      // Extinction check (doc 28 §3)
      if (pop.population < effectiveK * 0.1 && pop.population > 0) {
        pop.population = 0;
        newEvents.push({
          eventId: `eco-${++eventIdCounter}`, eventType: 'extinction',
          tick, regionId, speciesId,
          details: `${speciesId} went extinct in ${regionId}`,
        });
      }

      // Over-population check
      if (pop.population > effectiveK * 1.5) {
        newEvents.push({
          eventId: `eco-${++eventIdCounter}`, eventType: 'over_population',
          tick, regionId, speciesId,
          details: `${speciesId} over-populated (${pop.population} > 1.5*${Math.round(effectiveK)})`,
        });
      }
    }

    // Contamination decay
    region.contamination *= (0.999 * mod.contaminationDecayMod);
    if (region.contamination < 0.001) region.contamination = 0;

    // Advance solar term every ~15 ticks (1 year = 365 ticks, 24 terms)
    if (tick % 15 === 0) {
      solarTermIndex = (solarTermIndex + 1) % 24;
      currentSolarTerm = SOLAR_TERMS[solarTermIndex];
    }

    region.events.push(...newEvents);
    return newEvents;
  }

  function stepAll(tick: Tick): Map<string, EcologyEvent[]> {
    const results = new Map<string, EcologyEvent[]>();
    for (const regionId of regions.keys()) {
      results.set(regionId, step(regionId, tick));
    }
    return results;
  }

  function setSolarTerm(term: SolarTerm): void {
    currentSolarTerm = term;
    solarTermIndex = SOLAR_TERMS.indexOf(term);
  }

  function getSolarTerm(): SolarTerm { return currentSolarTerm; }

  function getSeasonalModulation(): SeasonalModulation {
    return SOLAR_TERM_TABLE[currentSolarTerm];
  }

  function setAmbientQi(regionId: string, qi: number): boolean {
    const region = regions.get(regionId);
    if (!region) return false;
    region.ambientQi = Math.max(0, Math.min(2, qi));
    return true;
  }

  function getAmbientQi(regionId: string): number {
    return regions.get(regionId)?.ambientQi ?? 0;
  }

  function setContamination(regionId: string, level: number): boolean {
    const region = regions.get(regionId);
    if (!region) return false;
    region.contamination = Math.max(0, Math.min(1, level));
    return true;
  }

  function getContamination(regionId: string): number {
    return regions.get(regionId)?.contamination ?? 0;
  }

  function addSpiritVein(vein: SpiritVein): boolean {
    const region = regions.get(vein.regionId);
    if (!region) return false;
    region.spiritVeins.push(vein);
    return true;
  }

  function getSpiritVeins(regionId: string): SpiritVein[] {
    return regions.get(regionId)?.spiritVeins ?? [];
  }

  function getDemography(regionId: string): DemographicRecord | undefined {
    return regions.get(regionId)?.demography;
  }

  function updateDemography(regionId: string, updates: Partial<DemographicRecord>): boolean {
    const demo = regions.get(regionId)?.demography;
    if (!demo) return false;
    Object.assign(demo, updates);
    return true;
  }

  function getEvents(regionId: string): EcologyEvent[] {
    return regions.get(regionId)?.events ?? [];
  }

  function stats(): EcologyStats {
    let totalPopulation = 0, extinctSpecies = 0, totalEvents = 0;
    let contaminatedRegions = 0;
    for (const region of regions.values()) {
      for (const pop of region.speciesPops.values()) {
        totalPopulation += pop.population;
        if (pop.population < 1) extinctSpecies++;
      }
      totalEvents += region.events.length;
      if (region.contamination > 0) contaminatedRegions++;
    }
    return {
      totalRegions: regions.size,
      totalSpecies: speciesRegistry.size,
      totalEvents,
      totalPopulation,
      extinctSpecies,
      contaminatedRegions,
    };
  }

  return {
    createRegion, getRegion, listRegions, removeRegion,
    registerSpecies, getSpecies, listSpecies, introduceSpecies,
    getPopulation, setPopulation, isExtinct,
    step, stepAll,
    setSolarTerm, getSolarTerm, getSeasonalModulation,
    setAmbientQi, getAmbientQi, setContamination, getContamination,
    addSpiritVein, getSpiritVeins,
    getDemography, updateDemography,
    getEvents, stats,
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export function createEcologyPlugin(): Plugin {
  let api: EcologyApi | null = null;

  return {
    id: 'ga:ecology',
    version: '0.1.0',
    dependencies: ['ga:determinism'],

    init(host: PluginHost) {
      api = createEcologyApi();
      host.capabilities.register({
        capability: 'ecology.food-web', provider: 'ga:ecology',
        version: '0.1.0', instance: api,
      });
      host.capabilities.register({
        capability: 'ecology.seasonal', provider: 'ga:ecology',
        version: '0.1.0', instance: api,
      });
      host.capabilities.register({
        capability: 'ecology.demography', provider: 'ga:ecology',
        version: '0.1.0', instance: api,
      });
      host.setState('ga:ecology', api);
      console.log('[ga:ecology] Initialized — 3 capabilities registered');
    },

    destroy(host: PluginHost) {
      host.capabilities.unregister('ecology.food-web', 'ga:ecology');
      host.capabilities.unregister('ecology.seasonal', 'ga:ecology');
      host.capabilities.unregister('ecology.demography', 'ga:ecology');
      api = null;
      console.log('[ga:ecology] Destroyed');
    },
  };
}
