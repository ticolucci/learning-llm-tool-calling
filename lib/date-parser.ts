import {
  format,
  add,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  isValid,
  parse,
} from 'date-fns';

/**
 * Word-to-number mapping for parsing written numbers
 */
const WORD_TO_NUMBER: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/**
 * Day name to date-fns function mapping
 */
const DAY_FUNCTIONS: Record<
  string,
  (date: Date | number) => Date
> = {
  monday: nextMonday,
  tuesday: nextTuesday,
  wednesday: nextWednesday,
  thursday: nextThursday,
  friday: nextFriday,
  saturday: nextSaturday,
  sunday: nextSunday,
};

/**
 * Parses a human-readable date string into YYYY-MM-DD format
 *
 * Supports formats like:
 * - "today" → 2025-11-18
 * - "tomorrow" → 2025-11-19
 * - "two days from now" → 2025-11-20
 * - "today + 2 days" → 2025-11-20
 * - "next week" → 2025-11-24 (next Monday)
 * - "next Friday" → 2025-11-21
 * - "2025-12-25" → 2025-12-25 (passes through valid dates)
 *
 * @param input - Human-readable date string
 * @returns Date in YYYY-MM-DD format
 * @throws Error if the date cannot be parsed
 */
export function parseHumanDate(input: string): string {
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    throw new Error('Unable to parse date: ');
  }

  // Check if it's already in YYYY-MM-DD format
  const isoDateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const parsed = parse(normalized, 'yyyy-MM-dd', new Date());
    if (!isValid(parsed)) {
      throw new Error(`Unable to parse date: ${input}`);
    }
    return normalized;
  }

  const now = new Date();

  // Handle absolute dates
  if (normalized === 'today') {
    return format(now, 'yyyy-MM-dd');
  }

  if (normalized === 'tomorrow') {
    return format(add(now, { days: 1 }), 'yyyy-MM-dd');
  }

  if (normalized === 'yesterday') {
    return format(add(now, { days: -1 }), 'yyyy-MM-dd');
  }

  // Handle "next week" → next Monday
  if (normalized === 'next week') {
    return format(nextMonday(now), 'yyyy-MM-dd');
  }

  // Handle "next [day]" → next occurrence of that day
  const nextDayMatch = normalized.match(/^next\s+(\w+)$/);
  if (nextDayMatch) {
    const dayName = nextDayMatch[1];
    const dayFunction = DAY_FUNCTIONS[dayName];
    if (dayFunction) {
      return format(dayFunction(now), 'yyyy-MM-dd');
    }
  }

  // Handle "X days/weeks from now" or "X day/week from now"
  const fromNowMatch = normalized.match(
    /^(\w+)\s+(days?|weeks?)\s+from\s+now$/
  );
  if (fromNowMatch) {
    const [, quantityStr, unit] = fromNowMatch;
    const quantity = WORD_TO_NUMBER[quantityStr] || parseInt(quantityStr, 10);

    if (isNaN(quantity)) {
      throw new Error(`Unable to parse date: ${input}`);
    }

    const unitNormalized = unit.startsWith('week') ? 'weeks' : 'days';
    const result = add(now, { [unitNormalized]: quantity });
    return format(result, 'yyyy-MM-dd');
  }

  // Handle "today + X days/weeks" or "today+X days/weeks"
  const additionMatch = normalized.match(
    /^today\s*\+\s*(\d+)\s*(days?|weeks?)$/
  );
  if (additionMatch) {
    const [, quantityStr, unit] = additionMatch;
    const quantity = parseInt(quantityStr, 10);

    if (isNaN(quantity)) {
      throw new Error(`Unable to parse date: ${input}`);
    }

    const unitNormalized = unit.startsWith('week') ? 'weeks' : 'days';
    const result = add(now, { [unitNormalized]: quantity });
    return format(result, 'yyyy-MM-dd');
  }

  // If nothing matched, throw an error
  throw new Error(`Unable to parse date: ${input}`);
}
