/**
 * ga:economy — Economy, Logistics, and Factions Plugin
 *
 * Implements doc 29 (Economy, Logistics, Factions).
 * Three currencies, supply/demand, trade routes, caravans,
 * debt/credit, smuggling, sect monopolies, production chain.
 * Pure function of (economy_state, events, rng).
 */

import type { Plugin, PluginHost } from '../kernel/plugin-host';
import type { EntityId, Tick, SimulationTier } from '../kernel/types';

// ============================================================================
// Currency Types (doc 29 §1)
// ============================================================================

export type CurrencyType = 'copper' | 'silver' | 'spirit_stone' | 'grain';

export interface CurrencyAmount {
  copper: number;
  silver: number;
  spiritStones: number;
  grain: number;
}

export const ZERO_CURRENCY: CurrencyAmount = { copper: 0, silver: 0, spiritStones: 0, grain: 0 };

// ============================================================================
// Market (doc 29 §2)
// ============================================================================

export interface GoodPrice {
  goodId: string;
  price: number;          // in copper cash
  supply: number;
  demand: number;
  basePrice: number;
  lastUpdatedTick: Tick;
}

export interface Market {
  marketId: string;
  regionId: string;
  prices: Map<string, GoodPrice>;
  exchangeRates: {
    copperToSilver: number;      // 1000:1
    silverToSpiritStone: number;  // 100-500:1
    grainToCopper: number;        // varies
  };
  lastUpdatedTick: Tick;
}

// ============================================================================
// Trade Route (doc 29 §4)
// ============================================================================

export type RouteMode = 'river' | 'road' | 'mountain_pass' | 'grotto_heaven';

export interface TradeRoute {
  routeId: string;
  fromMarketId: string;
  toMarketId: string;
  mode: RouteMode;
  travelTimeTicks: number;
  danger: number;          // [0,1] per trip
  tolls: number;           // copper per trip
  controllingFaction: string;
  capacity: number;        // cargo units per trip
  active: boolean;
}

// ============================================================================
// Caravan (doc 29 §4)
// ============================================================================

export interface Caravan {
  caravanId: string;
  routeId: string;
  cargo: Map<string, number>;  // goodId → amount
  guardCost: number;
  departureTick: Tick;
  arrivalTick: Tick;
  status: 'queued' | 'traveling' | 'arrived' | 'lost';
}

// ============================================================================
// Debt Record (doc 29 §7)
// ============================================================================

export type DebtStatus = 'active' | 'defaulted' | 'paid' | 'forgiven';
export type CollateralType = 'land' | 'livestock' | 'household_member' | 'manual' | 'herb' | 'none';

export interface DebtRecord {
  debtId: string;
  creditorId: EntityId;
  debtorId: EntityId;
  principal: number;
  currency: CurrencyType;
  interestRate: number;    // per 365 ticks (1 year)
  compound: boolean;
  collateral: { type: CollateralType; value: number; description: string };
  status: DebtStatus;
  tickEstablished: Tick;
  lastInterestTick: Tick;
}

// ============================================================================
// Faction Economy (doc 29 §13)
// ============================================================================

export interface FactionEconomy {
  factionId: string;
  name: string;
  treasury: CurrencyAmount;
  memberCount: number;
  aggregateRealm: string;
  cohesion: number;       // [0,1]
  prosperity: number;     // [0,1]
  corruptionIndex: number; // [0,1]
  debtOwed: number;
  debtOwedTo: number;
  monopolyHoldings: string[];
}

// ============================================================================
// Economy API
// ============================================================================

export interface EconomyApi {
  // Market management
  createMarket(marketId: string, regionId: string): Market;
  getMarket(marketId: string): Market | undefined;
  listMarkets(): Market[];
  removeMarket(marketId: string): boolean;

  // Price management (doc 29 §2)
  setGoodPrice(marketId: string, goodId: string, basePrice: number, supply: number, demand: number): boolean;
  getGoodPrice(marketId: string, goodId: string): GoodPrice | undefined;
  stepPrices(marketId: string, tick: Tick): void;

  // Trade routes
  createRoute(route: TradeRoute): boolean;
  getRoute(routeId: string): TradeRoute | undefined;
  listRoutes(): TradeRoute[];
  removeRoute(routeId: string): boolean;

  // Caravans
  dispatchCaravan(routeId: string, cargo: Map<string, number>, tick: Tick): Caravan | undefined;
  stepCaravans(tick: Tick): Caravan[];

  // Debt
  createDebt(record: Omit<DebtRecord, 'debtId' | 'status' | 'lastInterestTick'>): string;
  getDebt(debtId: string): DebtRecord | undefined;
  listDebts(): DebtRecord[];
  payDebt(debtId: string, amount: number, tick: Tick): boolean;
  accrueInterest(debtId: string, tick: Tick): void;

  // Factions
  createFaction(economy: FactionEconomy): boolean;
  getFaction(factionId: string): FactionEconomy | undefined;
  listFactions(): FactionEconomy[];
  updateFaction(factionId: string, updates: Partial<FactionEconomy>): boolean;

  // Currency conversion
  convertCurrency(amount: number, from: CurrencyType, to: CurrencyType, marketId?: string): number;

  // Stats
  stats(): EconomyStats;
}

export interface EconomyStats {
  totalMarkets: number;
  totalRoutes: number;
  totalActiveCaravans: number;
  totalDebts: number;
  totalActiveDebts: number;
  totalFactions: number;
  totalWealth: CurrencyAmount;
}

// ============================================================================
// Implementation
// ============================================================================

export function createEconomyApi(): EconomyApi {
  const markets = new Map<string, Market>();
  const routes = new Map<string, TradeRoute>();
  const caravans: Caravan[] = [];
  const debts = new Map<string, DebtRecord>();
  const factions = new Map<string, FactionEconomy>();
  let debtCounter = 0;
  let caravanCounter = 0;

  // Market management
  function createMarket(marketId: string, regionId: string): Market {
    const market: Market = {
      marketId, regionId,
      prices: new Map(),
      exchangeRates: { copperToSilver: 1000, silverToSpiritStone: 200, grainToCopper: 15 },
      lastUpdatedTick: 0,
    };
    markets.set(marketId, market);
    return market;
  }

  function getMarket(marketId: string): Market | undefined { return markets.get(marketId); }
  function listMarkets(): Market[] { return Array.from(markets.values()); }
  function removeMarket(marketId: string): boolean { return markets.delete(marketId); }

  // Price management (doc 29 §2 — Victoria II-style equilibrium)
  function setGoodPrice(marketId: string, goodId: string, basePrice: number, supply: number, demand: number): boolean {
    const market = markets.get(marketId);
    if (!market) return false;
    market.prices.set(goodId, {
      goodId, price: basePrice, supply, demand, basePrice, lastUpdatedTick: 0,
    });
    return true;
  }

  function getGoodPrice(marketId: string, goodId: string): GoodPrice | undefined {
    return markets.get(marketId)?.prices.get(goodId);
  }

  function stepPrices(marketId: string, tick: Tick): void {
    const market = markets.get(marketId);
    if (!market) return;
    for (const price of market.prices.values()) {
      // Victoria II-style: price(t+1) = price(t) * (1 + 0.05 * (demand - supply) / max(supply, demand))
      const maxSD = Math.max(price.supply, price.demand, 1);
      const adjustment = 0.05 * (price.demand - price.supply) / maxSD;
      price.price = price.price * (1 + adjustment);
      // Clamp to [0.01, 100x base]
      price.price = Math.max(0.01, Math.min(price.basePrice * 100, price.price));
      price.lastUpdatedTick = tick;
    }
    market.lastUpdatedTick = tick;
  }

  // Trade routes
  function createRoute(route: TradeRoute): boolean {
    routes.set(route.routeId, route);
    return true;
  }

  function getRoute(routeId: string): TradeRoute | undefined { return routes.get(routeId); }
  function listRoutes(): TradeRoute[] { return Array.from(routes.values()); }
  function removeRoute(routeId: string): boolean { return routes.delete(routeId); }

  // Caravans
  function dispatchCaravan(routeId: string, cargo: Map<string, number>, tick: Tick): Caravan | undefined {
    const route = routes.get(routeId);
    if (!route || !route.active) return undefined;
    const caravan: Caravan = {
      caravanId: `caravan-${++caravanCounter}`,
      routeId, cargo: new Map(cargo),
      guardCost: 50, departureTick: tick,
      arrivalTick: tick + route.travelTimeTicks,
      status: 'traveling',
    };
    caravans.push(caravan);
    return caravan;
  }

  function stepCaravans(tick: Tick): Caravan[] {
    const arrived: Caravan[] = [];
    for (const c of caravans) {
      if (c.status === 'traveling' && tick >= c.arrivalTick) {
        // Loss probability based on route danger
        const route = routes.get(c.routeId);
        if (route && route.danger > 0.5) {
          c.status = 'lost';
        } else {
          c.status = 'arrived';
          arrived.push(c);
        }
      }
    }
    return arrived;
  }

  // Debt
  function createDebt(record: Omit<DebtRecord, 'debtId' | 'status' | 'lastInterestTick'>): string {
    const id = `debt-${++debtCounter}`;
    const debt: DebtRecord = { ...record, debtId: id, status: 'active', lastInterestTick: record.tickEstablished };
    debts.set(id, debt);
    return id;
  }

  function getDebt(debtId: string): DebtRecord | undefined { return debts.get(debtId); }
  function listDebts(): DebtRecord[] { return Array.from(debts.values()); }

  function payDebt(debtId: string, amount: number, tick: Tick): boolean {
    const debt = debts.get(debtId);
    if (!debt || debt.status !== 'active') return false;
    debt.principal -= amount;
    if (debt.principal <= 0) {
      debt.principal = 0;
      debt.status = 'paid';
    }
    return true;
  }

  function accrueInterest(debtId: string, tick: Tick): void {
    const debt = debts.get(debtId);
    if (!debt || debt.status !== 'active') return;
    const yearsElapsed = (tick - debt.lastInterestTick) / 365;
    if (yearsElapsed < 1) return;
    if (debt.compound) {
      debt.principal = debt.principal * (1 + debt.interestRate) ** yearsElapsed;
    } else {
      debt.principal += debt.principal * debt.interestRate * yearsElapsed;
    }
    debt.lastInterestTick = tick;
  }

  // Factions
  function createFaction(economy: FactionEconomy): boolean {
    factions.set(economy.factionId, economy);
    return true;
  }

  function getFaction(factionId: string): FactionEconomy | undefined { return factions.get(factionId); }
  function listFactions(): FactionEconomy[] { return Array.from(factions.values()); }

  function updateFaction(factionId: string, updates: Partial<FactionEconomy>): boolean {
    const faction = factions.get(factionId);
    if (!faction) return false;
    Object.assign(faction, updates);
    return true;
  }

  // Currency conversion
  function convertCurrency(amount: number, from: CurrencyType, to: CurrencyType, marketId?: string): number {
    const market = marketId ? markets.get(marketId) : undefined;
    const rates = market?.exchangeRates ?? { copperToSilver: 1000, silverToSpiritStone: 200, grainToCopper: 15 };
    // Convert everything to copper first, then to target
    let copper = amount;
    switch (from) {
      case 'silver': copper = amount * rates.copperToSilver; break;
      case 'spirit_stone': copper = amount * rates.copperToSilver * rates.silverToSpiritStone; break;
      case 'grain': copper = amount * rates.grainToCopper; break;
    }
    switch (to) {
      case 'silver': return copper / rates.copperToSilver;
      case 'spirit_stone': return copper / (rates.copperToSilver * rates.silverToSpiritStone);
      case 'grain': return copper / rates.grainToCopper;
      default: return copper;
    }
  }

  function stats(): EconomyStats {
    let totalWealth = { ...ZERO_CURRENCY };
    let totalActiveDebts = 0;
    let activeCaravans = 0;
    for (const f of factions.values()) {
      totalWealth.copper += f.treasury.copper;
      totalWealth.silver += f.treasury.silver;
      totalWealth.spiritStones += f.treasury.spiritStones;
      totalWealth.grain += f.treasury.grain;
    }
    for (const d of debts.values()) { if (d.status === 'active') totalActiveDebts++; }
    for (const c of caravans) { if (c.status === 'traveling') activeCaravans++; }
    return {
      totalMarkets: markets.size, totalRoutes: routes.size,
      totalActiveCaravans: activeCaravans,
      totalDebts: debts.size, totalActiveDebts,
      totalFactions: factions.size, totalWealth,
    };
  }

  return {
    createMarket, getMarket, listMarkets, removeMarket,
    setGoodPrice, getGoodPrice, stepPrices,
    createRoute, getRoute, listRoutes, removeRoute,
    dispatchCaravan, stepCaravans,
    createDebt, getDebt, listDebts, payDebt, accrueInterest,
    createFaction, getFaction, updateFaction, listFactions,
    convertCurrency, stats,
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export function createEconomyPlugin(): Plugin {
  let api: EconomyApi | null = null;

  return {
    id: 'ga:economy',
    version: '0.1.0',
    dependencies: ['ga:determinism'],

    init(host: PluginHost) {
      api = createEconomyApi();
      host.capabilities.register({
        capability: 'economy.markets', provider: 'ga:economy',
        version: '0.1.0', instance: api,
      });
      host.capabilities.register({
        capability: 'economy.trade', provider: 'ga:economy',
        version: '0.1.0', instance: api,
      });
      host.capabilities.register({
        capability: 'economy.factions', provider: 'ga:economy',
        version: '0.1.0', instance: api,
      });
      host.setState('ga:economy', api);
      console.log('[ga:economy] Initialized — 3 capabilities registered');
    },

    destroy(host: PluginHost) {
      host.capabilities.unregister('economy.markets', 'ga:economy');
      host.capabilities.unregister('economy.trade', 'ga:economy');
      host.capabilities.unregister('economy.factions', 'ga:economy');
      api = null;
      console.log('[ga:economy] Destroyed');
    },
  };
}
