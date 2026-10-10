import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addDays, curacaoToday } from '@/lib/dates';
import { asRole, createTestDb, insertCar, occupy, resetData } from './helpers';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await resetData(db);
});

/** Datum relatief aan vandaag (Curaçao). */
const d = (n: number) => addDays(curacaoToday(), n);

type Row = { car_id: string; start_date: string; end_date: string };

async function availability(): Promise<Row[]> {
  const { rows } = await db.query<Row>(
    'select car_id, start_date::text as start_date, end_date::text as end_date from public.get_availability()',
  );
  return rows;
}

describe('get_availability()', () => {
  it('geeft optie, bevestigd en blokkade van zichtbare auto’s, gesorteerd', async () => {
    const car = await insertCar(db);
    await occupy(db, car, d(20), d(23), 'blocked');
    await occupy(db, car, d(10), d(13), 'confirmed');
    await occupy(db, car, d(30), d(34), 'option');
    expect(await availability()).toEqual([
      { car_id: car, start_date: d(10), end_date: d(13) },
      { car_id: car, start_date: d(20), end_date: d(23) },
      { car_id: car, start_date: d(30), end_date: d(34) },
    ]);
  });

  it('laat verborgen auto’s weg', async () => {
    const hidden = await insertCar(db, { visible: false });
    await occupy(db, hidden, d(10), d(13), 'confirmed');
    expect(await availability()).toEqual([]);
  });

  it('laat verlopen opties weg, ook als de status nog niet is bijgewerkt', async () => {
    const car = await insertCar(db);
    await occupy(db, car, d(10), d(13), 'option', { expiresInHours: -1 });
    expect(await availability()).toEqual([]);
  });

  it('laat afgelopen periodes en periodes voorbij 12 maanden weg', async () => {
    const car = await insertCar(db);
    await occupy(db, car, d(-10), d(-5), 'confirmed');
    await occupy(db, car, d(400), d(405), 'confirmed');
    await occupy(db, car, d(-2), d(2), 'confirmed'); // loopt nog: wel tonen
    expect(await availability()).toEqual([{ car_id: car, start_date: d(-2), end_date: d(2) }]);
  });

  it('laat een periode die vandaag eindigt weg', async () => {
    const car = await insertCar(db);
    await occupy(db, car, d(-3), d(0), 'confirmed');
    expect(await availability()).toEqual([]);
  });

  it('toont een periode die vandaag begint', async () => {
    const car = await insertCar(db);
    await occupy(db, car, d(0), d(3), 'confirmed');
    expect(await availability()).toEqual([{ car_id: car, start_date: d(0), end_date: d(3) }]);
  });

  it('geeft geen persoonsgegevens terug', async () => {
    const car = await insertCar(db);
    await occupy(db, car, d(10), d(13), 'confirmed');
    const { rows } = await db.query<Record<string, unknown>>('select * from public.get_availability()');
    expect(Object.keys(rows[0]).sort()).toEqual(['car_id', 'end_date', 'start_date']);
  });
});

describe('toegang voor bezoekers (anon)', () => {
  it('mag get_availability() aanroepen', async () => {
    const car = await insertCar(db);
    await occupy(db, car, d(10), d(13), 'confirmed');
    const rows = await asRole(db, 'anon', async (tx) => (await tx.query('select * from public.get_availability()')).rows);
    expect(rows).toHaveLength(1);
  });

  it('ziet alleen zichtbare auto’s', async () => {
    await insertCar(db, { name: 'Zichtbaar' });
    await insertCar(db, { name: 'Verborgen', visible: false });
    const names = await asRole(db, 'anon', async (tx) =>
      (await tx.query<{ name: string }>('select name from public.cars')).rows.map((r) => r.name),
    );
    expect(names).toEqual(['Zichtbaar']);
  });

  it('kan aanvragen en periodes niet lezen', async () => {
    await expect(asRole(db, 'anon', (tx) => tx.query('select * from public.requests'))).rejects.toThrow(
      /permission denied/,
    );
    await expect(asRole(db, 'anon', (tx) => tx.query('select * from public.periods'))).rejects.toThrow(
      /permission denied/,
    );
  });

  it('kan curacao_today() niet rechtstreeks aanroepen', async () => {
    await expect(asRole(db, 'anon', (tx) => tx.query('select public.curacao_today()'))).rejects.toThrow(
      /permission denied/,
    );
  });
});
