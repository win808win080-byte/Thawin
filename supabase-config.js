export const SUPABASE_URL = 'https://ufqdccduxffrowzjdhtm.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_-v-oCKqJFvO-sXx8kKXesg_V9dECXyQ';

export function isSupabaseConfigured() {
  return !SUPABASE_URL.includes('YOUR_PROJECT_ID')
    && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');
}
