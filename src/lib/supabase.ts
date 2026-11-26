import { createClient } from '@supabase/supabase-js';

// Public (publishable) values. Env vars override them; the fallbacks keep the
// existing deployment working unchanged.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dbsklaimaaytqnzolsbw.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Czdm3uPIoyv4DhfN3Kch9A_Jswl6DK0';

export const supabase = createClient(supabaseUrl, supabaseKey);
