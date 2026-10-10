import { describe, expect, it } from 'vitest';
import { rowsToAvailabilityMap } from '@/lib/data/availability';
import { mapCarRow } from '@/lib/data/cars';

describe('mapCarRow', () => {
  const row = {
    id: 'c1',
    name: 'Kia Picanto',
    transmission: 'automatic' as const,
    seats: 4,
    luggage: 1,
    airco: true,
    price_per_day_cents: 3500,
    photo_path: null,
    is_placeholder_photo: true,
  };

  it('zet een databaserij om naar een Car', () => {
    expect(mapCarRow(row, 'https://x.supabase.co')).toEqual({
      id: 'c1',
      name: 'Kia Picanto',
      transmission: 'automatic',
      seats: 4,
      luggage: 1,
      airco: true,
      pricePerDayCents: 3500,
      photoUrl: null,
      isPlaceholderPhoto: true,
    });
  });

  it('bouwt de publieke foto-URL uit Supabase Storage', () => {
    expect(mapCarRow({ ...row, photo_path: 'abc/picanto.webp' }, 'https://x.supabase.co').photoUrl).toBe(
      'https://x.supabase.co/storage/v1/object/public/car-photos/abc/picanto.webp',
    );
  });
});

describe('rowsToAvailabilityMap', () => {
  it('groepeert bezette periodes per auto', () => {
    expect(
      rowsToAvailabilityMap([
        { car_id: 'a', start_date: '2026-11-01', end_date: '2026-11-04' },
        { car_id: 'b', start_date: '2026-11-02', end_date: '2026-11-03' },
        { car_id: 'a', start_date: '2026-11-10', end_date: '2026-11-12' },
      ]),
    ).toEqual({
      a: [
        { from: '2026-11-01', to: '2026-11-04' },
        { from: '2026-11-10', to: '2026-11-12' },
      ],
      b: [{ from: '2026-11-02', to: '2026-11-03' }],
    });
  });
});
