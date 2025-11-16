/**
 * LLM integration entry point
 * Registers all tools and exports the tool registry
 */

import { toolRegistry } from './registry';
import { weatherTool } from './tools/weather';
import { checklistTool } from './tools/checklist';

// Register all tools
toolRegistry.register(weatherTool);
toolRegistry.register(checklistTool);

// Re-export for convenience
export { toolRegistry } from './registry';
export { executeTool, executeTools } from './executor';
export * from './types';
