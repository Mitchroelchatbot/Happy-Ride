import { createPublicClient } from '@/lib/supabase/public';
import type { Car, Transmission } from '@/lib/types';

export type CarRow = {
  id: string;
  name: string;
  transmission: Transmission;
  seats: number;
  luggage: number;
  airco: boolean;
  price_per_day_cents: number;
  photo_path: string | null;
  is_placeholder_photo: boolean;
};

const CAR_COLUMNS =
  'id, name, transmission, seats, luggage, airco, price_per_day_cents, photo_path, is_placeholder_photo';

export function mapCarRow(row: CarRow, supabaseUrl: string): Car {
  return {
    id: row.id,
    name: row.name,
    transmission: row.transmission,
    seats: row.seats,
    luggage: row.luggage,
    airco: row.airco,
    pricePerDayCents: row.price_per_day_cents,
    photoUrl: row.photo_path ? `${supabaseUrl}/storage/v1/object/public/car-photos/${row.photo_path}` : null,
    isPlaceholderPhoto: row.is_placeholder_photo,
  };
}

/** Zichtbare auto's in de volgorde van de beheerpagina (RLS laat alleen zichtbare door). */
export async function getVisibleCars(): Promise<Car[]> {
  const { data, error } = await createPublicClient()
    .from('cars')
    .select(CAR_COLUMNS)
    .order('sort_order')
    .order('name')
    .overrideTypes<CarRow[], { merge: false }>();
  if (error) throw new Error(`Auto's laden mislukt: ${error.message}`);
  return (data ?? []).map((row) => mapCarRow(row, process.env.NEXT_PUBLIC_SUPABASE_URL!));
}
