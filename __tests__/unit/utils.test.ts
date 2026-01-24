/**
 * Unit Tests for Utility Functions
 *
 * Tests the utility functions in src/lib/utils.ts
 */

import {
  cn,
  formatDate,
  capitalize,
  truncate,
  generateId,
  isEmpty,
  getInitials,
} from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    });

    it('should handle arrays of classes', () => {
      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });

    it('should merge Tailwind classes correctly', () => {
      // tailwind-merge should resolve conflicts
      expect(cn('px-4', 'px-8')).toBe('px-8');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle undefined and null values', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-06-15T10:30:00Z');

    it('should format date in English locale by default', () => {
      const result = formatDate(testDate, 'en');
      expect(result).toContain('June');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format date in Arabic locale', () => {
      const result = formatDate(testDate, 'ar');
      // Arabic formatted dates contain Arabic numerals or different formatting
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should accept string date input', () => {
      const result = formatDate('2024-06-15', 'en');
      expect(result).toContain('June');
      expect(result).toContain('15');
    });

    it('should accept custom format options', () => {
      const options: Intl.DateTimeFormatOptions = {
        year: '2-digit',
        month: 'short',
        day: '2-digit',
      };
      const result = formatDate(testDate, 'en', options);
      expect(result).toContain('Jun');
      expect(result).toContain('24');
    });

    it('should use default options when none provided', () => {
      const result = formatDate(testDate);
      expect(result).toContain('2024');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should handle already capitalized strings', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should keep rest of string unchanged', () => {
      expect(capitalize('hELLO wORLD')).toBe('HELLO wORLD');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Hi', 5)).toBe('Hi');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(truncate('', 5)).toBe('');
    });

    it('should handle zero length', () => {
      expect(truncate('Hello', 0)).toBe('...');
    });
  });

  describe('generateId', () => {
    it('should generate a string ID', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
    });

    it('should generate ID with default length of 8', () => {
      const id = generateId();
      expect(id.length).toBeLessThanOrEqual(8);
    });

    it('should generate ID with specified length', () => {
      const id = generateId(12);
      expect(id.length).toBeLessThanOrEqual(12);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      // With very high probability, all 100 should be unique
      expect(ids.size).toBeGreaterThan(95);
    });

    it('should only contain alphanumeric characters', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false);
    });

    it('should return false for non-empty array', () => {
      expect(isEmpty([1, 2, 3])).toBe(false);
    });

    it('should return false for non-empty object', () => {
      expect(isEmpty({ a: 1 })).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(42)).toBe(false);
    });

    it('should return false for boolean false', () => {
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('getInitials', () => {
    it('should return initials for two-word name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('should return initials for multi-word name', () => {
      expect(getInitials('John Michael Doe')).toBe('JM');
    });

    it('should return single initial for single word', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should handle lowercase names', () => {
      expect(getInitials('john doe')).toBe('JD');
    });

    it('should handle mixed case names', () => {
      expect(getInitials('jOHN dOE')).toBe('JD');
    });

    it('should limit to 2 characters', () => {
      expect(getInitials('A B C D E')).toBe('AB');
    });
  });
});
