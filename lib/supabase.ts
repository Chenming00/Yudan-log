import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseEnv() {
  const supabaseUrl =
    process.env.PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env.PUBLIC_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const supabaseAnonKey =
    process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials missing in environment variables.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  return supabaseClient;
}

export function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const { supabaseUrl } = getSupabaseEnv();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.SUPABASE_SECRET_KEY ||
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (!secretKey) {
    throw new Error('Supabase server secret key is not configured.');
  }

  supabaseAdminClient = createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdminClient;
}
