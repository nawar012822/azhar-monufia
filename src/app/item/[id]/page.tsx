import type { Metadata } from 'next';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import ItemView from '@/components/ItemView';
import { SITE_URL } from '@/lib/constants';

export const revalidate = 60;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dbsklaimaaytqnzolsbw.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Czdm3uPIoyv4DhfN3Kch9A_Jswl6DK0';

// Server-side anon read. Only approved items are rendered on the server;
// anything else falls back to the client lookup (owners / moderators).
const getItem = cache(async (id: string) => {
  if (!/^\d+$/.test(id)) return null;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb.from('items').select('*').eq('id', id).eq('status', 'approved').maybeSingle();
  return data;
});

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = await getItem(params.id);
  if (!item) return { title: 'مادة | المستودع الرقمي', robots: { index: false } };
  const description = (item.abstract || '').slice(0, 160);
  return {
    title: `${item.title} | المستودع الرقمي`,
    description,
    alternates: { canonical: `${SITE_URL}/item/${item.id}` },
    openGraph: { title: item.title, description, type: 'article', locale: 'ar_EG', url: `${SITE_URL}/item/${item.id}` },
  };
}

export default async function ItemPage({ params }: { params: { id: string } }) {
  if (!/^\d+$/.test(params.id)) notFound();
  const item = await getItem(params.id);
  return <ItemView initialItem={item} id={params.id} />;
}
