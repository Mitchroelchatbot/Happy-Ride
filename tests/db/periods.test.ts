import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, insertCar, insertPeriod, insertRequest, occupy, resetData, type Kind } from './helpers';

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

const KINDS: Kind[] = ['option', 'confirmed', 'blocked'];
const PAIRS = KINDS.flatMap((a) => KINDS.map((b) => [a, b] as [Kind, Kind]));
const OVERLAP = /periods_no_overlap/;
const CHECK = /violates check constraint/;

async function countPeriods(): Promise<number> {
  const { rows } = await db.query<{ n: number }>('select count(*)::int as n from public.periods');
  return rows[0].n;
}

describe('periods: overlapcontrole', () => {
  it('staat aansluitende periodes toe (inleverdag = ophaaldag van de volgende klant)', async () => {
    const car = await insertCar(db);
    await occupy(db, car, '2030-06-01', '2030-06-04', 'confirmed');
    await occupy(db, car, '2030-06-04', '2030-06-08', 'option');
    expect(await countPeriods()).toBe(2);
  });

  describe.each(PAIRS)('%s, daarna %s', (first, second) => {
    it('weigert een overlappende periode', async () => {
      const car = await insertCar(db);
      await occupy(db, car, '2030-06-01', '2030-06-05', first);
      await expect(occupy(db, car, '2030-06-04', '2030-06-08', second)).rejects.toThrow(OVERLAP);
    });
  });

  it('weigert een periode die volledig binnen een andere valt', async () => {
    const car = await insertCar(db);
    await occupy(db, car, '2030-06-01', '2030-06-10', 'confirmed');
    await expect(occupy(db, car, '2030-06-03', '2030-06-05', 'blocked')).rejects.toThrow(OVERLAP);
  });

  it('staat dezelfde data toe voor een andere auto', async () => {
    const a = await insertCar(db, { name: 'A' });
    const b = await insertCar(db, { name: 'B' });
    await occupy(db, a, '2030-06-01', '2030-06-05', 'confirmed');
    await occupy(db, b, '2030-06-01', '2030-06-05', 'confirmed');
    expect(await countPeriods()).toBe(2);
  });

  it('weigert een lege periode (ophalen = inleveren)', async () => {
    const car = await insertCar(db);
    await expect(
      insertPeriod(db, { carId: car, from: '2030-06-01', to: '2030-06-01', kind: 'blocked', note: 'x' }),
    ).rejects.toThrow(CHECK);
  });

  it('eist een aanvraag bij optie/bevestigd en geen aanvraag bij een blokkade', async () => {
    const car = await insertCar(db);
    const req = await insertRequest(db, car, '2030-07-01', '2030-07-05');
    await expect(insertPeriod(db, { carId: car, from: '2030-07-01', to: '2030-07-05', kind: 'option' })).rejects.toThrow(
      CHECK,
    );
    await expect(
      insertPeriod(db, { carId: car, from: '2030-07-01', to: '2030-07-05', kind: 'blocked', requestId: req }),
    ).rejects.toThrow(CHECK);
  });

  it('weigert een aanvraag waarvan de inleverdag niet na de ophaaldag ligt', async () => {
    const car = await insertCar(db);
    await expect(insertRequest(db, car, '2030-07-05', '2030-07-05')).rejects.toThrow(CHECK);
  });
});
