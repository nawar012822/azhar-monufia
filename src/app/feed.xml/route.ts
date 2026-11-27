import { serverClient } from '@/lib/supabase';
import { SITE_URL } from '@/lib/constants';

export const revalidate = 600;
const esc = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] as string));

export async function GET() {
  const { data } = await serverClient().from('items').select('id,title,author,abstract,created_at').eq('status', 'approved').order('created_at', { ascending: false }).limit(50);
  const items = (data || []).map((i: any) => `<item><title>${esc(i.title || '')}</title><link>${SITE_URL}/item/${i.id}</link><guid isPermaLink="true">${SITE_URL}/item/${i.id}</guid><pubDate>${new Date(i.created_at).toUTCString()}</pubDate>${i.author ? `<author>${esc(i.author)}</author>` : ''}<description>${esc((i.abstract || '').slice(0, 400))}</description></item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>المستودع الرقمي</title><link>${SITE_URL}</link><description>أحدث المواد المضافة</description><language>ar</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
