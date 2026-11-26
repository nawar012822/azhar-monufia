'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ALL_COLLECTIONS = ['كتب ومراجع', 'رسائل جامعية', 'أبحاث علمية', 'مخطوطات', 'إنتاج هيئة التدريس', 'مشروعات الطلاب', 'الدوريات والمجلات', 'المحاضرات والمواد'];
const ALL_DEPARTMENTS = ['الوثائق والمكتبات والمعلومات', 'النحو والصرف', 'البلاغة والنقد', 'الأدب والنقد', 'أصول اللغة', 'التاريخ والحضارة'];

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [collection, setCollection] = useState('');
  const [department, setDepartment] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);

  const executeSearch = async (searchQuery: string) => {
    setError(false);
    setLoading(true);
    setSearched(true);
    
    let dbQuery = supabase.from('items').select('id,title,author,abstract,collection,department,access,status').eq('status', 'approved').order('created_at', { ascending: false }).limit(100);
    
    // strip characters that have meaning in PostgREST filter syntax
    const q = searchQuery.replace(/[,()%*\\]/g, ' ').trim().slice(0, 100);
    if (q) dbQuery = dbQuery.or(`title.ilike.%${q}%,author.ilike.%${q}%,abstract.ilike.%${q}%`);
    if (collection) dbQuery = dbQuery.eq('collection', collection);
    if (department) dbQuery = dbQuery.eq('department', department);
    
    const { data, error } = await dbQuery;
    if (error) { setError(true); setResults([]); } else if (data) setResults(data);
    setLoading(false);
  };

  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery);
    }
  }, [initialQuery]);

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
                {ALL_COLLECTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">القسم</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]">
                <option value="">كل الأقسام</option>
                {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
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