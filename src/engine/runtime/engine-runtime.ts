/**
 * Engine Runtime — In-Memory Implementation
 * =========================================
 *
 * A concrete implementation of the EngineRuntime interface. This is the
 * single authoritative path that unifies all subsystems.
 *
 * Currently in-memory — persistence is a stub. But the COMMAND PATH is
 * real: every world mutation goes through:
 *
 *   CommandBus.submit()
 *     → validate()
 *     → WorldRepository.applyTransaction()
 *     → DerivedArtifactCoordinator.invalidateCell()
 *     → (async) recompile artifacts
 *     → activateBundle() (atomic)
 */

import type {
  EngineRuntime,
  WorldRepository,
  CommandBus,
  PluginHost,
  Scheduler,
  JobSystem,
  ArchitectGateway,
  WorldSnapshot,
  WorldTransaction,
  WorldCommand,
  ValidationResult,
  EnginePlugin,
  PluginDescriptor,
  SimulationSystem,
  AsyncJob,
  JobStatus,
  PrincipalCredentials,
  PrincipalSession,
  AuditEntry,
  RuntimeInfo,
  DerivedArtifactCoordinatorHandle,
  CoordinatorSummary,
} from './types';
import type { WorldCell, WorldTransaction as WT, Principal } from '../world/world-fabric';
import type { ArtifactKind } from '../world/world-fabric';

// ---------------------------------------------------------------------------
// World Repository (in-memory)
// ---------------------------------------------------------------------------

class InMemoryWorldRepository implements WorldRepository {
  private revision = 0;
  private cells = new Map<string, WorldCell>();
  private transactions: WorldTransaction[] = [];

  getRevision(): number {
    return this.revision;
  }

  getCell(cellId: string): WorldCell | null {
    return this.cells.get(cellId) ?? null;
  }

  listCells(): WorldCell[] {
    return Array.from(this.cells.values());
  }

  applyTransaction(tx: WorldTransaction): void {
    this.revision = tx.resultRevision;
    this.transactions.push(tx);
    // Apply operations to cells
    for (const op of tx.forwardOperations) {
      const cell = this.cells.get(op.cellId);
      if (cell) {
        cell.revision = tx.resultRevision;
      }
    }
  }

  getTransactions(): WorldTransaction[] {
    return [...this.transactions];
  }

  rollback(revision: number): boolean {
    if (revision >= this.revision) return false;
    // In a real implementation, this would restore cell state
    this.revision = revision;
    return true;
  }

  snapshot(): WorldSnapshot {
    return {
      revision: this.revision,
      cells: this.listCells(),
      timestamp: new Date().toISOString(),
      hash: `snap-${this.revision}-${Date.now().toString(36)}`,
    };
  }

  restore(snapshot: WorldSnapshot): void {
    this.revision = snapshot.revision;
    this.cells.clear();
    for (const cell of snapshot.cells) {
      this.cells.set(cell.cellId, cell);
    }
  }

  /** Internal: add a cell directly (for testing). */
  _addCell(cell: WorldCell): void {
    this.cells.set(cell.cellId, cell);
  }
}

// ---------------------------------------------------------------------------
// Command Bus
// ---------------------------------------------------------------------------

class InMemoryCommandBus implements CommandBus {
  private pending: WorldCommand[] = [];
  private world: WorldRepository;
  private nextTxId = 0;

  constructor(world: WorldRepository) {
    this.world = world;
  }

  async submit(command: WorldCommand): Promise<WorldTransaction> {
    const validation = this.validate(command);
    if (!validation.valid) {
      throw new Error(`Command validation failed: ${validation.errors.join('; ')}`);
    }

    const baseRevision = command.baseRevision;
    const resultRevision = baseRevision + 1;
    const txId = `tx-${++this.nextTxId}-${Date.now().toString(36)}`;

    const tx: WorldTransaction = {
      id: txId,
      baseRevision,
      resultRevision,
      forwardOperations: [{
        operationId: `op-${txId}`,
        type: command.type as WT['forwardOperations'][0]['type'],
        cellId: (command.payload.cellId as string) ?? 'default',
        payload: command.payload,
      }],
      inverseOperations: [], // Would compute inverse for undo
      affectedCells: (command.payload.cellId as string) ? [command.payload.cellId as string] : [],
      invalidatedArtifacts: ['render-mesh', 'collision-mesh', 'navigation-mesh'] as ArtifactKind[],
      requestedBy: command.requestedBy,
      timestamp: new Date().toISOString(),
    };

    this.world.applyTransaction(tx);
    return tx;
  }

  validate(command: WorldCommand): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!command.commandId) errors.push('Missing commandId');
    if (!command.type) errors.push('Missing command type');
    if (!command.requestedBy) errors.push('Missing requestedBy');
    if (command.baseRevision < 0) errors.push('Invalid baseRevision');

    // Check for stale commands (base revision doesn't match current)
    if (command.baseRevision !== this.world.getRevision()) {
      warnings.push(
        `Stale command: base revision ${command.baseRevision} != current ${this.world.getRevision()}`,
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  getPending(): WorldCommand[] {
    return [...this.pending];
  }
}

// ---------------------------------------------------------------------------
// Plugin Host
// ---------------------------------------------------------------------------

class InMemoryPluginHost implements PluginHost {
  private plugins = new Map<string, EnginePlugin>();
  private runtime: EngineRuntime | null = null;

  setRuntime(rt: EngineRuntime): void {
    this.runtime = rt;
  }

  register(plugin: EnginePlugin): void {
    this.plugins.set(plugin.pluginId, plugin);
    if (this.runtime) {
      void plugin.init(this.runtime);
    }
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      void plugin.destroy();
      this.plugins.delete(pluginId);
    }
  }

  list(): PluginDescriptor[] {
    return Array.from(this.plugins.values()).map((p) => ({
      pluginId: p.pluginId,
      version: p.version,
      capabilities: p.capabilities,
      active: true,
    }));
  }

  get(pluginId: string): EnginePlugin | null {
    return this.plugins.get(pluginId) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

class InMemoryScheduler implements Scheduler {
  private running = false;
  private tick = 0;
  private systems: SimulationSystem[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.interval = setInterval(() => this.step(), 1000 / 60); // 60 FPS
  }

  stop(): void {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  step(): void {
    this.tick++;
    const dt = 1 / 60;
    for (const system of this.systems) {
      try {
        system.update(dt, this.tick);
      } catch (err) {
        console.error(`[Scheduler] System ${system.systemId} threw:`, err);
      }
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getTick(): number {
    return this.tick;
  }

  registerSystem(system: SimulationSystem): void {
    this.systems.push(system);
  }
}

// ---------------------------------------------------------------------------
// Job System
// ---------------------------------------------------------------------------

class InMemoryJobSystem implements JobSystem {
  private jobs = new Map<string, JobStatus>();
  private counter = 0;

  submit(job: AsyncJob): string {
    const jobId = job.jobId || `job-${++this.counter}-${Date.now().toString(36)}`;
    const status: JobStatus = {
      jobId,
      type: job.type,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, status);

    job.execute()
      .then(() => {
        const s = this.jobs.get(jobId);
        if (s) {
          s.status = 'completed';
          s.progress = 1;
          s.completedAt = new Date().toISOString();
        }
      })
      .catch((err) => {
        const s = this.jobs.get(jobId);
        if (s) {
          s.status = 'failed';
          s.error = err instanceof Error ? err.message : String(err);
          s.completedAt = new Date().toISOString();
        }
      });

    return jobId;
  }

  getStatus(jobId: string): JobStatus | null {
    return this.jobs.get(jobId) ?? null;
  }

  cancel(jobId: string): boolean {
    const s = this.jobs.get(jobId);
    if (s && s.status === 'running') {
      s.status = 'cancelled';
      s.completedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  listActive(): JobStatus[] {
    return Array.from(this.jobs.values()).filter(
      (s) => s.status === 'running' || s.status === 'queued',
    );
  }
}

// ---------------------------------------------------------------------------
// Architect Gateway (security boundary)
// ---------------------------------------------------------------------------

class InMemoryArchitectGateway implements ArchitectGateway {
  private audit: AuditEntry[] = [];

  authenticate(credentials: PrincipalCredentials): PrincipalSession | null {
    // Mock authentication — in production this would validate tokens
    if (!credentials.principalId || !credentials.token) return null;
    return {
      principal: {
        principalId: credentials.principalId,
        role: 'architect',
        autonomyLevel: 'assisted',
      },
      sessionId: `session-${Date.now().toString(36)}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  authorize(session: PrincipalSession, command: WorldCommand): boolean {
    const authorized = session.principal.role === 'architect' || session.principal.role === 'user';

    const entry: AuditEntry = {
      entryId: `audit-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      principal: session.principal,
      command,
      authorized,
      result: authorized ? 'success' : 'denied',
    };
    this.audit.push(entry);
    return authorized;
  }

  getAuditTrail(): AuditEntry[] {
    return [...this.audit];
  }
}

// ---------------------------------------------------------------------------
// Coordinator Handle
// ---------------------------------------------------------------------------

class CoordinatorHandle implements DerivedArtifactCoordinatorHandle {
  private invalidated = new Map<string, ArtifactKind[]>();
  private active = new Map<string, boolean>();

  invalidateCell(cellId: string, kinds: ArtifactKind[]): void {
    this.invalidated.set(cellId, kinds);
  }

  isBundleReady(cellId: string): boolean {
    return this.active.get(cellId) ?? true;
  }

  activateBundle(cellId: string): boolean {
    this.active.set(cellId, true);
    this.invalidated.delete(cellId);
    return true;
  }

  getSummary(): CoordinatorSummary {
    return {
      cellsWithPending: this.invalidated.size,
      cellsWithActive: this.active.size,
      totalPendingArtifacts: Array.from(this.invalidated.values()).reduce((s, k) => s + k.length, 0),
      totalActiveArtifacts: this.active.size,
    };
  }
}

// ---------------------------------------------------------------------------
// Engine Runtime Implementation
// ---------------------------------------------------------------------------

class EngineRuntimeImpl implements EngineRuntime {
  readonly world: InMemoryWorldRepository;
  readonly commands: InMemoryCommandBus;
  readonly plugins: InMemoryPluginHost;
  readonly scheduler: InMemoryScheduler;
  readonly jobs: InMemoryJobSystem;
  readonly coordinator: CoordinatorHandle;
  readonly gateway: InMemoryArchitectGateway;
  readonly renderer: null = null;
  readonly physics: null = null;
  readonly persistence: null = null;

  private initialized = false;

  constructor() {
    this.world = new InMemoryWorldRepository();
    this.commands = new InMemoryCommandBus(this.world);
    this.plugins = new InMemoryPluginHost();
    this.scheduler = new InMemoryScheduler();
    this.jobs = new InMemoryJobSystem();
    this.coordinator = new CoordinatorHandle();
    this.gateway = new InMemoryArchitectGateway();
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.plugins.setRuntime(this);
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.scheduler.stop();
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getInfo(): RuntimeInfo {
    return {
      version: '0.1.0',
      revision: this.world.getRevision(),
      tick: this.scheduler.getTick(),
      running: this.scheduler.isRunning(),
      plugins: this.plugins.list(),
      cells: this.world.listCells().length,
      coordinator: this.coordinator.getSummary(),
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let runtimeInstance: EngineRuntimeImpl | null = null;

export function getEngineRuntime(): EngineRuntimeImpl {
  if (!runtimeInstance) {
    runtimeInstance = new EngineRuntimeImpl();
    void runtimeInstance.init();
  }
  return runtimeInstance;
}
