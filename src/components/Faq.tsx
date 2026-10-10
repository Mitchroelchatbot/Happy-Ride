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
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900 [&::-webkit-details-marker]:hidden">
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
