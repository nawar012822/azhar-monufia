import type { Metadata } from 'next';
import { cache } from 'react';
import { serverClient } from '@/lib/supabase';
import { ITEM_SELECT, flat } from '@/lib/repo';
import { notFound } from 'next/navigation';
import ItemView from '@/components/ItemView';
import { SITE_URL } from '@/lib/constants';
import { itemJsonLd, citationMeta } from '@/lib/scholarly';

export const revalidate = 60;

// Server-side anon read. Only approved items are rendered on the server;
// anything else falls back to the client lookup (owners / moderators).
const getItem = cache(async (id: string) => {
  if (!/^\d+$/.test(id)) return null;
  const { data } = await serverClient().from('items').select(ITEM_SELECT).eq('id', id).eq('status', 'approved').maybeSingle();
  return data ? flat(data) : null;
});
const hasFileFor = cache(async (id: string) => {
  const { data } = await serverClient().from('item_files').select('file_key').eq('item_id', id).maybeSingle();
  return !!data;
});

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = await getItem(params.id);
  if (!item) return { title: 'مادة | المستودع الرقمي', robots: { index: false } };
  const description = (item.abstract || '').slice(0, 160);
  return {
    title: `${item.title} | المستودع الرقمي`,
    description,
    alternates: { canonical: `${SITE_URL}/item/${item.id}` },
    other: citationMeta(item, await hasFileFor(params.id)),
    openGraph: { title: item.title, description, type: 'article', locale: 'ar_EG', url: `${SITE_URL}/item/${item.id}` },
  };
}

export default async function ItemPage({ params }: { params: { id: string } }) {
  if (!/^\d+$/.test(params.id)) notFound();
  const item = await getItem(params.id);
  const ld = item ? itemJsonLd(item, await hasFileFor(params.id)) : null;
  return (<>
    {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />}
    <ItemView initialItem={item} id={params.id} />
  </>);
}
