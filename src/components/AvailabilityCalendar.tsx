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
