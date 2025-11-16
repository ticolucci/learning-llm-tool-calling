import type { ToolDefinition } from '../types';

/**
 * Checklist creation tool - creates a packing checklist
 */
export const checklistTool: ToolDefinition = {
  name: 'create_checklist',
  description: 'Creates a packing checklist for a trip',
  parameters: {
    type: 'object',
    properties: {
      destination: {
        type: 'string',
        description: 'Trip destination',
      },
      startDate: {
        type: 'string',
        description: 'Trip start date (YYYY-MM-DD)',
      },
      endDate: {
        type: 'string',
        description: 'Trip end date (YYYY-MM-DD)',
      },
      items: {
        type: 'array',
        description: 'List of items to pack',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string' },
            category: { type: 'string' },
            quantity: { type: 'number' },
          },
        },
      },
    },
    required: ['destination', 'startDate', 'endDate', 'items'],
  },
  execute: async (params) => {
    // TODO: Implement checklist creation in database
    // For now, just return the params
    return {
      success: true,
      checklist: params,
    };
  },
};
