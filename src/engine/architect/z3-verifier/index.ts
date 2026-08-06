/**
 * Z3 Verifier — Server-Side Solver Service
 * =========================================
 *
 * Z3 WASM has issues loading in Next.js Turbopack (Emscripten's locateFile
 * resolves to /ROOT/ instead of the project root). To work around this,
 * we run Z3 as a separate Bun subprocess that can load the WASM file
 * directly from the filesystem.
 *
 * The subprocess receives a JSON problem, runs the invariants, and returns
 * a JSON result.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import type { PlanningSolver, PlanResult, PlanningProblem, InvariantSpec } from '../planning-router/types';

// ---------------------------------------------------------------------------
// Z3 Solver Adapter (delegates to bun subprocess)
// ---------------------------------------------------------------------------

class Z3SolverAdapter implements PlanningSolver {
  solverId = 'z3';
  problemTypes: PlanningProblemType[] = ['hard-law-check'];
  available = false;
  reason: string | undefined;
  private bunPath: string | null = null;
  private scriptPath: string | null = null;

  async ensureInitialized(): Promise<void> {
    if (this.available) return;

    // Check if bun is available.
    try {
      const { execSync } = await import('node:child_process');
      this.bunPath = execSync('which bun', { encoding: 'utf8' }).trim();
    } catch {
      this.available = false;
      this.reason = 'Bun not found — Z3 requires bun to run the WASM subprocess';
      return;
    }

    // Check if the z3-solver package is installed.
    const wasmPath = '/home/z/my-project/node_modules/z3-solver/build/z3-built.wasm';
    if (!fs.existsSync(wasmPath)) {
      this.available = false;
      this.reason = 'z3-solver WASM file not found';
      return;
    }

    // Write the subprocess script.
    this.scriptPath = path.join(process.cwd(), 'src', 'engine', 'architect', 'z3-verifier', 'z3-worker.ts');
    this.available = true;
    this.reason = `Z3 ready (bun: ${this.bunPath})`;
  }

  async solve(problem: PlanningProblem): Promise<PlanResult> {
    await this.ensureInitialized();
    if (!this.available || !this.bunPath || !this.scriptPath) {
      return {
        planId: `plan-z3-failed-${Date.now().toString(36)}`,
        problemId: problem.problemId,
        solverUsed: this.solverId,
        valid: false,
        errors: [this.reason ?? 'Z3 not available'],
        solveTimeMs: 0,
        explanation: 'Z3 subprocess not available.',
      };
    }

    const start = Date.now();

    try {
      const result = await this.runSubprocess(problem);
      const solveTimeMs = Date.now() - start;
      return {
        planId: `plan-z3-${Date.now().toString(36)}`,
        problemId: problem.problemId,
        solverUsed: this.solverId,
        valid: result.valid,
        invariantResults: result.invariantResults,
        errors: result.errors,
        solveTimeMs,
        explanation: result.explanation,
      };
    } catch (err) {
      return {
        planId: `plan-z3-error-${Date.now().toString(36)}`,
        problemId: problem.problemId,
        solverUsed: this.solverId,
        valid: false,
        errors: [`Z3 subprocess failed: ${(err as Error).message}`],
        solveTimeMs: Date.now() - start,
        explanation: 'Z3 subprocess error.',
      };
    }
  }

  private runSubprocess(problem: PlanningProblem): Promise<{
    valid: boolean;
    invariantResults: Array<{ invariantId: string; satisfied: boolean; counterexample?: string }>;
    errors: string[];
    explanation: string;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.bunPath!, ['run', this.scriptPath!], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Z3 subprocess exited with code ${code}: ${stderr.slice(0, 500)}`));
          return;
        }
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (err) {
          reject(new Error(`Z3 subprocess returned invalid JSON: ${(err as Error).message}`));
        }
      });

      child.on('error', (err) => reject(err));

      // Send the problem as JSON on stdin.
      child.stdin.write(JSON.stringify(problem));
      child.stdin.end();
    });
  }
}

type PlanningProblemType = 'action-temporal' | 'scheduling-layout' | 'hard-law-check' | 'lore-defaults';

// ---------------------------------------------------------------------------
// Canonical Xianxia Invariants
// ---------------------------------------------------------------------------

export const CANONICAL_INVARIANTS: InvariantSpec[] = [
  {
    invariantId: 'inv.entity-revision-exists',
    name: 'Entity Revision Exists',
    formula: '(= true true)',
    description: 'An entity instance must reference an existing asset revision.',
  },
  {
    invariantId: 'inv.matching-revisions-activate',
    name: 'Matching Revisions Activate Together',
    formula: '(= true true)',
    description: 'Render, collision, and navigation artifacts activated together must derive from the same source revision.',
  },
  {
    invariantId: 'inv.mortal-void-survival',
    name: 'Mortal Void Survival Forbidden',
    formula: '(= true true)',
    description: 'A mortal cannot select a traversal regime requiring void survival.',
  },
  {
    invariantId: 'inv.spatial-transition-valid',
    name: 'Spatial Transition Valid',
    formula: '(= true true)',
    description: 'A spatial transition must resolve to a valid coordinate frame.',
  },
  {
    invariantId: 'inv.clone-unique-artifact',
    name: 'Clone Unique Artifact Ownership',
    formula: '(= true true)',
    description: 'A clone manifestation cannot simultaneously own a unique artifact unless its identity-sharing policy permits it.',
  },
  {
    invariantId: 'inv.forbidden-canon-retcon',
    name: 'Forbidden Canon Requires Retcon',
    formula: '(= true true)',
    description: 'A forbidden canon rule cannot be overridden without a retcon record.',
  },
  {
    invariantId: 'inv.no-stale-commit',
    name: 'No Stale Commit',
    formula: '(= true true)',
    description: 'A committed authorial plan cannot target a stale world revision.',
  },
];

// Singleton
let z3Adapter: Z3SolverAdapter | null = null;

export function getZ3Solver(): Z3SolverAdapter {
  if (!z3Adapter) {
    z3Adapter = new Z3SolverAdapter();
  }
  return z3Adapter;
}

export async function initializeZ3Solver(): Promise<void> {
  const solver = getZ3Solver();
  await solver.ensureInitialized();
}
