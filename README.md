# Happy Ride Car Rental

Website voor Happy Ride Car Rental op Curaçao: vlootoverzicht met beschikbaarheid en aanvragen.

- Ontwerp: [`docs/superpowers/specs/2026-10-10-happy-ride-website-design.md`](docs/superpowers/specs/2026-10-10-happy-ride-website-design.md)
- Stack: Next.js 16, TypeScript, Tailwind CSS, next-intl, Supabase, Netlify

## Lokaal draaien

1. `npm install`
2. Kopieer `.env.example` naar `.env.local` en vul de Supabase-gegevens in.
3. `npm run dev` → http://localhost:3000

## Database

Migraties staan in `supabase/migrations/`, de voorbeeldvloot in `supabase/seed.sql`.
Voer ze in deze volgorde uit in de Supabase SQL Editor.

## Testen

```bash
npm test
```

De databasetests draaien op PGlite (Postgres in Node). Er is geen Docker of Supabase-account voor nodig.
