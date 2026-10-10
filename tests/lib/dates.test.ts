import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  curacaoToday,
  daysBetween,
  isISODate,
  monthGrid,
  monthOf,
} from '@/lib/dates';

describe('isISODate', () => {
  it('accepteert geldige datums', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2028-02-29')).toBe(true);
  });
  it('weigert ongeldige datums en andere vormen', () => {
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2026-2-3')).toBe(false);
    expect(isISODate('morgen')).toBe(false);
    expect(isISODate(null)).toBe(false);
  });
});

describe('addDays / daysBetween', () => {
  it('telt dagen volgens het hotelmodel', () => {
    expect(daysBetween('2026-06-01', '2026-06-04')).toBe(3);
    expect(daysBetween('2026-06-04', '2026-06-01')).toBe(-3);
  });
  it('gaat over maand- en jaargrenzen', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('curacaoToday', () => {
  it('rekent in Curaçao-tijd (UTC−4)', () => {
    expect(curacaoToday(new Date('2026-10-11T03:59:00Z'))).toBe('2026-10-10');
    expect(curacaoToday(new Date('2026-10-11T04:00:00Z'))).toBe('2026-10-11');
  });
});

describe('maanden', () => {
  it('monthOf en addMonths', () => {
    expect(monthOf('2026-10-10')).toBe('2026-10');
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('monthGrid begint op maandag met lege vakjes ervoor', () => {
    const grid = monthGrid('2026-10'); // 1 oktober 2026 is een donderdag
    expect(grid.slice(0, 3)).toEqual([null, null, null]);
    expect(grid[3]).toBe('2026-10-01');
    expect(grid.at(-1)).toBe('2026-10-31');
    expect(grid).toHaveLength(34);
  });
});
