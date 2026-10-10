import { describe, expect, it } from 'vitest';
import { basePriceCents } from '@/lib/pricing';

describe('basePriceCents', () => {
  it('is dagprijs × dagen', () => {
    expect(basePriceCents(3500, 7)).toBe(24500);
    expect(basePriceCents(4250, 3)).toBe(12750);
  });
});
