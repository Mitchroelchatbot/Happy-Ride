import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { Conditions } from '@/components/Conditions';
import { Faq } from '@/components/Faq';
import { Fleet, FleetSkeleton } from '@/components/Fleet';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { getVisibleCars } from '@/lib/data/cars';

// Vangnet: elk uur opnieuw opbouwen. De beheerpagina (stap 3) ververst direct via revalidatePath.
export const revalidate = 3600;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const cars = await getVisibleCars();

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Suspense fallback={<FleetSkeleton />}>
          <Fleet cars={cars} />
        </Suspense>
        <Conditions />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
