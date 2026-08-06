/**
 * Workspace Definitions
 * =====================
 *
 * Replaces 18 bottom-dock tabs with 8 coherent workspaces.
 * The bottom dock is NOT the primary application navigation.
 *
 * Desktop shell layout:
 *
 *   TOP BAR: project identity, workspace switcher, save, undo/redo,
 *            play/pause, command palette, job status, build provenance
 *   LEFT SIDEBAR: Outliner or Asset Browser (workspace-dependent)
 *   CENTER: primary viewport / canvas
 *   RIGHT SIDEBAR: context-sensitive Inspector
 *   BOTTOM DOCK: timeline, console, jobs, evidence, history, diagnostics
 */

import type { WorkspaceId } from './action-registry';

export interface WorkspaceDefinition {
  id: WorkspaceId;
  name: string;
  description: string;
  icon: string;
  /** What the left sidebar shows in this workspace. */
  leftSidebar: 'outliner' | 'asset-browser' | 'animation-list' | 'character-list' | 'job-list' | 'none';
  /** What the center canvas shows. */
  center: 'viewport-3d' | 'uv-canvas' | 'timeline' | 'graph' | 'comparison' | 'playtest';
  /** What the right sidebar shows. */
  rightSidebar: 'inspector' | 'properties' | 'capability-status' | 'validation' | 'none';
  /** What the bottom dock shows (tabs available). */
  bottomDockTabs: string[];
}

export const WORKSPACES: readonly WorkspaceDefinition[] = [
  {
    id: 'world',
    name: 'World',
    description: 'Terrain, structures, vegetation, environment, entities, World Fabric, streaming, destruction, navigation',
    icon: 'Globe',
    leftSidebar: 'outliner',
    center: 'viewport-3d',
    rightSidebar: 'inspector',
    bottomDockTabs: ['console', 'history', 'jobs'],
  },
  {
    id: 'assets',
    name: 'Assets',
    description: 'Asset Forge, imported assets, MeshKernel, operation stack, materials, UV, LOD, collision, validation, revisions',
    icon: 'Package',
    leftSidebar: 'asset-browser',
    center: 'viewport-3d',
    rightSidebar: 'properties',
    bottomDockTabs: ['console', 'jobs', 'evidence'],
  },
  {
    id: 'characters',
    name: 'Characters',
    description: 'Body, equipment, garment fitting, body-hide zones, skeleton, weights, sockets, morphs, animation compatibility',
    icon: 'Users',
    leftSidebar: 'character-list',
    center: 'viewport-3d',
    rightSidebar: 'inspector',
    bottomDockTabs: ['console', 'jobs'],
  },
  {
    id: 'animation',
    name: 'Animation',
    description: 'Clips, state machines, timeline, events, VFX, cameras, cinematics, audio hooks',
    icon: 'Clapperboard',
    leftSidebar: 'animation-list',
    center: 'timeline',
    rightSidebar: 'properties',
    bottomDockTabs: ['console', 'timeline'],
  },
  {
    id: 'simulation',
    name: 'Simulation',
    description: 'NPC simulation, economy, ecology, combat, cultivation, schedules, simulation LOD, world events',
    icon: 'Cpu',
    leftSidebar: 'outliner',
    center: 'viewport-3d',
    rightSidebar: 'capability-status',
    bottomDockTabs: ['console', 'history', 'jobs'],
  },
  {
    id: 'architect',
    name: 'Architect',
    description: 'Conversation, current plan, proposed operations, clarifications, capability discovery, evidence, job execution, approval queue',
    icon: 'Sparkles',
    leftSidebar: 'none',
    center: 'viewport-3d',
    rightSidebar: 'validation',
    bottomDockTabs: ['architect', 'jobs', 'evidence'],
  },
  {
    id: 'playtest',
    name: 'Playtest',
    description: 'Embodied game view, runtime HUD, input testing, game-state inspection, performance overlay, return-to-editor controls',
    icon: 'Gamepad2',
    leftSidebar: 'none',
    center: 'playtest',
    rightSidebar: 'none',
    bottomDockTabs: ['console'],
  },
  {
    id: 'diagnostics',
    name: 'Diagnostics',
    description: 'Console, crashes, jobs, conformance, benchmarks, Frontier Lab, capability gaps, provenance, security, build information',
    icon: 'Activity',
    leftSidebar: 'job-list',
    center: 'viewport-3d',
    rightSidebar: 'capability-status',
    bottomDockTabs: ['console', 'crashes', 'conformance', 'benchmarks', 'frontier', 'capabilities', 'engine', 'reasoning', 'constraints', 'complexity', 'claims'],
  },
] as const;

export function getWorkspaceById(id: WorkspaceId): WorkspaceDefinition | null {
  return WORKSPACES.find((w) => w.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// UI Surface Inventory Types
// ---------------------------------------------------------------------------

export type SurfaceStatus =
  | 'working'
  | 'broken'
  | 'no-op'
  | 'placeholder'
  | 'unreachable'
  | 'overflow-hidden'
  | 'prototype'
  | 'unknown';

export interface UiSurfaceRecord {
  surfaceId: string;
  componentPath: string;
  visibleLabel: string;
  accessibleName: string;
  role: string;
  workspace: WorkspaceId;
  actionId?: string;
  capabilityId?: string;
  apiRoute?: string;
  shortcut?: string;
  currentStatus: SurfaceStatus;
  evidence?: string[];
  testIds?: string[];
  notes?: string[];
}

// ---------------------------------------------------------------------------
// Job Center Types
// ---------------------------------------------------------------------------

export type JobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export interface StudioJob {
  jobId: string;
  action: string;
  requestingActor: 'user' | 'architect' | 'system';
  target: string;
  status: JobStatus;
  queueTime: string;
  startTime?: string;
  elapsedTimeMs?: number;
  progress: number;
  stage: string;
  provider?: string;
  sourceRevision?: number;
  outputRevision?: number;
  warnings: string[];
  logs: string[];
  cancellationAvailable: boolean;
  resultingArtifactIds: string[];
  evidence?: string[];
  error?: string;
}

class JobCenter {
  private jobs = new Map<string, StudioJob>();
  private counter = 0;
  private listeners: Array<() => void> = [];

  createJob(
    action: string,
    target: string,
    actor: 'user' | 'architect' | 'system' = 'user',
  ): StudioJob {
    const jobId = `job-${++this.counter}-${Date.now().toString(36)}`;
    const job: StudioJob = {
      jobId,
      action,
      requestingActor: actor,
      target,
      status: 'queued',
      queueTime: new Date().toISOString(),
      progress: 0,
      stage: 'queued',
      warnings: [],
      logs: [],
      cancellationAvailable: true,
      resultingArtifactIds: [],
    };
    this.jobs.set(jobId, job);
    this.notifyListeners();
    return job;
  }

  updateJob(jobId: string, updates: Partial<StudioJob>): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    Object.assign(job, updates);
    if (updates.status === 'running' && !job.startTime) {
      job.startTime = new Date().toISOString();
    }
    this.notifyListeners();
  }

  completeJob(jobId: string, artifactIds: string[] = [], revision?: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'completed';
    job.progress = 1;
    job.outputRevision = revision;
    job.resultingArtifactIds = artifactIds;
    job.elapsedTimeMs = job.startTime
      ? Date.now() - new Date(job.startTime).getTime()
      : 0;
    this.notifyListeners();
  }

  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'failed';
    job.error = error;
    job.elapsedTimeMs = job.startTime
      ? Date.now() - new Date(job.startTime).getTime()
      : 0;
    this.notifyListeners();
  }

  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'cancelled';
    this.notifyListeners();
  }

  getJob(jobId: string): StudioJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  getActiveJobs(): StudioJob[] {
    return this.list().filter((j) => j.status === 'running' || j.status === 'queued');
  }

  list(): StudioJob[] {
    return Array.from(this.jobs.values()).sort((a, b) =>
      b.queueTime.localeCompare(a.queueTime),
    );
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // never throw
      }
    }
  }
}

let jobCenterInstance: JobCenter | null = null;

export function getJobCenter(): JobCenter {
  if (!jobCenterInstance) {
    jobCenterInstance = new JobCenter();
  }
  return jobCenterInstance;
}
