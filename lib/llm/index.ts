/**
 * LLM integration entry point
 * Registers all tools and exports the tool registry
 */

import { toolRegistry } from './registry';
import { weatherTool } from './tools/weather';
import { dateParserTool } from './tools/date-parser';

// Register all tools
toolRegistry.register(weatherTool);
toolRegistry.register(dateParserTool);

// Re-export for convenience
export { toolRegistry } from './registry';
export { executeTool, executeTools } from './executor';
export * from './types';
