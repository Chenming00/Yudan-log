import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let browserClientKey = '';
let browserClientPromise: Promise<SupabaseClient> | null = null;

export async function getBrowserSupabaseClient(url: string, publishableKey: string) {
  if (!url || !publishableKey) return null;

  const nextKey = `${url}:${publishableKey}`;
  if (browserClient && browserClientKey === nextKey) return browserClient;

  if (!browserClientPromise || browserClientKey !== nextKey) {
    browserClientKey = nextKey;
    browserClientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, publishableKey, {
        auth: {
          storageKey: 'yudan-auth',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    );
  }

  browserClient = await browserClientPromise;
  return browserClient;
}
