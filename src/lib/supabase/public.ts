import { createClient } from '@supabase/supabase-js';

/** Client met de anon key: alleen wat RLS bezoekers toestaat. Geen sessie. */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreken (zie .env.example).');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
