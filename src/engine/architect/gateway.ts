/**
 * Architect Gateway — the security boundary between the AI and the engine.
 *
 * All AI actions flow through the gateway. The gateway:
 * - Authenticates sessions
 * - Enforces authority levels
 * - Routes tool dispatches through the tool registry
 * - Records every action in the audit log
 * - Enforces approval gates for protected actions
 */

import type { AuthorityLevel, ToolResult, AuditRecord } from './types';
import type { ToolRegistry } from './tool-protocol';
import type { WorldOracle } from './world-oracle';
import type { DecisionLedger } from './decision-ledger';
import type { CapabilityGraph } from './capability-graph';
import type { AuditLog } from './audit';
import { createToolRegistry } from './tool-protocol';
import { createAuditLog } from './audit';
import { createWorldOracle } from './world-oracle';
import { createDecisionLedger } from './decision-ledger';
import { createCapabilityGraph } from './capability-graph';
import { checkPermission, requiresHumanApproval, isProtectedFile } from './permissions';
import type { PluginHost } from '../kernel/plugin-host';

export interface ArchitectSession {
  id: string;
  authority: AuthorityLevel;
  createdAt: number;
  lastActivity: number;
}

export interface ArchitectGateway {
  // Session management
  createSession(authority: AuthorityLevel): ArchitectSession;
  destroySession(sessionId: string): void;
  getSession(sessionId: string): ArchitectSession | undefined;

  // Tool dispatch (the AI's primary interface)
  executeTool(sessionId: string, toolId: string, params: Record<string, unknown>): Promise<ToolResult>;

  // Resource access (read-only)
  queryResource(sessionId: string, uri: string): Promise<unknown>;
  searchResources(sessionId: string, query: string): Promise<unknown>;

  // Approval gates
  requestApproval(sessionId: string, action: string, detail: string): { approved: boolean; reason: string };

  // Subsystem access (for the engine to query)
  readonly tools: ToolRegistry;
  readonly audit: AuditLog;
  readonly oracle: WorldOracle;
  readonly decisions: DecisionLedger;
  readonly capabilities: CapabilityGraph;
}

export function createArchitectGateway(host: PluginHost): ArchitectGateway {
  const audit = createAuditLog();
  const tools = createToolRegistry(checkPermission, audit.record.bind(audit));
  const oracle = createWorldOracle(host);
  const decisions = createDecisionLedger();
  const capabilities = createCapabilityGraph();

  const sessions = new Map<string, ArchitectSession>();

  function createSession(authority: AuthorityLevel): ArchitectSession {
    const session: ArchitectSession = {
      id: crypto.randomUUID(),
      authority,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    sessions.set(session.id, session);
    return session;
  }

  function destroySession(sessionId: string) {
    sessions.delete(sessionId);
  }

  function getSession(sessionId: string): ArchitectSession | undefined {
    const session = sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  async function executeTool(
    sessionId: string,
    toolId: string,
    params: Record<string, unknown>
  ): Promise<ToolResult> {
    const session = getSession(sessionId);
    if (!session) {
      return { ok: false, error: 'Invalid or expired session' };
    }

    // Check if this action requires human approval
    if (requiresHumanApproval(toolId)) {
      return {
        ok: false,
        error: `Action ${toolId} requires explicit human approval. Use requestApproval().`,
      };
    }

    return tools.dispatch(toolId, params, {
      authority: session.authority,
      requestId: crypto.randomUUID(),
      pluginId: 'architect',
    });
  }

  async function queryResource(sessionId: string, uri: string): Promise<unknown> {
    const session = getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }
    return oracle.query(uri);
  }

  async function searchResources(sessionId: string, query: string): Promise<unknown> {
    const session = getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }
    return oracle.search(query);
  }

  function requestApproval(
    sessionId: string,
    action: string,
    detail: string
  ): { approved: boolean; reason: string } {
    // In a full implementation, this would:
    // 1. Notify the human operator
    // 2. Wait for approval (async)
    // 3. Return the result
    // For now, ALL approval requests are denied in autonomous mode.
    // The human must manually approve by running the action themselves.

    audit.record({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      requestId: sessionId,
      actor: 'ai',
      authority: getSession(sessionId)?.authority || 'observe',
      action: `approval-request:${action}`,
      params: { action, detail },
      result: 'denied',
      durationMs: 0,
      detail: 'Autonomous approval denied — requires human operator',
    });

    return {
      approved: false,
      reason: `Action "${action}" requires human approval. In autonomous mode, all approval requests are denied. Description: ${detail}`,
    };
  }

  return {
    createSession,
    destroySession,
    getSession,
    executeTool,
    queryResource,
    searchResources,
    requestApproval,
    tools,
    audit,
    oracle,
    decisions,
    capabilities,
  };
}
