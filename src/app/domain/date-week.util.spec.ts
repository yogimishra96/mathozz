import { describe, expect, it } from 'vitest';
import { monthKeyUtc, todayKeyUtc, weekKeyUtc } from './date-week.util';

describe('date-week.util', () => {
  it('todayKeyUtc matches ISO date prefix', () => {
    const d = new Date('2026-03-15T12:00:00.000Z');
    expect(todayKeyUtc(d)).toBe('2026-03-15');
  });

  it('weekKeyUtc returns yyyy-Www pattern', () => {
    const key = weekKeyUtc(new Date('2026-03-15T12:00:00.000Z'));
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('monthKeyUtc is yyyy-mm', () => {
    expect(monthKeyUtc(new Date('2026-03-15T12:00:00.000Z'))).toBe('2026-03');
  });
});
