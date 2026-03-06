import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function testSupabaseConnection(): Promise<void> {
  const healthUrl = new URL('/auth/v1/health', supabaseUrl);
  const response = await fetch(healthUrl, {
    headers: {
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase healthcheck failed: ${response.status} ${response.statusText}`);
  }
}
