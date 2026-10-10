import { describe, expect, it } from 'vitest';
import { parseSelection } from '@/lib/selection';

const TODAY = '2026-10-10';

describe('parseSelection', () => {
  it('geeft "none" zolang een datum ontbreekt', () => {
    expect(parseSelection(null, null, TODAY)).toEqual({ state: 'none' });
    expect(parseSelection('2026-11-01', null, TODAY)).toEqual({ state: 'none' });
  });
  it('herkent ongeldige invoer', () => {
    expect(parseSelection('2026-11-xx', '2026-11-08', TODAY)).toEqual({ state: 'invalid', reason: 'format' });
    expect(parseSelection('2026-10-09', '2026-10-20', TODAY)).toEqual({ state: 'invalid', reason: 'past' });
    expect(parseSelection('2026-11-08', '2026-11-01', TODAY)).toEqual({ state: 'invalid', reason: 'order' });
    expect(parseSelection('2026-11-01', '2026-11-01', TODAY)).toEqual({ state: 'invalid', reason: 'order' });
    expect(parseSelection('2026-11-01', '2026-11-03', TODAY)).toEqual({ state: 'invalid', reason: 'tooShort' });
  });
  it('accepteert vandaag als ophaaldag en precies de minimale duur', () => {
    expect(parseSelection('2026-10-10', '2026-10-13', TODAY)).toEqual({
      state: 'valid',
      from: '2026-10-10',
      to: '2026-10-13',
      days: 3,
    });
  });
});
