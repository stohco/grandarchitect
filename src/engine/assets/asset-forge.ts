/**
 * Asset Forge — Provider Broker
 * ==============================
 *
 * The Asset Forge coordinates multiple Unified3DProvider implementations.
 * It is NOT Buffalo-specific — Buffalo is one provider available to it.
 *
 * Responsibilities:
 *   - Provider selection (by capability, availability, or user choice)
 *   - Job submission and tracking
 *   - Candidate tracking (candidates are never authoritative)
 *   - Source-region protection (protected parts are not edited)
 *   - Candidate comparison (for Frontier Lab benchmarking)
 *   - Provider fallback (if one provider fails, try another)
 *
 * The Asset Forge does NOT:
 *   - Directly modify authoritative world assets
 *   - Make creative decisions (that's the user/Architect's role)
 *   - Bypass the operation graph (every edit is a versioned node)
 *   - Run in the game runtime (it's an editor/processor service)
 */

import type {
  Unified3DProvider,
  AssetUnderstandingRequest,
  AssetUnderstandingResult,
  AssetGenerationRequest,
  GeneratedAssetCandidate,
  AssetEditingRequest,
  EditedAssetCandidate,
  PartExtractionRequest,
  SemanticPartCandidate,
} from './unified-provider';
import type { CandidateAsset } from './semantic-asset';
import { Hunyuan3DBuffaloProvider } from './providers/hunyuan3d-buffalo';

export interface ProviderDescriptor {
  providerId: string;
  displayName: string;
  available: boolean;
  capabilities: string[];
  modelVersion: string;
}

export interface ForgeJob {
  jobId: string;
  providerId: string;
  capability: 'understand' | 'generate' | 'edit' | 'extract-parts';
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: CandidateAsset;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export class AssetForge {
  private providers = new Map<string, Unified3DProvider>();
  private jobs = new Map<string, ForgeJob>();
  private jobCounter = 0;

  constructor() {
    // Register the mocked Buffalo provider
    this.registerProvider(new Hunyuan3DBuffaloProvider());
  }

  /**
   * Register a new provider. The Asset Forge can coordinate multiple
   * providers simultaneously for comparison and fallback.
   */
  registerProvider(provider: Unified3DProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  /**
   * List all registered providers with their capabilities.
   */
  listProviders(): ProviderDescriptor[] {
    return Array.from(this.providers.values()).map((p) => ({
      providerId: p.providerId,
      displayName: p.displayName,
      available: p.available,
      modelVersion: p.modelVersion,
      capabilities: p.capabilities
        .filter((c) => c.implemented)
        .map((c) => c.capability),
    }));
  }

  /**
   * Select a provider by ID, or find the first available one with the
   * requested capability.
   */
  selectProvider(
    capability: 'understand' | 'generate' | 'edit' | 'extract-parts',
    preferredProviderId?: string,
  ): Unified3DProvider | null {
    if (preferredProviderId) {
      const p = this.providers.get(preferredProviderId);
      if (p) return p;
    }
    // Find first provider with this capability (even if not "available" —
    // mocks still work for interface validation)
    for (const p of this.providers.values()) {
      if (p.capabilities.some((c) => c.capability === capability)) {
        return p;
      }
    }
    return null;
  }

  /**
   * Understand an asset using a provider.
   */
  async understand(
    request: AssetUnderstandingRequest,
    providerId?: string,
  ): Promise<AssetUnderstandingResult> {
    const provider = this.selectProvider('understand', providerId);
    if (!provider) throw new Error('No provider available for understanding');
    return provider.understand(request);
  }

  /**
   * Generate a new asset candidate.
   */
  async generate(
    request: AssetGenerationRequest,
    providerId?: string,
  ): Promise<GeneratedAssetCandidate> {
    const provider = this.selectProvider('generate', providerId);
    if (!provider) throw new Error('No provider available for generation');
    const result = await this.trackJob(provider.providerId, 'generate', () =>
      provider.generate(request),
    );
    return result;
  }

  /**
   * Edit an existing asset. The source asset is immutable — the provider
   * receives a copy and returns a candidate.
   */
  async edit(
    request: AssetEditingRequest,
    providerId?: string,
  ): Promise<EditedAssetCandidate> {
    // Validate protected parts are not in the target list
    const conflict = request.targetPartIds.find((id) =>
      request.protectedPartIds.includes(id),
    );
    if (conflict) {
      throw new Error(
        `Part "${conflict}" is in both target and protected lists — cannot edit a protected part.`,
      );
    }
    const provider = this.selectProvider('edit', providerId);
    if (!provider) throw new Error('No provider available for editing');
    return this.trackJob(provider.providerId, 'edit', () => provider.edit(request));
  }

  /**
   * Extract semantic parts from an asset.
   */
  async extractParts(
    request: PartExtractionRequest,
    providerId?: string,
  ): Promise<SemanticPartCandidate[]> {
    const provider = this.selectProvider('extract-parts', providerId);
    if (!provider) throw new Error('No provider available for part extraction');
    return this.trackJob(provider.providerId, 'extract-parts', () =>
      provider.extractParts(request),
    );
  }

  /**
   * Get all jobs (for UI display).
   */
  getJobs(): ForgeJob[] {
    return Array.from(this.jobs.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  /**
   * Track a job through its lifecycle.
   */
  private async trackJob<T>(
    providerId: string,
    capability: ForgeJob['capability'],
    fn: () => Promise<T>,
  ): Promise<T> {
    const jobId = `job-${++this.jobCounter}-${Date.now().toString(36)}`;
    const job: ForgeJob = {
      jobId,
      providerId,
      capability,
      status: 'running',
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    try {
      const result = await fn();
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      if (result && typeof result === 'object' && 'candidate' in result) {
        job.result = (result as { candidate: CandidateAsset }).candidate;
      }
      return result;
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
      job.completedAt = new Date().toISOString();
      throw err;
    }
  }
}

// Singleton instance
let forgeInstance: AssetForge | null = null;

export function getAssetForge(): AssetForge {
  if (!forgeInstance) {
    forgeInstance = new AssetForge();
  }
  return forgeInstance;
}
