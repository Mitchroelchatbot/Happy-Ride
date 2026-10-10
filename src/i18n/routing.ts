import { defineRouting } from 'next-intl/routing';

// Stap 4 voegt 'en' en 'es' toe.
export const routing = defineRouting({
  locales: ['nl'],
  defaultLocale: 'nl',
  localePrefix: 'always',
});
