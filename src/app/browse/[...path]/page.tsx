'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ItemCard from '@/components/ItemCard';
import { ArrowRight, BookOpen, User, Eye, Search, Folder } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { flat, ITEM_SELECT } from '@/lib/repo';

const KIND_AR: Record<string, string> = { university: 'جامعة', faculty: 'كلية', department: 'قسم' };

export default function BrowsePage() {
  const params = useParams();
  const segs = ((params.path as string[]) || []).map(decodeURIComponent);
  const path = segs.join('/');
  const [org, setOrg] = useState<any>(null);
  const [crumbs, setCrumbs] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [colls, setColls] = useState<any[]>([]);
  const [coll, setColl] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const prefixes = segs.map((_, i) => segs.slice(0, i + 1).join('/'));
      const { data: chain } = await supabase.from('orgs').select('id,parent_id,kind,name_ar,path').in('path', prefixes);
      const cur = (chain || []).find((o: any) => o.path === path);
      if (!cur) { setMissing(true); setLoading(false); return; }
      setOrg(cur);
      setCrumbs(prefixes.map(p => (chain || []).find((o: any) => o.path === p)).filter(Boolean));
      const { data: kids } = await supabase.from('orgs').select('id,name_ar,path,kind').eq('parent_id', cur.id).order('name_ar');
      setChildren((kids || []).filter((k: any) => !k.path.endsWith('/unclassified')));
      // collections of the nearest faculty (or this org when it is a faculty)
      const facPath = segs.slice(0, 2).join('/');
      const fac = (chain || []).find((o: any) => o.path === facPath);
      if (fac) {
        const { data: cs } = await supabase.from('collections').select('id,slug,name_ar,icon').eq('org_id', fac.id).order('sort');
        setColls(cs || []);
      }
    })();
  }, [path]);

  useEffect(() => {
    if (!org) return;
    (async () => {
      setLoading(true);
      const { data: ids } = await supabase.rpc('search_in', { p_org: org.id, p_q: q, p_collection: coll, p_limit: 50, p_offset: 0 });
      const list = (ids || []).map((r: any) => r.id);
      if (list.length === 0) { setItems([]); setLoading(false); return; }
      const { data } = await supabase.from('items').select(ITEM_SELECT).in('id', list);
      const order = new Map<number, number>(list.map((id: number, i: number) => [id, i]));
      setItems((data || []).map(flat).sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
      setLoading(false);
    })();
  }, [org, q, coll]);

  if (missing) return <main className="flex-1 flex items-center justify-center bg-[#F8F6F0] text-xl" dir="rtl">هذه الصفحة غير موجودة. <Link href="/" className="underline mr-2">الرئيسية</Link></main>;

  return (
    <main className="flex-1 bg-[#F8F6F0] py-10 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <nav className="text-sm text-gray-500 mb-4 flex flex-wrap gap-2 items-center">
          <Link href="/" className="hover:text-[#1B4D3E]">الرئيسية</Link>
          {crumbs.map((c, i) => (
            <span key={c.id} className="flex items-center gap-2">/ {i === crumbs.length - 1 ? <b className="text-[#1B4D3E]">{c.name_ar}</b> : <Link href={`/browse/${c.path}`} className="hover:text-[#1B4D3E]">{c.name_ar}</Link>}</span>
          ))}
        </nav>

        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 bg-gradient-to-l from-[#0C422E] to-[#1B4D3E] text-white p-6 md:p-8 rounded-3xl shadow-md gap-4">
          <div>
            <p className="text-sm text-[#D4AF37] font-bold mb-1">{org ? KIND_AR[org.kind] : ''}</p>
            <h1 className="text-2xl md:text-4xl font-bold text-white font-serif">{org?.name_ar || 'جاري التحميل...'}</h1>
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white/90 hover:text-white bg-white/10 px-5 py-2.5 rounded-xl border border-white/20 self-start"><ArrowRight className="w-4 h-4" /> الرئيسية</Link>
        </div>

        {children.length > 0 && (
          <div className="mb-8">
            <h2 className="font-bold text-gray-700 mb-3">الأقسام التابعة</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {children.map(c => (
                <Link key={c.id} href={`/browse/${c.path}`} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition">
                  <Folder className="w-5 h-5 text-[#D4AF37]" /><span className="font-bold text-[#1B4D3E]">{c.name_ar}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl border border-gray-200 mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث داخل هذا القسم..." className="w-full py-3 pr-12 pl-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setColl(null)} className={`px-3 py-1 rounded-full text-sm border ${coll === null ? 'bg-[#1B4D3E] text-white' : 'bg-white'}`}>الكل</button>
            {colls.map(c => (
              <button key={c.id} onClick={() => setColl(c.id)} className={`px-3 py-1 rounded-full text-sm border ${coll === c.id ? 'bg-[#1B4D3E] text-white' : 'bg-white'}`}>{c.icon} {c.name_ar}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B4D3E] mx-auto"></div></div>
        ) : items.length === 0 ? (
          <div className="bg-white p-14 rounded-3xl border text-center">
            <BookOpen className="w-14 h-14 mx-auto text-gray-300 mb-3" />
            <p className="text-lg text-gray-500 font-bold">لا توجد مواد هنا حتى الآن.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </main>
  );
}
