/**
 * Tool Protocol — the typed tool registry and dispatch system.
 *
 * Plugins register tools. The architect dispatches them.
 * Every tool call is permission-checked and audit-logged.
 */

import type { ArchitectTool, ToolContext, ToolResult, AuthorityLevel, PermissionCheck, AuditRecord } from './types';
import type { Result } from '../kernel/types';

export interface ToolRegistry {
  register(tool: ArchitectTool): Result<void>;
  unregister(toolId: string): Result<void>;
  dispatch(toolId: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
  list(): ArchitectTool[];
  describe(toolId: string): ArchitectTool | undefined;
  listByAuthority(authority: AuthorityLevel): ArchitectTool[];
}

export function createToolRegistry(
  checkPermission: (authority: AuthorityLevel, toolId: string) => PermissionCheck,
  recordAudit: (record: AuditRecord) => void,
): ToolRegistry {
  const tools = new Map<string, ArchitectTool>();

  return {
    register(tool) {
      if (tools.has(tool.id)) {
        return { ok: false, error: `Tool ${tool.id} already registered` };
      }
      tools.set(tool.id, tool);
      return { ok: true, value: undefined };
    },

    unregister(toolId) {
      if (!tools.has(toolId)) {
        return { ok: false, error: `Tool ${toolId} not found` };
      }
      tools.delete(toolId);
      return { ok: true, value: undefined };
    },

    async dispatch(toolId, params, context) {
      const tool = tools.get(toolId);
      if (!tool) {
        return { ok: false, error: `Tool ${toolId} not found` };
      }

      // Permission check
      const perm = checkPermission(context.authority, toolId);
      if (!perm.allowed) {
        recordAudit({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          requestId: context.requestId,
          actor: context.pluginId || 'ai',
          authority: context.authority,
          action: toolId,
          params,
          result: 'denied',
          durationMs: 0,
          detail: perm.reason,
        });
        return { ok: false, error: `Permission denied: ${perm.reason || 'insufficient authority'}` };
      }

      // Validate required params
      for (const [name, spec] of Object.entries(tool.inputSchema)) {
        if (spec.required && !(name in params)) {
          return { ok: false, error: `Missing required parameter: ${name}` };
        }
      }

      // Execute
      const start = Date.now();
      try {
        const result = await tool.execute(params, context);
        const durationMs = Date.now() - start;

        recordAudit({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          requestId: context.requestId,
          actor: context.pluginId || 'ai',
          authority: context.authority,
          action: toolId,
          params,
          result: result.ok ? 'success' : 'failure',
          durationMs,
          detail: result.error,
        });

        return {
          ...result,
          metadata: {
            ...result.metadata,
            durationMs: result.metadata?.durationMs ?? durationMs,
          },
        };
      } catch (e) {
        const durationMs = Date.now() - start;
        const error = e instanceof Error ? e.message : String(e);

        recordAudit({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          requestId: context.requestId,
          actor: context.pluginId || 'ai',
          authority: context.authority,
          action: toolId,
          params,
          result: 'error',
          durationMs,
          detail: error,
        });

        return { ok: false, error: `Tool ${toolId} crashed: ${error}` };
      }
    },

    list() {
      return Array.from(tools.values());
    },

    describe(toolId) {
      return tools.get(toolId);
    },

    listByAuthority(authority) {
      const levels: AuthorityLevel[] = ['observe', 'diagnose', 'sandbox', 'branch', 'integrate', 'release'];
      const maxLevel = levels.indexOf(authority);
      return Array.from(tools.values()).filter(t => levels.indexOf(t.authorityRequired) <= maxLevel);
    },
  };
}
