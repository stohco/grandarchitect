/**
 * Honest Maturity — Authorial Grand Architect
 * ===========================================
 *
 * This file documents the TRUE maturity of each authorial subsystem.
 * It exists to prevent the pattern of claiming "implemented" for schemas.
 *
 * Last updated: 2026-08-06
 * Last verified commit: aea56b1
 */

export const AUTHORIAL_MATURITY = {
  studioContextGraph: {
    status: 'schema-and-query-service-prototype',
    description: 'StudioContextSnapshot type and 13 inspection query names exist. No real context contributors, no consistency guarantees, no real-time synchronization with browser state.',
    whatExists: ['Type definitions', 'buildContextSnapshot() helper', 'Inspection query enum'],
    whatDoesNotExist: ['Real context contributors from subsystems', 'Revision consistency verdicts', 'Browser-integrated selection reading', 'Access-control filtering for NPC views'],
  },
  canonStyleSystem: {
    status: 'domain-records-and-resolver-prototype',
    description: 'CanonRule, StyleConstraint, CreativeContextPacket types exist. CreativeContextResolver can match scope. No Bible compiler, no source spans, no modality preservation, no formal precedence resolution.',
    whatExists: ['Type definitions for 7 truth layers', 'Scope matching', 'CreativeContextResolver with resolve()'],
    whatDoesNotExist: ['Bible compiler that transforms prose into records', 'Source spans (document, line, hash)', 'Modality (must/normally/may/disputed/secret)', 'Formal precedence with decision traces', 'Provider enforcement (rejecting calls without packet)'],
  },
  unboundLoop: {
    status: 'orchestration-state-model',
    description: '13-stage loop type and LoopState exist. UnboundLoopManager can create/advance/pause loops. No real stage handlers, no durable persistence, no crash recovery, no idempotency.',
    whatExists: ['Stage enum', 'LoopState with all stage artifacts', 'UnboundLoopManager with start/advance/pause/resume'],
    whatDoesNotExist: ['Real stage handlers that execute', 'Durable persistence outside process memory', 'Crash recovery and resumption', 'Idempotency keys', 'Base revision tracking with invalidation', 'Independent critique enforcement'],
  },
  decisionLedgers: {
    status: 'record-model',
    description: 'DecisionEntry and 5 ledger types exist. NarrativeWorldState with promises, conflicts, arcs exist. No append-only revision chain, no durable persistence, no retcon propagation, no impact analysis.',
    whatExists: ['DecisionEntry type', '5 ledger types', 'NarrativeWorldState with 10 record types', 'getApplicableConstraints(scope)'],
    whatDoesNotExist: ['Append-only revision chain', 'Durable storage (disk/database)', 'Retcon propagation to affected assets', 'Impact graph', 'Temporal applicability'],
  },
  narrativeWorldGraph: {
    status: 'domain-graph-model',
    description: 'Record types for promises, conflicts, arcs, mysteries, motifs exist. No connection to world/simulation truth, no consumer-specific projections, no NPC knowledge filtering.',
    whatExists: ['Record types', 'In-memory storage'],
    whatDoesNotExist: ['Concrete entity/location anchors', 'Simulation bindings', 'Consumer-specific projections (authorial/player/NPC)', 'Promise detection from content', 'Mystery truth filtering'],
  },
  authorialGrandArchitect: {
    status: 'not-operationally-proven',
    description: 'The architecture is specified and the types exist. No complete authorial request has been proven through all 13 stages with real Studio integration, real Bible compilation, real durable decisions, and restart recovery.',
    correctDescription: 'Authorial Grand Architect domain model and orchestration scaffold',
  },
} as const;

/**
 * What the authorial system ACTUALLY is:
 *
 * A domain model and orchestration scaffold for the Authorial Grand Architect.
 *
 * NOT an operating authorial intelligence.
 * NOT a Bible compiler.
 * NOT a durable decision system.
 * NOT a crash-resumable loop.
 * NOT connected to real Studio state.
 *
 * What it correctly provides:
 * - Correct conceptual separation (truth vs perspective, canon vs style,
 *   generation vs critique, plan vs execution, decision vs memory)
 * - Type definitions for all 13 UnboundLoop stages
 * - CreativeContextPacket that every provider should receive
 * - 7 truth layers (authorial, world-state, institutional, character, rumor, mystery, narrative)
 * - Style inheritance hierarchy (project → cosmology → realm → region → culture → asset → scene)
 * - Decision ledger types with scoped constraint inheritance
 * - Narrative world graph with promises, arcs, mysteries, consequences
 *
 * What it does NOT provide (honestly):
 * - Real Studio context reading from browser
 * - Bible compilation from prose to records
 * - Durable ledger persistence
 * - Crash-resumable loop execution
 * - Independent critique enforcement
 * - One complete end-to-end authorial request
 */
