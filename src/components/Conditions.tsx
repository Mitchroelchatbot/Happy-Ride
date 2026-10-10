import {
  Baby,
  CalendarDays,
  CalendarX,
  Fuel,
  IdCard,
  Infinity as InfinityIcon,
  Plane,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const ITEMS: { key: string; Icon: LucideIcon }[] = [
  { key: 'age', Icon: IdCard },
  { key: 'minDays', Icon: CalendarDays },
  { key: 'deposit', Icon: Wallet },
  { key: 'km', Icon: InfinityIcon },
  { key: 'insurance', Icon: ShieldCheck },
  { key: 'airport', Icon: Plane },
  { key: 'fuel', Icon: Fuel },
  { key: 'extras', Icon: Baby },
  { key: 'cancel', Icon: CalendarX },
];

export async function Conditions() {
  const t = await getTranslations('conditions');

  return (
    <section id="voorwaarden" className="scroll-mt-20 bg-navy-100/50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-extrabold sm:text-3xl">{t('title')}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ key, Icon }) => (
            <li key={key} className="flex gap-3 rounded-xl bg-white p-4">
              <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-lagoon-600" />
              <span>{t(`items.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
