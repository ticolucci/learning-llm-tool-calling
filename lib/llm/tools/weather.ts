import type { ToolDefinition } from '../types';

/**
 * Weather tool - fetches weather forecast for a location and date range
 */
export const weatherTool: ToolDefinition = {
  name: 'get_weather',
  description: 'Fetches weather forecast for a location and date range',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or coordinates',
      },
      startDate: {
        type: 'string',
        description: 'Start date (YYYY-MM-DD)',
      },
      endDate: {
        type: 'string',
        description: 'End date (YYYY-MM-DD)',
      },
    },
    required: ['location', 'startDate', 'endDate'],
  },
  execute: async (params) => {
    const { location, startDate, endDate } = params as {
      location: string;
      startDate: string;
      endDate: string;
    };

    // Import the actual weather implementation
    const { getWeather } = await import('@/lib/weather');
    return getWeather(location, startDate, endDate);
  },
};
