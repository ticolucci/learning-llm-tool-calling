import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseHumanDate } from './date-parser';

describe('parseHumanDate', () => {
  beforeEach(() => {
    // Mock the current date to 2025-11-18 for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-11-18T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('absolute dates', () => {
    it('parses "today" to current date', () => {
      const result = parseHumanDate('today');
      expect(result).toBe('2025-11-18');
    });

    it('parses "tomorrow" to next day', () => {
      const result = parseHumanDate('tomorrow');
      expect(result).toBe('2025-11-19');
    });

    it('parses "yesterday" to previous day', () => {
      const result = parseHumanDate('yesterday');
      expect(result).toBe('2025-11-17');
    });
  });

  describe('relative dates with "from now"', () => {
    it('parses "two days from now"', () => {
      const result = parseHumanDate('two days from now');
      expect(result).toBe('2025-11-20');
    });

    it('parses "2 days from now"', () => {
      const result = parseHumanDate('2 days from now');
      expect(result).toBe('2025-11-20');
    });

    it('parses "1 week from now"', () => {
      const result = parseHumanDate('1 week from now');
      expect(result).toBe('2025-11-25');
    });

    it('parses "3 weeks from now"', () => {
      const result = parseHumanDate('3 weeks from now');
      expect(result).toBe('2025-12-09');
    });
  });

  describe('addition syntax', () => {
    it('parses "today + 2 days"', () => {
      const result = parseHumanDate('today + 2 days');
      expect(result).toBe('2025-11-20');
    });

    it('parses "today + 1 week"', () => {
      const result = parseHumanDate('today + 1 week');
      expect(result).toBe('2025-11-25');
    });

    it('parses "today+2days" (no spaces)', () => {
      const result = parseHumanDate('today+2days');
      expect(result).toBe('2025-11-20');
    });
  });

  describe('week references', () => {
    it('parses "next week" to next Monday (date-fns default)', () => {
      // If today is Tuesday 2025-11-18, next week (next Monday) is 2025-11-24
      const result = parseHumanDate('next week');
      expect(result).toBe('2025-11-24');
    });

    it('parses "next Monday"', () => {
      // From Tuesday 2025-11-18, next Monday is 2025-11-24
      const result = parseHumanDate('next Monday');
      expect(result).toBe('2025-11-24');
    });

    it('parses "next Friday"', () => {
      // From Tuesday 2025-11-18, next Friday is 2025-11-21
      const result = parseHumanDate('next Friday');
      expect(result).toBe('2025-11-21');
    });
  });

  describe('word numbers', () => {
    it('parses "one day from now"', () => {
      const result = parseHumanDate('one day from now');
      expect(result).toBe('2025-11-19');
    });

    it('parses "three weeks from now"', () => {
      const result = parseHumanDate('three weeks from now');
      expect(result).toBe('2025-12-09');
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase input', () => {
      const result = parseHumanDate('TODAY');
      expect(result).toBe('2025-11-18');
    });

    it('handles mixed case input', () => {
      const result = parseHumanDate('Next Week');
      expect(result).toBe('2025-11-24');
    });
  });

  describe('error handling', () => {
    it('throws error for unparseable input', () => {
      expect(() => parseHumanDate('invalid date string')).toThrow(
        'Unable to parse date: invalid date string'
      );
    });

    it('throws error for empty string', () => {
      expect(() => parseHumanDate('')).toThrow('Unable to parse date:');
    });
  });

  describe('already formatted dates', () => {
    it('returns YYYY-MM-DD dates as-is', () => {
      const result = parseHumanDate('2025-12-25');
      expect(result).toBe('2025-12-25');
    });

    it('validates that formatted dates are valid', () => {
      expect(() => parseHumanDate('2025-13-45')).toThrow();
    });
  });
});
