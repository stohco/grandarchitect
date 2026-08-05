/**
 * Workspace Agent Evaluation Framework
 * ====================================
 *
 * Comparison metrics for evaluating Prime Agent (or any workspace agent)
 * against the current workspace workflow. Measures verified completion,
 * false claims, recovery, context retention, and cost.
 */

export interface EvaluationMetric {
  metricId: string;
  name: string;
  description: string;
  /** Current workspace agent value. */
  currentValue: number | string | null;
  /** Candidate agent value. */
  candidateValue: number | string | null;
  /** Higher is better (for numbers). */
  higherIsBetter: boolean;
}

export interface EvaluationTask {
  taskId: string;
  name: string;
  description: string;
  /** The exact task to give both agents. */
  instruction: string;
  /** Required acceptance gates. */
  requiredGates: string[];
  /** Evidence bundle path. */
  evidencePath: string;
}

export interface EvaluationResult {
  task: EvaluationTask;
  currentAgent: AgentPerformance;
  candidateAgent: AgentPerformance;
  recommendation: 'adopt' | 'borrow-patterns' | 'reject';
  rationale: string;
}

export interface AgentPerformance {
  /** Whether the exact workflow was completed (verified, not claimed). */
  verifiedCompletion: boolean;
  /** Number of false completion claims. */
  falseCompletionClaims: number;
  /** Number of human corrections required. */
  humanCorrections: number;
  /** Browser regressions captured. */
  browserRegressionsCaptured: number;
  /** Dirty workspace incidents. */
  dirtyWorkspaceIncidents: number;
  /** Unpushed commit incidents. */
  unpushedCommitIncidents: number;
  /** Duplicate implementations introduced. */
  duplicateImplementations: number;
  /** Test gate reliability (0-1). */
  testGateReliability: number;
  /** Token usage. */
  tokenUsage: number;
  /** Cost in USD. */
  costUsd: number;
  /** Time to verified completion in seconds. */
  timeToCompletionSec: number;
  /** Context retained after interruption (0-1). */
  contextRetention: number;
}

export const EVALUATION_METRICS: readonly EvaluationMetric[] = [
  {
    metricId: 'verified-completion',
    name: 'Verified Completion Rate',
    description: 'Percentage of tasks where the exact workflow was verified complete (not just claimed)',
    currentValue: null,
    candidateValue: null,
    higherIsBetter: true,
  },
  {
    metricId: 'false-claims',
    name: 'False Completion Claims',
    description: 'Number of times the agent claimed "done" or "fixed" without verification',
    currentValue: null,
    candidateValue: null,
    higherIsBetter: false,
  },
  {
    metricId: 'recovery',
    name: 'Recovery After Interruption',
    description: 'Whether the agent retained context and recovered after a session interruption',
    currentValue: null,
    candidateValue: null,
    higherIsBetter: true,
  },
  {
    metricId: 'context-retention',
    name: 'Context Retention',
    description: 'How much working context was retained across turns (0-1)',
    currentValue: null,
    candidateValue: null,
    higherIsBetter: true,
  },
  {
    metricId: 'duplicates',
    name: 'Duplicate Implementations',
    description: 'Number of duplicate systems introduced (e.g., parallel operation graphs)',
    currentValue: null,
    candidateValue: null,
    higherIsBetter: false,
  },
  {
    metricId: 'merge-conflicts',
    name: 'Merge Conflicts',
    description: 'Number of merge conflicts caused by overlapping edits',
    currentValue: null,
    candidateValue: null,
    higherIsBetter: false,
  },
  {
    metricId: 'human-corrections',
    name: 'Human Corrections Required',
    description: 'Number of times a human had to correct the agent',
    currentValue: null,
    candidateValue: null,
    higherIsBetter: false,
  },
  {
    metricId: 'browser-failures-caught',
    name: 'Browser Failures Caught',
    description: 'Number of browser-only failures the agent caught (not just lint/type errors)',
    currentValue: null,
    candidateValue: null,
    higherIsBetter: true,
  },
  {
    metricId: 'cost',
    name: 'Cost (USD)',
    description: 'Total cost in USD for the task',
    currentValue: null,
    candidateValue: null,
    higherIsBetter: false,
  },
  {
    metricId: 'time',
    name: 'Time to Verified Completion',
    description: 'Elapsed time in seconds from task start to verified completion',
    currentValue: null,
    candidateValue: null,
    higherIsBetter: false,
  },
] as const;

export const CANONICAL_EVALUATION_TASK: EvaluationTask = {
  taskId: 'eval-transform-reliability',
  name: 'Transform Editing Reliability',
  description:
    'Prove reliable entity transform editing in Firefox and Chromium, including translate, rotate, scale, atomic commit, correct transform semantics, undo/redo, no store warnings, and exact build provenance.',
  instruction:
    'Fix and prove reliable entity transform editing in Firefox and Chromium, ' +
    'including atomic transactions, correct transform semantics, undo/redo, ' +
    'no Zustand getSnapshot warning, no error-boundary activation and exact ' +
    'build provenance.',
  requiredGates: [
    'lint',
    'typecheck',
    'build',
    'browser-chromium',
    'browser-firefox',
  ],
  evidencePath: 'evidence/eval-transform-reliability/',
};
