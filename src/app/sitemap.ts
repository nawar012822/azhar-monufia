import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { COLLECTIONS, SITE_URL } from '@/lib/constants';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dbsklaimaaytqnzolsbw.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Czdm3uPIoyv4DhfN3Kch9A_Jswl6DK0';
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb.from('items').select('id,created_at').eq('status', 'approved').limit(5000);

  const fixed = ['', '/search', '/about', '/contact', '/policies'].map((p) => ({ url: `${SITE_URL}${p}` }));
  const cols = COLLECTIONS.map((c) => ({ url: `${SITE_URL}/collections/${encodeURIComponent(c.id)}` }));
  const items = (data || []).map((i: any) => ({ url: `${SITE_URL}/item/${i.id}`, lastModified: new Date(i.created_at) }));
  return [...fixed, ...cols, ...items];
}
