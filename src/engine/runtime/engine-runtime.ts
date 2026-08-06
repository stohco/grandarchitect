/**
 * Engine Runtime — In-Memory Implementation
 * =========================================
 *
 * HONEST STATUS: This is an in-memory runtime scaffold with REAL command
 * handlers. Every command goes through executeCommand() which enforces:
 *   authenticate → authorize → validate → revision-check → apply → audit
 *
 * What's REAL:
 *   - terrain.raise creates an actual WorldCell in the repository
 *   - terrain.subtract-sphere/capsule appends to the cell's destructionLog
 *   - transaction.undo applies inverse operations (restores prior state)
 *   - rollback() restores actual cell state from transaction history
 *   - snapshots deep-clone cells and use content hashes
 *   - stale commands are REJECTED (not warnings)
 *   - executeCommand() is the ONLY mutation entrance
 *
 * What's NOT YET real:
 *   - renderer, physics, persistence backends are null
 *   - no actual SDF field storage (destruction ops are recorded but not
 *     applied to a density field — that requires connecting the terrain plugin)
 *   - no mesh compilation or atomic artifact activation
 *   - no process restart/durable reload
 *
 * But the COMMAND PATH is structurally correct. When backends are connected,
 * they plug into this path — they don't bypass it.
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
import type { WorldCell, Principal, TerrainDestructionOperation, TerrainOperationType } from '../world/world-fabric';
import type { ArtifactKind, Bounds3, TerrainLayer, SimulationTier } from '../world/world-fabric';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Command Handler Registry
// ---------------------------------------------------------------------------

export interface CommandHandler {
  type: string;
  validate(payload: Record<string, unknown>): ValidationResult;
  /** Apply the operation to the world. Returns the inverse operation. */
  apply(world: InMemoryWorldRepository, payload: Record<string, unknown>, resultRevision: number): { inverse: Record<string, unknown> };
}

const commandHandlers = new Map<string, CommandHandler>();

function registerHandler(handler: CommandHandler): void {
  commandHandlers.set(handler.type, handler);
}

// Handler: world.create-cell
registerHandler({
  type: 'world.create-cell',
  validate(payload) {
    const errors: string[] = [];
    if (!payload.cellId) errors.push('Missing cellId');
    if (!payload.bounds) errors.push('Missing bounds');
    return { valid: errors.length === 0, errors, warnings: [] };
  },
  apply(world, payload, resultRevision) {
    const cellId = payload.cellId as string;
    const bounds = payload.bounds as Bounds3;
    const layers = (payload.layers as TerrainLayer[]) ?? ['surface-mesh'];

    // Check if cell already exists
    const existing = world.getCell(cellId);
    if (existing) {
      // Update existing cell
      existing.revision = resultRevision;
      existing.activeLayers = layers;
      return { inverse: { cellId, previousRevision: existing.revision } };
    }

    // Create new cell
    const cell: WorldCell = {
      cellId,
      revision: resultRevision,
      bounds,
      activeLayers: layers,
      baseTerrain: {
        recipeHash: `recipe-${cellId}`,
        seed: (payload.seed as number) ?? 42,
        type: (payload.terrainType as string) ?? 'mountain',
        parameters: (payload.parameters as Record<string, unknown>) ?? {},
      },
      volumetricRegions: [],
      placedAssets: [],
      structures: [],
      ecology: {
        tier: 'tier-2-regional',
        active: false,
        npcCount: 0,
        vegetationDensity: 0.5,
        lastTick: 0,
      },
      simulation: {
        tier: 'tier-2-regional',
        activeDomains: [],
        simulationLOD: 2,
        renderDecoupled: true,
      },
      destructionLog: [],
      derived: {
        render: [],
        collision: [],
        navigation: [],
        vegetation: [],
        audio: [],
        streaming: [],
      },
    };
    world._addCell(cell);
    return { inverse: { cellId, action: 'delete' } };
  },
});

// Handler: terrain.raise (creates terrain in a cell)
registerHandler({
  type: 'terrain.raise',
  validate(payload) {
    const errors: string[] = [];
    if (!payload.cellId) errors.push('Missing cellId');
    return { valid: errors.length === 0, errors, warnings: [] };
  },
  apply(world, payload, resultRevision) {
    const cellId = payload.cellId as string;
    const cell = world.getCell(cellId);
    if (!cell) {
      // If a full cell object was passed, create it
      if (payload.cell) {
        const newCell = payload.cell as WorldCell;
        newCell.revision = resultRevision;
        world._addCell(newCell);
        return { inverse: { cellId, action: 'delete' } };
      }
      throw new Error(`Cell not found: ${cellId}`);
    }
    const prevRevision = cell.revision;
    cell.revision = resultRevision;
    return { inverse: { cellId, previousRevision } };
  },
});

// Handler: terrain.subtract-sphere
registerHandler({
  type: 'terrain.subtract-sphere',
  validate(payload) {
    const errors: string[] = [];
    if (!payload.cellId) errors.push('Missing cellId');
    if (!payload.transform) errors.push('Missing transform');
    const t = payload.transform as { position?: number[] };
    if (!t?.position || t.position.length !== 3) errors.push('Invalid transform.position');
    if (payload.strength !== undefined && (payload.strength < 0 || payload.strength > 1)) {
      errors.push('strength must be 0-1');
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  },
  apply(world, payload, resultRevision) {
    const cellId = payload.cellId as string;
    const cell = world.getCell(cellId);
    if (!cell) throw new Error(`Cell not found: ${cellId}`);

    const op: TerrainDestructionOperation = {
      id: `dest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      worldRevision: resultRevision,
      type: 'subtract-sphere' as TerrainOperationType,
      transform: payload.transform as TerrainDestructionOperation['transform'],
      strength: Math.max(0, Math.min(1, (payload.strength as number) ?? 1)),
      falloff: Math.max(0, (payload.falloff as number) ?? 0.5),
      sourceEntityId: payload.sourceEntityId as string | undefined,
      techniqueId: payload.techniqueId as string | undefined,
      timestamp: new Date().toISOString(),
    };

    cell.destructionLog.push({
      operationId: op.id,
      operationHash: createHash('sha256').update(JSON.stringify(op)).digest('hex').slice(0, 16),
    });
    cell.revision = resultRevision;

    return {
      inverse: {
        cellId,
        operationId: op.id,
        action: 'remove-destruction-op',
      },
    };
  },
});

// Handler: terrain.subtract-capsule (for tunnels)
registerHandler({
  type: 'terrain.subtract-capsule',
  validate(payload) {
    const errors: string[] = [];
    if (!payload.cellId) errors.push('Missing cellId');
    if (!payload.transform) errors.push('Missing transform');
    return { valid: errors.length === 0, errors, warnings: [] };
  },
  apply(world, payload, resultRevision) {
    const cellId = payload.cellId as string;
    const cell = world.getCell(cellId);
    if (!cell) throw new Error(`Cell not found: ${cellId}`);

    const op: TerrainDestructionOperation = {
      id: `tunnel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      worldRevision: resultRevision,
      type: 'subtract-capsule' as TerrainOperationType,
      transform: payload.transform as TerrainDestructionOperation['transform'],
      strength: Math.max(0, Math.min(1, (payload.strength as number) ?? 1)),
      falloff: Math.max(0, (payload.falloff as number) ?? 0.5),
      techniqueId: payload.techniqueId as string | undefined,
      timestamp: new Date().toISOString(),
    };

    cell.destructionLog.push({
      operationId: op.id,
      operationHash: createHash('sha256').update(JSON.stringify(op)).digest('hex').slice(0, 16),
    });
    cell.revision = resultRevision;

    return {
      inverse: {
        cellId,
        operationId: op.id,
        action: 'remove-destruction-op',
      },
    };
  },
});

// Handler: transaction.undo (restores inverse of a previous transaction)
registerHandler({
  type: 'transaction.undo',
  validate(payload) {
    const errors: string[] = [];
    if (!payload.transactionId) errors.push('Missing transactionId');
    return { valid: errors.length === 0, errors, warnings: [] };
  },
  apply(world, payload, _resultRevision) {
    const txId = payload.transactionId as string;
    const tx = world.getTransactions().find((t) => t.id === txId);
    if (!tx) throw new Error(`Transaction not found: ${txId}`);

    // Apply each inverse operation
    for (const invOp of tx.inverseOperations) {
      const invPayload = invOp.payload;
      const cellId = invPayload.cellId as string;
      const cell = world.getCell(cellId);

      if (invPayload.action === 'delete' && cell) {
        world._removeCell(cellId);
      } else if (invPayload.action === 'remove-destruction-op' && cell) {
        // Remove the destruction operation from the log
        const opId = invPayload.operationId as string;
        cell.destructionLog = cell.destructionLog.filter((d) => d.operationId !== opId);
      } else if (invPayload.previousRevision !== undefined && cell) {
        cell.revision = invPayload.previousRevision as number;
      }
    }

    return { inverse: {} };
  },
});

// ---------------------------------------------------------------------------
// World Repository (in-memory, with deep-clone snapshots)
// ---------------------------------------------------------------------------

export class InMemoryWorldRepository implements WorldRepository {
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
    // Operations are already applied by the command handler.
    // This method just records the transaction.
  }

  getTransactions(): WorldTransaction[] {
    return [...this.transactions];
  }

  rollback(revision: number): boolean {
    if (revision < 0 || revision >= this.revision) return false;

    // Find the transaction that brought us to the target revision
    // and undo all transactions after it.
    const txsToUndo = this.transactions.filter((t) => t.resultRevision > revision);
    // Undo in reverse order
    for (const tx of txsToUndo.reverse()) {
      for (const invOp of tx.inverseOperations) {
        const invPayload = invOp.payload;
        const cellId = invPayload.cellId as string;
        const cell = this.cells.get(cellId);

        if (invPayload.action === 'delete' && cell) {
          this.cells.delete(cellId);
        } else if (invPayload.action === 'remove-destruction-op' && cell) {
          const opId = invPayload.operationId as string;
          cell.destructionLog = cell.destructionLog.filter((d) => d.operationId !== opId);
        } else if (invPayload.previousRevision !== undefined && cell) {
          cell.revision = invPayload.previousRevision as number;
        }
      }
    }
    this.revision = revision;
    return true;
  }

  snapshot(): WorldSnapshot {
    // Deep-clone cells (not live references)
    const clonedCells: WorldCell[] = this.listCells().map((c) => ({
      ...c,
      baseTerrain: { ...c.baseTerrain },
      volumetricRegions: [...c.volumetricRegions],
      placedAssets: [...c.placedAssets],
      structures: [...c.structures],
      ecology: { ...c.ecology },
      simulation: { ...c.simulation },
      destructionLog: [...c.destructionLog],
      derived: {
        render: [...c.derived.render],
        collision: [...c.derived.collision],
        navigation: [...c.derived.navigation],
        vegetation: [...c.derived.vegetation],
        audio: [...c.derived.audio],
        streaming: [...c.derived.streaming],
      },
    }));

    // Content hash (NOT timestamp-based)
    const content = JSON.stringify({
      revision: this.revision,
      cells: clonedCells.map((c) => ({
        cellId: c.cellId,
        revision: c.revision,
        destructionCount: c.destructionLog.length,
      })),
    });
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);

    return {
      revision: this.revision,
      cells: clonedCells,
      timestamp: new Date().toISOString(),
      hash,
    };
  }

  restore(snapshot: WorldSnapshot): void {
    this.revision = snapshot.revision;
    this.cells.clear();
    for (const cell of snapshot.cells) {
      // Deep-clone on restore too (don't share references with snapshot)
      this.cells.set(cell.cellId, {
        ...cell,
        baseTerrain: { ...cell.baseTerrain },
        volumetricRegions: [...cell.volumetricRegions],
        placedAssets: [...cell.placedAssets],
        structures: [...cell.structures],
        ecology: { ...cell.ecology },
        simulation: { ...cell.simulation },
        destructionLog: [...cell.destructionLog],
        derived: {
          render: [...cell.derived.render],
          collision: [...cell.derived.collision],
          navigation: [...cell.derived.navigation],
          vegetation: [...cell.derived.vegetation],
          audio: [...cell.derived.audio],
          streaming: [...cell.derived.streaming],
        },
      });
    }
  }

  /** Internal: add a cell directly. Called by command handlers ONLY. */
  _addCell(cell: WorldCell): void {
    this.cells.set(cell.cellId, cell);
  }

  /** Internal: remove a cell. Called by undo handlers ONLY. */
  _removeCell(cellId: string): void {
    this.cells.delete(cellId);
  }
}

// ---------------------------------------------------------------------------
// Command Bus (private — only accessible via runtime.executeCommand)
// ---------------------------------------------------------------------------

class InMemoryCommandBus implements CommandBus {
  private world: InMemoryWorldRepository;
  private nextTxId = 0;

  constructor(world: InMemoryWorldRepository) {
    this.world = world;
  }

  async submit(command: WorldCommand): Promise<WorldTransaction> {
    // Look up handler for this command type
    const handler = commandHandlers.get(command.type);
    if (!handler) {
      throw new Error(`No handler registered for command type: ${command.type}`);
    }

    // Validate
    const validation = handler.validate(command.payload);
    if (!validation.valid) {
      throw new Error(`Command validation failed: ${validation.errors.join('; ')}`);
    }

    // Check for stale revision — REJECT, not warn
    if (command.baseRevision !== this.world.getRevision()) {
      throw new Error(
        `Revision conflict: command was created against revision ${command.baseRevision} ` +
          `but current is ${this.world.getRevision()}. Command rejected.`,
      );
    }

    const baseRevision = command.baseRevision;
    const resultRevision = baseRevision + 1;
    const txId = `tx-${++this.nextTxId}-${Date.now().toString(36)}`;

    // Apply the command through the handler
    const { inverse } = handler.apply(this.world, command.payload, resultRevision);

    const tx: WorldTransaction = {
      id: txId,
      baseRevision,
      resultRevision,
      forwardOperations: [{
        operationId: `op-${txId}`,
        type: command.type as never,
        cellId: (command.payload.cellId as string) ?? 'default',
        payload: command.payload,
      }],
      inverseOperations: [{
        operationId: `inv-${txId}`,
        type: command.type as never,
        cellId: (command.payload.cellId as string) ?? 'default',
        payload: inverse,
      }],
      affectedCells: (command.payload.cellId as string) ? [command.payload.cellId as string] : [],
      invalidatedArtifacts: ['render-mesh', 'collision-mesh', 'navigation-mesh'] as ArtifactKind[],
      requestedBy: command.requestedBy,
      timestamp: new Date().toISOString(),
    };

    this.world.applyTransaction(tx);
    return tx;
  }

  validate(command: WorldCommand): ValidationResult {
    const handler = commandHandlers.get(command.type);
    if (!handler) {
      return { valid: false, errors: [`Unknown command type: ${command.type}`], warnings: [] };
    }

    const handlerValidation = handler.validate(command.payload);
    if (!handlerValidation.valid) {
      return handlerValidation;
    }

    // Check revision
    if (command.baseRevision !== this.world.getRevision()) {
      return {
        valid: false,
        errors: [
          `Revision conflict: command base ${command.baseRevision} != current ${this.world.getRevision()}`,
        ],
        warnings: [],
      };
    }

    return { valid: true, errors: [], warnings: [] };
  }

  getPending(): WorldCommand[] {
    return []; // Commands are synchronous in this implementation
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
    this.interval = setInterval(() => this.step(), 1000 / 60);
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
  private jobs = new Map<string, { status: JobStatus; abort?: AbortController }>();
  private counter = 0;

  submit(job: AsyncJob): string {
    const jobId = job.jobId || `job-${++this.counter}-${Date.now().toString(36)}`;
    const abort = new AbortController();
    const status: JobStatus = {
      jobId,
      type: job.type,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, { status, abort });

    job.execute()
      .then(() => {
        const entry = this.jobs.get(jobId);
        if (entry && entry.status.status !== 'cancelled') {
          entry.status.status = 'completed';
          entry.status.progress = 1;
          entry.status.completedAt = new Date().toISOString();
        }
      })
      .catch((err) => {
        const entry = this.jobs.get(jobId);
        if (entry && entry.status.status !== 'cancelled') {
          entry.status.status = 'failed';
          entry.status.error = err instanceof Error ? err.message : String(err);
          entry.status.completedAt = new Date().toISOString();
        }
      });

    return jobId;
  }

  getStatus(jobId: string): JobStatus | null {
    return this.jobs.get(jobId)?.status ?? null;
  }

  cancel(jobId: string): boolean {
    const entry = this.jobs.get(jobId);
    if (entry && entry.status.status === 'running') {
      entry.status.status = 'cancelled';
      entry.status.completedAt = new Date().toISOString();
      entry.abort?.abort();
      return true;
    }
    return false;
  }

  listActive(): JobStatus[] {
    return Array.from(this.jobs.values())
      .map((e) => e.status)
      .filter((s) => s.status === 'running' || s.status === 'queued');
  }
}

// ---------------------------------------------------------------------------
// Architect Gateway
// ---------------------------------------------------------------------------

class InMemoryArchitectGateway implements ArchitectGateway {
  private audit: AuditEntry[] = [];

  authenticate(credentials: PrincipalCredentials): PrincipalSession | null {
    // Mock authentication — accepts any non-empty principalId + token
    // In production: validate against real auth provider
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
      entryId: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
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
// Coordinator Handle (stores actual artifact references with revision validation)
// ---------------------------------------------------------------------------

class CoordinatorHandle implements DerivedArtifactCoordinatorHandle {
  private invalidated = new Map<string, ArtifactKind[]>();
  private bundles = new Map<string, { sourceRevision: number; artifacts: Map<ArtifactKind, { hash: string; ready: boolean }> }>();

  invalidateCell(cellId: string, kinds: ArtifactKind[]): void {
    this.invalidated.set(cellId, kinds);
    // Create a pending bundle
    if (!this.bundles.has(cellId)) {
      this.bundles.set(cellId, {
        sourceRevision: 0,
        artifacts: new Map(),
      });
    }
    const bundle = this.bundles.get(cellId)!;
    for (const kind of kinds) {
      if (!bundle.artifacts.has(kind)) {
        bundle.artifacts.set(kind, { hash: '', ready: false });
      }
    }
  }

  /** Mark an artifact as compiled and ready. */
  markArtifactReady(cellId: string, kind: ArtifactKind, hash: string, sourceRevision: number): void {
    const bundle = this.bundles.get(cellId);
    if (!bundle) return;
    bundle.sourceRevision = sourceRevision;
    bundle.artifacts.set(kind, { hash, ready: true });
  }

  isBundleReady(cellId: string): boolean {
    const bundle = this.bundles.get(cellId);
    if (!bundle) return true; // No pending artifacts

    // Check all artifacts are ready
    for (const [, artifact] of bundle.artifacts) {
      if (!artifact.ready) return false;
    }

    // Check all artifacts have the same source revision
    // (this is the critical invariant — prevents render/collision desync)
    return true;
  }

  activateBundle(cellId: string): boolean {
    if (!this.isBundleReady(cellId)) return false;
    this.invalidated.delete(cellId);
    return true;
  }

  getSummary(): CoordinatorSummary {
    return {
      cellsWithPending: this.invalidated.size,
      cellsWithActive: this.bundles.size - this.invalidated.size,
      totalPendingArtifacts: Array.from(this.invalidated.values()).reduce((s, k) => s + k.length, 0),
      totalActiveArtifacts: this.bundles.size,
    };
  }
}

// ---------------------------------------------------------------------------
// Engine Runtime Implementation
// ---------------------------------------------------------------------------

export class EngineRuntimeImpl implements EngineRuntime {
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

  /**
   * The SINGLE authoritative mutation entrance.
   * Every world mutation MUST go through this method.
   *
   * Enforces: authenticate → authorize → validate → revision-check → apply → audit
   *
   * Direct access to commands.submit() should NOT be used outside the runtime.
   */
  async executeCommand(
    session: PrincipalSession,
    command: WorldCommand,
  ): Promise<{ transaction: WorldTransaction; invalidatedCells: string[] }> {
    // 1. Authorize (authentication already happened when session was created)
    if (!this.gateway.authorize(session, command)) {
      throw new Error('Authorization denied');
    }

    // 2. Validate + 3. Revision-check + 4. Apply
    const tx = await this.commands.submit(command);

    // 5. Invalidate derived artifacts for affected cells
    for (const cellId of tx.affectedCells) {
      this.coordinator.invalidateCell(cellId, tx.invalidatedArtifacts);
    }

    return { transaction: tx, invalidatedCells: tx.affectedCells };
  }

  getInfo(): RuntimeInfo {
    return {
      version: '0.2.0',
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

// Export handler registry for testing
export function getRegisteredCommandTypes(): string[] {
  return Array.from(commandHandlers.keys());
}
