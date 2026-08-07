import type {
  AutonomyLevel,
  ArchitectRole,
  ArchitectSession,
  CommandRequest,
  CommandResponse,
  AuditRecord,
  AuditFilter,
  ToolContext,
  Tick,
} from './types';
import type { ToolRegistry } from './tool-protocol';
import type { PermissionSystem } from './permissions';
import type { AuditTrail, AuditEntry } from './audit';
import type { WorldOracle } from './world-oracle';
import type { CapabilityGraph } from './capability-graph';
import type { DecisionLedger } from './decision-ledger';
import { createHash } from 'crypto';

/**
 * The Architect Gateway.
 *
 * The single chokepoint through which all AI commands pass.
 * It is the security boundary between the AI and the engine.
 */

export interface ArchitectGateway {
  readonly tools: ToolRegistry;
  readonly permissions: PermissionSystem;
  readonly audit: AuditTrail;
  readonly oracle: WorldOracle;
  readonly capabilities: CapabilityGraph;
  readonly decisions: DecisionLedger;

  authenticate(params: AuthParams): ArchitectSession;
  isSessionValid(sessionId: string): boolean;
  getSession(sessionId: string): ArchitectSession | undefined;

  authorize(req: CommandRequest): AuthorizationOutcome;
  execute(req: CommandRequest): Promise<CommandResponse>;
  dispatch(req: CommandRequest): Promise<CommandResponse>;

  queryAudit(filter: AuditFilter): AuditRecord[];

  getTick(): Tick;
  getPluginHost(): unknown;
}

export interface AuthParams {
  principalId: string;
  role: ArchitectRole;
  autonomy: AutonomyLevel;
  humanAuthorization: { humanId: string };
  sessionTtlMs?: number;
}

export type AuthorizationOutcome =
  | { allowed: true; toolName: string }
  | { allowed: false; reason: string; code: string };

export interface GatewayDeps {
  tools: ToolRegistry;
  permissions: PermissionSystem;
  audit: AuditTrail;
  oracle: WorldOracle;
  capabilities: CapabilityGraph;
  decisions: DecisionLedger;
  getTick: () => Tick;
  pluginHost?: unknown;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createArchitectGateway(deps: GatewayDeps): ArchitectGateway {
  const sessions = new Map<string, ArchitectSession>();

  function authenticate(params: AuthParams): ArchitectSession {
    const sessionId = 'session-' + crypto.randomUUID();
    const now = Date.now();
    const ttl = params.sessionTtlMs ?? 15 * 60 * 1000;

    const session: ArchitectSession = {
      sessionId,
      principalId: params.principalId,
      role: params.role,
      autonomy: params.autonomy,
      capabilities: [],
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttl).toISOString(),
      renewalToken: 'renewal-' + crypto.randomUUID(),
    };

    sessions.set(sessionId, session);
    return session;
  }

  function isSessionValid(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;
    return new Date(session.expiresAt).getTime() > Date.now();
  }

  function getSession(sessionId: string): ArchitectSession | undefined {
    const session = sessions.get(sessionId);
    if (!session) return undefined;
    if (new Date(session.expiresAt).getTime() <= Date.now()) return undefined;
    return session;
  }

  function authorize(req: CommandRequest): AuthorizationOutcome {
    const session = getSession(req.sessionId);
    if (!session) {
      return { allowed: false, reason: 'Session not found or expired', code: 'SessionExpired' };
    }

    const toolDesc = deps.tools.describe(req.tool);
    if (!toolDesc) {
      return { allowed: false, reason: `Tool '${req.tool}' not found`, code: 'ToolNotFound' };
    }

    const authResult = deps.permissions.authorize(
      session,
      req.tool,
      toolDesc.requiresAutonomy,
      req.capabilityToken,
    );

    if (!authResult.allowed) {
      const reason = authResult.reason;
      return {
        allowed: false,
        reason: JSON.stringify(reason),
        code: reason.kind,
      };
    }

    return { allowed: true, toolName: req.tool };
  }

  async function execute(req: CommandRequest): Promise<CommandResponse> {
    const session = getSession(req.sessionId)!;
    const startWall = Date.now();

    const context: ToolContext = {
      sessionId: req.sessionId,
      principalId: session.principalId,
      role: session.role,
      autonomy: req.assertedAutonomy,
      tick: deps.getTick(),
    };

    const toolResult = await deps.tools.dispatch(req.tool, req.args, context);

    const wallMs = Date.now() - startWall;

    const auditRecord = deps.audit.append({
      agent: { principalId: session.principalId, role: session.role },
      human: { principalId: 'cron-agent' },
      tool: req.tool,
      args: req.args,
      reason: 'architect command',
      result: {
        status: toolResult.ok ? 'ok' : 'error',
        summary: toolResult.ok ? 'success' : toolResult.error.message,
      },
      capabilityTokenHash: req.capabilityToken ? hashToken(req.capabilityToken) : 'none',
      autonomy: req.assertedAutonomy,
      sessionId: req.sessionId,
      cost: { cpuMs: wallMs, wallMs },
      tick: deps.getTick(),
    });

    if (toolResult.ok) {
      return {
        requestId: req.requestId,
        status: 'ok',
        result: toolResult.data,
        audit: auditRecord,
      };
    } else {
      return {
        requestId: req.requestId,
        status: 'error',
        error: toolResult.error,
        audit: auditRecord,
      };
    }
  }

  async function dispatch(req: CommandRequest): Promise<CommandResponse> {
    const auth = authorize(req);
    if (!auth.allowed) {
      const session = getSession(req.sessionId);
      const auditRecord = deps.audit.append({
        agent: { principalId: session?.principalId ?? 'unknown', role: session?.role ?? 'Architect' },
        human: { principalId: 'cron-agent' },
        tool: req.tool,
        args: req.args,
        reason: 'architect command (denied)',
        result: { status: 'error', summary: auth.reason },
        capabilityTokenHash: 'none',
        autonomy: req.assertedAutonomy,
        sessionId: req.sessionId,
        cost: { cpuMs: 0, wallMs: 0 },
        tick: deps.getTick(),
      });

      return {
        requestId: req.requestId,
        status: 'error',
        error: { code: auth.code, message: auth.reason },
        audit: auditRecord,
      };
    }

    return execute(req);
  }

  function queryAudit(filter: AuditFilter): AuditRecord[] {
    return deps.audit.query(filter);
  }

  return {
    tools: deps.tools,
    permissions: deps.permissions,
    audit: deps.audit,
    oracle: deps.oracle,
    capabilities: deps.capabilities,
    decisions: deps.decisions,

    authenticate,
    isSessionValid,
    getSession,
    authorize,
    execute,
    dispatch,
    queryAudit,
    getTick: deps.getTick,
    getPluginHost: () => deps.pluginHost,
  };
}
