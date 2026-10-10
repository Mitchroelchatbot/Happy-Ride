import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { WhatsAppButton } from './WhatsAppButton';

export async function Header() {
  const t = await getTranslations('header');
  const tw = await getTranslations('whatsapp');

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-3 px-4">
        <a href="#top" className="flex items-center">
          <Image src="/logo.png" alt={t('logoAlt')} width={64} height={64} priority className="size-16 object-contain" />
        </a>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
          <WhatsAppButton label={t('whatsapp')} message={tw('general')} />
        </div>
      </div>
    </header>
  );
}
