import { createClient } from '@supabase/supabase-js';

// Public (publishable) values. Env vars override them.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dbsklaimaaytqnzolsbw.supabase.co';
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Czdm3uPIoyv4DhfN3Kch9A_Jswl6DK0';

// All data lives in the "repo" schema (multi-tenant). Auth and storage are unaffected by the schema option.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'repo' } });

// Server-side anonymous client (no session).
export const serverClient = () =>
  createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'repo' }, auth: { persistSession: false } });
