/**
 * Tool definition interface for LLM tool calling
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Tool invocation from LLM
 */
export interface ToolInvocation {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  id: string;
  name: string;
  result?: unknown;
  error?: string;
  durationMs?: number;
}
