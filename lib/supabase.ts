import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

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
