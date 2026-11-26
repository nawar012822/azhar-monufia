'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ROOT_PATH, COLLECTIONS } from '@/lib/constants';
import { flat, ITEM_SELECT } from '@/lib/repo';


function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [collection, setCollection] = useState('');
  const [department, setDepartment] = useState('');
  const [orgList, setOrgList] = useState<any[]>([]);
  const [collMap, setCollMap] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase.from('orgs').select('id,name_ar,path,kind').or(`path.eq.${ROOT_PATH},path.like.${ROOT_PATH}/%`).order('path').then(({ data }) => setOrgList(data || []));
    supabase.from('collections').select('id,slug').then(({ data }) => { const m: Record<string, number> = {}; (data || []).forEach((c: any) => { m[c.slug] = c.id; }); setCollMap(m); });
  }, []);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);

  const executeSearch = async (searchQuery: string) => {
    setError(false);
    setLoading(true);
    setSearched(true);
    
    const root = orgList.find(o => o.id === Number(department)) || orgList.find(o => o.path === ROOT_PATH);
    if (!root) { setError(true); setResults([]); setLoading(false); return; }
    const { data: ids, error: e1 } = await supabase.rpc('search_in', { p_org: root.id, p_q: searchQuery.slice(0, 100), p_collection: collection ? collMap[collection] ?? null : null, p_limit: 50, p_offset: 0 });
    if (e1) { setError(true); setResults([]); setLoading(false); return; }
    const list = (ids || []).map((r: any) => r.id);
    if (list.length === 0) { setResults([]); setLoading(false); return; }
    const { data, error } = await supabase.from('items').select(ITEM_SELECT).in('id', list);
    const order = new Map<number, number>(list.map((id: number, i: number) => [id, i]));
    if (error) { setError(true); setResults([]); } else setResults((data || []).map(flat).sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
    setLoading(false);
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
    <div className="max-w-5xl mx-auto">
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
              <select value={collection} onChange={e => setCollection(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]">
                <option value="">كل المجموعات</option>
                {COLLECTIONS.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">القسم</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]">
                <option value="">كل الأقسام</option>
                {orgList.filter(o => o.kind !== 'university' && !o.path.endsWith('/unclassified')).map(d => <option key={d.id} value={d.id}>{'— '.repeat(Math.max(0, d.path.split('/').length - 2))}{d.name_ar}</option>)}
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
          <h2 className="text-xl font-bold mb-4">النتائج ({results.length})</h2>
          <div className="space-y-4">
            {results.map(item => (
              <Link href={`/item/${item.id}`} key={item.id} className="block bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                <h3 className="text-xl font-bold text-[#1B4D3E] mb-1 font-serif">{item.title}</h3>
                <p className="text-gray-600 text-sm mb-3">د. {item.author} • {item.collection}</p>
                <p className="text-gray-500 text-sm line-clamp-2">{item.abstract}</p>
              </Link>
            ))}
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
    <main className="min-h-screen bg-[#F8F6F0] py-12 px-4" dir="rtl">
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