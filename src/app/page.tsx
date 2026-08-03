'use client';

import { useEffect, useState } from 'react';
import {
  runHarness,
  sanityCheck,
  crossCheckVsMath,
  HARNESS_SEED_STRING,
  HARNESS_TICK_COUNT,
  type HarnessState,
} from '@/lib/determinism/harness';
import type { DeterminismFingerprint } from '@/lib/determinism/fingerprint';

interface HarnessResult {
  fingerprint: DeterminismFingerprint;
  finalState: HarnessState;
  finalHashSync: string;
  finalHashAsync: string;
  checkpointHashes: { tick: number; hash: string }[];
  tickCount: number;
  durationMs: number;
}

export default function DeterminismPage() {
  const [result, setResult] = useState<HarnessResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sanity, setSanity] = useState<ReturnType<typeof sanityCheck> | null>(null);
  const [crossCheck, setCrossCheck] = useState<ReturnType<typeof crossCheckVsMath> | null>(null);
  const [userAgent, setUserAgent] = useState<string>('');

  useEffect(() => {
    setUserAgent(navigator.userAgent);
    setSanity(sanityCheck());
    setCrossCheck(crossCheckVsMath());
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await runHarness();
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  // Auto-run on mount so the user sees the hash immediately
  // handleRun is stable enough for this one-shot mount effect
  useEffect(() => {
    handleRun();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-mono tracking-tight">
          Determinism Verification Harness
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          The smallest end-to-end proof that the xianxia RPG&apos;s
          century-spanning deterministic stack works.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
        {/* The hash — the thing to compare across browsers */}
        <section className="border border-zinc-800 rounded-lg p-6 bg-zinc-900">
          <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-3">
            Final Hash (compare across browsers)
          </h2>
          {running && (
            <p className="font-mono text-zinc-400 animate-pulse">Running {HARNESS_TICK_COUNT} ticks...</p>
          )}
          {error && (
            <p className="font-mono text-red-400">Error: {error}</p>
          )}
          {result && !running && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-mono">SHA-256 (sync, @noble/hashes):</p>
              <p className="font-mono text-lg text-emerald-400 break-all select-all">
                {result.finalHashSync}
              </p>
              <p className="text-xs text-zinc-500 font-mono mt-3">SHA-256 (async, crypto.subtle):</p>
              <p className="font-mono text-sm text-emerald-400 break-all select-all">
                {result.finalHashAsync}
              </p>
              <p className="text-xs text-zinc-600 mt-3">
                If sync and async match, the two hash paths agree.
                Open this page in Chrome, Firefox, and Safari — the sync hash
                must be identical in all three for the stack to be
                cross-engine deterministic.
              </p>
            </div>
          )}
        </section>

        {/* Browser identification */}
        <section className="border border-zinc-800 rounded-lg p-6 bg-zinc-900">
          <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-3">
            Browser / Engine
          </h2>
          <p className="font-mono text-xs text-zinc-300 break-all">{userAgent}</p>
          <p className="text-xs text-zinc-600 mt-2">
            Identify which engine you&apos;re testing. The hash above must be
            identical in Chrome (V8), Firefox (SpiderMonkey), and Safari
            (JavaScriptCore).
          </p>
        </section>

        {/* Run controls */}
        <section className="border border-zinc-800 rounded-lg p-6 bg-zinc-900">
          <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-3">
            Run
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRun}
              disabled={running}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded font-mono text-sm border border-zinc-700 transition-colors"
            >
              {running ? 'Running...' : 'Re-run harness'}
            </button>
            {result && (
              <span className="font-mono text-xs text-zinc-500">
                {result.tickCount} ticks in {result.durationMs.toFixed(2)} ms
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Seed string: <code className="text-zinc-400">{HARNESS_SEED_STRING}</code>
          </p>
        </section>

        {/* Sanity check — the transcendentals return expected values */}
        {sanity && (
          <section className="border border-zinc-800 rounded-lg p-6 bg-zinc-900">
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-3">
              Sanity Check (expected values)
            </h2>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="text-zinc-500">sin(0) =</div><div className="text-zinc-300">{sanity.sin0}</div>
              <div className="text-zinc-500">sin(π/2) =</div><div className="text-zinc-300">{sanity.sinPiOver2}</div>
              <div className="text-zinc-500">cos(0) =</div><div className="text-zinc-300">{sanity.cos0}</div>
              <div className="text-zinc-500">cos(π/2) =</div><div className="text-zinc-300">{sanity.cosPiOver2}</div>
              <div className="text-zinc-500">exp(0) =</div><div className="text-zinc-300">{sanity.exp0}</div>
              <div className="text-zinc-500">log(1) =</div><div className="text-zinc-300">{sanity.log1}</div>
              <div className="text-zinc-500">atan2(1,1) =</div><div className="text-zinc-300">{sanity.atan2_1_1}</div>
              <div className="text-zinc-500">sqrt(4) =</div><div className="text-zinc-300">{sanity.sqrt4}</div>
              <div className="text-zinc-500">pow(2,10) =</div><div className="text-zinc-300">{sanity.pow2_10}</div>
            </div>
            <p className="text-xs text-zinc-600 mt-3">
              Expected: sin(0)=0, sin(π/2)=1, cos(0)=1, cos(π/2)≈0,
              exp(0)=1, log(1)=0, atan2(1,1)=π/4≈0.7854, sqrt(4)=2, pow(2,10)=1024.
            </p>
          </section>
        )}

        {/* Cross-check vs Math.* — det_ should be within a few ULP of Math.* */}
        {crossCheck && (
          <section className="border border-zinc-800 rounded-lg p-6 bg-zinc-900">
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-3">
              Cross-check: det_sin vs Math.sin (ULP diff)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-2 pr-4">input</th>
                    <th className="text-right py-2 pr-4">det_sin</th>
                    <th className="text-right py-2 pr-4">Math.sin</th>
                    <th className="text-right py-2">ULP diff</th>
                  </tr>
                </thead>
                <tbody>
                  {crossCheck.map((row) => (
                    <tr key={row.input} className="border-b border-zinc-800/50">
                      <td className="py-2 pr-4 text-zinc-400">{row.input}</td>
                      <td className="py-2 pr-4 text-right text-zinc-300">{row.det_sin}</td>
                      <td className="py-2 pr-4 text-right text-zinc-300">{row.math_sin}</td>
                      <td className={`py-2 text-right ${row.ulp_diff < 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {row.ulp_diff.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-600 mt-3">
              ULP diff &lt; 2 means our det_sin is within 2 units of the last
              place of Math.sin. Higher diffs indicate a polynomial
              coefficient error. The ULP diff itself must be identical across
              browsers for the stack to be deterministic.
            </p>
          </section>
        )}

        {/* Checkpoint hashes — intermediate reproducibility */}
        {result && result.checkpointHashes.length > 0 && (
          <section className="border border-zinc-800 rounded-lg p-6 bg-zinc-900">
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-3">
              Checkpoint Hashes (every {HARNESS_TICK_COUNT / result.checkpointHashes.length | 0 || 100} ticks)
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.checkpointHashes.map((cp) => (
                <div key={cp.tick} className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-zinc-500 w-16">tick {cp.tick}:</span>
                  <span className="text-zinc-300 break-all select-all">{cp.hash}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-3">
              These intermediate hashes must also match across browsers.
              If the final hash differs but an early checkpoint matches,
              the divergence is in the later ticks — narrow your debugging.
            </p>
          </section>
        )}

        {/* Fingerprint — the engine version stamp */}
        {result && (
          <section className="border border-zinc-800 rounded-lg p-6 bg-zinc-900">
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-3">
              Determinism Fingerprint
            </h2>
            <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap break-all">
{JSON.stringify(result.fingerprint, null, 2)}
            </pre>
            <p className="text-xs text-zinc-600 mt-3">
              A save from this fingerprint loads only in an engine with the
              same fingerprint. When a component version changes, the
              fingerprint changes, and old saves are flagged for migration.
            </p>
          </section>
        )}

        {/* Final state detail */}
        {result && (
          <section className="border border-zinc-800 rounded-lg p-6 bg-zinc-900">
            <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-3">
              Final State (for debugging)
            </h2>
            <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
{JSON.stringify(result.finalState, null, 2)}
            </pre>
          </section>
        )}

        {/* What this proves */}
        <section className="border border-zinc-800 rounded-lg p-6 bg-zinc-900">
          <h2 className="text-sm font-mono uppercase tracking-wider text-zinc-400 mb-3">
            What This Proves
          </h2>
          <div className="space-y-3 text-sm text-zinc-300">
            <p>
              If the <span className="text-emerald-400 font-mono">Final Hash (sync)</span> above
              is identical when this page is opened in Chrome, Firefox, and
              Safari, then the following stack is proven cross-engine
              deterministic:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 ml-2">
              <li><span className="text-zinc-300">xoshiro256** + splitmix64</span> RNG (BigInt-backed)</li>
              <li><span className="text-zinc-300">Cody-Waite + minimax</span> transcendentals (det_sin, det_cos, det_tan, det_atan2, det_exp, det_log, det_pow, det_sqrt)</li>
              <li><span className="text-zinc-300">Q32.32 fixed-point</span> accumulation (BigInt-backed)</li>
              <li><span className="text-zinc-300">CBOR RFC 8949 deterministic</span> serialization</li>
              <li><span className="text-zinc-300">SHA-256</span> hashing (both sync and async paths)</li>
            </ul>
            <p>
              This is the single highest-risk piece of the xianxia RPG&apos;s
              technical thesis. If it passes, the century-spanning
              deterministic vision is feasible. If it fails, no amount of
              additional lore or governance will save it — the project must
              descope to a non-deterministic single-realm game.
            </p>
            <p className="text-zinc-500 text-xs">
              See <code className="text-zinc-400">/home/z/my-project/corpus-extension/09_SYNTHESIS.md</code> for
              the full prototype specification and <code className="text-zinc-400">08_THREEJS_REPOSITORY_RESEARCH.md</code> for
              the ecosystem research that identified this as Gap 1.
            </p>
          </div>
        </section>

        <footer className="text-center text-xs text-zinc-600 py-4">
          xianxia determinism verification harness v0.1.0 · run in 3 browsers · compare hashes
        </footer>
      </div>
    </main>
  );
}
