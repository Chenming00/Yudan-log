import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let browserClientKey = '';

export function getBrowserSupabaseClient(url: string, publishableKey: string) {
  if (!url || !publishableKey) return null;

  const nextKey = `${url}:${publishableKey}`;
  if (browserClient && browserClientKey === nextKey) return browserClient;

  browserClient = createClient(url, publishableKey, {
    auth: {
      storageKey: 'yudan-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  browserClientKey = nextKey;

  return browserClient;
}
