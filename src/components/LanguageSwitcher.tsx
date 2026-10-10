'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function LanguageSwitcher() {
  const t = useTranslations('header');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (routing.locales.length < 2) return null;

  const query = Object.fromEntries(searchParams.entries());

  return (
    <nav aria-label={t('languages')} className="flex rounded-full border border-navy-100 p-0.5 text-sm font-bold">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={{ pathname, query }}
          locale={l}
          aria-current={l === locale ? 'true' : undefined}
          className={`grid min-h-10 min-w-10 place-items-center rounded-full px-2 ${
            l === locale ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-100'
          }`}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
