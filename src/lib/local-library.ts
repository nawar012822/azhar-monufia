// Reading list and recently viewed.
// Signed in: saved on the account (table user_lists), so it follows the user to any device.
// Signed out: saved in this browser only. On login the browser lists are merged into the account.
import { supabase } from '@/lib/supabase';

export type Mini = { id: number | string; title: string; author?: string | null; at: number };
type Kind = 'reading' | 'recent';
const KEYS: Record<Kind, string> = { reading: 'azhar-reading', recent: 'azhar-recent' };
const LIMIT: Record<Kind, number> = { reading: 200, recent: 20 };

const readLocal = (k: Kind): Mini[] => { try { return JSON.parse(localStorage.getItem(KEYS[k]) || '[]'); } catch { return []; } };
const writeLocal = (k: Kind, v: Mini[]) => { try { localStorage.setItem(KEYS[k], JSON.stringify(v)); } catch {} };

async function uid(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

async function readRemote(userId: string, kind: Kind): Promise<Mini[]> {
  const { data } = await supabase.from('user_lists').select('at, items(id,title,author)').eq('user_id', userId).eq('kind', kind).order('at', { ascending: false }).limit(LIMIT[kind]);
  return (data || []).map((r: any) => { const i = Array.isArray(r.items) ? r.items[0] : r.items; return i ? { id: i.id, title: i.title, author: i.author, at: new Date(r.at).getTime() } : null; }).filter(Boolean) as Mini[];
}

export async function getList(kind: Kind): Promise<Mini[]> {
  const u = await uid();
  return u ? readRemote(u, kind) : readLocal(kind);
}
export const getReading = () => getList('reading');
export const getRecent = () => getList('recent');

export async function inReading(id: number | string): Promise<boolean> {
  const u = await uid();
  if (!u) return readLocal('reading').some(x => String(x.id) === String(id));
  const { data } = await supabase.from('user_lists').select('item_id').eq('user_id', u).eq('kind', 'reading').eq('item_id', Number(id)).maybeSingle();
  return !!data;
}

export async function toggleReading(m: Omit<Mini, 'at'>): Promise<boolean> {
  const u = await uid();
  if (!u) {
    const l = readLocal('reading'); const has = l.some(x => String(x.id) === String(m.id));
    writeLocal('reading', has ? l.filter(x => String(x.id) !== String(m.id)) : [{ ...m, at: Date.now() }, ...l].slice(0, LIMIT.reading));
    return !has;
  }
  const has = await inReading(m.id);
  if (has) await supabase.from('user_lists').delete().eq('user_id', u).eq('kind', 'reading').eq('item_id', Number(m.id));
  else await supabase.from('user_lists').upsert({ user_id: u, item_id: Number(m.id), kind: 'reading', at: new Date().toISOString() });
  return !has;
}

export async function removeReading(id: number | string) {
  const u = await uid();
  if (!u) writeLocal('reading', readLocal('reading').filter(x => String(x.id) !== String(id)));
  else await supabase.from('user_lists').delete().eq('user_id', u).eq('kind', 'reading').eq('item_id', Number(id));
}

export async function addRecent(m: Omit<Mini, 'at'>) {
  const u = await uid();
  if (!u) { writeLocal('recent', [{ ...m, at: Date.now() }, ...readLocal('recent').filter(x => String(x.id) !== String(m.id))].slice(0, LIMIT.recent)); return; }
  await supabase.from('user_lists').upsert({ user_id: u, item_id: Number(m.id), kind: 'recent', at: new Date().toISOString() });
}

export async function clearRecent() {
  const u = await uid();
  if (!u) writeLocal('recent', []);
  else await supabase.from('user_lists').delete().eq('user_id', u).eq('kind', 'recent');
}

// Called after sign-in: move this browser's lists into the account, then empty the browser copy.
export async function mergeLocalIntoAccount(userId: string) {
  for (const kind of ['reading', 'recent'] as Kind[]) {
    const local = readLocal(kind);
    if (!local.length) continue;
    const rows = local.map(x => ({ user_id: userId, item_id: Number(x.id), kind, at: new Date(x.at || Date.now()).toISOString() })).filter(r => Number.isFinite(r.item_id));
    const { error } = await supabase.from('user_lists').upsert(rows, { onConflict: 'user_id,item_id,kind', ignoreDuplicates: true });
    if (!error) writeLocal(kind, []);
  }
}
