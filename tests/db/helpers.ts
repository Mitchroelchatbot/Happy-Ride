import { PGlite, type Transaction } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

export type Kind = 'option' | 'confirmed' | 'blocked';

export async function createTestDb(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { btree_gist } });
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
  `);
  // Supabase geeft anon/authenticated/service_role standaard rechten op alles in schema public;
  // zonder dit zouden de revokes in de migratie niet echt getest worden.
  await db.exec(`
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
    } catch (err) {
      throw new Error(`Migratie ${file} mislukt: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
    }
  }
  return db;
}

export function readSeed(): string {
  return readFileSync(path.join(ROOT, 'supabase', 'seed.sql'), 'utf8');
}

export async function resetData(db: PGlite): Promise<void> {
  await db.exec('truncate public.periods, public.requests, public.extras, public.cars restart identity cascade;');
}

export async function insertCar(
  db: PGlite,
  opts: { name?: string; visible?: boolean; pricePerDayCents?: number } = {},
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.cars (name, transmission, seats, luggage, price_per_day_cents, visible)
     values ($1, 'automatic', 4, 1, $2::int, $3::boolean)
     returning id`,
    [opts.name ?? 'Testauto', opts.pricePerDayCents ?? 3500, opts.visible ?? true],
  );
  return rows[0].id;
}

export async function insertRequest(
  db: PGlite,
  carId: string,
  from: string,
  to: string,
  opts: { status?: 'new' | 'confirmed'; expiresInHours?: number } = {},
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.requests
       (car_id, pickup_date, return_date, pickup_time, return_time, pickup_location,
        name, email, phone, total_price_cents, locale, status, expires_at)
     values ($1::uuid, $2::date, $3::date, '10:00', '10:00', 'airport',
        'Test Klant', 'test@example.com', '+31600000000', 10500, 'nl', $4,
        now() + make_interval(hours => $5::int))
     returning id`,
    [carId, from, to, opts.status ?? 'new', opts.expiresInHours ?? 48],
  );
  return rows[0].id;
}

export async function insertPeriod(
  db: PGlite,
  p: { carId: string; from: string; to: string; kind: Kind; requestId?: string | null; note?: string | null },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.periods (car_id, period, kind, request_id, note)
     values ($1::uuid, daterange($2::date, $3::date, '[)'), $4, $5::uuid, $6)
     returning id`,
    [p.carId, p.from, p.to, p.kind, p.requestId ?? null, p.note ?? null],
  );
  return rows[0].id;
}

/** Bezet een auto met een periode van de gegeven soort, inclusief de aanvraag als die nodig is. */
export async function occupy(
  db: PGlite,
  carId: string,
  from: string,
  to: string,
  kind: Kind,
  opts: { expiresInHours?: number } = {},
): Promise<void> {
  const requestId =
    kind === 'blocked'
      ? null
      : await insertRequest(db, carId, from, to, {
          status: kind === 'confirmed' ? 'confirmed' : 'new',
          expiresInHours: opts.expiresInHours,
        });
  await insertPeriod(db, { carId, from, to, kind, requestId, note: kind === 'blocked' ? 'onderhoud' : null });
}

/** Voert `fn` uit als Supabase-rol (anon/authenticated), binnen een transactie. */
export async function asRole<T>(
  db: PGlite,
  role: 'anon' | 'authenticated',
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
}
