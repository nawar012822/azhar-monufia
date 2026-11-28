'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import ItemCard from '@/components/ItemCard';
import { useSearchParams } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ROOT_PATH, COLLECTIONS } from '@/lib/constants';
import { flat, ITEM_SELECT, treeSort } from '@/lib/repo';


function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [collection, setCollection] = useState('');
  const [department, setDepartment] = useState('');
  const [lang, setLang] = useState('');
  const [yFrom, setYFrom] = useState('');
  const [yTo, setYTo] = useState('');
  const [lic, setLic] = useState('');
  const [orgList, setOrgList] = useState<any[]>([]);
  const [collMap, setCollMap] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase.from('orgs').select('id,name_ar,path,kind,sort').or(`path.eq.${ROOT_PATH},path.like.${ROOT_PATH}/%`).then(({ data }) => setOrgList(treeSort(data || [])));
    supabase.from('collections').select('id,slug').then(({ data }) => { const m: Record<string, number> = {}; (data || []).forEach((c: any) => { m[c.slug] = c.id; }); setCollMap(m); });
  }, []);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);

  const PAGE = 50;
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const seq = useRef(0);
  const executeSearch = async (searchQuery: string, from = 0) => {
    const my = ++seq.current;
    const stale = () => my !== seq.current;
    const append = from > 0;
    setError(false);
    if (append) setLoadingMore(true); else { setLoading(true); setMore(false); setOffset(0); }
    setSearched(true);
    
    const root = orgList.find(o => o.id === Number(department)) || orgList.find(o => o.path === ROOT_PATH);
    if (!root) { setError(true); setResults([]); setLoading(false); setLoadingMore(false); return; }
    const { data: ids, error: e1 } = await supabase.rpc('search_in', { p_org: root.id, p_q: searchQuery.slice(0, 100), p_collection: collection ? collMap[collection] ?? null : null, p_limit: PAGE, p_offset: from, p_lang: lang || null, p_year_from: yFrom ? Number(yFrom) : null, p_year_to: yTo ? Number(yTo) : null, p_license: lic || null });
    if (stale()) return;
    if (e1) { setError(true); if (!append) setResults([]); setLoading(false); setLoadingMore(false); return; }
    const list = (ids || []).map((r: any) => r.id);
    setMore(list.length === PAGE && from + PAGE < 1000); setOffset(from + list.length);
    if (list.length === 0) { if (!append) setResults([]); setLoading(false); setLoadingMore(false); return; }
    const { data, error } = await supabase.from('items').select(ITEM_SELECT).in('id', list);
    if (stale()) return;
    const order = new Map<number, number>(list.map((id: number, i: number) => [id, i]));
    if (error) { setError(true); if (!append) setResults([]); } else { const page = (data || []).map(flat).sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)); setResults(prev => append ? [...prev, ...page.filter((x: any) => !prev.some((y: any) => y.id === x.id))] : page); }
    setLoading(false); setLoadingMore(false);
  };

  useEffect(() => {
    if (initialQuery && orgList.length) {
      executeSearch(initialQuery);
    }
  }, [initialQuery, orgList.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-[#1B4D3E] font-serif">البحث المتقدم</h1>
        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-[#1B4D3E] bg-white px-4 py-2 rounded-lg border"><ArrowRight className="w-4 h-4"/> الرئيسية</Link>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">الكلمة المفتاحية</label>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالعنوان، المؤلف، أو المستخلص..." className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">المجموعة</label>
              <select aria-label="المجموعة" value={collection} onChange={e => setCollection(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]">
                <option value="">كل المجموعات</option>
                {COLLECTIONS.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">القسم</label>
              <select aria-label="القسم" value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]">
                <option value="">كل الأقسام</option>
                {orgList.filter(o => o.kind !== 'university').map(d => <option key={d.id} value={d.id}>{'— '.repeat(Math.max(0, d.path.split('/').length - 2))}{d.name_ar}</option>)}
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">اللغة</label>
              <select aria-label="اللغة" value={lang} onChange={e => setLang(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]">
                <option value="">كل اللغات</option>
                <option value="العربية">العربية</option>
                <option value="الإنجليزية">الإنجليزية</option>
                <option value="الفارسية">الفارسية</option>
                <option value="الفرنسية">الفرنسية</option>
                <option value="الإندونيسية">الإندونيسية</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">من سنة</label>
              <input aria-label="من سنة" inputMode="numeric" maxLength={4} value={yFrom} onChange={e => setYFrom(e.target.value.replace(/\D/g, ''))} placeholder="1800" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">إلى سنة</label>
              <input aria-label="إلى سنة" inputMode="numeric" maxLength={4} value={yTo} onChange={e => setYTo(e.target.value.replace(/\D/g, ''))} placeholder="2025" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">الترخيص</label>
              <select aria-label="الترخيص" value={lic} onChange={e => setLic(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]">
                <option value="">كل التراخيص</option>
                <option value="pd">ملك عام</option>
                <option value="cc0">CC0</option>
                <option value="cc-by">CC BY (نسب المصنف)</option>
                <option value="nc">غير تجاري (NC)</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-[#1B4D3E] text-white py-3 rounded-xl font-bold hover:bg-[#153d31] flex items-center justify-center gap-2"><Search className="w-5 h-5"/> بحث</button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B4D3E] mx-auto"></div></div>
      ) : searched && (
        <div>
          <h2 className="text-xl font-bold mb-4">النتائج ({results.length}{more ? '+' : ''})</h2>
          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            {results.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
          {more && (
            <button type="button" disabled={loadingMore} onClick={() => executeSearch(query, offset)} className="mt-6 w-full bg-white border border-[#1B4D3E] text-[#1B4D3E] py-3 rounded-xl font-bold hover:bg-gray-50 disabled:opacity-60">{loadingMore ? 'جاري التحميل...' : 'عرض المزيد'}</button>
          )}
          <div className="space-y-4 mt-4">
            {error && <p className="text-red-600 bg-white p-8 rounded-xl border text-center">تعذر تنفيذ البحث الآن، حاول مرة أخرى.</p>}
            {!error && results.length === 0 && <p className="text-gray-500 bg-white p-8 rounded-xl border text-center">لا توجد نتائج مطابقة.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="flex-1 bg-[#F8F6F0] py-12 px-4" dir="rtl">
      <Suspense fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B4D3E]"></div>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </main>
  );
}