import { describe, expect, it } from 'vitest';
import { carStatus, isDayBusy, isRangeFree, sortByAvailability, type BusyRange } from '@/lib/availability';
import type { Selection } from '@/lib/selection';

const busy: BusyRange[] = [{ from: '2026-11-05', to: '2026-11-10' }];
const valid = (from: string, to: string): Selection => ({ state: 'valid', from, to, days: 0 });

describe('isRangeFree', () => {
  it('is vrij als de periode aansluit (hotelmodel)', () => {
    expect(isRangeFree(busy, { from: '2026-11-01', to: '2026-11-05' })).toBe(true);
    expect(isRangeFree(busy, { from: '2026-11-10', to: '2026-11-13' })).toBe(true);
  });
  it('is bezet bij elke overlap', () => {
    expect(isRangeFree(busy, { from: '2026-11-01', to: '2026-11-06' })).toBe(false);
    expect(isRangeFree(busy, { from: '2026-11-06', to: '2026-11-08' })).toBe(false);
    expect(isRangeFree(busy, { from: '2026-11-01', to: '2026-11-20' })).toBe(false);
  });
});

describe('isDayBusy', () => {
  it('telt de inleverdag niet als bezet', () => {
    expect(isDayBusy(busy, '2026-11-05')).toBe(true);
    expect(isDayBusy(busy, '2026-11-09')).toBe(true);
    expect(isDayBusy(busy, '2026-11-10')).toBe(false);
  });
});

describe('carStatus', () => {
  it('is "unknown" zonder geldige selectie of zolang er niets geladen is', () => {
    expect(carStatus(busy, { state: 'none' }, true)).toBe('unknown');
    expect(carStatus(busy, valid('2026-11-01', '2026-11-04'), false)).toBe('unknown');
  });
  it('geeft available of busy bij een geldige selectie', () => {
    expect(carStatus(busy, valid('2026-11-01', '2026-11-04'), true)).toBe('available');
    expect(carStatus(busy, valid('2026-11-08', '2026-11-12'), true)).toBe('busy');
  });
});

describe('sortByAvailability', () => {
  it('zet bezette auto’s onderaan en houdt verder de volgorde', () => {
    const cars = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const status = (c: { id: string }) => (c.id === 'a' || c.id === 'c' ? 'busy' : 'available');
    expect(sortByAvailability(cars, status).map((c) => c.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});
