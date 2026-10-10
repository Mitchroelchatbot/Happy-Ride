'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { carStatus, sortByAvailability, type AvailabilityMap } from '@/lib/availability';
import { curacaoToday } from '@/lib/dates';
import { parseSelection, type Selection } from '@/lib/selection';
import type { Car } from '@/lib/types';
import { CarCard } from './CarCard';

export function Fleet({ cars }: { cars: Car[] }) {
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

  return <FleetView cars={cars} selection={selection} availability={availability} loadError={loadError} />;
}

type ViewProps = {
  cars: Car[];
  selection: Selection;
  availability: AvailabilityMap | null;
  loadError: boolean;
};

// Alleen weergave. Ook de Suspense-fallback in page.tsx, zodat auto's en prijzen al in de statische HTML staan.
export function FleetView({ cars, selection, availability, loadError }: ViewProps) {
  const t = useTranslations('fleet');
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
