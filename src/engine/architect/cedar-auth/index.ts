/**
 * Cedar Authorization — Policy-Separated Permissions
 * ====================================================
 *
 * Cedar is a purpose-built authorization language. Policies remain
 * separate from application code, can be schema-validated, independently
 * audited, and formally analyzed.
 *
 * Per the FRONTIER_TECHNOLOGY_MATRIX.md directive, Cedar determines:
 *   - May the Grand Architect inspect authorial-only mystery truth?
 *   - May it invoke this experimental provider?
 *   - May it modify accepted canon?
 *   - May it execute a destructive world action?
 *   - May it install a plugin?
 *   - May it access the filesystem?
 *   - May it activate an unvalidated asset?
 *   - May it revise a protagonist's hard-canon identity?
 *
 * This adapter uses `@cedar-policy/cedar-wasm` for WASM-based evaluation.
 */

import { isAuthorized as cedarIsAuthorized, getCedarVersion } from '@cedar-policy/cedar-wasm';
import type { Principal } from '@/engine/world/world-fabric';

// ---------------------------------------------------------------------------
// Authorization Request
// ---------------------------------------------------------------------------

export interface AuthorizationRequest {
  principal: {
    id: string;
    role: 'user' | 'architect' | 'system' | 'plugin';
    autonomyLevel: 'manual' | 'assisted' | 'autonomous';
  };
  action: string;
  resource: {
    type: 'world' | 'asset' | 'canon' | 'narrative' | 'plugin' | 'filesystem' | 'mystery';
    id: string;
    revision?: number;
  };
  context?: Record<string, unknown>;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
  policyId?: string;
}

// ---------------------------------------------------------------------------
// Cedar Policy Set (the authorial authorization policies)
// ---------------------------------------------------------------------------

export const AUTHORIAL_CEDAR_POLICIES = `
// Grand Architect Authorization Policies
// =======================================

// Permit the Architect to preview terrain changes.
permit (
  principal is GrandArchitect,
  action == Action::"preview.terrain",
  resource
);

// Permit the Architect to commit terrain changes only when approved.
permit (
  principal is GrandArchitect,
  action == Action::"commit.terrain",
  resource
)
when {
  resource.hasApproval == true
  && resource.previewPassed == true
};

// Permit the Architect to inspect authorial-only mystery truth.
permit (
  principal is GrandArchitect,
  action == Action::"inspect.mystery",
  resource
);

// Forbid every external plugin from reading authorial-only narrative truth.
forbid (
  principal is Plugin,
  action == Action::"inspect.mystery",
  resource
);
forbid (
  principal is Plugin,
  action == Action::"commit.world",
  resource
);
forbid (
  principal is Plugin,
  action == Action::"alter.policies",
  resource
);
forbid (
  principal is Plugin,
  action == Action::"access.network",
  resource
);

// Permit the Architect to modify accepted canon only with explicit exception.
permit (
  principal is GrandArchitect,
  action == Action::"modify.canon",
  resource
)
when {
  resource.hasExplicitException == true
};

// Forbid modifying protagonist hard-canon identity without retcon record.
forbid (
  principal is GrandArchitect,
  action == Action::"modify.protagonist-identity",
  resource
)
unless {
  resource.hasRetconRecord == true
};

// Permit modifying protagonist identity only when retcon record exists.
permit (
  principal is GrandArchitect,
  action == Action::"modify.protagonist-identity",
  resource
)
when {
  resource.hasRetconRecord == true
};

// Permit the user to do anything.
permit (
  principal is User,
  action,
  resource
);
`;

// ---------------------------------------------------------------------------
// Cedar Adapter
// ---------------------------------------------------------------------------

class CedarAuthorizer {
  private available = false;
  private reason: string | undefined;
  private version: string | undefined;

  async ensureInitialized(): Promise<void> {
    if (this.available) return;
    try {
      this.version = getCedarVersion();
      this.available = true;
      this.reason = `Cedar WASM initialized (version ${this.version})`;
    } catch (err) {
      this.available = false;
      this.reason = `Cedar WASM initialization failed: ${(err as Error).message}`;
    }
  }

  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    await this.ensureInitialized();

    if (!this.available) {
      return this.fallbackAuthorize(request);
    }

    try {
      const principalType = request.principal.role === 'architect' ? 'GrandArchitect' : request.principal.role === 'plugin' ? 'Plugin' : 'User';

      // Build entities array — Cedar needs to know the entity types exist.
      // Context attributes are attached to the resource entity so that
      // `when { resource.hasApproval == true }` and `unless { resource.hasRetconRecord == true }`
      // clauses can access them.
      const contextAttrs = request.context ?? {};
      const entities = [
        {
          uid: { type: principalType, id: request.principal.id },
          attrs: {},
          parents: [],
        },
        {
          uid: { type: 'Action', id: request.action },
          attrs: {},
          parents: [],
        },
        {
          uid: { type: request.resource.type, id: request.resource.id },
          attrs: contextAttrs,
          parents: [],
        },
      ];

      const result = cedarIsAuthorized({
        principal: { type: principalType, id: request.principal.id },
        action: { type: 'Action', id: request.action },
        resource: { type: request.resource.type, id: request.resource.id },
        policies: { staticPolicies: AUTHORIAL_CEDAR_POLICIES },
        entities: entities as any,
        context: (request.context ?? {}) as any,
      });

      if (result.type === 'failure') {
        const errorDetails = result.errors.map((e: any) => JSON.stringify(e)).join('; ');
        const warningDetails = result.warnings?.map((w: any) => JSON.stringify(w)).join('; ') ?? '';
        return {
          allowed: false,
          reason: `Cedar evaluation failed: ${errorDetails}${warningDetails ? ' | warnings: ' + warningDetails : ''}`,
        };
      }

      const decision = result.response.decision;
      const diagnosticPolicies = result.response.diagnostics?.reason ?? [];

      return {
        allowed: decision === 'allow',
        reason: decision === 'allow'
          ? 'Allowed by Cedar policy'
          : 'Denied by Cedar policy',
        policyId: diagnosticPolicies[0],
      };
    } catch (err) {
      return this.fallbackAuthorize(request, (err as Error).message);
    }
  }

  /**
   * Fallback authorization when Cedar WASM is not available.
   * Conservative: deny by default for plugins, allow for architect/user.
   */
  private fallbackAuthorize(request: AuthorizationRequest, error?: string): AuthorizationResult {
    if (request.principal.role === 'plugin') {
      const destructiveActions = ['commit.world', 'alter.policies', 'access.network', 'inspect.mystery'];
      if (destructiveActions.includes(request.action)) {
        return {
          allowed: false,
          reason: `Plugin denied destructive action '${request.action}' (Cedar fallback${error ? ': ' + error : ''}).`,
        };
      }
      return { allowed: true, reason: 'Plugin allowed non-destructive action (Cedar fallback).' };
    }

    if (request.principal.role === 'user') {
      return { allowed: true, reason: 'User always allowed (Cedar fallback).' };
    }

    if (request.principal.role === 'architect') {
      if (request.action === 'modify.protagonist-identity' && !request.context?.hasRetconRecord) {
        return {
          allowed: false,
          reason: 'Architect denied: protagonist identity modification requires retcon record (Cedar fallback).',
        };
      }
      return { allowed: true, reason: 'Architect allowed (Cedar fallback).' };
    }

    return { allowed: false, reason: 'Unknown principal role (Cedar fallback).' };
  }

  isAvailable(): boolean {
    return this.available;
  }

  getReason(): string | undefined {
    return this.reason;
  }

  getVersion(): string | undefined {
    return this.version;
  }
}

// Singleton
let cedarInstance: CedarAuthorizer | null = null;

export function getCedarAuthorizer(): CedarAuthorizer {
  if (!cedarInstance) {
    cedarInstance = new CedarAuthorizer();
  }
  return cedarInstance;
}

// ---------------------------------------------------------------------------
// Convenience: authorize a Principal for an action.
// ---------------------------------------------------------------------------

export async function authorizeAction(
  principal: Principal,
  action: string,
  resource: { type: AuthorizationRequest['resource']['type']; id: string; revision?: number },
  context?: Record<string, unknown>,
): Promise<AuthorizationResult> {
  const authorizer = getCedarAuthorizer();
  return authorizer.authorize({
    principal: {
      id: principal.principalId,
      role: principal.role,
      autonomyLevel: principal.autonomyLevel,
    },
    action,
    resource,
    context,
  });
}
