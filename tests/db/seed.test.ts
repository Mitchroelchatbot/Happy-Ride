import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, readSeed } from './helpers';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(readSeed());
});
afterAll(async () => {
  await db.close();
});

describe('seed', () => {
  it('bevat de vier voorbeeldauto’s in volgorde, met placeholderfoto', async () => {
    const { rows } = await db.query<{ name: string; price_per_day_cents: number; is_placeholder_photo: boolean }>(
      'select name, price_per_day_cents, is_placeholder_photo from public.cars order by sort_order',
    );
    expect(rows).toEqual([
      { name: 'Kia Picanto', price_per_day_cents: 3500, is_placeholder_photo: true },
      { name: 'Hyundai i20', price_per_day_cents: 4200, is_placeholder_photo: true },
      { name: 'Suzuki Jimny', price_per_day_cents: 6000, is_placeholder_photo: true },
      { name: 'Kia Sportage', price_per_day_cents: 7000, is_placeholder_photo: true },
    ]);
  });

  it('bevat de twee extra’s', async () => {
    const { rows } = await db.query<{ key: string; price_per_day_cents: number }>(
      'select key, price_per_day_cents from public.extras order by key',
    );
    expect(rows).toEqual([
      { key: 'child_seat', price_per_day_cents: 500 },
      { key: 'extra_driver', price_per_day_cents: 500 },
    ]);
  });

  it('is herhaalbaar: twee keer uitvoeren geeft nog steeds 4 auto’s en 2 extra’s', async () => {
    await db.exec(readSeed());
    const cars = await db.query<{ n: number }>('select count(*)::int as n from public.cars');
    const extras = await db.query<{ n: number }>('select count(*)::int as n from public.extras');
    expect(cars.rows[0].n).toBe(4);
    expect(extras.rows[0].n).toBe(2);
  });
});
