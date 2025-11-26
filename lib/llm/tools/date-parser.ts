import type { ToolDefinition } from '../types';

/**
 * Date parsing tool - converts human-readable dates to YYYY-MM-DD format
 */
export const dateParserTool: ToolDefinition = {
  name: 'parse_date',
  description:
    'Converts human-readable date strings into YYYY-MM-DD format. ' +
    'Supports formats like "today", "tomorrow", "two days from now", ' +
    '"today + 2 days", "next week", "next Friday", etc.',
  parameters: {
    type: 'object',
    properties: {
      dateString: {
        type: 'string',
        description:
          'Human-readable date string to parse (e.g., "today", "next week", "2 days from now")',
      },
    },
    required: ['dateString'],
  },
  execute: async (params) => {
    const { dateString } = params as { dateString: string };

    // Import the actual date parser implementation
    const { parseHumanDate } = await import('@/lib/date-parser');

    try {
      const parsedDate = parseHumanDate(dateString);
      return {
        success: true,
        date: parsedDate,
        originalInput: dateString,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalInput: dateString,
      };
    }
  },
};
