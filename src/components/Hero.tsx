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
