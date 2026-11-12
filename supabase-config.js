export const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

export function isSupabaseConfigured() {
  return !SUPABASE_URL.includes('YOUR_PROJECT_ID')
    && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');
}
