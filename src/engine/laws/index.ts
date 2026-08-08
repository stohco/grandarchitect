/**
 * laws — Law Interaction Solver subsystem
 * ========================================
 *
 * "Power is relative to the laws of the environment in which it is
 * exercised." Deterministic resolution of capability × technique × artifact
 * × comprehension against world resistance × local law stack, including
 * formations/domains/restrictions and protection-aware terrain clipping.
 *
 * Files:
 *   - types.ts                  shared primitives (Realm, LawDomain, ...)
 *   - realm-law-profile.ts      RealmLawProfile + canonical 10-station table
 *   - capability-vector.ts      CapabilityVector + technique/artifact/
 *                               comprehension modifiers
 *   - local-law-stack.ts        LocalLawStack + conflict semantics
 *   - formation-core.ts         FormationCore / TerritoryAnchor /
 *                               ProtectedDomain / FormationLoadEvent
 *   - terrain-operation-clip.ts protection-aware clip → MatterRemovalEvent
 *   - law-interaction-solver.ts the solver + threshold table + forbidden rule
 *
 * No forbidden functions. No Three.js, no DOM. Deterministic.
 */

export * from './types';
export * from './realm-law-profile';
export * from './capability-vector';
export * from './local-law-stack';
export * from './formation-core';
export * from './terrain-operation-clip';
export * from './law-interaction-solver';
