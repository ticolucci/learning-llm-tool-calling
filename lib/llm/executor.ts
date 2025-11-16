import type { ToolInvocation, ToolResult } from './types';
import { toolRegistry } from './registry';

/**
 * Execute a tool invocation
 */
export async function executeTool(
  invocation: ToolInvocation
): Promise<ToolResult> {
  const startTime = performance.now();

  try {
    const tool = toolRegistry.get(invocation.name);

    if (!tool) {
      throw new Error(`Tool "${invocation.name}" not found`);
    }

    const result = await tool.execute(invocation.parameters);

    return {
      id: invocation.id,
      name: invocation.name,
      result,
      durationMs: Math.round(performance.now() - startTime),
    };
  } catch (error) {
    return {
      id: invocation.id,
      name: invocation.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Math.round(performance.now() - startTime),
    };
  }
}

/**
 * Execute multiple tool invocations in parallel
 */
export async function executeTools(
  invocations: ToolInvocation[]
): Promise<ToolResult[]> {
  return Promise.all(invocations.map(executeTool));
}
