# Stap 1 — Basis en vloot met kalender: implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een werkende, mobiele publieke pagina in het Nederlands. Bezoekers kiezen data, zien per auto prijs, totaalprijs en beschikbaarheid, en kunnen een kalender openklappen. De gegevens komen uit Supabase, waar een exclusion constraint overlap onmogelijk maakt.

**Architecture:** Next.js 16 (App Router) met next-intl. Alleen `nl` is in deze stap actief, maar elke tekst gaat al via `messages/nl.json`. De pagina is statisch: de auto's worden server-side opgehaald (anon key, `revalidate`), de bezette data haalt de browser vers op via `GET /api/availability`, die de databasefunctie `get_availability()` aanroept. Pure logica (data, selectie, beschikbaarheid, prijs, opmaak) zit in `src/lib/` en wordt met Vitest getest. Het databaseschema wordt getest met PGlite (echte Postgres in Node).

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, next-intl v4, @supabase/supabase-js v2, lucide-react, Vitest, @electric-sql/pglite, sharp.

**Spec:** `docs/superpowers/specs/2026-10-10-happy-ride-website-design.md`

**Bewust nog niet in deze stap** (komt in latere stappen): het aanvraagformulier en `create_request` (stap 2). De knop **Aanvragen** opent in deze stap WhatsApp met een voorgevuld bericht, en stap 2 vervangt dat door het formulier. Verder komen de beheerpagina (stap 3), EN/ES, de privacyverklaring en de footerlink daarnaartoe, en SEO-extra's (stap 4) later.

**Werkmap:** `C:\Users\31641\Projecten\Happy-Ride` (in Git Bash: `/c/Users/31641/Projecten/Happy-Ride`). Alle commando's draaien vanuit die map.

---

## Bestandsstructuur

```
.env.example                          namen van env-variabelen, zonder waarden
netlify.toml                          build-instellingen Netlify
next.config.ts                        next-intl-plugin + toegestane afbeeldingshosts
vitest.config.ts                      testconfig (alias @ → src)
scripts/prepare-brand-assets.mjs      verkleint logo's van Drive naar public/ en src/app/icon.png
messages/nl.json                      alle Nederlandse teksten
public/logo.png                       logo (512 px)
public/placeholders/car.svg           neutrale placeholderfoto
supabase/migrations/20261010000001_schema.sql        tabellen, constraint, RLS
supabase/migrations/20261010000002_availability.sql  curacao_today(), get_availability()
supabase/seed.sql                     voorbeeldvloot + extra's
src/config.ts                         bedrijfsregels + contactgegevens (placeholders)
src/proxy.ts                          next-intl-routering (/ → /nl)
src/i18n/routing.ts                   talen
src/i18n/navigation.ts                taalbewuste Link/useRouter/usePathname
src/i18n/request.ts                   laadt berichten per taal
src/lib/dates.ts                      ISO-datums, dagen tellen, maanden, kalenderraster
src/lib/selection.ts                  ?van=&tot= → geldige/ongeldige selectie
src/lib/availability.ts               overlap, status per auto, sorteren
src/lib/pricing.ts                    basisprijs
src/lib/format.ts                     euro- en datumopmaak
src/lib/whatsapp.ts                   wa.me-links
src/lib/types.ts                      Car-type
src/lib/supabase/public.ts            Supabase-client met anon key (server)
src/lib/data/cars.ts                  auto's ophalen + mapCarRow
src/lib/data/availability.ts          rijen → AvailabilityMap
src/app/globals.css                   Tailwind + kleuren + knopstijlen
src/app/icon.png                      favicon
src/app/[locale]/layout.tsx           html, lettertype, metadata, provider
src/app/[locale]/page.tsx             de pagina
src/app/api/availability/route.ts     bezette data als JSON
src/components/Header.tsx
src/components/LanguageSwitcher.tsx
src/components/WhatsAppButton.tsx
src/components/Hero.tsx
src/components/DateRangePicker.tsx
src/components/Fleet.tsx
src/components/CarCard.tsx
src/components/AvailabilityCalendar.tsx
src/components/Conditions.tsx
src/components/Faq.tsx
src/components/Footer.tsx
tests/lib/*.test.ts                   unit-tests
tests/db/helpers.ts                   PGlite-database met migraties
tests/db/*.test.ts                    databasetests
```

---

### Task 1: Project opzetten

**Files:**
- Create: Next.js-scaffold, `vitest.config.ts`, `netlify.toml`, `.env.example`
- Modify: `.gitignore`, `README.md` (terugzetten), `package.json` (scripts)

- [ ] **Step 1: Branch maken**

```bash
git checkout -b stap-1-vloot
```

- [ ] **Step 2: Bestanden die create-next-app blokkeren tijdelijk hernoemen**

create-next-app weigert een map met een `README.md`.

```bash
mv README.md README.keep && mv .gitignore gitignore.keep
```

- [ ] **Step 3: Next.js 16 scaffolden**

```bash
npx create-next-app@16 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Verwacht: "Success! Created happy-ride", met `src/app/`, `package.json` en `postcss.config.mjs`.

- [ ] **Step 4: README en .gitignore terugzetten en samenvoegen**

```bash
mv -f README.keep README.md && rm gitignore.keep
```

Overschrijf `.gitignore` met:

```gitignore
# Geheimen — nooit committen (openbare repo)
.env
.env.*
!.env.example
*.pem
*.key

# Dependencies & builds
node_modules/
.next/
out/
dist/
build/
.cache/
.netlify/
*.tsbuildinfo
next-env.d.ts

# Tests
coverage/
test-results/
playwright-report/

# Logs
*.log
npm-debug.log*

# OS / editor
.DS_Store
Thumbs.db
desktop.ini
.vscode/
.idea/
```

- [ ] **Step 5: Dependencies installeren**

```bash
npm install next-intl @supabase/supabase-js lucide-react
npm install -D vitest @electric-sql/pglite sharp
```

- [ ] **Step 6: Scripts toevoegen aan `package.json`**

Voeg in `"scripts"` toe (laat `dev`, `build`, `start` en `lint` staan):

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 7: `vitest.config.ts` maken**

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
```

- [ ] **Step 8: `netlify.toml` maken**

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "22"
```

- [ ] **Step 9: `.env.example` maken**

```dotenv
# Kopieer naar .env.local en vul in. Nooit .env.local committen.
NEXT_PUBLIC_SUPABASE_URL=
# Anon key of publishable key (sb_publishable_...) uit Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SITE_URL=http://localhost:3000

# Vanaf stap 2
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
MAIL_FROM=
MAIL_TO_ADMIN=
TEST_DATABASE_URL=
```

- [ ] **Step 10: Controleren dat de scaffold bouwt**

```bash
npm run build
```

Verwacht: "✓ Compiled successfully" en een route-overzicht met `/`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 met Tailwind, Vitest en Netlify-config"
```

---

### Task 2: Configuratie en datumhulpfuncties

**Files:**
- Create: `src/config.ts`, `src/lib/dates.ts`
- Test: `tests/lib/dates.test.ts`

- [ ] **Step 1: `src/config.ts` maken**

```ts
/** Bedrijfsregels. Moeten gelijk blijven aan de databasefuncties (stap 2 test dat). */
export const RULES = {
  minRentalDays: 3,
  optionHours: 48,
  reminderHoursBeforeExpiry: 24,
  responseHours: 24,
  availabilityMonthsAhead: 12,
} as const;

/** Curaçao: UTC−4, geen zomertijd. */
export const CURACAO_UTC_OFFSET_HOURS = -4;

/** PLACEHOLDERS — vervangen zodra Happy Ride de gegevens aanlevert. */
export const CONTACT = {
  whatsapp: '59990000000', // alleen cijfers, met landcode 599
  email: 'info@happyride.cw',
  address: '[Adres], Willemstad, Curaçao',
} as const;
```

- [ ] **Step 2: Falende test schrijven: `tests/lib/dates.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  curacaoToday,
  daysBetween,
  isISODate,
  monthGrid,
  monthOf,
} from '@/lib/dates';

describe('isISODate', () => {
  it('accepteert geldige datums', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2028-02-29')).toBe(true);
  });
  it('weigert ongeldige datums en andere vormen', () => {
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2026-2-3')).toBe(false);
    expect(isISODate('morgen')).toBe(false);
    expect(isISODate(null)).toBe(false);
  });
});

describe('addDays / daysBetween', () => {
  it('telt dagen volgens het hotelmodel', () => {
    expect(daysBetween('2026-06-01', '2026-06-04')).toBe(3);
    expect(daysBetween('2026-06-04', '2026-06-01')).toBe(-3);
  });
  it('gaat over maand- en jaargrenzen', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('curacaoToday', () => {
  it('rekent in Curaçao-tijd (UTC−4)', () => {
    expect(curacaoToday(new Date('2026-10-11T03:59:00Z'))).toBe('2026-10-10');
    expect(curacaoToday(new Date('2026-10-11T04:00:00Z'))).toBe('2026-10-11');
  });
});

describe('maanden', () => {
  it('monthOf en addMonths', () => {
    expect(monthOf('2026-10-10')).toBe('2026-10');
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('monthGrid begint op maandag met lege vakjes ervoor', () => {
    const grid = monthGrid('2026-10'); // 1 oktober 2026 is een donderdag
    expect(grid.slice(0, 3)).toEqual([null, null, null]);
    expect(grid[3]).toBe('2026-10-01');
    expect(grid.at(-1)).toBe('2026-10-31');
    expect(grid).toHaveLength(34);
  });
});
```

- [ ] **Step 3: Test draaien, verwacht FAIL**

```bash
npx vitest run tests/lib/dates.test.ts
```

Verwacht: FAIL met "Failed to resolve import '@/lib/dates'".

- [ ] **Step 4: `src/lib/dates.ts` maken**

```ts
import { CURACAO_UTC_OFFSET_HOURS } from '@/config';

/** 'YYYY-MM-DD' */
export type ISODate = string;
/** 'YYYY-MM' */
export type ISOMonth = string;

const DAY_MS = 86_400_000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUTC(d: ISODate): number {
  return Date.parse(`${d}T00:00:00Z`);
}

function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const ms = toUTC(value);
  return !Number.isNaN(ms) && fromUTC(ms) === value;
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * DAY_MS);
}

/** Aantal dagen van `from` tot `to` (hotelmodel: 1→4 juni = 3). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

export function curacaoToday(now: Date = new Date()): ISODate {
  return fromUTC(now.getTime() + CURACAO_UTC_OFFSET_HOURS * 3_600_000);
}

export function monthOf(d: ISODate): ISOMonth {
  return d.slice(0, 7);
}

export function addMonths(m: ISOMonth, n: number): ISOMonth {
  const [y, mo] = m.split('-').map(Number);
  const total = y * 12 + (mo - 1) + n;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Dagen van een maand, maandag eerst, met `null` voor lege vakjes vóór de 1e. */
export function monthGrid(m: ISOMonth): (ISODate | null)[] {
  const first = `${m}-01`;
  const leading = (new Date(toUTC(first)).getUTCDay() + 6) % 7;
  const daysInMonth = daysBetween(first, `${addMonths(m, 1)}-01`);
  const cells: (ISODate | null)[] = Array(leading).fill(null);
  for (let i = 0; i < daysInMonth; i++) cells.push(addDays(first, i));
  return cells;
}
```

- [ ] **Step 5: Test draaien, verwacht PASS**

```bash
npx vitest run tests/lib/dates.test.ts
```

Verwacht: alle tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config.ts src/lib/dates.ts tests/lib/dates.test.ts
git commit -m "feat: bedrijfsregels en datumhulpfuncties"
```

---

### Task 3: Selectie van data uit de URL

**Files:**
- Create: `src/lib/selection.ts`
- Test: `tests/lib/selection.test.ts`

- [ ] **Step 1: Falende test schrijven: `tests/lib/selection.test.ts`**

```ts
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
```

- [ ] **Step 2: Test draaien, verwacht FAIL**

```bash
npx vitest run tests/lib/selection.test.ts
```

Verwacht: FAIL met "Failed to resolve import '@/lib/selection'".

- [ ] **Step 3: `src/lib/selection.ts` maken**

```ts
import { RULES } from '@/config';
import { daysBetween, isISODate, type ISODate } from '@/lib/dates';

export type Selection =
  | { state: 'none' }
  | { state: 'invalid'; reason: 'format' | 'past' | 'order' | 'tooShort' }
  | { state: 'valid'; from: ISODate; to: ISODate; days: number };

export function parseSelection(
  from: string | null,
  to: string | null,
  today: ISODate,
  minDays: number = RULES.minRentalDays,
): Selection {
  if (!from || !to) return { state: 'none' };
  if (!isISODate(from) || !isISODate(to)) return { state: 'invalid', reason: 'format' };
  if (from < today) return { state: 'invalid', reason: 'past' };
  const days = daysBetween(from, to);
  if (days <= 0) return { state: 'invalid', reason: 'order' };
  if (days < minDays) return { state: 'invalid', reason: 'tooShort' };
  return { state: 'valid', from, to, days };
}
```

- [ ] **Step 4: Test draaien, verwacht PASS**

```bash
npx vitest run tests/lib/selection.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/selection.ts tests/lib/selection.test.ts
git commit -m "feat: datumselectie uit URL valideren"
```

---

### Task 4: Beschikbaarheidslogica en prijs

**Files:**
- Create: `src/lib/availability.ts`, `src/lib/pricing.ts`
- Test: `tests/lib/availability.test.ts`, `tests/lib/pricing.test.ts`

- [ ] **Step 1: Falende tests schrijven**

`tests/lib/availability.test.ts`:

```ts
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
```

`tests/lib/pricing.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { basePriceCents } from '@/lib/pricing';

describe('basePriceCents', () => {
  it('is dagprijs × dagen', () => {
    expect(basePriceCents(3500, 7)).toBe(24500);
    expect(basePriceCents(4250, 3)).toBe(12750);
  });
});
```

- [ ] **Step 2: Tests draaien, verwacht FAIL**

```bash
npx vitest run tests/lib/availability.test.ts tests/lib/pricing.test.ts
```

Verwacht: FAIL met "Failed to resolve import".

- [ ] **Step 3: `src/lib/availability.ts` maken**

```ts
import type { ISODate } from '@/lib/dates';
import type { Selection } from '@/lib/selection';

/** Bezette periode, half-open: [from, to). `to` is de inleverdag en zelf vrij. */
export type BusyRange = { from: ISODate; to: ISODate };
export type AvailabilityMap = Record<string, BusyRange[]>;
export type CarStatus = 'unknown' | 'available' | 'busy';

function overlaps(a: BusyRange, b: BusyRange): boolean {
  return a.from < b.to && b.from < a.to; // ISO-datums vergelijken als strings
}

export function isRangeFree(busy: BusyRange[], wanted: BusyRange): boolean {
  return !busy.some((b) => overlaps(b, wanted));
}

export function isDayBusy(busy: BusyRange[], day: ISODate): boolean {
  return busy.some((b) => b.from <= day && day < b.to);
}

export function carStatus(busy: BusyRange[], selection: Selection, loaded: boolean): CarStatus {
  if (!loaded || selection.state !== 'valid') return 'unknown';
  return isRangeFree(busy, selection) ? 'available' : 'busy';
}

export function sortByAvailability<T>(cars: T[], status: (car: T) => CarStatus): T[] {
  return [...cars.filter((c) => status(c) !== 'busy'), ...cars.filter((c) => status(c) === 'busy')];
}
```

- [ ] **Step 4: `src/lib/pricing.ts` maken**

```ts
/** Prijs zonder extra's. Extra's komen in stap 2. */
export function basePriceCents(pricePerDayCents: number, days: number): number {
  return pricePerDayCents * days;
}
```

- [ ] **Step 5: Tests draaien, verwacht PASS**

```bash
npx vitest run tests/lib/availability.test.ts tests/lib/pricing.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/availability.ts src/lib/pricing.ts tests/lib/availability.test.ts tests/lib/pricing.test.ts
git commit -m "feat: beschikbaarheidslogica en basisprijs"
```

---

### Task 5: Opmaak en WhatsApp-links

**Files:**
- Create: `src/lib/format.ts`, `src/lib/whatsapp.ts`
- Test: `tests/lib/format.test.ts`, `tests/lib/whatsapp.test.ts`

- [ ] **Step 1: Falende tests schrijven**

`tests/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDate, formatEuro } from '@/lib/format';

const plain = (s: string) => s.replace(/\u00a0|\u202f/g, ' ');

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
```

`tests/lib/whatsapp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CONTACT } from '@/config';
import { whatsappUrl } from '@/lib/whatsapp';

describe('whatsappUrl', () => {
  it('zonder bericht', () => {
    expect(whatsappUrl()).toBe(`https://wa.me/${CONTACT.whatsapp}`);
  });
  it('met gecodeerd bericht', () => {
    expect(whatsappUrl('Hoi & tot zo')).toBe(`https://wa.me/${CONTACT.whatsapp}?text=Hoi%20%26%20tot%20zo`);
  });
});
```

- [ ] **Step 2: Tests draaien, verwacht FAIL**

```bash
npx vitest run tests/lib/format.test.ts tests/lib/whatsapp.test.ts
```

- [ ] **Step 3: `src/lib/format.ts` maken**

```ts
import type { ISODate } from '@/lib/dates';

export function formatEuro(cents: number, locale: string): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

export function formatDate(d: ISODate, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${d}T00:00:00Z`));
}
```

- [ ] **Step 4: `src/lib/whatsapp.ts` maken**

```ts
import { CONTACT } from '@/config';

export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${CONTACT.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
```

- [ ] **Step 5: Tests draaien, verwacht PASS**

```bash
npx vitest run tests/lib/format.test.ts tests/lib/whatsapp.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/format.ts src/lib/whatsapp.ts tests/lib/format.test.ts tests/lib/whatsapp.test.ts
git commit -m "feat: euro-/datumopmaak en WhatsApp-links"
```

---

### Task 6: Databaseschema met overlapcontrole

**Files:**
- Create: `tests/db/helpers.ts`, `tests/db/periods.test.ts`, `supabase/migrations/20261010000001_schema.sql`

- [ ] **Step 1: `tests/db/helpers.ts` maken**

Deze helper start een in-memory Postgres (PGlite), maakt de rollen aan die Supabase standaard heeft en voert alle migraties in volgorde uit.

```ts
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
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
  }
  return db;
}

export function readSeed(): string {
  return readFileSync(path.join(ROOT, 'supabase', 'seed.sql'), 'utf8');
}

export async function resetData(db: PGlite): Promise<void> {
  await db.exec('truncate public.periods, public.requests, public.extras, public.cars cascade;');
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
): Promise<void> {
  await db.query(
    `insert into public.periods (car_id, period, kind, request_id, note)
     values ($1::uuid, daterange($2::date, $3::date, '[)'), $4, $5::uuid, $6)`,
    [p.carId, p.from, p.to, p.kind, p.requestId ?? null, p.note ?? null],
  );
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
```

- [ ] **Step 2: Falende test schrijven: `tests/db/periods.test.ts`**

```ts
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
```

- [ ] **Step 3: Test draaien, verwacht FAIL**

```bash
npx vitest run tests/db/periods.test.ts
```

Verwacht: FAIL met "ENOENT" (de map `supabase/migrations` bestaat nog niet).

- [ ] **Step 4: `supabase/migrations/20261010000001_schema.sql` maken**

```sql
-- Happy Ride: basisschema
-- Overlap van periodes per auto wordt afgedwongen door een exclusion constraint.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- Vloot --------------------------------------------------------------------
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  transmission text not null check (transmission in ('manual', 'automatic')),
  seats smallint not null check (seats between 1 and 9),
  luggage smallint not null default 0 check (luggage between 0 and 10),
  airco boolean not null default true,
  price_per_day_cents integer not null check (price_per_day_cents > 0),
  photo_path text,
  is_placeholder_photo boolean not null default false,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Extra's -------------------------------------------------------------------
create table public.extras (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('extra_driver', 'child_seat')),
  price_per_day_cents integer not null check (price_per_day_cents >= 0),
  active boolean not null default true
);

-- Aanvragen -----------------------------------------------------------------
create sequence public.request_reference_seq start 1001;

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  reference integer not null unique default nextval('public.request_reference_seq'),
  car_id uuid not null references public.cars (id) on delete restrict,
  pickup_date date not null,
  return_date date not null,
  pickup_time time not null,
  return_time time not null,
  pickup_location text not null check (pickup_location in ('airport', 'accommodation', 'office')),
  accommodation_address text,
  flight_number text,
  name text not null,
  email text not null,
  phone text not null,
  message text,
  extra_driver boolean not null default false,
  child_seats smallint not null default 0 check (child_seats between 0 and 3),
  total_price_cents integer not null check (total_price_cents > 0),
  locale text not null check (locale in ('nl', 'en', 'es')),
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'rejected', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  reminder_sent_at timestamptz,
  mail_failed boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint requests_dates_check check (return_date > pickup_date),
  constraint requests_address_check
    check (pickup_location <> 'accommodation' or length(trim(coalesce(accommodation_address, ''))) > 0)
);

create index requests_status_expires_idx on public.requests (status, expires_at);

-- Bezette periodes ----------------------------------------------------------
-- period is half-open [ophaaldag, inleverdag): de inleverdag is vrij voor de volgende klant.
create table public.periods (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars (id) on delete restrict,
  period daterange not null,
  kind text not null check (kind in ('option', 'confirmed', 'blocked')),
  request_id uuid unique references public.requests (id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  constraint periods_period_check
    check (not isempty(period) and lower(period) is not null and upper(period) is not null),
  constraint periods_request_check check ((kind = 'blocked') = (request_id is null)),
  constraint periods_no_overlap exclude using gist (car_id with =, period with &&)
);

-- Toegang -------------------------------------------------------------------
alter table public.cars enable row level security;
alter table public.extras enable row level security;
alter table public.requests enable row level security;
alter table public.periods enable row level security;

revoke all on public.cars, public.extras, public.requests, public.periods from anon, authenticated;
grant select on public.cars, public.extras to anon, authenticated;

create policy "cars: publiek leest zichtbare auto's" on public.cars
  for select to anon, authenticated using (visible);

create policy "extras: publiek leest actieve extra's" on public.extras
  for select to anon, authenticated using (active);
```

- [ ] **Step 5: Test draaien, verwacht PASS**

```bash
npx vitest run tests/db/periods.test.ts
```

Verwacht: alle 15 tests PASS (9 combinaties + 6 losse tests). Faalt het laden van `btree_gist` of `create role`, controleer dan de geïnstalleerde PGlite-versie (`npm ls @electric-sql/pglite`). `contrib/btree_gist` bestaat vanaf 0.2.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261010000001_schema.sql tests/db/helpers.ts tests/db/periods.test.ts
git commit -m "feat: databaseschema met exclusion constraint tegen overlap"
```

---

### Task 7: Beschikbaarheid uit de database (`get_availability`) en toegangsregels

**Files:**
- Create: `supabase/migrations/20261010000002_availability.sql`
- Test: `tests/db/availability.test.ts`

- [ ] **Step 1: Falende test schrijven: `tests/db/availability.test.ts`**

```ts
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
});
```

- [ ] **Step 2: Test draaien, verwacht FAIL**

```bash
npx vitest run tests/db/availability.test.ts
```

Verwacht: FAIL met "function public.get_availability() does not exist". De drie RLS-tests onder "toegang" kunnen al slagen, want die gebruiken alleen het schema uit Task 6.

- [ ] **Step 3: `supabase/migrations/20261010000002_availability.sql` maken**

```sql
-- "Vandaag" op Curaçao (UTC−4, geen zomertijd). Vaste offset: werkt zonder tijdzonedatabase.
create or replace function public.curacao_today()
returns date
language sql
stable
as $$
  select ((now() at time zone 'UTC') - interval '4 hours')::date
$$;

-- Bezette periodes per zichtbare auto, van vandaag tot 12 maanden vooruit.
-- Alleen auto + datums: geen persoonsgegevens. Verlopen opties tellen niet mee.
create or replace function public.get_availability()
returns table (car_id uuid, start_date date, end_date date)
language sql
stable
security definer
set search_path = public
as $$
  select p.car_id, lower(p.period), upper(p.period)
  from public.periods p
  join public.cars c on c.id = p.car_id and c.visible
  left join public.requests r on r.id = p.request_id
  where upper(p.period) > public.curacao_today()
    and lower(p.period) < (public.curacao_today() + interval '12 months')::date
    and not (p.kind = 'option' and r.expires_at <= now())
  order by p.car_id, lower(p.period)
$$;

revoke all on function public.get_availability() from public;
grant execute on function public.get_availability() to anon, authenticated;
```

- [ ] **Step 4: Tests draaien, verwacht PASS**

```bash
npx vitest run tests/db
```

Verwacht: alle tests in `periods.test.ts` en `availability.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261010000002_availability.sql tests/db/availability.test.ts
git commit -m "feat: get_availability() zonder persoonsgegevens, met toegangstests"
```

---

### Task 8: Voorbeeldvloot (seed)

**Files:**
- Create: `supabase/seed.sql`
- Test: `tests/db/seed.test.ts`

- [ ] **Step 1: Falende test schrijven: `tests/db/seed.test.ts`**

```ts
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
});
```

- [ ] **Step 2: Test draaien, verwacht FAIL**

```bash
npx vitest run tests/db/seed.test.ts
```

Verwacht: FAIL met "ENOENT ... seed.sql".

- [ ] **Step 3: `supabase/seed.sql` maken**

```sql
-- Voorbeeldvloot (placeholders). Wordt later via de beheerpagina vervangen.
insert into public.cars
  (name, transmission, seats, luggage, airco, price_per_day_cents, is_placeholder_photo, sort_order)
values
  ('Kia Picanto',  'automatic', 4, 1, true, 3500, true, 10),
  ('Hyundai i20',  'automatic', 5, 2, true, 4200, true, 20),
  ('Suzuki Jimny', 'automatic', 4, 1, true, 6000, true, 30),
  ('Kia Sportage', 'automatic', 5, 3, true, 7000, true, 40);

insert into public.extras (key, price_per_day_cents)
values
  ('extra_driver', 500),
  ('child_seat', 500);
```

- [ ] **Step 4: Test draaien, verwacht PASS**

```bash
npx vitest run tests/db/seed.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql tests/db/seed.test.ts
git commit -m "feat: voorbeeldvloot en extra's als seed"
```

---

### Task 9: Talen, layout, stijl en teksten

**Files:**
- Create: `src/i18n/routing.ts`, `src/i18n/navigation.ts`, `src/i18n/request.ts`, `src/proxy.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx` (tijdelijk), `messages/nl.json`
- Modify: `next.config.ts`, `src/app/globals.css`
- Delete: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/favicon.ico`, `src/app/page.module.css` (als die bestaat), standaard-SVG's in `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`)

- [ ] **Step 1: Scaffold-bestanden opruimen**

```bash
rm -f src/app/layout.tsx src/app/page.tsx src/app/favicon.ico src/app/page.module.css
rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

- [ ] **Step 2: `src/i18n/routing.ts`**

```ts
import { defineRouting } from 'next-intl/routing';

// Stap 4 voegt 'en' en 'es' toe.
export const routing = defineRouting({
  locales: ['nl'],
  defaultLocale: 'nl',
  localePrefix: 'always',
});
```

- [ ] **Step 3: `src/i18n/navigation.ts`**

```ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

- [ ] **Step 4: `src/i18n/request.ts`**

```ts
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    timeZone: 'America/Curacao',
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 5: `src/proxy.ts`** (Next 16 noemt middleware "proxy")

```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Alles behalve API-routes, Next-interne bestanden en bestanden met een extensie.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

- [ ] **Step 6: `next.config.ts` vervangen**

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [{ protocol: 'https', hostname: new URL(supabaseUrl).hostname, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 7: `src/app/globals.css` vervangen**

Contrast: donkerblauwe tekst op oranje is 6,5:1 (AA). Witte tekst op oranje haalt AA niet, dus knoppen gebruiken donkerblauwe tekst.

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-nunito), ui-sans-serif, system-ui, sans-serif;

  --color-navy-950: #071526;
  --color-navy-900: #0b2545;
  --color-navy-700: #1d3f6e;
  --color-navy-100: #e6edf7;

  --color-sun-600: #ef6c00;
  --color-sun-500: #fb8c00;
  --color-sun-100: #fff3e0;

  --color-lagoon-800: #115e59;
  --color-lagoon-600: #0d9488;
  --color-lagoon-100: #ccfbf1;
}

@layer components {
  .btn-primary {
    @apply inline-flex min-h-12 items-center justify-center rounded-full bg-sun-500 px-6 text-lg font-extrabold text-navy-900 transition hover:bg-sun-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900;
  }
  .btn-secondary {
    @apply inline-flex min-h-12 items-center justify-center rounded-full border-2 border-navy-900 px-6 font-bold text-navy-900 transition hover:bg-navy-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900;
  }
  .btn-ghost {
    @apply inline-flex min-h-11 items-center justify-center rounded-full px-4 font-bold text-navy-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-navy-900;
  }
}

html {
  scroll-behavior: smooth;
}
```

- [ ] **Step 8: `messages/nl.json`** (alle teksten voor stap 1)

```json
{
  "meta": {
    "title": "Happy Ride Car Rental — Autohuur op Curaçao",
    "description": "Huur een auto op Curaçao bij Happy Ride. Zie direct welke auto's vrij zijn op jouw data, met prijzen in euro's. Gratis ophalen op de luchthaven."
  },
  "header": {
    "logoAlt": "Happy Ride Car Rental",
    "whatsapp": "WhatsApp",
    "languages": "Taal"
  },
  "hero": {
    "title": "Huur je auto op Curaçao",
    "subtitle": "Kies je data en zie meteen welke auto's vrij zijn. Ophalen op de luchthaven is gratis.",
    "pickup": "Ophalen",
    "return": "Inleveren",
    "showCars": "Bekijk auto's",
    "days": "{count, plural, one {# dag} other {# dagen}}",
    "invalid": {
      "format": "Deze datum klopt niet. Kies een datum in de kalender.",
      "past": "Kies een ophaaldatum vanaf vandaag.",
      "order": "De inleverdatum moet na de ophaaldatum liggen.",
      "tooShort": "De minimale huurperiode is {min} dagen."
    }
  },
  "fleet": {
    "title": "Onze auto's",
    "chooseDatesHint": "Kies je data om te zien welke auto's vrij zijn.",
    "loadError": "De beschikbaarheid kon niet geladen worden. Stuur ons een WhatsApp, dan kijken we het direct voor je na."
  },
  "car": {
    "automatic": "Automaat",
    "manual": "Schakel",
    "seats": "{count} personen",
    "luggage": "{count, plural, =0 {geen koffers} one {# koffer} other {# koffers}}",
    "airco": "Airco",
    "perDay": "per dag",
    "total": "{price} totaal voor {days, plural, one {# dag} other {# dagen}}",
    "available": "Beschikbaar",
    "busy": "Bezet op deze data",
    "request": "Aanvragen",
    "chooseDates": "Kies je data",
    "showAvailability": "Beschikbaarheid",
    "hideAvailability": "Verberg kalender",
    "example": "voorbeeld",
    "photoAlt": "Foto van de {name}"
  },
  "calendar": {
    "previous": "Vorige maand",
    "next": "Volgende maand",
    "free": "Vrij",
    "busy": "Bezet",
    "selected": "Jouw data"
  },
  "conditions": {
    "title": "Voorwaarden in het kort",
    "items": {
      "age": "Minimumleeftijd [23] jaar, rijbewijs minimaal [2] jaar in bezit.",
      "minDays": "Minimale huurduur [3] dagen.",
      "deposit": "Borg [€ 400], die je terugkrijgt als je de auto zonder schade inlevert.",
      "km": "Onbeperkt aantal kilometers.",
      "insurance": "Basisverzekering inbegrepen, eigen risico [€ 500].",
      "airport": "Gratis ophalen en inleveren op de luchthaven.",
      "fuel": "Tank vol ophalen, vol inleveren.",
      "extras": "Extra bestuurder [€ 5] per dag, kinderzitje [€ 5] per dag.",
      "cancel": "Gratis annuleren tot [48] uur voor het ophalen."
    }
  },
  "faq": {
    "title": "Veelgestelde vragen",
    "items": {
      "q1": {
        "q": "Is mijn aanvraag meteen een reservering?",
        "a": "Nee. Je doet eerst een aanvraag. Happy Ride reageert binnen [24] uur met een bevestiging en de betaalopties. Pas daarna is de auto voor je gereserveerd."
      },
      "q2": {
        "q": "Hoe betaal ik?",
        "a": "Je betaalt niet via de website. Na je aanvraag ontvang je van ons de betaalopties."
      },
      "q3": {
        "q": "Kan ik de auto op de luchthaven ophalen?",
        "a": "Ja, ophalen en inleveren op de luchthaven van Curaçao is gratis. Geef je vluchtnummer door, dan houden we rekening met je aankomsttijd."
      },
      "q4": {
        "q": "Welk rijbewijs heb ik nodig?",
        "a": "Een geldig rijbewijs dat je minimaal [2] jaar hebt. Je moet minimaal [23] jaar oud zijn."
      },
      "q5": {
        "q": "Wat als mijn plannen veranderen?",
        "a": "Annuleren is gratis tot [48] uur voor het ophalen. Stuur ons een WhatsApp of e-mail."
      },
      "q6": {
        "q": "Aan welke kant van de weg rijd je op Curaçao?",
        "a": "Rechts, net als in Nederland en de rest van het Europese vasteland."
      }
    }
  },
  "footer": {
    "contact": "Contact",
    "tagline": "Car Rental",
    "rights": "© {year} Happy Ride Car Rental"
  },
  "whatsapp": {
    "general": "Hallo Happy Ride, ik heb een vraag over het huren van een auto.",
    "request": "Hallo Happy Ride, ik wil graag de {car} aanvragen van {from} tot {to}."
  }
}
```

- [ ] **Step 9: `src/app/[locale]/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import '../globals.css';

// next/font downloadt het lettertype tijdens de build en serveert het vanaf de eigen site (AVG).
const nunito = Nunito({ subsets: ['latin'], display: 'swap', variable: '--font-nunito' });

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description'),
    metadataBase: new URL(process.env.SITE_URL ?? 'https://happyride.cw'),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={nunito.variable}>
      <body className="bg-white font-sans text-navy-900 antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Tijdelijke `src/app/[locale]/page.tsx`** (Task 15 vervangt hem)

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('hero');
  return <h1 className="p-8 text-3xl font-extrabold">{t('title')}</h1>;
}
```

- [ ] **Step 11: Controleren**

```bash
npm run typecheck && npm run build
```

Verwacht: geen typefouten, de build slaagt en de routes tonen `/[locale]` met `/nl` (SSG). Start daarna `npm run dev`: `http://localhost:3000/` moet doorsturen naar `/nl` en daar "Huur je auto op Curaçao" tonen.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: next-intl (nl), layout, kleuren en Nederlandse teksten"
```

---

### Task 10: Logo, favicon en placeholderfoto

**Files:**
- Create: `scripts/prepare-brand-assets.mjs`, `public/logo.png`, `src/app/icon.png`, `public/placeholders/car.svg`

- [ ] **Step 1: `scripts/prepare-brand-assets.mjs`**

```js
// Verkleint de logo's van Google Drive naar web-formaten.
// Gebruik: node scripts/prepare-brand-assets.mjs "<map met logo's>"
import path from 'node:path';
import sharp from 'sharp';

const srcDir = process.argv[2];
if (!srcDir) {
  console.error('Geef de map met logo’s op, bv.: node scripts/prepare-brand-assets.mjs "J:/Mijn Drive/..."');
  process.exit(1);
}

await sharp(path.join(srcDir, 'Logo zonder achtergrond.png'))
  .resize(512, 512, { fit: 'inside' })
  .png({ compressionLevel: 9, palette: true })
  .toFile('public/logo.png');

await sharp(path.join(srcDir, 'Logo zonder naam.png'))
  .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile('src/app/icon.png');

console.log('Klaar: public/logo.png en src/app/icon.png');
```

- [ ] **Step 2: Script draaien**

```bash
node scripts/prepare-brand-assets.mjs "J:/Mijn Drive/Projecten/#5 Happy Ride Car Rental/02 — Design & Branding"
```

Verwacht: "Klaar: …". Controleer met `ls -la public/logo.png src/app/icon.png` dat beide bestanden kleiner zijn dan 300 KB.

- [ ] **Step 3: `public/placeholders/car.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img" aria-label="Voorbeeldfoto">
  <rect width="800" height="500" fill="#e6edf7"/>
  <g fill="none" stroke="#9fb3cf" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
    <path d="M150 320 h500 v-50 q0-20-20-25 l-70-15 l-70-70 q-12-12-30-12 h-160 q-18 0-30 12 l-60 70 l-40 10 q-20 5-20 25 z"/>
    <path d="M265 190 h110 v55 h-160 z M405 190 h55 l55 55 h-110 z"/>
  </g>
  <circle cx="260" cy="330" r="48" fill="#e6edf7" stroke="#9fb3cf" stroke-width="14"/>
  <circle cx="540" cy="330" r="48" fill="#e6edf7" stroke="#9fb3cf" stroke-width="14"/>
</svg>
```

- [ ] **Step 4: Commit**

```bash
git add scripts/prepare-brand-assets.mjs public/logo.png src/app/icon.png public/placeholders/car.svg
git commit -m "feat: logo, favicon en placeholderfoto"
```

---

### Task 11: Supabase koppelen en datalaag

**Files:**
- Create: `src/lib/types.ts`, `src/lib/supabase/public.ts`, `src/lib/data/cars.ts`, `src/lib/data/availability.ts`, `src/app/api/availability/route.ts`
- Test: `tests/lib/data.test.ts`

- [ ] **Step 1: ⚠️ Taak voor de eigenaar (Mitch): Supabase-project aanmaken**

De uitvoerder stopt hier en vraagt de eigenaar om:
1. Op supabase.com een project `happy-ride` aan te maken in regio **Central EU (Frankfurt)**.
2. In de **SQL Editor** achtereenvolgens de inhoud te plakken en uit te voeren van `supabase/migrations/20261010000001_schema.sql`, `supabase/migrations/20261010000002_availability.sql` en `supabase/seed.sql`.
3. Onder **Project Settings → API** de *Project URL* en de *anon* of *publishable key* door te geven.

De uitvoerder zet die twee waarden daarna in `.env.local` (dat bestand staat in `.gitignore`):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon- of publishable key>
SITE_URL=http://localhost:3000
```

De anon/publishable key is bedoeld om openbaar in de browser te staan; de beveiliging zit in de RLS-regels uit Task 6 en 7. Vraag **nooit** om de service role key of het databasewachtwoord.

- [ ] **Step 2: Falende test schrijven: `tests/lib/data.test.ts`**

```ts
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
```

- [ ] **Step 3: Test draaien, verwacht FAIL**

```bash
npx vitest run tests/lib/data.test.ts
```

- [ ] **Step 4: `src/lib/types.ts`**

```ts
export type Transmission = 'manual' | 'automatic';

export type Car = {
  id: string;
  name: string;
  transmission: Transmission;
  seats: number;
  luggage: number;
  airco: boolean;
  pricePerDayCents: number;
  photoUrl: string | null;
  isPlaceholderPhoto: boolean;
};
```

- [ ] **Step 5: `src/lib/supabase/public.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

/** Client met de anon key: alleen wat RLS bezoekers toestaat. Geen sessie. */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreken (zie .env.example).');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
```

- [ ] **Step 6: `src/lib/data/cars.ts`**

```ts
import { createPublicClient } from '@/lib/supabase/public';
import type { Car, Transmission } from '@/lib/types';

export type CarRow = {
  id: string;
  name: string;
  transmission: Transmission;
  seats: number;
  luggage: number;
  airco: boolean;
  price_per_day_cents: number;
  photo_path: string | null;
  is_placeholder_photo: boolean;
};

const CAR_COLUMNS =
  'id, name, transmission, seats, luggage, airco, price_per_day_cents, photo_path, is_placeholder_photo';

export function mapCarRow(row: CarRow, supabaseUrl: string): Car {
  return {
    id: row.id,
    name: row.name,
    transmission: row.transmission,
    seats: row.seats,
    luggage: row.luggage,
    airco: row.airco,
    pricePerDayCents: row.price_per_day_cents,
    photoUrl: row.photo_path ? `${supabaseUrl}/storage/v1/object/public/car-photos/${row.photo_path}` : null,
    isPlaceholderPhoto: row.is_placeholder_photo,
  };
}

/** Zichtbare auto's in de volgorde van de beheerpagina (RLS laat alleen zichtbare door). */
export async function getVisibleCars(): Promise<Car[]> {
  const { data, error } = await createPublicClient()
    .from('cars')
    .select(CAR_COLUMNS)
    .order('sort_order')
    .order('name')
    .returns<CarRow[]>();
  if (error) throw new Error(`Auto's laden mislukt: ${error.message}`);
  return (data ?? []).map((row) => mapCarRow(row, process.env.NEXT_PUBLIC_SUPABASE_URL!));
}
```

- [ ] **Step 7: `src/lib/data/availability.ts`**

```ts
import type { AvailabilityMap } from '@/lib/availability';

export type AvailabilityRow = { car_id: string; start_date: string; end_date: string };

export function rowsToAvailabilityMap(rows: AvailabilityRow[]): AvailabilityMap {
  const map: AvailabilityMap = {};
  for (const r of rows) {
    (map[r.car_id] ??= []).push({ from: r.start_date, to: r.end_date });
  }
  return map;
}
```

- [ ] **Step 8: `src/app/api/availability/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { rowsToAvailabilityMap, type AvailabilityRow } from '@/lib/data/availability';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET() {
  const { data, error } = await createPublicClient().rpc('get_availability');
  if (error) {
    console.error('get_availability mislukt:', error.message);
    return NextResponse.json({ error: 'availability_unavailable' }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json(rowsToAvailabilityMap((data ?? []) as AvailabilityRow[]), { headers: NO_STORE });
}
```

- [ ] **Step 9: Test draaien, verwacht PASS**

```bash
npx vitest run tests/lib/data.test.ts
```

- [ ] **Step 10: Live controleren tegen Supabase**

```bash
npm run dev
```

Open in een tweede terminal (of in de browser) `http://localhost:3000/api/availability`. Verwacht: `{}` (de seed heeft geen periodes) met status 200.

- [ ] **Step 11: Commit**

```bash
git add src/lib/types.ts src/lib/supabase/public.ts src/lib/data tests/lib/data.test.ts src/app/api/availability/route.ts
git commit -m "feat: datalaag voor auto's en beschikbaarheid via Supabase"
```

---

### Task 12: Header met taalwisselaar en WhatsApp-knop

**Files:**
- Create: `src/components/WhatsAppButton.tsx`, `src/components/LanguageSwitcher.tsx`, `src/components/Header.tsx`

- [ ] **Step 1: `src/components/WhatsAppButton.tsx`**

```tsx
import { MessageCircle } from 'lucide-react';
import { whatsappUrl } from '@/lib/whatsapp';

export function WhatsAppButton({ label, message }: { label: string; message?: string }) {
  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sun-500 px-4 font-bold text-navy-900 transition hover:bg-sun-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
    >
      <MessageCircle aria-hidden className="size-5" />
      <span>{label}</span>
    </a>
  );
}
```

- [ ] **Step 2: `src/components/LanguageSwitcher.tsx`**

Toont niets zolang er maar één taal is. In stap 4 verschijnt hij vanzelf.

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function LanguageSwitcher() {
  const t = useTranslations('header');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (routing.locales.length < 2) return null;

  const query = Object.fromEntries(searchParams.entries());

  return (
    <nav aria-label={t('languages')} className="flex rounded-full border border-navy-100 p-0.5 text-sm font-bold">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={{ pathname, query }}
          locale={l}
          aria-current={l === locale ? 'true' : undefined}
          className={`grid min-h-10 min-w-10 place-items-center rounded-full px-2 ${
            l === locale ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-100'
          }`}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: `src/components/Header.tsx`**

```tsx
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { WhatsAppButton } from './WhatsAppButton';

export async function Header() {
  const t = await getTranslations('header');
  const tw = await getTranslations('whatsapp');

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-3 px-4">
        <a href="#top" className="flex items-center">
          <Image src="/logo.png" alt={t('logoAlt')} width={64} height={64} priority className="size-16 object-contain" />
        </a>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
          <WhatsAppButton label={t('whatsapp')} message={tw('general')} />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Verwacht: geen fouten.

- [ ] **Step 5: Commit**

```bash
git add src/components/WhatsAppButton.tsx src/components/LanguageSwitcher.tsx src/components/Header.tsx
git commit -m "feat: header met logo, taalwisselaar en WhatsApp-knop"
```

---

### Task 13: Hero met datumkiezer

**Files:**
- Create: `src/components/DateRangePicker.tsx`, `src/components/Hero.tsx`

- [ ] **Step 1: `src/components/DateRangePicker.tsx`**

Gebruikt de native datumvelden van de telefoon: die zijn snel, toegankelijk en er is geen extra bibliotheek nodig. Kiest de klant een ophaaldatum terwijl de inleverdatum leeg of te vroeg is, dan zet het veld de inleverdatum automatisch op de minimale huurduur.

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { RULES } from '@/config';
import { usePathname, useRouter } from '@/i18n/navigation';
import { addDays, curacaoToday, daysBetween, isISODate } from '@/lib/dates';
import { parseSelection } from '@/lib/selection';

export function DateRangePicker() {
  const t = useTranslations('hero');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const today = curacaoToday();
  const from = searchParams.get('van') ?? '';
  const to = searchParams.get('tot') ?? '';
  const selection = parseSelection(from || null, to || null, today);

  function update(next: { van: string; tot: string }) {
    const query = Object.fromEntries(searchParams.entries());
    for (const [key, value] of Object.entries(next)) {
      if (value) query[key] = value;
      else delete query[key];
    }
    router.replace({ pathname, query }, { scroll: false });
  }

  function onPickupChange(value: string) {
    const needsReturn = !isISODate(to) || !isISODate(value) || daysBetween(value, to) < RULES.minRentalDays;
    update({ van: value, tot: needsReturn && isISODate(value) ? addDays(value, RULES.minRentalDays) : to });
  }

  let message = '';
  if (selection.state === 'valid') message = t('days', { count: selection.days });
  if (selection.state === 'invalid') message = t(`invalid.${selection.reason}`, { min: RULES.minRentalDays });

  return (
    <div className="rounded-2xl bg-white p-4 text-navy-900 shadow-xl sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-sm font-bold">{t('pickup')}</span>
          <input
            type="date"
            name="van"
            value={from}
            min={today}
            onChange={(e) => onPickupChange(e.target.value)}
            className="mt-1 block h-12 w-full rounded-xl border border-navy-100 bg-white px-3 text-base"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold">{t('return')}</span>
          <input
            type="date"
            name="tot"
            value={to}
            min={isISODate(from) ? addDays(from, 1) : addDays(today, 1)}
            onChange={(e) => update({ van: from, tot: e.target.value })}
            className="mt-1 block h-12 w-full rounded-xl border border-navy-100 bg-white px-3 text-base"
          />
        </label>
        <a href="#vloot" className="btn-primary">
          {t('showCars')}
        </a>
      </div>
      <p
        aria-live="polite"
        className={`mt-3 min-h-6 text-sm font-semibold ${selection.state === 'invalid' ? 'text-sun-600' : 'text-navy-700'}`}
      >
        {message}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/Hero.tsx`**

De hero-foto is nog niet aangeleverd, dus voorlopig staat er een rustig donkerblauw vlak. Komt er een foto, dan zet je die als `next/image` met `fill` en een donkere overlay in deze sectie.

```tsx
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { DateRangePicker } from './DateRangePicker';

export async function Hero() {
  const t = await getTranslations('hero');

  return (
    <section id="top" className="scroll-mt-20 bg-navy-900 text-white">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pb-16 sm:pt-16">
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-lg text-navy-100">{t('subtitle')}</p>
        <div className="mt-6">
          <Suspense fallback={<div className="h-40 rounded-2xl bg-white/10" />}>
            <DateRangePicker />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/components/DateRangePicker.tsx src/components/Hero.tsx
git commit -m "feat: hero met datumkiezer, data in de URL"
```

---

### Task 14: Beschikbaarheidskalender

**Files:**
- Create: `src/components/AvailabilityCalendar.tsx`

- [ ] **Step 1: `src/components/AvailabilityCalendar.tsx`**

```tsx
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { RULES } from '@/config';
import { isDayBusy, type BusyRange } from '@/lib/availability';
import { addMonths, curacaoToday, monthGrid, monthOf, type ISOMonth } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import type { Selection } from '@/lib/selection';

type Props = { busy: BusyRange[]; selection: Selection };

export function AvailabilityCalendar({ busy, selection }: Props) {
  const t = useTranslations('calendar');
  const locale = useLocale();

  const today = curacaoToday();
  const minMonth = monthOf(today);
  const maxMonth = addMonths(minMonth, RULES.availabilityMonthsAhead - 1);
  const wanted = selection.state === 'valid' ? monthOf(selection.from) : minMonth;
  const [month, setMonth] = useState<ISOMonth>(wanted < minMonth ? minMonth : wanted > maxMonth ? maxMonth : wanted);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
  // 1 januari 2024 was een maandag.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + i))),
  );
  const inSelection = (day: string) => selection.state === 'valid' && day >= selection.from && day <= selection.to;

  return (
    <div className="rounded-xl border border-navy-100 p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={month <= minMonth}
          aria-label={t('previous')}
          className="grid size-11 place-items-center rounded-full hover:bg-navy-100 disabled:opacity-30"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <p className="font-bold capitalize" aria-live="polite">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={month >= maxMonth}
          aria-label={t('next')}
          className="grid size-11 place-items-center rounded-full hover:bg-navy-100 disabled:opacity-30"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      <div aria-hidden className="mt-2 grid grid-cols-7 gap-1 text-center text-xs font-bold text-navy-700">
        {weekdays.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <ol className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
        {monthGrid(month).map((day, i) => {
          if (!day) return <li key={`leeg-${i}`} aria-hidden />;
          const past = day < today;
          const busyDay = !past && isDayBusy(busy, day);
          const state = past ? '' : busyDay ? t('busy') : t('free');
          return (
            <li
              key={day}
              className={[
                'grid h-9 place-items-center rounded-lg',
                past
                  ? 'text-gray-300'
                  : busyDay
                    ? 'bg-gray-200 text-gray-500 line-through'
                    : 'bg-lagoon-100 font-semibold text-lagoon-800',
                inSelection(day) ? 'ring-2 ring-navy-900' : '',
              ].join(' ')}
            >
              <span aria-hidden>{Number(day.slice(8))}</span>
              <span className="sr-only">
                {formatDate(day, locale)}
                {state ? `: ${state}` : ''}
              </span>
            </li>
          );
        })}
      </ol>

      <ul className="mt-3 flex flex-wrap gap-4 text-xs text-navy-700">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded bg-lagoon-100" />
          {t('free')}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded bg-gray-200" />
          {t('busy')}
        </li>
        {selection.state === 'valid' && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded ring-2 ring-navy-900" />
            {t('selected')}
          </li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AvailabilityCalendar.tsx
git commit -m "feat: maandkalender met vrije en bezette dagen"
```

---

### Task 15: Autokaarten, vlootoverzicht en de pagina

**Files:**
- Create: `src/components/CarCard.tsx`, `src/components/Fleet.tsx`
- Modify: `src/app/[locale]/page.tsx` (vervangt de tijdelijke versie)

- [ ] **Step 1: `src/components/CarCard.tsx`**

In deze stap opent **Aanvragen** WhatsApp met een voorgevuld bericht; stap 2 vervangt dat door het formulier. Is de beschikbaarheid nog niet geladen (status `unknown`) terwijl de data geldig zijn, dan staat de knop er al wel: Happy Ride controleert de aanvraag toch.

```tsx
'use client';

import { Cog, Luggage, Snowflake, Users } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { BusyRange, CarStatus } from '@/lib/availability';
import { formatDate, formatEuro } from '@/lib/format';
import { basePriceCents } from '@/lib/pricing';
import type { Selection } from '@/lib/selection';
import type { Car } from '@/lib/types';
import { whatsappUrl } from '@/lib/whatsapp';
import { AvailabilityCalendar } from './AvailabilityCalendar';

type Props = { car: Car; status: CarStatus; selection: Selection; busy: BusyRange[] };

export function CarCard({ car, status, selection, busy }: Props) {
  const t = useTranslations('car');
  const tw = useTranslations('whatsapp');
  const locale = useLocale();
  const [showCalendar, setShowCalendar] = useState(false);

  const isBusy = status === 'busy';
  const valid = selection.state === 'valid' ? selection : null;
  const total = valid ? basePriceCents(car.pricePerDayCents, valid.days) : null;

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm ${
        isBusy ? 'opacity-60 grayscale' : ''
      }`}
    >
      <div className="relative aspect-[16/10] bg-navy-100">
        <Image
          src={car.photoUrl ?? '/placeholders/car.svg'}
          alt={t('photoAlt', { name: car.name })}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
          unoptimized={!car.photoUrl}
        />
        {(car.isPlaceholderPhoto || !car.photoUrl) && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-navy-700">
            {t('example')}
          </span>
        )}
        {status === 'available' && (
          <span className="absolute right-3 top-3 rounded-full bg-lagoon-100 px-3 py-1 text-sm font-bold text-lagoon-800">
            {t('available')}
          </span>
        )}
        {isBusy && (
          <span className="absolute right-3 top-3 rounded-full bg-gray-200 px-3 py-1 text-sm font-bold text-gray-700">
            {t('busy')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-xl font-extrabold">{car.name}</h3>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy-700">
          <li className="flex items-center gap-1.5">
            <Cog aria-hidden className="size-4" />
            {t(car.transmission)}
          </li>
          <li className="flex items-center gap-1.5">
            <Users aria-hidden className="size-4" />
            {t('seats', { count: car.seats })}
          </li>
          {car.airco && (
            <li className="flex items-center gap-1.5">
              <Snowflake aria-hidden className="size-4" />
              {t('airco')}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <Luggage aria-hidden className="size-4" />
            {t('luggage', { count: car.luggage })}
          </li>
        </ul>

        <p className="mt-4">
          <span className="text-2xl font-extrabold">{formatEuro(car.pricePerDayCents, locale)}</span>{' '}
          <span className="text-navy-700">{t('perDay')}</span>
        </p>
        {valid && total !== null && (
          <p className="text-sm font-semibold text-navy-700">
            {t('total', { price: formatEuro(total, locale), days: valid.days })}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          {valid && !isBusy && (
            <a
              href={whatsappUrl(
                tw('request', {
                  car: car.name,
                  from: formatDate(valid.from, locale),
                  to: formatDate(valid.to, locale),
                }),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              {t('request')}
            </a>
          )}
          {!valid && (
            <a href="#top" className="btn-secondary">
              {t('chooseDates')}
            </a>
          )}
          <button
            type="button"
            aria-expanded={showCalendar}
            onClick={() => setShowCalendar((v) => !v)}
            className="btn-ghost"
          >
            {showCalendar ? t('hideAvailability') : t('showAvailability')}
          </button>
        </div>

        {showCalendar && (
          <div className="mt-3">
            <AvailabilityCalendar busy={busy} selection={selection} />
          </div>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: `src/components/Fleet.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { carStatus, sortByAvailability, type AvailabilityMap } from '@/lib/availability';
import { curacaoToday } from '@/lib/dates';
import { parseSelection } from '@/lib/selection';
import type { Car } from '@/lib/types';
import { CarCard } from './CarCard';

export function Fleet({ cars }: { cars: Car[] }) {
  const t = useTranslations('fleet');
  const searchParams = useSearchParams();
  const selection = parseSelection(searchParams.get('van'), searchParams.get('tot'), curacaoToday());

  const [availability, setAvailability] = useState<AvailabilityMap | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/availability', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<AvailabilityMap>;
      })
      .then((data) => {
        if (!cancelled) setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const busyOf = (car: Car) => availability?.[car.id] ?? [];
  const statusOf = (car: Car) => carStatus(busyOf(car), selection, availability !== null);

  return (
    <section id="vloot" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
      <h2 className="text-2xl font-extrabold sm:text-3xl">{t('title')}</h2>
      {selection.state !== 'valid' && <p className="mt-2 text-navy-700">{t('chooseDatesHint')}</p>}
      {loadError && (
        <p role="alert" className="mt-4 rounded-xl bg-sun-100 p-4 font-semibold">
          {t('loadError')}
        </p>
      )}
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortByAvailability(cars, statusOf).map((car) => (
          <li key={car.id}>
            <CarCard car={car} status={statusOf(car)} selection={selection} busy={busyOf(car)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FleetSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-96 animate-pulse rounded-2xl bg-navy-100" />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `src/app/[locale]/page.tsx` vervangen**

```tsx
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { Fleet, FleetSkeleton } from '@/components/Fleet';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { getVisibleCars } from '@/lib/data/cars';

// Vangnet: elk uur opnieuw opbouwen. De beheerpagina (stap 3) ververst direct via revalidatePath.
export const revalidate = 3600;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const cars = await getVisibleCars();

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Suspense fallback={<FleetSkeleton />}>
          <Fleet cars={cars} />
        </Suspense>
      </main>
    </>
  );
}
```

- [ ] **Step 4: Controleren in de browser**

```bash
npm run dev
```

Open `http://localhost:3000/nl` op een mobiel formaat (375 × 812) en controleer:
1. Er zijn vier kaarten met het label "voorbeeld", € 35 / € 42 / € 60 / € 70 per dag, en de knop "Kies je data".
2. Kies een ophaaldatum: de inleverdatum springt naar +3 dagen, onder de velden staat "3 dagen", de URL krijgt `?van=…&tot=…`, en elke kaart toont "Beschikbaar", de totaalprijs en de knop "Aanvragen".
3. Zet de inleverdatum op 1 dag na het ophalen: je ziet de melding "De minimale huurperiode is 3 dagen." en de kaarten vallen terug op "Kies je data".
4. Blokkeer in de Supabase SQL Editor een auto over je gekozen data:
   ```sql
   insert into periods (car_id, period, kind, note)
   select id, daterange(current_date + 5, current_date + 9, '[)'), 'blocked', 'test' from cars where name = 'Kia Picanto';
   ```
   Kies data die daarmee overlappen en herlaad: de Picanto staat onderaan, grijs, met "Bezet op deze data" en zonder knop Aanvragen. Klap "Beschikbaarheid" open: de dagen zijn doorgestreept en de inleverdag is groen.
5. Verwijder de testblokkade weer: `delete from periods where note = 'test';`

- [ ] **Step 5: Commit**

```bash
git add src/components/CarCard.tsx src/components/Fleet.tsx "src/app/[locale]/page.tsx"
git commit -m "feat: vlootoverzicht met status, totaalprijs en kalender per auto"
```

---

### Task 16: Voorwaarden, veelgestelde vragen en footer

**Files:**
- Create: `src/components/Conditions.tsx`, `src/components/Faq.tsx`, `src/components/Footer.tsx`
- Modify: `src/app/[locale]/page.tsx`

- [ ] **Step 1: `src/components/Conditions.tsx`**

```tsx
import {
  Baby,
  CalendarDays,
  CalendarX,
  Fuel,
  IdCard,
  Infinity as InfinityIcon,
  Plane,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const ITEMS: { key: string; Icon: LucideIcon }[] = [
  { key: 'age', Icon: IdCard },
  { key: 'minDays', Icon: CalendarDays },
  { key: 'deposit', Icon: Wallet },
  { key: 'km', Icon: InfinityIcon },
  { key: 'insurance', Icon: ShieldCheck },
  { key: 'airport', Icon: Plane },
  { key: 'fuel', Icon: Fuel },
  { key: 'extras', Icon: Baby },
  { key: 'cancel', Icon: CalendarX },
];

export async function Conditions() {
  const t = await getTranslations('conditions');

  return (
    <section id="voorwaarden" className="scroll-mt-20 bg-navy-100/50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-extrabold sm:text-3xl">{t('title')}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ key, Icon }) => (
            <li key={key} className="flex gap-3 rounded-xl bg-white p-4">
              <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-lagoon-600" />
              <span>{t(`items.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: `src/components/Faq.tsx`**

```tsx
import { ChevronDown } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

export async function Faq() {
  const t = await getTranslations('faq');

  return (
    <section id="vragen" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-10">
      <h2 className="text-2xl font-extrabold sm:text-3xl">{t('title')}</h2>
      <div className="mt-6 space-y-3">
        {KEYS.map((key) => (
          <details key={key} className="group rounded-xl border border-navy-100 bg-white p-4 open:shadow-sm">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-bold">
              {t(`items.${key}.q`)}
              <ChevronDown aria-hidden className="size-5 shrink-0 transition group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-navy-700">{t(`items.${key}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: `src/components/Footer.tsx`**

Zolang het witte logo er niet is, staat de naam als tekst in de footer. De link naar de privacyverklaring komt in stap 4, samen met de pagina zelf.

```tsx
import { Mail, MapPin, MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { CONTACT } from '@/config';
import { whatsappUrl } from '@/lib/whatsapp';

export async function Footer() {
  const t = await getTranslations('footer');
  const tw = await getTranslations('whatsapp');

  return (
    <footer className="bg-navy-950 text-navy-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-extrabold text-white">Happy Ride</p>
          <p className="text-sm uppercase tracking-widest">{t('tagline')}</p>
        </div>
        <div>
          <h2 className="font-bold text-white">{t('contact')}</h2>
          <ul className="mt-3 space-y-3">
            <li className="flex items-start gap-2">
              <MapPin aria-hidden className="mt-0.5 size-5 shrink-0" />
              {CONTACT.address}
            </li>
            <li>
              <a
                href={whatsappUrl(tw('general'))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-2 hover:text-white"
              >
                <MessageCircle aria-hidden className="size-5" />
                WhatsApp
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className="flex min-h-11 items-center gap-2 hover:text-white">
                <Mail aria-hidden className="size-5" />
                {CONTACT.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-sm">
        {t('rights', { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
```

- [ ] **Step 4: `src/app/[locale]/page.tsx` aanvullen**

Vervang de inhoud door:

```tsx
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { Conditions } from '@/components/Conditions';
import { Faq } from '@/components/Faq';
import { Fleet, FleetSkeleton } from '@/components/Fleet';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { getVisibleCars } from '@/lib/data/cars';

// Vangnet: elk uur opnieuw opbouwen. De beheerpagina (stap 3) ververst direct via revalidatePath.
export const revalidate = 3600;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const cars = await getVisibleCars();

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Suspense fallback={<FleetSkeleton />}>
          <Fleet cars={cars} />
        </Suspense>
        <Conditions />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: Controleren in de browser**

```bash
npm run dev
```

Op `http://localhost:3000/nl` (375 px breed) moeten de negen voorwaarden met iconen te zien zijn, en zes uitklapbare vragen die bij een tik openklappen. De footer toont adres, WhatsApp en e-mail. Nergens mag de pagina horizontaal scrollen.

- [ ] **Step 6: Commit**

```bash
git add src/components/Conditions.tsx src/components/Faq.tsx src/components/Footer.tsx "src/app/[locale]/page.tsx"
git commit -m "feat: voorwaarden, veelgestelde vragen en footer"
```

---

### Task 17: Alles controleren, README bijwerken en pushen

**Files:**
- Modify: `README.md`

- [ ] **Step 1: `README.md` vervangen**

````markdown
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
````

- [ ] **Step 2: Volledige controle**

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Verwacht: alle tests PASS, geen type- of lintfouten, de build slaagt en `/nl` wordt gebouwd als statische pagina.

- [ ] **Step 3: Controleren op geheimen vóór het pushen** (de repo is openbaar)

```bash
git status --short
git ls-files | grep -iE '\.env($|\.)' || echo "geen env-bestanden gevolgd"
git grep -nE 'sb_secret_|service_role.*ey[A-Za-z0-9]|RESEND_API_KEY=re_' -- . ':!.env.example' || echo "geen geheimen gevonden"
```

Verwacht: alleen `.env.example` wordt gevolgd, en "geen geheimen gevonden".

- [ ] **Step 4: Commit en push**

```bash
git add README.md
git commit -m "docs: README met lokaal draaien en testen"
git push -u origin stap-1-vloot
```

---

### Task 18: Netlify koppelen

- [ ] **Step 1: ⚠️ Taak voor de eigenaar (Mitch): Netlify-site aanmaken**

De uitvoerder vraagt de eigenaar om:
1. Op netlify.com **Add new project → Import an existing project → GitHub** te kiezen, met de repo `Mitchroelchatbot/Happy-Ride`. Netlify herkent Next.js vanzelf.
2. Onder **Site configuration → Environment variables** in te stellen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `SITE_URL` (voorlopig de `*.netlify.app`-URL).
3. **Deploy Previews** aan te laten staan, zodat elke branch of pull request een eigen preview krijgt.

- [ ] **Step 2: Preview controleren**

Open de deploy-preview van branch `stap-1-vloot` op een telefoon en loop de controles uit Task 15 (stap 4, punten 1 t/m 3) en Task 16 (stap 5) opnieuw na.

- [ ] **Step 3: Afronden**

Gebruik de skill superpowers:finishing-a-development-branch om `stap-1-vloot` samen te voegen met `main`.
