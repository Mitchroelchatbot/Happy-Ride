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
