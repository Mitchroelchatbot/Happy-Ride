import { NextResponse } from 'next/server';
import { rowsToAvailabilityMap, type AvailabilityRow } from '@/lib/data/availability';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET() {
  const { data, error } = await createPublicClient().rpc('get_availability');
  if (error) {
    console.error('get_availability mislukt:', error.message);
    return NextResponse.json({ error: 'availability_unavailable' }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json(rowsToAvailabilityMap((data ?? []) as AvailabilityRow[]), { headers: NO_STORE });
}
