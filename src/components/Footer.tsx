import { Mail, MapPin, MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { CONTACT } from '@/config';
import { whatsappUrl } from '@/lib/whatsapp';

export async function Footer() {
  const t = await getTranslations('footer');
  const tw = await getTranslations('whatsapp');

  return (
    <footer className="bg-navy-950 text-navy-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2">
        <div>
          <p className="text-2xl font-extrabold text-white">Happy Ride</p>
          <p className="text-sm uppercase tracking-widest">{t('tagline')}</p>
        </div>
        <div>
          <h2 className="font-bold text-white">{t('contact')}</h2>
          <ul className="mt-3 space-y-3">
            <li className="flex items-start gap-2">
              <MapPin aria-hidden className="mt-0.5 size-5 shrink-0" />
              {CONTACT.address}
            </li>
            <li>
              <a
                href={whatsappUrl(tw('general'))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-2 hover:text-white"
              >
                <MessageCircle aria-hidden className="size-5" />
                WhatsApp
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className="flex min-h-11 items-center gap-2 hover:text-white">
                <Mail aria-hidden className="size-5" />
                {CONTACT.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-sm">
        {t('rights', { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
