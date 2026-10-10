import type { AvailabilityMap } from '@/lib/availability';

export type AvailabilityRow = { car_id: string; start_date: string; end_date: string };

export function rowsToAvailabilityMap(rows: AvailabilityRow[]): AvailabilityMap {
  const map: AvailabilityMap = {};
  for (const r of rows) {
    (map[r.car_id] ??= []).push({ from: r.start_date, to: r.end_date });
  }
  return map;
}
