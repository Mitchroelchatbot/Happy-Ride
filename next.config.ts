import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Bewust GEEN cacheComponents/partialPrefetching (scaffold-standaard): we gebruiken het klassieke
// ISR-model (`export const revalidate`, revalidatePath) dat Netlify volledig ondersteunt.
const nextConfig: NextConfig = {
  // Tailwind v4 loopt via de Turbopack-loader (geen postcss.config.mjs in deze scaffold).
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  images: {
    remotePatterns: supabaseUrl
      ? [{ protocol: 'https', hostname: new URL(supabaseUrl).hostname, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
};

export default withNextIntl(nextConfig);
