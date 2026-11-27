import type { MetadataRoute } from 'next';
import { serverClient } from '@/lib/supabase';
import { COLLECTIONS, SITE_URL } from '@/lib/constants';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = serverClient();
  const { data } = await sb.from('items').select('id,created_at').eq('status', 'approved').limit(5000);

  const fixed = ['', '/search', '/about', '/contact', '/policies', '/my-library'].map((p) => ({ url: `${SITE_URL}${p}` }));
  const cols = COLLECTIONS.map((c) => ({ url: `${SITE_URL}/collections/${c.slug}` }));
  const { data: orgs } = await sb.from('orgs').select('path').neq('kind', 'university');
  const depts = (orgs || []).map((o: any) => ({ url: `${SITE_URL}/browse/${o.path}` }));
  const items = (data || []).map((i: any) => ({ url: `${SITE_URL}/item/${i.id}`, lastModified: new Date(i.created_at) }));
  return [...fixed, ...cols, ...depts, ...items];
}
