/**
 * Engine Runtime — The Single Authoritative Path
 * ================================================
 *
 * The most important missing system identified by the repository audit.
 * Everything must pass through ONE path:
 *
 *   User or Grand Architect intention
 *     → validated command (Command Bus)
 *     → authoritative world revision (World Repository)
 *     → derived render/collision/navigation artifacts (Coordinator)
 *     → atomic activation
 *     → visible and playable result
 *
 * Without this, every new subsystem increases inconsistency. The editor,
 * simulation plugins, Frontier experiments, terrain code, Zustand store
 * and Grand Architect prototypes currently resemble several partially
 * overlapping engines. This interface unifies them.
 *
 * Architecture:
 *
 *   EngineRuntime
 *   ├── World Repository (authoritative world state + revisions)
 *   ├── Command Bus (validated commands → transactions)
 *   ├── Plugin Host (capabilities)
 *   ├── Scheduler (tick-based simulation)
 *   ├── Job System (async work)
 *   ├── Derived Artifact Coordinator (compile → validate → activate)
 *   ├── Renderer Backend (Three.js WebGL2/WebGPU)
 *   ├── Physics Backend (collision queries)
 *   ├── Persistence Backend (save/reload)
 *   └── Architect Gateway (AI tools, security boundary)
 */

import type { WorldCell, WorldTransaction, WorldOperation, Principal } from '../world/world-fabric';
export type { WorldTransaction } from '../world/world-fabric';
import type { ArtifactKind } from '../world/world-fabric';

// ---------------------------------------------------------------------------
// World Repository
// ---------------------------------------------------------------------------

export interface WorldRepository {
  /** Current world revision number. */
  getRevision(): number;
  /** Get a cell by ID. */
  getCell(cellId: string): WorldCell | null;
  /** List all cells. */
  listCells(): WorldCell[];
  /** Apply a transaction (commits a new revision). */
  applyTransaction(tx: WorldTransaction): void;
  /** Get transaction history. */
  getTransactions(): WorldTransaction[];
  /** Rollback to a previous revision. */
  rollback(revision: number): boolean;
  /** Snapshot the entire world state. */
  snapshot(): WorldSnapshot;
  /** Restore from a snapshot. */
  restore(snapshot: WorldSnapshot): void;
}

export interface WorldSnapshot {
  revision: number;
  cells: WorldCell[];
  timestamp: string;
  /** Hash of the full world state for verification. */
  hash: string;
}

// ---------------------------------------------------------------------------
// Command Bus
// ---------------------------------------------------------------------------

export interface CommandBus {
  /**
   * Submit a command for validation and execution.
   * Returns the resulting transaction (or throws on validation failure).
   */
  submit(command: WorldCommand): Promise<WorldTransaction>;

  /**
   * Validate a command without executing it.
   */
  validate(command: WorldCommand): ValidationResult;

  /**
   * Get pending commands.
   */
  getPending(): WorldCommand[];
}

export interface WorldCommand {
  commandId: string;
  type: string;
  payload: Record<string, unknown>;
  requestedBy: Principal;
  /** Base revision the command was created against. */
  baseRevision: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Plugin Host
// ---------------------------------------------------------------------------

export interface PluginHost {
  /** Register a plugin. */
  register(plugin: EnginePlugin): void;
  /** Unregister a plugin. */
  unregister(pluginId: string): void;
  /** List registered plugins. */
  list(): PluginDescriptor[];
  /** Get a plugin by ID. */
  get(pluginId: string): EnginePlugin | null;
}

export interface EnginePlugin {
  pluginId: string;
  version: string;
  /** Capabilities this plugin provides. */
  capabilities: string[];
  /** Initialize the plugin. */
  init(runtime: EngineRuntime): Promise<void>;
  /** Destroy the plugin. */
  destroy(): Promise<void>;
}

export interface PluginDescriptor {
  pluginId: string;
  version: string;
  capabilities: string[];
  active: boolean;
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export interface Scheduler {
  /** Start the simulation. */
  start(): void;
  /** Stop the simulation. */
  stop(): void;
  /** Step one tick. */
  step(): void;
  /** Is the simulation running? */
  isRunning(): boolean;
  /** Current tick number. */
  getTick(): number;
  /** Register a system to run each tick. */
  registerSystem(system: SimulationSystem): void;
}

export interface SimulationSystem {
  systemId: string;
  /** Called each tick. */
  update(dt: number, tick: number): void;
  /** Which simulation tier this system belongs to. */
  tier: string;
}

// ---------------------------------------------------------------------------
// Job System
// ---------------------------------------------------------------------------

export interface JobSystem {
  /** Submit an async job. */
  submit(job: AsyncJob): string;
  /** Get job status. */
  getStatus(jobId: string): JobStatus | null;
  /** Cancel a job. */
  cancel(jobId: string): boolean;
  /** List active jobs. */
  listActive(): JobStatus[];
}

export interface AsyncJob {
  jobId: string;
  type: string;
  execute(): Promise<unknown>;
}

export interface JobStatus {
  jobId: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Renderer / Physics / Persistence Backends
// ---------------------------------------------------------------------------

export interface RendererBackend {
  /** Initialize the renderer. */
  init(canvas: HTMLCanvasElement): Promise<void>;
  /** Render one frame. */
  render(): void;
  /** Resize the renderer. */
  resize(width: number, height: number): void;
  /** Get renderer info. */
  getInfo(): RendererInfo;
}

export interface RendererInfo {
  backend: 'webgl2' | 'webgpu';
  version: string;
  maxTextureSize: number;
  drawCalls: number;
  triangles: number;
}

export interface PhysicsBackend {
  /** Cast a ray against the collision world. */
  raycast(origin: [number, number, number], direction: [number, number, number], maxDist: number): RaycastHit | null;
  /** Sweep a capsule. */
  sweepCapsule(from: [number, number, number], to: [number, number, number], radius: number, height: number): SweepHit[];
  /** Check overlap. */
  overlapSphere(center: [number, number, number], radius: number): boolean;
}

export interface RaycastHit {
  point: [number, number, number];
  normal: [number, number, number];
  distance: number;
  cellId: string;
}

export interface SweepHit {
  point: [number, number, number];
  normal: [number, number, number];
  distance: number;
  cellId: string;
}

export interface PersistenceBackend {
  /** Save the world to disk. */
  save(snapshot: WorldSnapshot): Promise<void>;
  /** Load the world from disk. */
  load(): Promise<WorldSnapshot | null>;
  /** Check if a save exists. */
  hasSave(): boolean;
}

// ---------------------------------------------------------------------------
// Architect Gateway (security boundary — above plugins, not alongside)
// ---------------------------------------------------------------------------

export interface ArchitectGateway {
  /** Authenticate a principal. */
  authenticate(credentials: PrincipalCredentials): PrincipalSession | null;
  /** Authorize a command. */
  authorize(session: PrincipalSession, command: WorldCommand): boolean;
  /** Get the audit trail. */
  getAuditTrail(): AuditEntry[];
}

export interface PrincipalCredentials {
  principalId: string;
  token: string;
}

export interface PrincipalSession {
  principal: Principal;
  sessionId: string;
  expiresAt: string;
}

export interface AuditEntry {
  entryId: string;
  timestamp: string;
  principal: Principal;
  command: WorldCommand;
  authorized: boolean;
  result: 'success' | 'denied' | 'error';
}

// ---------------------------------------------------------------------------
// The Engine Runtime
// ---------------------------------------------------------------------------

export interface EngineRuntime {
  readonly world: WorldRepository;
  readonly commands: CommandBus;
  readonly plugins: PluginHost;
  readonly scheduler: Scheduler;
  readonly jobs: JobSystem;
  readonly coordinator: DerivedArtifactCoordinatorHandle;
  readonly renderer: RendererBackend | null;
  readonly physics: PhysicsBackend | null;
  readonly persistence: PersistenceBackend | null;
  readonly gateway: ArchitectGateway;

  /** Initialize the runtime. */
  init(): Promise<void>;
  /** Shutdown the runtime. */
  shutdown(): Promise<void>;
  /** Is the runtime initialized? */
  isInitialized(): boolean;
  /** Get runtime info. */
  getInfo(): RuntimeInfo;

  /**
   * The SINGLE authoritative mutation entrance.
   * Every world mutation MUST go through this method.
   *
   * Enforces: authenticate → authorize → validate → revision-check → apply → audit
   *
   * Direct access to commands.submit() should NOT be used outside the runtime.
   * The command bus is exposed for read-only inspection only.
   */
  executeCommand(
    session: PrincipalSession,
    command: WorldCommand,
  ): Promise<CommandExecutionResult>;
}

export interface CommandExecutionResult {
  transaction: WorldTransaction;
  invalidatedCells: string[];
}

export interface DerivedArtifactCoordinatorHandle {
  invalidateCell(cellId: string, kinds: ArtifactKind[]): void;
  isBundleReady(cellId: string): boolean;
  activateBundle(cellId: string): boolean;
  getSummary(): CoordinatorSummary;
}

export interface CoordinatorSummary {
  cellsWithPending: number;
  cellsWithActive: number;
  totalPendingArtifacts: number;
  totalActiveArtifacts: number;
}

export interface RuntimeInfo {
  version: string;
  revision: number;
  tick: number;
  running: boolean;
  plugins: PluginDescriptor[];
  cells: number;
  coordinator: CoordinatorSummary;
}
