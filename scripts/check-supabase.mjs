import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

try {
  const healthUrl = new URL('/auth/v1/health', supabaseUrl);
  const response = await fetch(healthUrl, {
    headers: {
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Health endpoint returned ${response.status} ${response.statusText}`);
  }

  // Keep a typed Supabase call to verify client can be instantiated and used.
  await supabase.auth.getSession();

  console.log('Supabase connection check passed.');
} catch (error) {
  console.error('Supabase connection check failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
