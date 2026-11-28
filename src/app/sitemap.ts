import type { MetadataRoute } from 'next';
import { serverClient } from '@/lib/supabase';
import { COLLECTIONS, SITE_URL } from '@/lib/constants';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = serverClient();
  const data: any[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data: page } = await sb.from('items').select('id,created_at').eq('status', 'approved').order('id').range(from, from + 999);
    if (!page || !page.length) break;
    data.push(...page);
    if (page.length < 1000) break;
  }

  const fixed = ['', '/search', '/about', '/contact', '/policies'].map((p) => ({ url: `${SITE_URL}${p}` }));
  const cols = COLLECTIONS.map((c) => ({ url: `${SITE_URL}/collections/${c.slug}` }));
  const { data: orgs } = await sb.from('orgs').select('path').neq('kind', 'university');
  const depts = (orgs || []).map((o: any) => ({ url: `${SITE_URL}/browse/${o.path}` }));
  const items = (data || []).map((i: any) => ({ url: `${SITE_URL}/item/${i.id}`, lastModified: new Date(i.created_at) }));
  return [...fixed, ...cols, ...depts, ...items];
}
