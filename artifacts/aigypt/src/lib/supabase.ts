import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://placeholder.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL is not set — Supabase calls will fail until credentials are configured.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
