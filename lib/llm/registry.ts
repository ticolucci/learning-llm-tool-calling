import type { ToolDefinition } from './types';

/**
 * Tool registry - centralized storage for all available tools
 */
class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  /**
   * Register a new tool
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
