import { createBrowserClient } from '@supabase/ssr';

function cleanSupabaseUrl(url?: string): string {
  if (!url) return '';
  const match = url.match(/(https:\/\/[a-zA-Z0-9_-]+\.supabase\.co)/);
  if (match) return match[1];
  return url.trim().replace(/^["'`]|["'`]$/g, '');
}

function cleanSupabaseKey(key?: string): string {
  if (!key) return '';
  const match = key.match(/(sb_[a-zA-Z0-9_-]+|eyJ[a-zA-Z0-9_.-]+)/);
  if (match) return match[1];
  return key.trim().replace(/^["'`]|["'`]$/g, '');
}

export function createClient() {
  const supabaseUrl = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co';
  const supabaseAnonKey = cleanSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder-anon-key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
