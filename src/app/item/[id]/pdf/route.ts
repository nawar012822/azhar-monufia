import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase';
import { presignR2Get, r2Configured } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stable, permanent link to an item's PDF (for Google Scholar, harvesters and citations).
// Redirects to a short-lived signed link. Only works for files the public can read (open items).
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!/^\d+$/.test(params.id)) return new NextResponse('Not found', { status: 404 });
  const sb = serverClient();
  const { data: f } = await sb.from('item_files').select('bucket,file_key').eq('item_id', params.id).maybeSingle();
  if (!f) return new NextResponse('Not found', { status: 404 });
  let url: string | null = null;
  if (f.bucket === 'r2') { if (r2Configured()) url = presignR2Get(f.file_key, { expires: 300 }); }
  else if (f.bucket === 'books') url = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dbsklaimaaytqnzolsbw.supabase.co'}/storage/v1/object/public/books/${f.file_key.split('/').map(encodeURIComponent).join('/')}`;
  else { const { data } = await sb.storage.from(f.bucket).createSignedUrl(f.file_key, 300); url = data?.signedUrl || null; }
  if (!url) return new NextResponse('Unavailable', { status: 503 });
  return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}
