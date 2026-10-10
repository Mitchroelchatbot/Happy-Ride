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
