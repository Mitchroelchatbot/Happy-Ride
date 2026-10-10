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
