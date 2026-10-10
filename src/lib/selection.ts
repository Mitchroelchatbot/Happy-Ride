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
