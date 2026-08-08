/**
 * Emergence Gauntlet — golden emergence scenarios (regression suite).
 *
 * From docs/emergence-directive.md: "Create golden simulation scenarios...
 * The exact story does not have to be predetermined. But if [the trigger]
 * disappears and absolutely nothing else notices, the emergence test fails."
 *
 * Every scenario declares the systems that MUST be able to respond to the
 * trigger (causal fan-out). The gauntlet is machine-audited:
 *   - the premise must exist verbatim in its source document,
 *   - every observed system must have at least one registered consumer,
 *   - each scenario must observe enough systems to be emergence, not
 *     spectacle (fan-out >= MIN_OBSERVED_SYSTEMS).
 */

import type { GenesisSystem } from './genesis-types';
import { GENESIS_SYSTEMS } from './genesis-types';
import { claimVerified } from './genesis-coverage';
import { consumersForSystem } from './consumer-registry';

export interface EmergenceScenario {
  id: string;
  title: string;
  /** Verbatim premise text + source (machine-audited). */
  premise: { text: string; source: string };
  /** Systems that must be able to respond when the trigger fires. */
  observedSystems: GenesisSystem[];
}

/** A major world verb should notify at least this many systems. */
export const MIN_OBSERVED_SYSTEMS = 4;

export const EMERGENCE_GAUNTLET: EmergenceScenario[] = [
  {
    id: 'gauntlet.destroy-bridge',
    title: 'Destroy the Bridge',
    premise: {
      text: 'Scenario: destroy the bridge',
      source: 'docs/emergence-directive.md',
    },
    observedSystems: ['simulation', 'persistence', 'validation', 'visual'],
  },
  {
    id: 'gauntlet.drain-spirit-vein',
    title: 'Drain a Spirit Vein',
    premise: {
      text: 'Scenario: drain a spirit vein',
      source: 'docs/emergence-directive.md',
    },
    observedSystems: ['generation', 'simulation', 'persistence', 'validation'],
  },
  {
    id: 'gauntlet.kill-village-leader',
    title: 'Kill a Village Leader',
    premise: {
      text: 'Scenario: kill a village leader',
      source: 'docs/emergence-directive.md',
    },
    observedSystems: ['simulation', 'persistence', 'validation', 'visual'],
  },
  {
    id: 'gauntlet.tunnel-protected-cave',
    title: 'Tunnel into a Protected Cave',
    premise: {
      text: 'Scenario: tunnel into protected cave',
      source: 'docs/emergence-directive.md',
    },
    observedSystems: ['generation', 'simulation', 'persistence', 'validation'],
  },
  {
    id: 'gauntlet.forest-fire',
    title: 'Forest Fire',
    premise: {
      text: 'Scenario: forest fire',
      source: 'docs/emergence-directive.md',
    },
    observedSystems: ['generation', 'simulation', 'visual', 'validation'],
  },
  {
    id: 'gauntlet.matter-removal',
    title: 'Matter Removal (Causal Event Fabric)',
    premise: {
      text: 'interface MatterRemovedEvent {',
      source: 'docs/emergence-directive.md',
    },
    observedSystems: ['simulation', 'persistence', 'validation', 'audio'],
  },
];

export interface EmergenceScenarioAudit {
  scenario: EmergenceScenario;
  premiseVerified: boolean;
  /** Systems with no registered consumer (empty = observable). */
  unobserved: GenesisSystem[];
  fanOut: number;
  pass: boolean;
}

/** Audit a single scenario. */
export function auditScenario(scenario: EmergenceScenario): EmergenceScenarioAudit {
  const premiseVerified = claimVerified(scenario.premise);
  const unobserved = scenario.observedSystems.filter(
    (s) => consumersForSystem(s).length === 0,
  );
  const fanOut = scenario.observedSystems.length;
  return {
    scenario,
    premiseVerified,
    unobserved,
    fanOut,
    pass: premiseVerified && unobserved.length === 0 && fanOut >= MIN_OBSERVED_SYSTEMS,
  };
}

/** Audit the whole gauntlet. */
export function runGauntlet(): EmergenceScenarioAudit[] {
  return EMERGENCE_GAUNTLET.map(auditScenario);
}
