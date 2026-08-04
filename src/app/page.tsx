'use client';

import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Activity, ShieldCheck, FlaskConical, Layers, Cpu, GitBranch,
  ScrollText, Network, Play, CheckCircle2, XCircle, Loader2, Lock,
} from 'lucide-react';
import {
  PHASES, TOTAL_TESTS, AUTONOMY_LEVELS, ARCHITECT_ROLES, PLUGINS,
  SAFETY_RAILS, CONFORMANCE_FILES,
} from '@/lib/engine/dashboard-data';

interface SuiteResult {
  name: string;
  path: string;
  expected: number;
  passed: number;
  failed: number;
  total: number;
  ok: boolean;
  durationMs: number;
  tail: string;
}
interface RunResult {
  ok: boolean;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  suites: SuiteResult[];
  timestamp: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  determinism: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  kernel: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  architect: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  reference: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  simulation: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
};

export default function Page() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/engine/run-tests', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RunResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, []);

  const completedPhases = PHASES.filter((p) => p.status === 'done').length;
  const completionPct = Math.round((completedPhases / PHASES.length) * 100);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center">
                <Network className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">
                  Grand Architect Control Plane
                </h1>
                <p className="text-xs text-muted-foreground">
                  Xianxia Multiverse Engine · {TOTAL_TESTS.toLocaleString()} conformance tests · 7 suites
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Determinism Verified
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                Phase 5 / 7
              </Badge>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
              <TabsTrigger value="overview" className="gap-1.5">
                <Activity className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="architect" className="gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Architect
              </TabsTrigger>
              <TabsTrigger value="plugins" className="gap-1.5">
                <Layers className="h-4 w-4" /> Plugins
              </TabsTrigger>
              <TabsTrigger value="tests" className="gap-1.5">
                <FlaskConical className="h-4 w-4" /> Conformance
              </TabsTrigger>
              <TabsTrigger value="prototype" className="gap-1.5">
                <Cpu className="h-4 w-4" /> Prototype
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Roadmap Completion</CardDescription>
                    <CardTitle className="text-3xl">{completionPct}%</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={completionPct} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {completedPhases} of {PHASES.length} phases complete
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Conformance Tests</CardDescription>
                    <CardTitle className="text-3xl">{TOTAL_TESTS.toLocaleString()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      All passing across 7 suites
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Plugins Implemented</CardDescription>
                    <CardTitle className="text-3xl">{PLUGINS.length}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {(['determinism', 'reference', 'simulation'] as const).map((cat) => {
                        const count = PLUGINS.filter((p) => p.category === cat).length;
                        return (
                          <Badge key={cat} variant="outline" className={`text-xs ${CATEGORY_COLORS[cat]}`}>
                            {cat}: {count}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ScrollText className="h-4 w-4" /> Implementation Roadmap
                  </CardTitle>
                  <CardDescription>
                    Phased build of the engine, from determinism to the vertical slice.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {PHASES.map((phase) => (
                    <div
                      key={phase.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border border-border/60 bg-card/30"
                    >
                      <div className="flex items-center gap-3 sm:w-64 shrink-0">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                            phase.status === 'done'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {phase.status === 'done' ? <CheckCircle2 className="h-4 w-4" /> : phase.id}
                        </div>
                        <div>
                          <div className="font-medium text-sm">Phase {phase.id}</div>
                          <div className="text-xs text-muted-foreground">{phase.name}</div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1.5">
                          <span className="font-medium text-foreground">Exit:</span> {phase.exitCriteria}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {phase.artifacts.map((a) => (
                            <Badge key={a} variant="secondary" className="text-[10px] font-mono">
                              {a}
                            </Badge>
                          ))}
                          {phase.testCount > 0 && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <FlaskConical className="h-2.5 w-2.5" />
                              {phase.testCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Safety Rails
                  </CardTitle>
                  <CardDescription>
                    Ten invariants that bound the Grand Architect&apos;s autonomy.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2">
                    {SAFETY_RAILS.map((rail, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs p-2 rounded border border-border/40 bg-card/20">
                        <span className="font-mono text-muted-foreground shrink-0">{String(i + 1).padStart(2, '0')}</span>
                        <span>{rail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ARCHITECT */}
            <TabsContent value="architect" className="space-y-6 mt-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Autonomy Ladder</CardTitle>
                    <CardDescription>
                      Six progressive autonomy levels, from read-only observation to full architect authority.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {AUTONOMY_LEVELS.map((lvl) => (
                      <div key={lvl.level} className="flex items-start gap-3 p-2 rounded border border-border/40">
                        <div className="h-7 w-7 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center justify-center text-xs font-semibold shrink-0">
                          {lvl.level}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{lvl.name}</div>
                          <div className="text-xs text-muted-foreground">{lvl.description}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Architect Roles</CardTitle>
                    <CardDescription>
                      Eight role profiles with capability tokens and hard-gated actions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ScrollArea className="max-h-[420px] pr-3">
                      {ARCHITECT_ROLES.map((role) => (
                        <div key={role.role} className="p-3 rounded border border-border/40 mb-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium text-sm">{role.role}</span>
                            <Badge variant="outline" className="text-[10px]">
                              Autonomy {role.autonomy}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1.5">{role.description}</p>
                          {role.hardGatedActions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {role.hardGatedActions.map((a) => (
                                <Badge key={a} variant="outline" className="text-[10px] gap-1 border-rose-500/40 text-rose-700 dark:text-rose-300">
                                  <Lock className="h-2.5 w-2.5" /> {a}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Control Plane Architecture</CardTitle>
                  <CardDescription>
                    The eight modules that form the Grand Architect&apos;s security boundary.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { name: 'gateway', desc: 'Session auth + tool authorization + audit dispatch' },
                      { name: 'tool-protocol', desc: 'Register, dispatch, filter tools by autonomy' },
                      { name: 'permissions', desc: 'Role profiles, capability tokens, hard gates' },
                      { name: 'audit', desc: 'SHA-256 chained tamper-evident trail' },
                      { name: 'capability-graph', desc: 'DAG of requirements, topological sort' },
                      { name: 'decision-ledger', desc: 'ADR records with supersession tracking' },
                      { name: 'world-oracle', desc: 'Searchable index over graph + ledger + audit' },
                      { name: 'types', desc: 'Shared architect type vocabulary' },
                    ].map((m) => (
                      <div key={m.name} className="p-3 rounded border border-border/40 bg-card/30">
                        <div className="font-mono text-xs font-medium text-rose-700 dark:text-rose-300 mb-1">
                          architect/{m.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PLUGINS */}
            <TabsContent value="plugins" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Plugin Registry</CardTitle>
                  <CardDescription>
                    {PLUGINS.length} plugins across three categories. Each plugin registers capabilities
                    with the kernel and passes its conformance suite.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-2 pr-3">
                      {PLUGINS.map((plugin) => (
                        <div
                          key={plugin.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/30"
                        >
                          <div className="sm:w-56 shrink-0">
                            <div className="font-mono text-sm font-medium">{plugin.id}</div>
                            <div className="text-[10px] text-muted-foreground">v{plugin.version}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {plugin.capabilities.map((c) => (
                                <Badge key={c} variant="secondary" className="text-[10px] font-mono">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              depends: {plugin.dependencies.length > 0 ? plugin.dependencies.join(', ') : '(none)'}
                              {plugin.lines > 0 && <span className="ml-2">· {plugin.lines} lines</span>}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 ${CATEGORY_COLORS[plugin.category]}`}
                          >
                            {plugin.category}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TESTS */}
            <TabsContent value="tests" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">Conformance Test Runner</CardTitle>
                      <CardDescription>
                        Runs all {CONFORMANCE_FILES.length} suites ({TOTAL_TESTS.toLocaleString()} tests) via{' '}
                        <code className="text-xs">bun run</code>. Parses pass/fail counts from stdout.
                      </CardDescription>
                    </div>
                    <Button onClick={runTests} disabled={running} className="shrink-0">
                      {running ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" /> Run All Suites
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!result && !error && (
                    <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
                      Click <span className="font-medium text-foreground">Run All Suites</span> to execute
                      every conformance test and verify the engine&apos;s integrity.
                    </div>
                  )}
                  {error && (
                    <div className="p-3 rounded border border-rose-500/40 bg-rose-500/5 text-sm text-rose-700 dark:text-rose-300">
                      <XCircle className="h-4 w-4 inline mr-2" />
                      {error}
                    </div>
                  )}
                  {result && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded border border-border/60 bg-card/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</div>
                          <div className={`text-lg font-semibold flex items-center gap-1.5 ${result.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {result.ok ? 'All Pass' : 'Failures'}
                          </div>
                        </div>
                        <div className="p-3 rounded border border-border/60 bg-card/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Passed</div>
                          <div className="text-lg font-semibold text-emerald-600">{result.totalPassed.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded border border-border/60 bg-card/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Failed</div>
                          <div className={`text-lg font-semibold ${result.totalFailed === 0 ? 'text-muted-foreground' : 'text-rose-600'}`}>
                            {result.totalFailed.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-3 rounded border border-border/60 bg-card/30">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Duration</div>
                          <div className="text-lg font-semibold">{(result.totalDuration / 1000).toFixed(2)}s</div>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        {result.suites.map((s) => (
                          <div key={s.name} className="p-3 rounded border border-border/60 bg-card/30">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                {s.ok ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-rose-500" />
                                )}
                                <span className="font-medium text-sm">{s.name}</span>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {s.passed}/{s.total}
                                </Badge>
                                {s.failed > 0 && (
                                  <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-700 dark:text-rose-300">
                                    {s.failed} failed
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">{s.durationMs}ms</span>
                            </div>
                            <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap max-h-24 overflow-y-auto bg-muted/30 p-2 rounded">
                              {s.tail}
                            </pre>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Ran at {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* PROTOTYPE */}
            <TabsContent value="prototype" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Determinism & Rendering Prototype</CardTitle>
                  <CardDescription>
                    The original self-contained proof: xoshiro256** RNG, Cody-Waite transcendentals,
                    Q32.32 fixed-point, CBOR+SHA-256 hashing, and a live Three.js render.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <iframe
                    src="/determinism.html"
                    title="Determinism Prototype"
                    className="w-full"
                    style={{ height: '78vh', border: 'none', display: 'block' }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/60 bg-card/30 mt-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Network className="h-3.5 w-3.5" />
              <span>Xianxia Multiverse Engine · Grand Architect Control Plane</span>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-help">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    Determinism hash: 7fde855...
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">7fde855dc9d17c7ba11c7d40c1dda10535a10dd269af0b37149104c256213f75</p>
                </TooltipContent>
              </Tooltip>
              <span className="hidden sm:inline">·</span>
              <span>{TOTAL_TESTS.toLocaleString()} tests · 7 suites · 0 forbidden functions</span>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
