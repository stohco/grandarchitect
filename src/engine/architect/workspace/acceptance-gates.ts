/**
 * Acceptance Gates — Exact Quality Gate Sequence
 * ==============================================
 *
 * A capability is NOT complete until ALL of these gates pass. A passing
 * gate proves ONLY what that gate tests — not that the whole task succeeded.
 *
 * The browser verifier must reproduce the original user interaction through
 * REAL pointer events against the PRODUCTION build.
 */

export interface AcceptanceGate {
  gateId: string;
  name: string;
  command: string;
  /** What this gate verifies. */
  verifies: string;
  /** Whether the gate is required (vs optional). */
  required: boolean;
}

export const ACCEPTANCE_GATES: readonly AcceptanceGate[] = [
  {
    gateId: 'format-check',
    name: 'Format Check',
    command: 'npm run format:check',
    verifies: 'Code is formatted consistently (no style drift)',
    required: true,
  },
  {
    gateId: 'lint',
    name: 'ESLint',
    command: 'npm run lint',
    verifies: 'No ESLint errors or warnings (catches hooks violations, unused vars, etc.)',
    required: true,
  },
  {
    gateId: 'typecheck',
    name: 'TypeScript Type Check',
    command: 'npm run typecheck',
    verifies: 'No TypeScript errors (tsc --noEmit — catches type mismatches, missing props)',
    required: true,
  },
  {
    gateId: 'test-unit',
    name: 'Unit Tests',
    command: 'npm run test:unit',
    verifies: 'All unit tests pass (deterministic simulation, pure functions, stores)',
    required: true,
  },
  {
    gateId: 'build',
    name: 'Production Build',
    command: 'npm run build',
    verifies: 'Production build succeeds (catches SSR issues, import errors, bundling problems)',
    required: true,
  },
  {
    gateId: 'browser-chromium',
    name: 'Browser Test — Chromium',
    command: 'npm run test:browser:chromium',
    verifies: 'Real user workflow passes in Chromium production build (pointer events, not synthetic)',
    required: true,
  },
  {
    gateId: 'browser-firefox',
    name: 'Browser Test — Firefox',
    command: 'npm run test:browser:firefox',
    verifies: 'Real user workflow passes in Firefox production build (the user\'s actual browser)',
    required: true,
  },
] as const;

/**
 * The canonical editor reliability workflow that must be verified:
 *
 * 1. Generate Wang Family Bend
 * 2. Select an entity
 * 3. Translate on X axis (drag gizmo)
 * 4. Release
 * 5. Rotate
 * 6. Release
 * 7. Scale
 * 8. Release
 * 9. Undo three times
 * 10. Redo three times
 * 11. Switch selection
 * 12. Return to first entity
 * 13. Regenerate world
 * 14. Repeat
 *
 * Assertions:
 * - No getSnapshot warning
 * - No error boundary activation
 * - No unhandled rejection
 * - Exactly one store update per commit
 * - Exactly one transaction per drag
 * - Stable Inspector mount
 * - Correct transform values
 * - No unintended scale change on translation
 * - Undo and redo restore exact values
 * - Build SHA matches the committed source under test
 */
export const EDITOR_RELIABILITY_WORKFLOW = {
  name: 'Editor Reliability — Transform Editing',
  steps: [
    'Generate Wang Family Bend (seed: wang-family-bend-1108)',
    'Select an entity (Chen Household #1)',
    'Translate on X axis — drag gizmo 5 meters right',
    'Release — verify exactly one transaction committed',
    'Rotate — drag gizmo 30 degrees',
    'Release — verify exactly one transaction',
    'Scale — drag gizmo to 1.5x',
    'Release — verify exactly one transaction',
    'Undo (Ctrl+Z) — verify original transform restored',
    'Undo — verify second edit reverted',
    'Undo — verify third edit reverted',
    'Redo (Ctrl+Shift+Z) — verify third edit re-applied',
    'Redo — verify second edit re-applied',
    'Redo — verify first edit re-applied',
    'Switch selection to Wang Household #2',
    'Return to first entity — verify transform persisted',
    'Regenerate world — verify no crash',
    'Repeat all steps',
  ],
  assertions: [
    'No "getSnapshot should be cached" warning in console',
    'No React error boundary activation',
    'No unhandled promise rejection',
    'Exactly one store update per gizmo commit (not per-field)',
    'Exactly one transaction per drag (not multiple)',
    'Inspector panel remains mounted (no unmount/remount churn)',
    'Transform values match expected (position, rotation, scale)',
    'Translation does not change scale (no [1,1,1] → [7.7,1,7.6] bug)',
    'Undo restores exact previous values (inverse patches work)',
    'Redo restores exact edited values (forward patches work)',
    'Build SHA displayed in status bar matches committed source',
    'No memory leaks (heap stable after 100 interactions)',
  ],
} as const;

/**
 * Required evidence for every completion report.
 */
export interface CompletionReport {
  /** Local commit SHA after work. */
  localCommitSha: string;
  /** Remote commit SHA (if pushed). */
  remoteCommitSha: string | null;
  /** Whether the worktree was clean before commit. */
  cleanWorktree: boolean;
  /** Build artifact provenance. */
  buildProvenance: {
    commitSha: string;
    buildTimestamp: string;
    buildId: string;
    dirty: boolean;
  };
  /** Commands executed with exit codes. */
  commands: Array<{ command: string; exitCode: number }>;
  /** Raw test report paths. */
  testReportPaths: string[];
  /** Browser and OS used for verification. */
  verificationEnvironment: { browser: string; os: string };
  /** Screenshots or videos of the workflow. */
  evidencePaths: string[];
  /** Console errors and warnings captured. */
  consoleErrors: string[];
  /** Known unresolved limitations (honest). */
  knownLimitations: string[];
  /** Independent reviewer verdicts. */
  reviewerVerdicts: Array<{
    reviewer: string;
    verdict: 'pass' | 'fail' | 'needs-review';
    notes: string;
  }>;
}
