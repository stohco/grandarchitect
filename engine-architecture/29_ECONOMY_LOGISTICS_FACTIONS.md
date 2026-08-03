# 29 — Economy, Logistics, and Factions

**Status:** Foundation. The scarcity engine — three currencies, regional supply and demand, trade routes, caravans, debt and credit, smuggling, sect monopolies, market manipulation, price shocks, and the production chain that turns a spirit-vein's qi into a pill a Core Formation cultivator buys at auction. Includes the 1:365 time-ratio rule that governs Precelestial-Acquired trade.
**Date:** 2026-08-03

---

## 0. What this document is and why it exists

The prior corpus (doc 18: economy system) specified the economic substrate at design resolution: three currencies, six markets, trade routes, the debt cycle, the sect economy. It did not specify the *simulator* that animates prices, routes caravans, clears markets, defaults debts, runs smuggling rings, and propagates price shocks across regions. This document specifies that simulator.

The doctrine (AGENTS.md Part 3: "Design for joy first") requires that the economy serve the player's experience: the desire to cultivate is, in part, the desire to escape the debt cycle (per doc 18 §5). The economy's work is to make scarcity *felt* — the price of a Foundation Establishment pill should feel as astronomical as the genre demands; the choice between buying medicine for a sick parent and saving for a spirit-stone should feel as painful as the genre promises. Every subsystem below serves that felt scarcity.

### Precedents cited

- **Mount & Blade: Warband (TaleWorlds, 2010) — the caravan and price-disparity model.** Trade goods have different prices in different towns; caravans arbitrage; bandits prey on caravans. This document adopts the per-town price + caravan-arbitrage model.
- **Patrician III (Ascaron, 2003) — the production-chain and supply-line model.** Each city produces and consumes specific goods; the player builds supply chains. This document adopts the named-production-chain model for the cultivation economy.
- **Victoria II (Paradox, 2010) — the world-market price-formation model.** Prices adjust toward equilibrium via supply-demand imbalances, with concessions and subsidies. This document adopts the equilibrium-seeking price model for S2 markets.
- **Dwarf Fortress (Bay 12) — the workshop and stockpile model.** Each workshop consumes inputs and produces outputs; stockpiles buffer against supply shocks. This document adopts the workshop-and-stockpile model for sect crafters.

---

## 1. The three currencies (recap)

Per doc 18 §1, the three currencies are:

| Currency | Mortal circulation | Cultivator circulation | Conversion |
|---|---|---|---|
| Copper cash (文) | Daily | Rare | 1000 cash = 1 tael silver (nominal; fluctuates) |
| Silver (銀, taels) | Tax, large transactions | Rare below Foundation Establishment | 1 tael = 100-500 spirit stones (regional) |
| Spirit stones (靈石) | None | Standard | 1 spirit stone = 100-500 taels (regional) |

A fourth pseudo-currency, **grain (穀)**, is the reserve currency for mortal households (per doc 18 §1.4). It is not traded in markets at S4 resolution (per doc 28 §11); it is tracked at the demographic level.

```typescript
interface CurrencyState {
  regionId: number;
  cashPerSilver: number;          // local exchange rate; fluctuates
  silverPerSpiritStone: number;   // local; fluctuates
  cashLiquidity: number;          // total cash in circulation
  silverLiquidity: number;
  spiritStoneLiquidity: number;
  grainReserve: number;           // in dan (石, ~60kg)
}
```

**Failure case — currency famine.** A region drained of one currency (e.g., a sect extracting spirit stones to the capital) cannot conduct transactions in that currency. The simulator enforces this: if `spiritStoneLiquidity < transaction_demand`, transactions in spirit stones fail (or are quoted in silver at a premium). This is the historical "currency flight" pattern, made mechanical.

---

## 2. Supply and demand (the price-formation engine)

Each market good has a per-region `SupplyDemandState`. The price adjusts toward equilibrium each market-day.

```typescript
interface SupplyDemandState {
  regionId: number;
  goodId: string;            // 'spirit_herb_qingxin', 'iron_tool', 'foundation_pill', etc.
  supply: number;            // units available
  demand: number;            // units desired at current price
  currentPrice: number;      // in local currency
  equilibriumPrice: number;  // theoretical; computed from long-run supply/demand
  priceHistory: PricePoint[];// last 365 days
  volatility: number;        // rolling standard deviation of price
}

interface PricePoint {
  tick: number;
  price: number;
  volume: number;            // units traded
}
```

**Price adjustment rule (Victoria II-style equilibrium-seeking).** Each market-day:

```
price(t+1) = price(t) * (1 + adjustment_rate * (demand - supply) / max(supply, demand))

  adjustment_rate = 0.05  // 5% per market-day; converges in ~20 days
```

If `supply = 0` (a famine or shortage), the price spikes toward `max_affordable_price` (the highest price at which the wealthiest demander can still buy); it does not go to infinity.

**Failure case — price oscillation.** A market with slow supply response (e.g., spirit herbs take decades to grow) can oscillate as demand spikes deplete supply, price spikes suppress demand, supply recovers, price crashes, demand returns. The simulator detects oscillation (amplitude > 30% over 60 days) and dampens by halving the `adjustment_rate` for that good. This is the historical "hog cycle" (Schweinezyklus), made mechanical.

---

## 3. Regional scarcity

Different regions have different scarcity profiles. The Cangli Riverlands are grain-rich, herb-poor, iron-poor; the northern mountains are herb-rich, grain-poor, iron-rich. Scarcity is encoded in the `RegionEconomicProfile`:

```typescript
interface RegionEconomicProfile {
  regionId: number;
  production: Record<string, number>;   // goodId → units produced per year
  consumption: Record<string, number>;  // goodId → units consumed per year
  selfSufficiency: Record<string, number>; // goodId → 0..1
  tradeDependencies: TradeDependency[];
  naturalResources: NaturalResource[];
}

interface TradeDependency {
  goodId: string;
  dependsOnRegion: number;
  fractionOfSupply: number;  // 0..1
  routeId: number;           // trade route (per §4)
}
```

**Failure case — scarcity denial.** A region cannot consume what it does not produce or import. If `import + production < consumption`, the deficit is rationed: the poorest consumers are priced out first. The simulator applies the rationing by raising price until demand matches `import + production`. This is the historical famine mechanism, made mechanical.

---

## 4. Trade routes and caravans

Trade routes are the edges of the trade graph. Each route connects two markets and has a cost (in time, danger, and tolls).

```typescript
interface TradeRoute {
  routeId: number;
  fromRegion: number;
  toRegion: number;
  mode: 'river' | 'road' | 'mountain_pass' | 'grotto_heaven';
  travelTime: number;          // ticks one-way
  danger: number;              // 0..1; probability of caravan loss
  tollPerUnit: number;         // cash per unit of cargo
  controllingFaction: number | null;
  caravanTraffic: number;      // caravans per year
  capacity: number;            // max caravans per year
}

interface Caravan {
  caravanId: number;
  operatorId: number;          // NPC or faction id
  routeId: number;
  cargo: CaravanCargo[];
  departedAt: number;
  arrivalTick: number;
  guards: number[];            // cultivator ids protecting the caravan
  insurancePaid: boolean;
  status: 'in_transit' | 'arrived' | 'lost' | 'plundered';
}

interface CaravanCargo {
  goodId: string;
  quantity: number;
  purchasedAt: number;         // price per unit at origin
  expectedSalePrice: number;   // at destination
}
```

**Caravan dispatch rule.** A merchant NPC (or faction) dispatches a caravan when `expectedSalePrice - purchasedAt - tolls - guard_cost > min_margin` for at least one good. The dispatch is a verb in the NPC's action policy (per doc 26 §16, `trade_at_market`).

**Caravan loss.** A caravan has a per-route `danger` probability per trip of being lost (bandits, beasts, weather). If lost, the cargo is gone (unless the bandits later sell it — the simulator models this via the `SmugglingEvent` subsystem in §8). Guards reduce `danger` proportionally to guard strength.

**Failure case — route capture.** If a hostile faction controls a route (per `controllingFaction`) and denies passage to a rival faction's caravans, the rival must find an alternate route or do without. The simulator tracks this: caravans of the denied faction have their `status` set to `turned_back` at the route entry. This is the historical *ha-jin* (海禁, maritime ban) pattern, made mechanical.

---

## 5. Price formation across regions

A good's price differs by region. The price difference is the *arbitrage opportunity* that drives caravans.

```
price_region_A  ≠  price_region_B
arbitrage_opportunity = price_B - price_A - tolls - guard_cost - risk_premium

  risk_premium = expected_loss * cargo_value
  expected_loss = route.danger
```

When `arbitrage_opportunity > min_margin`, caravans flow from A to B. Their purchases raise `price_A` and their sales lower `price_B`, closing the arbitrage. The closure rate is `closure_per_caravan = caravan_cargo / regional_supply` — small caravans on big markets move prices slowly; big caravans on small markets move them sharply.

**Failure case — cornering a market.** A wealthy faction can buy up all of a good in a region, hoard it, and sell at a markup. The simulator allows this (it is lawful), but the hoarding is visible to other factions (per doc 27 §6, the purchase events produce knowledge facts), and other factions may respond with `ReportToAuthority`, `SmuggleGoods` (§8), or `EstablishAlternateRoute`. Prolonged cornering triggers a `ScandalEvent` (per doc 30 §3) and may provoke regulatory intervention by the regional authority.

---

## 6. Sect monopolies and spirit-vein tithes

Sects that control spirit veins (per doc 14 §1, doc 18 §6.1) charge cultivators for access. The tithe is the sect's primary revenue stream.

```typescript
interface SpiritVeinTithe {
  veinId: number;
  sectId: number;
  titheRate: number;         // 0..1; fraction of cultivator's harvest paid
  minimumAccessFee: number;  // flat spirit-stone fee per cultivator per year
  restrictedAccess: boolean; // if true, only sect members may access
  titheHistory: TitheRecord[];
}

interface TitheRecord {
  cultivatorId: number;
  tick: number;
  harvestValue: number;      // in spirit stones
  tithePaid: number;
}
```

**Sect monopolies.** A sect with a monopoly on a rare good (a specific spirit herb, a specific pill recipe, a specific inheritance manual) can charge monopoly prices. The monopoly is encoded as `monopolyHolder` on the good's `SupplyDemandState`. The monopoly holder's price is `monopoly_price = equilibrium_price * (1 + monopoly_markup)` (default markup 50-200%).

**Failure case — monopoly erosion.** Monopolies erode over time as: (1) other sects discover the recipe (via research, per doc 31 §3), (2) smugglers undercut (per §8), (3) the monopoly holder's political power wanes. The simulator tracks a `monopoly_stability` score; when it drops below `monopoly_threshold`, the monopoly collapses and the price returns to equilibrium.

---

## 7. Debt and credit

Debt is the engine of mortal poverty (per doc 18 §5.1) and the lubricant of cultivator commerce. Each debt is a tracked obligation.

```typescript
interface DebtRecord {
  debtId: number;
  creditor: number;          // NPC or faction id
  debtor: number;
  principal: number;         // in cash, silver, or spirit stones
  currency: 'cash' | 'silver' | 'spirit_stone' | 'grain';
  interestRate: number;      // per year; 0.5 = 50% APR
  interestType: 'simple' | 'compound';
  issuedAt: number;
  dueAt: number;
  collateral: Collateral[];
  status: 'current' | 'delinquent' | 'defaulted' | 'forgiven' | 'paid';
}

interface Collateral {
  type: 'land' | 'pig' | 'household_member' | 'cultivation_manual' | 'spirit_herb';
  value: number;
  seizedOnDefault: boolean;
}
```

**Interest accrual.** Interest accrues per in-game day. A debt in default (past `dueAt`) compounds at `default_penalty_rate` (default 2× the agreed rate). A defaulted debt triggers `CollateralSeizure`: the creditor takes the collateral, and the debtor's relationship with the creditor degrades (loyalty -0.3, grudge severity 0.5, per doc 26 §14).

**Failure case — debt spiral.** A debtor who cannot pay sees their collateral seized, then their household members sold (per doc 18 §5.1). The simulator enforces this lawfully: it does not prevent the spiral, but it produces the cascade of consequences (the debtor's kin develop grudges, the debtor may flee the region, the debtor's faction loyalty drops). This is the engine of mortal suffering that drives the desire to cultivate.

**Cultivator debt.** Cultivators can also incur debt (to sects, to alchemists, to auction houses). The currency is typically spirit stones. Default on a cultivator debt is more violent: the creditor may dispatch enforcers (a `DebtCollectionEvent`), and the debtor's `reputation` (per doc 27 §6) drops sharply.

---

## 8. Smuggling

Smuggling is the unlawful transport of goods to evade tolls, taxes, or monopolies. It is a verb in the NPC action policy (per doc 26 §16, `smuggle_goods`).

```typescript
interface SmugglingOperation {
  operationId: number;
  operatorId: number;
  goodId: string;
  quantity: number;
  originRegion: number;
  destinationRegion: number;
  routeType: 'unmarked_path' | 'false_manifest' | 'bribed_official' | 'grotto_heaven_shortcut';
  detectionRisk: number;     // 0..1; per-trip probability of detection
  profitMargin: number;      // expected, after bribes and losses
  status: 'planning' | 'in_transit' | 'delivered' | 'detected' | 'lost';
}
```

**Detection.** Smuggling is detected via: (1) per-trip `detectionRisk` roll, (2) informants (NPCs whose `traits.deception` is low and who have a grudge against the smuggler), (3) residue reading by a cultivator official (per doc 27 §5). Detected smuggling triggers `SeizureEvent` (goods confiscated) and `ProsecutionEvent` (the smuggler is charged).

**Failure case — smuggling collapse.** A region with high enforcement suppresses smuggling; prices of smuggled goods rise; new smugglers enter to capture the margin; enforcement may collapse under corruption (per doc 26 §9 failure case — greedy officials). The simulator models this as a feedback loop: `enforcement_strength` decays with `corruption_index`, and smuggling volume tracks `enforcement_strength` inversely.

---

## 9. Market manipulation and price shocks

Market manipulation is the deliberate action of a faction to move a price. Price shocks are large, sudden moves from exogenous events.

```typescript
interface MarketManipulationEvent {
  type: 'cornering' | 'dumping' | 'rumor_planting' | 'supply_interdiction' | 'subsidy';
  factionId: number;
  goodId: string;
  regionId: number;
  intendedPriceMove: number;  // fraction; e.g., +0.5 = +50%
  tick: number;
  durationTicks: number;
  successProbability: number;
}

interface PriceShockEvent {
  type: 'famine' | 'plague' | 'war' | 'beast_tide' | 'vein_collapse' | 'tribulation' | 'inheritance_discovery';
  goodId: string;
  regionId: number;
  magnitude: number;          // fraction of supply lost
  tick: number;
  recoveryTime: number;       // ticks for supply to recover
}
```

**Shock propagation.** A price shock in region A propagates to region B via the trade graph: the supply shortfall in A is partly filled by imports from B, raising B's price. The propagation follows the trade-route edges (per §4). A 50% shortfall in A might produce a 10-20% price rise in B, depending on the trade-route capacity.

**Failure case — shock cascade.** A shock to a keystone good (e.g., a Foundation Establishment pill, which alchemists need and which all aspiring cultivators demand) propagates widely. The simulator tracks the *cascade depth*: a pill-price shock raises the price of breakthrough, which suppresses cultivator advancement, which reduces the supply of Foundation Establishment+ cultivators, which reduces the enforcement capacity against smugglers, which raises smuggling margins, which... The cascade is bounded by the simulation's tier caps (per §12) so it cannot run away indefinitely.

---

## 10. The production chain (habitat → pill)

The full production chain for a Foundation Establishment pill (per doc 18 §3.3, expanded):

```
┌────────────────┐
│ Spirit Vein    │  (qi source; §1 of doc 28)
└───────┬────────┘
        │ qi emission
        ▼
┌────────────────┐
│ Ambient Qi     │  (regional field; doc 28 §2.2)
└───────┬────────┘
        │ qi absorption
        ▼
┌────────────────┐
│ Herb Habitat   │  (wild garden; takes 50-100 years to mature)
└───────┬────────┘
        │ harvest (verb; per doc 26 §16)
        ▼
┌────────────────┐
│ Gatherer       │  (mortal or low-realm cultivator)
└───────┬────────┘
        │ transport
        ▼
┌────────────────┐
│ Trade Route    │  (per §4; danger, tolls)
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Sect Stockpile │  (storage; buffers against supply shocks)
└───────┬────────┘
        │ preservation (formation; per doc 16)
        ▼
┌────────────────┐
│ Alchemist      │  (workshop; consumes herb + beast parts + minerals)
└───────┬────────┘
        │ refining (per doc 16)
        ├──────────────┐
        ▼              ▼
┌──────────────┐ ┌──────────────┐
│   Success    │ │   Failure    │  (failure rate 30-70%)
│   (pill)     │ │ (waste, loss)│
└──────┬───────┘ └──────────────┘
       │
       ▼
┌────────────────┐
│ Merchant       │  (or sect distribution)
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Regional Price │  (per §2; equilibrium-seeking)
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Cultivator     │  (consumer; buys at market or auction)
└────────────────┘
```

Each link has a time cost (herbs take decades, transport takes days, refining takes hours) and a loss rate (gathering risk, transport risk, refining failure). The chain's *tempo* is years for the slow links and hours for the fast links; the production chain is the engine that makes the cultivation economy slow.

```typescript
interface ProductionChainStep {
  stepId: string;
  inputGood: string;
  outputGood: string;
  processor: 'habitat' | 'gatherer' | 'caravan' | 'stockpile' | 'alchemist' | 'merchant';
  durationTicks: number;
  lossRate: number;          // 0..1; fraction lost per pass
  skillFactor: number;       // multiplier on success, based on processor's skill
  concurrentCapacity: number;// how many parallel passes
}
```

**Failure case — chain break.** Removing any link breaks the chain. If the gatherers are killed (beast attack, plague), the herb supply drops, the alchemist runs out of inputs, the pill price spikes, the cultivators cannot break through. The simulator models this cascade via the price-shock propagation (§9) and the ecological cascade (doc 28 §4).

---

## 11. The 1:365 time ratio and Precelestial-Acquired trade

Per doc 15 §3, the Precelestial stratum runs at 1:1 real-time-to-game-time; the Acquired stratum runs at 1:365 (1 real second = 1 game day; 1 real year = 365 game years). The two strata trade via grotto-heavens (per doc 19), which are the only lawful crossings.

The time-ratio asymmetry produces strange economics:

- A Precelestial cultivator who visits the Acquired for a Precelestial-day (1 real day = 1 Acquired year) returns to find a year's worth of Acquired commerce has happened. Their Precelestial-side investments have not changed (Precelestial was at 1:1); their Acquired-side investments have appreciated or depreciated by a year's worth.
- A Precelestial-side alchemist producing pills in real-time sells them to Acquired-side merchants who experience the pills as fresh and rare (the pills' shelf-life is measured in Acquired years; the alchemist's production time is measured in Precelestial hours).

```typescript
interface CrossStratumTrade {
  crossingId: number;
  grottoHeavenId: number;
  precelestialParty: number;
  acquiredParty: number;
  goodId: string;
  quantity: number;
  precelestialPrice: number;  // in Precelestial spirit stones
  acquiredPrice: number;      // in Acquired spirit stones
  exchangeRate: number;       // precelestial_spirit_stones per acquired_spirit_stone
  precelestialTick: number;
  acquiredTick: number;       // differs by ~365×
}
```

**The exchange rate.** Precelestial spirit stones are *more valuable* than Acquired spirit stones (they are qi-richer, longer-lived, less contaminated). The exchange rate is typically 1 Precelestial = 50-200 Acquired. The rate fluctuates with the grotto-heaven's political situation.

**Failure case — arbitrage exploit.** A Precelestial cultivator could attempt to flood the Acquired market with cheap Precelestial goods, then return for the proceeds. The simulator allows this (it is lawful), but: (1) the grotto-heaven's controlling sect extracts a tithe on every crossing (per §6), (2) the Acquired-side price falls as supply rises (per §2), (3) the Precelestial-side authority may restrict crossings if the trade imbalance threatens local Precelestial interests. This is the historical *chao-feng* (吵封, "border quarrel") pattern, made mechanical.

**Failure case — time-debt.** A Precelestial cultivator who borrows in the Acquired (e.g., takes an Acquired-side loan to buy a treasure) returns to find the loan's interest has compounded across the time asymmetry. A 50% APR Acquired loan, held for one Precelestial year (= 365 Acquired years), compounds to astronomical values. The simulator enforces this lawfully: the debt is denominated in Acquired currency and accrues at Acquired time; the Precelestial cultivator's `DebtRecord.dueAt` is in Acquired ticks. This is the genre's "time debt" trope, made mechanical.

---

## 12. Tier simulation (S4 / S2 / S0)

The economy degrades by tier:

```
┌─────────┬──────────────────────────────────────────────────────────────┐
│ Tier    │ Economy behavior                                              │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S4      │ Every transaction tracked. Caravans individually simulated. │
│ (full)  │ Prices re-evaluated per market-day. Debts accrue per day.   │
│         │ Smuggling operations individually tracked.                  │
│         │ Cost: ~0.5ms per active market per market-day.               │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S2      │ Markets aggregate to monthly price points. Caravans         │
│ (aggr.) │ aggregated to "trade volume" per route per month. Debts     │
│         │ accrue per month. Smuggling aggregated to "smuggling        │
│         │ volume" per region per month.                                │
│         │ Cost: ~0.01ms per market per month.                          │
├─────────┼──────────────────────────────────────────────────────────────┤
│ S0      │ Frozen prices. No market dynamics. Debts frozen at last     │
│ (frozen)│ accrual. The region's economy is a snapshot.                 │
│         │ Cost: 0 per tick.                                             │
└─────────┴──────────────────────────────────────────────────────────────┘
```

**Promotion rule.** When the player enters a region, the economy promotes to S2 (monthly aggregates rehydrated from frozen prices + elapsed time). When the player visits a market, that market promotes to S4 (full transaction tracking).

**Demotion rule.** When the player leaves, the S4 market aggregates to S2; when the player leaves the region, the S2 markets freeze to S0. Named debts (debts involving the player or named NPCs, per doc 34) never freeze below S2 — they are tracked individually regardless of the player's location.

**Failure case — promotion artifact.** A market promoted from S0 to S4 must not produce a price that contradicts the frozen S0 price by more than `promotion_price_tolerance` (default 20%). If it would, the simulator uses the frozen S0 price and adjusts over the first market-day. This prevents "the player left for a year and the price tripled" whiplash.

---

## 13. Faction economy

A faction (sect, lineage, kingdom, alliance) has its own `FactionEconomyState`:

```typescript
interface FactionEconomyState {
  factionId: number;
  treasury: { cash: number; silver: number; spiritStones: number; grain: number };
  revenue: RevenueSource[];
  expenses: ExpenseSource[];
  members: number;
  aggregateRealm: number;     // mean realm of members
  cohesion: number;           // 0..1; per doc 26 §15
  prosperity: number;         // 0..1; mean of treasury + revenue trend
  corruptionIndex: number;    // 0..1; per doc 26 §9 failure case
  debtOwed: number;
  debtOwedTo: number;
  monopolyHoldings: string[]; // goodIds
}

interface RevenueSource {
  type: 'tithe' | 'land_tax' | 'craft_sales' | 'mercenary_contract' | 'tribute' | 'auction_fee';
  amount: number;             // per year
  trend: number;              // -1..+1; recent change
}

interface ExpenseSource {
  type: 'disciple_support' | 'maintenance' | 'treasure_acquisition' | 'tribute_paid' | 'enforcement';
  amount: number;
  trend: number;
}
```

**Faction prosperity.** A faction's `prosperity` decays when `expenses > revenue` for sustained periods. Low prosperity triggers: (1) member departures (cultivators leave for richer sects), (2) reduced enforcement (corruption rises), (3) vulnerability to attack (rival factions sense weakness). This is the historical "sect decline" pattern, made mechanical.

**Failure case — faction collapse.** When `prosperity < collapse_threshold` AND `cohesion < collapse_threshold`, the faction enters `CollapseEvent` (per doc 26 §15 failure case and doc 30 §3): members leave, treasury is looted, territories are claimed by rivals, named NPCs become free agents. The collapse is deterministic given the seed.

---

## 14. Determinism contract

Every economic operation is a pure function of:

```
economy_state(t+1) = economy_fn(
  economy_state(t),         // prices, debts, caravans, factions
  harvest_pressure(t),      // from ecology (per doc 28)
  events(t),                // wars, plagues, discoveries (per doc 30)
  rng(regionSeed, tick)     // for caravan loss rolls, smuggling detection
)
```

The function is evaluated per region per market-day at S4, per region per month at S2. All randomness flows through `rng(regionSeed, tick)`.

**Hash verification.** `hashEconomy(regionId, tick)` returns the SHA-256 of the CBOR-encoded `EconomyState` for that region. Two runs with the same seed produce identical hashes. Cross-stratum trade hashes include both `precelestialTick` and `acquiredTick` so the time asymmetry is auditable.

**Transaction atomicity.** A transaction (purchase, debt issuance, caravan dispatch) is atomic: it either fully commits (debit one party, credit another, update price) or fully rolls back. Partial transactions are bugs; the simulator detects them via a per-transaction hash ledger.

---

## 15. Rejected alternatives

- **Centrally-planned prices.** Rejected: produces prices that don't reflect scarcity. The equilibrium-seeking model (§2) is what makes scarcity *felt*.
- **Single global market.** Rejected: regional scarcity is the engine of trade (per §3). A global market flattens the trade graph and removes the caravan gameplay.
- **Player as the only economic actor.** Rejected: the player must perceive the economy as alive — caravans flowing, prices moving, factions competing. NPCs must trade independently.
- **Cryptocurrency-style speculation (futures, options).** Rejected: too modern for the setting; the genre's economics are pre-modern (cash, silver, hoarding, debt). Futures and options would distract.
- **Per-good simulation threads.** Rejected: determinism requires a single-threaded market-clearing per region. Cross-region parallelism is allowed because regions are isolated within a market-day.
- **Random walk prices.** Rejected: prices must reflect supply and demand or the player cannot reason about them. The equilibrium-seeking model (§2) is the only one that produces learnable prices.

---

## 16. Open decisions (surfaced for review)

1. **The 5% per market-day adjustment rate (§2).** Invented. May be too fast (markets feel volatile) or too slow (scarcity feels sluggish). Tuning needed.
2. **The 50-200% monopoly markup range (§6).** Invented. May be too high (monopolies feel unbeatable) or too low (monopolies feel trivial).
3. **The 2× default penalty rate (§7).** Invented. May be too punishing (default cascades too fast) or too lenient (default feels trivial).
4. **The 1:50-200 Precelestial-Acquired exchange rate (§11).** Decided within a range. The exact value will be tuned by the first Precelestial prototype (deferred until Acquired-side play is proven).
5. **The 20% promotion price tolerance (§12).** Invented. May be too tight (markets snap back too sharply on promotion) or too loose (prices feel discontinuous).
6. **The collapse thresholds for factions (§13).** Invented. Tuning data needed from playtesting sect-scale conflicts.

---

## 17. Doctrine compliance

- **Build the engine, not just the brake:** the prior corpus's economy doc (18) was the substrate; this document specifies the simulator (price formation, caravans, debts, smuggling, monopolies, shocks, cross-stratum trade, tier degradation).
- **Make decisions; do not defer:** the three-currency model, the equilibrium-seeking price, the caravan arbitrage, the debt spiral, the smuggling-detection loop, the cross-stratum time asymmetry, the tier mapping are all decided. §16 are tuning parameters, not forks.
- **Cite the precedent:** Mount & Blade: Warband, Patrician III, Victoria II, Dwarf Fortress are named and their contributions specified.
- **Design for joy first:** the first hour's joy is feeling the price of medicine for the player's sick parent — and choosing between medicine and a spirit-stone. The economy produces the felt scarcity that drives the desire to cultivate.
- **Authorize the smallest end-to-end thing:** this document specifies enough to implement the Cangli Riverlands economy (10 regions, 6 markets, 3 currencies, 50 goods) at S2 with the player's current market at S4, as the first prototype.

This document is the economy bible. It is the scarcity engine the prior corpus was missing.
