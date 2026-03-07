interface HealthPayload {
  ok: boolean;
  checked_at: string;
  duration_ms: number;
  supabase_probe: 'ok' | 'error' | 'skipped';
  status?: number;
}

interface JsonResponse {
  status: (code: number) => {
    json: (payload: HealthPayload) => void;
  };
}

function getSupabaseConfig() {
  return {
    url: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
  };
}

export default async function handler(_: unknown, response: JsonResponse) {
  const startedAt = Date.now();
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    const payload: HealthPayload = {
      ok: true,
      checked_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      supabase_probe: 'skipped',
    };

    response.status(200).json(payload);
    return;
  }

  const probeUrl = new URL('/rest/v1/menu_items', url);
  probeUrl.searchParams.set('select', 'id');
  probeUrl.searchParams.set('limit', '1');

  try {
    const probeResponse = await fetch(probeUrl, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: 'no-store',
    });

    const ok = probeResponse.ok;
    const payload: HealthPayload = {
      ok,
      checked_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      supabase_probe: ok ? 'ok' : 'error',
      status: probeResponse.status,
    };

    response.status(ok ? 200 : 503).json(payload);
  } catch {
    const payload: HealthPayload = {
      ok: false,
      checked_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      supabase_probe: 'error',
    };

    response.status(503).json(payload);
  }
}
