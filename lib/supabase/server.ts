import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function cleanSupabaseUrl(url?: string): string {
  if (!url) return '';
  const match = url.match(/(https:\/\/[a-zA-Z0-9_-]+\.supabase\.co)/);
  if (match) return match[1];
  return url.trim().replace(/^["'`]|["'`]$/g, '');
}

export function cleanSupabaseKey(key?: string): string {
  if (!key) return '';
  const match = key.match(/(sb_[a-zA-Z0-9_-]+|eyJ[a-zA-Z0-9_.-]+)/);
  if (match) return match[1];
  return key.trim().replace(/^["'`]|["'`]$/g, '');
}

export function isSupabaseConfigured(): boolean {
  const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return !!url && !!key && !url.includes('placeholder') && !key.includes('placeholder');
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrl = cleanSupabaseUrl(rawUrl) || 'https://placeholder.supabase.co';
  const supabaseAnonKey = cleanSupabaseKey(rawKey) || 'placeholder-anon-key';

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component setAll ignored
          }
        },
      },
    }
  );
}
