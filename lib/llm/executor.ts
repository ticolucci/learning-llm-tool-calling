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
    const durationMs = Math.round(performance.now() - startTime);

    return {
      id: invocation.id,
      name: invocation.name,
      result,
      durationMs,
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);

    return {
      id: invocation.id,
      name: invocation.name,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs,
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
