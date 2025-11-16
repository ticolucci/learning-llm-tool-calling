import type { ToolDefinition } from '../types';
import { db } from '@/lib/db';
import { checklists, checklistItems } from '@/lib/schema';
import { nanoid } from 'nanoid';

/**
 * Checklist creation tool - creates a packing checklist
 */
export const checklistTool: ToolDefinition = {
  name: 'create_checklist',
  description: 'Creates a packing checklist for a trip',
  parameters: {
    type: 'object',
    properties: {
      conversationId: {
        type: 'string',
        description: 'The conversation ID to associate the checklist with',
      },
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
    required: ['conversationId', 'destination', 'startDate', 'endDate', 'items'],
  },
  execute: async (params) => {
    try {
      // Validate required conversationId
      if (!params.conversationId) {
        return {
          success: false,
          error: 'conversationId is required',
        };
      }

      // Create the checklist
      const [checklist] = await db
        .insert(checklists)
        .values({
          id: nanoid(),
          conversationId: params.conversationId,
          destination: params.destination,
          startDate: params.startDate,
          endDate: params.endDate,
        })
        .returning();

      // Create checklist items
      if (params.items && params.items.length > 0) {
        const itemsToInsert = params.items.map((item: {
          item: string;
          category?: string;
          quantity?: number;
        }) => ({
          id: nanoid(),
          checklistId: checklist.id,
          item: item.item,
          category: item.category || null,
          quantity: item.quantity || 1,
        }));

        await db.insert(checklistItems).values(itemsToInsert).returning();
      }

      return {
        success: true,
        checklistId: checklist.id,
        message: `Created checklist for ${params.destination} with ${params.items.length} items`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checklist',
      };
    }
  },
};
