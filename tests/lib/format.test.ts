import { describe, expect, it } from 'vitest';
import { formatDate, formatEuro } from '@/lib/format';

const plain = (s: string) => s.replace(/ | /g, ' ');

describe('formatEuro', () => {
  it('laat ,00 weg bij hele euro’s', () => {
    expect(plain(formatEuro(3500, 'nl'))).toBe('€ 35');
  });
  it('toont centen als die er zijn', () => {
    expect(plain(formatEuro(4250, 'nl'))).toBe('€ 42,50');
  });
});

describe('formatDate', () => {
  it('schrijft de datum voluit', () => {
    expect(formatDate('2026-11-01', 'nl')).toBe('1 november 2026');
  });
});
