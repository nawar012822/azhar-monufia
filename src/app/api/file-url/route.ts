import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { presignR2Get, r2Configured } from '@/lib/r2';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';

export const runtime = 'nodejs';

// Best-effort burst limit per server instance: this endpoint is open to everyone and hits the database.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.forEach((v, k) => { if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k); });
  return arr.length > MAX_PER_WINDOW;
}

// Returns a short-lived link to a file kept in Cloudflare R2, only if the database
// rules (row-level security) let this caller see the file row. Same rules as before:
// open files for everyone, restricted files for signed-in users.
export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ error: 'too many requests' }, { status: 429 });
  if (!r2Configured()) return NextResponse.json({ error: 'storage not configured' }, { status: 503 });
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }); }
  const key = typeof body?.file_key === 'string' ? body.file_key : '';
  if (!key || key.length > 300 || key.includes('..')) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const auth = req.headers.get('authorization') || '';
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: 'repo' }, global: { headers: auth ? { Authorization: auth } : {} }, auth: { persistSession: false },
  });
  const { data, error } = await sb.from('item_files').select('file_key,bucket').eq('file_key', key).eq('bucket', 'r2').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const name = typeof body?.name === 'string' && body.download ? body.name.slice(0, 120) : undefined;
  return NextResponse.json({ url: presignR2Get(key, { expires: 300, downloadName: name }) });
}
