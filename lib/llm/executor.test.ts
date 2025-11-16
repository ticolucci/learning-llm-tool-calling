import { describe, it, expect, beforeEach } from 'vitest';
import { executeTool } from './executor';
import { toolRegistry } from './registry';
import type { ToolDefinition, ToolInvocation } from './types';

describe('Tool Executor', () => {
  // Sample test tool
  const mockTool: ToolDefinition = {
    name: 'test_tool',
    description: 'A test tool',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
    execute: async (params) => {
      return { echo: params.message };
    },
  };

  beforeEach(() => {
    // Register mock tool for testing
    if (!toolRegistry.has('test_tool')) {
      toolRegistry.register(mockTool);
    }
  });

  describe('executeTool', () => {
    it('should execute a tool successfully', async () => {
      const invocation: ToolInvocation = {
        id: 'inv-123',
        name: 'test_tool',
        parameters: { message: 'Hello' },
      };

      const result = await executeTool(invocation);

      expect(result.id).toBe('inv-123');
      expect(result.name).toBe('test_tool');
      expect(result.result).toEqual({ echo: 'Hello' });
      expect(result.error).toBeUndefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle tool not found error', async () => {
      const invocation: ToolInvocation = {
        id: 'inv-456',
        name: 'nonexistent_tool',
        parameters: {},
      };

      const result = await executeTool(invocation);

      expect(result.id).toBe('inv-456');
      expect(result.error).toBe('Tool "nonexistent_tool" not found');
      expect(result.result).toBeUndefined();
    });

    it('should measure execution duration', async () => {
      const invocation: ToolInvocation = {
        id: 'inv-789',
        name: 'test_tool',
        parameters: { message: 'Test' },
      };

      const result = await executeTool(invocation);

      expect(result.durationMs).toBeDefined();
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs!).toBeGreaterThanOrEqual(0);
    });
  });
});
