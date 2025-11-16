import { describe, it, expect } from 'vitest';
import { getWeather } from './weather';

describe('Weather API', () => {
  describe('getWeather', () => {
    it('should return weather forecast for a date range', async () => {
      const result = await getWeather('Paris', '2024-06-01', '2024-06-03');

      expect(result.location).toBe('Paris');
      expect(result.startDate).toBe('2024-06-01');
      expect(result.endDate).toBe('2024-06-03');
      expect(result.forecast).toBeDefined();
      expect(result.forecast.length).toBe(3);
    });

    it('should include temperature data for each day', async () => {
      const result = await getWeather('London', '2024-07-01', '2024-07-02');

      result.forecast.forEach((day) => {
        expect(day.date).toBeDefined();
        expect(day.temperature.high).toBeGreaterThan(0);
        expect(day.temperature.low).toBeGreaterThan(0);
        expect(day.conditions).toBeDefined();
      });
    });

    it('should handle single day trips', async () => {
      const result = await getWeather('Tokyo', '2024-08-15', '2024-08-15');

      expect(result.forecast.length).toBe(1);
    });
  });
});
