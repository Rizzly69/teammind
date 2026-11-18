import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co').trim().replace(/^["']|["']$/g, '');
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key').trim().replace(/^["']|["']$/g, '');

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
