import type {
  CapabilityRequirement,
  CapabilityGap,
  PluginId,
} from './types';

/**
 * The Capability Graph.
 *
 * A DAG of CapabilityRequirements. Provides:
 *   1. Registration of requirements
 *   2. Dependency tracking (topological sort)
 *   3. Gap analysis (what's missing)
 */

export interface CapabilityGraph {
  /** Add or update a requirement. */
  upsert(req: CapabilityRequirement): void;
  /** Get a requirement by ID. */
  get(id: string): CapabilityRequirement | undefined;
  /** Remove a requirement. */
  remove(id: string): boolean;
  /** Check if a requirement exists. */
  has(id: string): boolean;
  /** Get all requirement IDs. */
  keys(): string[];
  /** Compute the topological order. */
  topologicalOrder(): string[];
  /** Get root requirements (no dependencies). */
  roots(): string[];
  /** Get leaf requirements (nothing depends on them). */
  leaves(): string[];
  /** Compute the gap: requirements not yet implemented. */
  computeGap(): CapabilityGap[];
  /** Get the total count. */
  size(): number;
}

export function createCapabilityGraph(): CapabilityGraph {
  const requirements = new Map<string, CapabilityRequirement>();

  function upsert(req: CapabilityRequirement): void {
    requirements.set(req.id, req);
  }

  function get(id: string): CapabilityRequirement | undefined {
    return requirements.get(id);
  }

  function remove(id: string): boolean {
    return requirements.delete(id);
  }

  function has(id: string): boolean {
    return requirements.has(id);
  }

  function keys(): string[] {
    return Array.from(requirements.keys());
  }

  /** Kahn's algorithm for topological sort. */
  function topologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    for (const id of requirements.keys()) {
      inDegree.set(id, 0);
      adjList.set(id, []);
    }

    for (const req of requirements.values()) {
      for (const dep of req.dependsOn) {
        if (requirements.has(dep)) {
          adjList.get(dep)!.push(req.id);
          inDegree.set(req.id, (inDegree.get(req.id) ?? 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      for (const neighbor of adjList.get(node) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    return result;
  }

  function roots(): string[] {
    const result: string[] = [];
    for (const req of requirements.values()) {
      if (req.dependsOn.length === 0) {
        result.push(req.id);
      }
    }
    return result;
  }

  function leaves(): string[] {
    const hasDependents = new Set<string>();
    for (const req of requirements.values()) {
      for (const dep of req.dependsOn) {
        if (requirements.has(dep)) {
          hasDependents.add(dep);
        }
      }
    }
    const result: string[] = [];
    for (const id of requirements.keys()) {
      if (!hasDependents.has(id)) {
        result.push(id);
      }
    }
    return result;
  }

  function computeGap(): CapabilityGap[] {
    const gaps: CapabilityGap[] = [];
    for (const req of requirements.values()) {
      if (req.implementationState === 'implemented') continue;

      const hasBlockingDefects = req.knownDefects.length > 0;
      const priority = computePriority(req);

      gaps.push({
        requirementId: req.id,
        currentState: hasBlockingDefects ? 'implemented-with-defects' : req.implementationState,
        description: req.description,
        priority,
      });
    }
    return gaps;
  }

  function computePriority(req: CapabilityRequirement): 'low' | 'med' | 'high' | 'critical' {
    // Critical if required by the vertical slice
    if (req.requiredBy.some(r => r.includes('vertical-slice'))) return 'critical';
    // High if required by a Phase 2-3 component
    if (req.requiredBy.some(r => r.includes('phase-2') || r.includes('phase-3'))) return 'high';
    // Med if in-progress
    if (req.implementationState === 'in-progress') return 'med';
    return 'low';
  }

  function size(): number {
    return requirements.size;
  }

  return { upsert, get, remove, has, keys, topologicalOrder, roots, leaves, computeGap, size };
}
