import type {
  AutonomyLevel,
  ArchitectRole,
  ArchitectSession,
  AuthorizationResult,
  RoleProfile,
} from './types';
import { autonomyGte } from './types';
import { randomBytes } from 'crypto';

/**
 * The permission subsystem. It provides:
 *   1. Role profiles (what each role may do)
 *   2. Authorization checks (can this session call this tool at this autonomy?)
 *   3. Capability token management (issue, consume, validate)
 */

export interface PermissionSystem {
  /** Get a role profile. */
  getRoleProfile(role: ArchitectRole): RoleProfile | undefined;
  /** Register a role profile. */
  registerRole(profile: RoleProfile): void;
  /** Authorize a tool call for a session. */
  authorize(
    session: ArchitectSession,
    tool: string,
    requiresAutonomy: AutonomyLevel,
    capabilityToken?: string,
  ): AuthorizationResult;
  /** Issue a new capability token. */
  issueCapabilityToken(params: TokenParams): string;
  /** Validate and consume a single-use token. Returns true if valid. */
  consumeToken(token: string, tool: string, sessionId: string): boolean;
  /** Check whether an action requires human approval at the given autonomy. */
  requiresHumanApproval(action: string, autonomy: AutonomyLevel): boolean;
}

export interface TokenParams {
  sessionId: string;
  tool: string;
  maxAutonomy: AutonomyLevel;
  singleUse: boolean;
  ttlMs: number;
  grantedBy: string;
}

interface StoredToken {
  token: string;
  sessionId: string;
  tool: string;
  maxAutonomy: AutonomyLevel;
  singleUse: boolean;
  expiresAt: number;
  consumed: boolean;
  grantedBy: string;
}

/** Actions that are hard-gated: require human approval regardless of autonomy. */
const HARD_GATED_ACTIONS = new Set([
  'world.delete',
  'migration.rewrite',
  'permissions.change',
  'dependency.import',
  'system.remove',
  'build.publish',
  'credentials.access',
  'architect.modify',
]);

export function createPermissionSystem(): PermissionSystem {
  const roles = new Map<ArchitectRole, RoleProfile>();
  const tokens = new Map<string, StoredToken>();

  function generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  // Register default role profiles
  const defaultRoles: RoleProfile[] = [
    {
      role: 'Architect',
      allowedTools: ['*'],
      autonomyCeiling: 'Branch',
      mayEscalate: true,
      requiresReview: false,
    },
    {
      role: 'Researcher',
      allowedTools: ['engine.describe', 'engine.explain', 'world.query', 'oracle.search', 'research.*'],
      autonomyCeiling: 'Sandbox',
      mayEscalate: true,
      requiresReview: true,
    },
    {
      role: 'Implementer',
      allowedTools: ['engine.describe', 'engine.explain', 'world.query', 'definition.patch', 'template.create', 'plugin.scaffold', 'code.edit', 'test.run'],
      autonomyCeiling: 'Branch',
      mayEscalate: true,
      requiresReview: true,
    },
    {
      role: 'Reviewer',
      allowedTools: ['engine.describe', 'engine.explain', 'world.query', 'oracle.search', 'critique.submit'],
      autonomyCeiling: 'Preview',
      mayEscalate: false,
      requiresReview: false,
    },
    {
      role: 'VlmPlaytester',
      allowedTools: ['engine.describe', 'vlm.capture', 'vlm.playtest', 'playtest.launch'],
      autonomyCeiling: 'Preview',
      mayEscalate: true,
      requiresReview: true,
    },
    {
      role: 'PerformanceAuditor',
      allowedTools: ['engine.describe', 'engine.explain', 'benchmark.run', 'profiler.capture'],
      autonomyCeiling: 'Preview',
      mayEscalate: false,
      requiresReview: true,
    },
    {
      role: 'SimulationAuditor',
      allowedTools: ['engine.describe', 'engine.explain', 'simulation.runYears', 'replay.verify'],
      autonomyCeiling: 'Preview',
      mayEscalate: false,
      requiresReview: true,
    },
    {
      role: 'SecurityReviewer',
      allowedTools: ['engine.describe', 'engine.explain', 'audit.query', 'dependency.inspect', 'permission.audit'],
      autonomyCeiling: 'Preview',
      mayEscalate: true,
      requiresReview: true,
    },
  ];

  for (const profile of defaultRoles) {
    roles.set(profile.role, profile);
  }

  function getRoleProfile(role: ArchitectRole): RoleProfile | undefined {
    return roles.get(role);
  }

  function registerRole(profile: RoleProfile): void {
    roles.set(profile.role, profile);
  }

  function toolMatchesPattern(tool: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('.*')) {
      return tool.startsWith(pattern.slice(0, -1));
    }
    return tool === pattern;
  }

  function authorize(
    session: ArchitectSession,
    tool: string,
    requiresAutonomy: AutonomyLevel,
    capabilityToken?: string,
  ): AuthorizationResult {
    // 1. Check role is allowed this tool
    const profile = roles.get(session.role);
    if (!profile) {
      return { allowed: false, reason: { kind: 'RoleNotAllowed', role: session.role, tool } };
    }

    const toolAllowed = profile.allowedTools.some(p => toolMatchesPattern(tool, p));
    if (!toolAllowed) {
      return { allowed: false, reason: { kind: 'RoleNotAllowed', role: session.role, tool } };
    }

    // 2. Check autonomy level
    if (!autonomyGte(session.autonomy, requiresAutonomy)) {
      return { allowed: false, reason: { kind: 'AutonomyExceeded', required: requiresAutonomy, asserted: session.autonomy } };
    }

    // 3. Check capability token for state-mutating tools
    if (capabilityToken) {
      const valid = consumeToken(capabilityToken, tool, session.sessionId);
      if (!valid) {
        return { allowed: false, reason: { kind: 'TokenInvalid', reason: 'token not found, expired, already consumed, or wrong scope' } };
      }
    }

    return { allowed: true };
  }

  function issueCapabilityToken(params: TokenParams): string {
    const token = generateToken();
    const stored: StoredToken = {
      token,
      sessionId: params.sessionId,
      tool: params.tool,
      maxAutonomy: params.maxAutonomy,
      singleUse: params.singleUse,
      expiresAt: Date.now() + params.ttlMs,
      consumed: false,
      grantedBy: params.grantedBy,
    };
    tokens.set(token, stored);
    return token;
  }

  function consumeToken(token: string, tool: string, sessionId: string): boolean {
    const stored = tokens.get(token);
    if (!stored) return false;
    if (stored.consumed) return false;
    if (Date.now() > stored.expiresAt) return false;
    if (stored.sessionId !== sessionId) return false;
    if (stored.tool !== tool) return false;

    if (stored.singleUse) {
      stored.consumed = true;
    }
    return true;
  }

  function requiresHumanApproval(action: string, autonomy: AutonomyLevel): boolean {
    if (HARD_GATED_ACTIONS.has(action)) return true;
    if (action === 'main.merge' && autonomy !== 'Release') return true;
    return false;
  }

  return {
    getRoleProfile,
    registerRole,
    authorize,
    issueCapabilityToken,
    consumeToken,
    requiresHumanApproval,
  };
}
