'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
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
  const urlFrom = searchParams.get('van') ?? '';
  const urlTo = searchParams.get('tot') ?? '';

  // Lokale state: de velden volgen direct wat de gebruiker typt, ook terwijl de navigatie nog loopt.
  const [dates, setDates] = useState({ van: urlFrom, tot: urlTo });
  const [seenUrl, setSeenUrl] = useState({ van: urlFrom, tot: urlTo });
  // Verandert de URL van buiten (terugknop, taalwissel), neem die waarden dan over.
  if (seenUrl.van !== urlFrom || seenUrl.tot !== urlTo) {
    setSeenUrl({ van: urlFrom, tot: urlTo });
    setDates({ van: urlFrom, tot: urlTo });
  }
  const { van: from, tot: to } = dates;
  const selection = parseSelection(from || null, to || null, today);

  function update(next: { van: string; tot: string }) {
    setDates(next);
    // Tussenwaarden tijdens het typen (bijv. jaar 0002) gaan niet naar de URL.
    const complete = (v: string) => v === '' || isISODate(v);
    if (!complete(next.van) || !complete(next.tot)) return;
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
        className={`mt-3 min-h-6 text-sm font-semibold ${selection.state === 'invalid' ? 'text-sun-800' : 'text-navy-700'}`}
      >
        {message}
      </p>
    </div>
  );
}
