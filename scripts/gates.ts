#!/usr/bin/env bun
/**
 * scripts/gates.ts
 *
 * `bun run gates`
 *
 * Unified gate runner. Runs every gate in the canonical order, stops at the
 * first failure, prints a summary table, and exits nonzero if any gate failed.
 *
 * Gates (in order):
 *   lint, typecheck, check:frontier-maturity, game:conformance,
 *   game:village-conformance, game:villagers-conformance,
 *   game:time-conformance, game:sky-conformance, game:editor-conformance,
 *   game:validator-conformance, game:director-conformance,
 *   game:assets-conformance, ai:build, ai:check
 *
 * ai:build runs BEFORE ai:check (check verifies freshly built context).
 */

const GATES: Array<{ name: string; script: string }> = [
  { name: "lint", script: "lint" },
  { name: "typecheck", script: "typecheck" },
  { name: "check:frontier-maturity", script: "check:frontier-maturity" },
  { name: "game:conformance", script: "game:conformance" },
  { name: "game:village-conformance", script: "game:village-conformance" },
  { name: "game:villagers-conformance", script: "game:villagers-conformance" },
  { name: "game:time-conformance", script: "game:time-conformance" },
  { name: "game:sky-conformance", script: "game:sky-conformance" },
  { name: "game:editor-conformance", script: "game:editor-conformance" },
  { name: "game:validator-conformance", script: "game:validator-conformance" },
  { name: "game:director-conformance", script: "game:director-conformance" },
  { name: "game:assets-conformance", script: "game:assets-conformance" },
  { name: "ai:build", script: "ai:build" },
  { name: "ai:check", script: "ai:check" },
];

interface GateResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIPPED";
  durationMs: number;
  exitCode: number | null;
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function runGate(script: string): Promise<{ exitCode: number; durationMs: number }> {
  return new Promise((resolve) => {
    const start = performance.now();
    const proc = Bun.spawn([process.execPath, "run", script], {
      cwd: process.cwd(),
      stdio: ["inherit", "inherit", "inherit"],
      env: { ...process.env, CI: "1" },
    });

    const cleanup = () => {
      try {
        proc.kill();
      } catch {
        /* already dead */
      }
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    proc.exited
      .then((exitCode) => {
        process.off("SIGINT", cleanup);
        process.off("SIGTERM", cleanup);
        resolve({ exitCode, durationMs: performance.now() - start });
      })
      .catch(() => {
        process.off("SIGINT", cleanup);
        process.off("SIGTERM", cleanup);
        resolve({ exitCode: 1, durationMs: performance.now() - start });
      });
  });
}

const results: GateResult[] = [];
let stopped = false;

for (const gate of GATES) {
  if (stopped) {
    results.push({ name: gate.name, status: "SKIPPED", durationMs: 0, exitCode: null });
    continue;
  }
  console.log(`\n── gate ${GATES.indexOf(gate) + 1}/${GATES.length}: ${gate.name} ──`);
  const { exitCode, durationMs } = await runGate(gate.script);
  if (exitCode === 0) {
    results.push({ name: gate.name, status: "PASS", durationMs, exitCode });
  } else {
    results.push({ name: gate.name, status: "FAIL", durationMs, exitCode });
    stopped = true;
  }
}

console.log("\n================ GATE SUMMARY ================");
for (const r of results) {
  const dur = r.status === "SKIPPED" ? "-" : fmtDuration(r.durationMs);
  const code = r.exitCode === null ? "" : ` (exit ${r.exitCode})`;
  console.log(
    `${r.status.padEnd(8)} ${r.name.padEnd(30)} ${dur.padEnd(8)}${code}`,
  );
}

const passed = results.filter((r) => r.status === "PASS").length;
const failed = results.filter((r) => r.status === "FAIL").length;
console.log(`\nGATES: ${passed}/${results.length} passed`);
if (failed > 0) {
  const failedGate = results.find((r) => r.status === "FAIL");
  console.error(
    `GATE FAILED: ${failedGate?.name} (stopped; ${results.length - passed} not run)`,
  );
  process.exit(1);
}
process.exit(0);
