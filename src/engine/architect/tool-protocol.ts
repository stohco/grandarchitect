import type {
  ArchitectTool,
  ToolCategory,
  AutonomyLevel,
  ToolHandler,
  ToolContext,
  ToolResult,
  JsonSchema,
  ToolPermission,
  PluginId,
} from './types';
import { autonomyRank } from './types';

/**
 * The Tool Registry.
 *
 * Every tool the AI can call must be registered here.
 * The registry is the source of truth: if a tool is not registered,
 * the Gateway refuses the call.
 */

export interface ToolRegistry {
  /** Register a tool. Returns error string on failure, undefined on success. */
  register(registration: ToolRegistrationInput): string | undefined;
  /** Unregister a tool by name. */
  unregister(toolName: string): boolean;
  /** Dispatch a tool call. */
  dispatch(toolName: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
  /** List all tools, optionally filtered. */
  list(filter?: ToolListFilter): ToolDescriptor[];
  /** Describe a single tool. */
  describe(toolName: string): ToolDescriptor | undefined;
  /** Check if a tool exists. */
  has(toolName: string): boolean;
}

/** Input to register() — the handler is separate from the schema. */
export interface ToolRegistrationInput {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  requiresPermissions: ToolPermission[];
  requiresAutonomy: AutonomyLevel;
  mutatesState: boolean;
  maxWallClockMs: number;
  maxMemoryMiB: number;
  longRunning: boolean;
  registeredBy: PluginId;
  handler: ToolHandler;
}

/** A tool descriptor (no handler — safe to serialize/send to AI). */
export interface ToolDescriptor {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  requiresPermissions: ToolPermission[];
  requiresAutonomy: AutonomyLevel;
  mutatesState: boolean;
  longRunning: boolean;
  registeredBy: PluginId;
}

export interface ToolListFilter {
  category?: ToolCategory;
  requiresAutonomy?: AutonomyLevel;
  prefix?: string;
  registeredBy?: PluginId;
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, ArchitectTool>();

  function register(input: ToolRegistrationInput): string | undefined {
    if (tools.has(input.name)) {
      return `Tool '${input.name}' already registered`;
    }

    const tool: ArchitectTool = {
      name: input.name,
      description: input.description,
      category: input.category,
      inputSchema: input.inputSchema,
      outputSchema: input.outputSchema,
      requiresPermissions: input.requiresPermissions,
      requiresAutonomy: input.requiresAutonomy,
      mutatesState: input.mutatesState,
      budget: {
        maxWallClockMs: input.maxWallClockMs,
        maxCpuMs: input.maxWallClockMs, // default CPU = wall
        maxMemoryMiB: input.maxMemoryMiB,
      },
      longRunning: input.longRunning,
      registeredBy: input.registeredBy,
      handler: input.handler,
    };

    tools.set(input.name, tool);
    return undefined;
  }

  function unregister(toolName: string): boolean {
    return tools.delete(toolName);
  }

  async function dispatch(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = tools.get(toolName);
    if (!tool) {
      return { ok: false, error: { code: 'ToolNotFound', message: `Tool '${toolName}' not found` } };
    }

    try {
      const result = await tool.handler(params, context);
      return result;
    } catch (e) {
      return { ok: false, error: { code: 'InternalError', message: String(e) } };
    }
  }

  function toDescriptor(tool: ArchitectTool): ToolDescriptor {
    return {
      name: tool.name,
      description: tool.description,
      category: tool.category,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      requiresPermissions: tool.requiresPermissions,
      requiresAutonomy: tool.requiresAutonomy,
      mutatesState: tool.mutatesState,
      longRunning: tool.longRunning,
      registeredBy: tool.registeredBy,
    };
  }

  function list(filter?: ToolListFilter): ToolDescriptor[] {
    let result = Array.from(tools.values());

    if (filter?.category) {
      result = result.filter(t => t.category === filter.category);
    }
    if (filter?.prefix) {
      result = result.filter(t => t.name.startsWith(filter.prefix!));
    }
    if (filter?.registeredBy) {
      result = result.filter(t => t.registeredBy === filter.registeredBy);
    }
    // requiresAutonomy filter: return tools usable AT this level or below
    // (i.e., requiresAutonomy <= filter.requiresAutonomy)
    if (filter?.requiresAutonomy) {
      const rank = autonomyRank(filter.requiresAutonomy);
      result = result.filter(t => autonomyRank(t.requiresAutonomy) <= rank);
    }

    return result.map(toDescriptor);
  }

  function describe(toolName: string): ToolDescriptor | undefined {
    const tool = tools.get(toolName);
    return tool ? toDescriptor(tool) : undefined;
  }

  function has(toolName: string): boolean {
    return tools.has(toolName);
  }

  return { register, unregister, dispatch, list, describe, has };
}
