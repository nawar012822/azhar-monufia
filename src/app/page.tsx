'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft, Folder } from 'lucide-react';
import ItemCard from '@/components/ItemCard';
import { supabase } from '@/lib/supabase';
import { COLLECTIONS, ROOT_PATH } from '@/lib/constants';
import { ITEM_SELECT, flat, treeSort } from '@/lib/repo';

const ALL_COLLECTIONS = COLLECTIONS.map(c => ({ ...c, id: c.slug }));

export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالة البحث
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [orgs, setOrgs] = useState<any[]>([]);
  const [st, setSt] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase.from('items').select(ITEM_SELECT).eq('status', 'approved').order('created_at', { ascending: false }).limit(200);
        if (!error && data) setItems(data.map(flat));
        const { data: o } = await supabase.from('orgs').select('id,parent_id,kind,name_ar,path,sort').like('path', `${ROOT_PATH}/%`);
        setOrgs(treeSort(o || []));
        const { data: sd } = await supabase.rpc('site_stats');
        if (sd) setSt(sd);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowDropdown(false);
    }
  };

  const norm = (t: string) => (t || '').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
  const nq = norm(searchQuery.trim());
  const dropdownResults = nq
    ? items.filter(item => norm(item.title).includes(nq) || norm(item.author || '').includes(nq) || norm(item.keywords || '').includes(nq)).slice(0, 5)
    : [];

  const totalViews = st ? Number(st.views) : items.reduce((sum, item) => sum + (item.views || 0), 0);
  const countOf = (slug: string) => st ? Number(st.by_collection?.[slug] || 0) : items.filter(i => i.collection_slug === slug).length;
  const mostViewed = [...items].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
  const latestItems = items.slice(0, 6);
  const stats = [
    [st ? Number(st.total) : items.length, 'مادة منشورة'],
    [countOf('books'), 'كتاب'],
    [orgs.filter(o => o.kind !== 'faculty').length, 'قسم وتخصص'],
    [totalViews, 'مشاهدة'],
  ];
  const chips = ['البلاغة', 'النحو', 'المكتبات', 'information literacy'];

  return (
    <main className="flex-1 pb-16" dir="rtl">
      <section className="relative bg-gradient-to-b from-[#0C422E] to-[#14573f] text-white overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(212,175,55,0.14), transparent 40%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.07), transparent 40%), linear-gradient(to bottom, #0C422E, #14573f)' }}>
        <div className="max-w-3xl mx-auto px-4 pt-14 pb-24 text-center">
          <p className="inline-block text-[#D4AF37] text-sm md:text-base font-bold bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6">جامعة الأزهر - كلية اللغة العربية بالمنوفية</p>
          <h1 className="text-4xl md:text-6xl font-bold mb-5 font-serif leading-tight">المستودع الرقمي</h1>
          <p className="text-gray-200 text-base md:text-xl mb-9 leading-relaxed">كتب وأبحاث ورسائل علمية في مكان واحد، مفتوحة للطلاب والباحثين.</p>

          <div className="relative max-w-2xl mx-auto z-30 text-right">
            <form onSubmit={handleSearchSubmit} className="bg-white p-1.5 rounded-2xl shadow-2xl flex items-center">
              <Search className="w-5 h-5 text-gray-400 mx-3 shrink-0" />
              <input aria-label="ابحث" type="text" placeholder="ابحث في المستودع..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)}
                className="flex-1 min-w-0 bg-transparent py-3 outline-none text-gray-800 text-base md:text-lg" />
              <button type="submit" className="bg-[#1B4D3E] text-white px-6 md:px-8 py-3 rounded-xl font-bold hover:bg-[#153d31] transition-colors">بحث</button>
            </form>
            {showDropdown && searchQuery && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 z-50 text-gray-800">
                  {dropdownResults.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center text-sm">لا توجد نتائج سريعة.</div>
                  ) : dropdownResults.map(item => (
                    <Link href={`/item/${item.id}`} key={item.id} onClick={() => setShowDropdown(false)} className="block px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
                      <h4 className="font-bold text-[#1B4D3E] text-sm line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.author}</p>
                    </Link>
                  ))}
                  <button onClick={handleSearchSubmit} className="w-full bg-gray-50 text-[#1B4D3E] font-bold text-sm p-3 hover:bg-gray-100">عرض كل النتائج</button>
                </div>
              </>
            )}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {chips.map(c => <Link key={c} href={`/search?q=${encodeURIComponent(c)}`} className="text-sm text-white/90 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full px-4 py-2 transition">{c}</Link>)}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-gray-100 text-center">
          {stats.map(([n, l], i) => (
            <div key={i} className={`py-5 ${i > 1 ? 'border-t md:border-t-0 border-gray-100' : ''}`}>
              <span className="block text-3xl font-bold text-[#1B4D3E] font-serif">{loading ? '…' : Number(n).toLocaleString('ar-EG')}</span>
              <span className="text-sm text-gray-500 font-bold">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-4 pt-14">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1B4D3E] mb-6 font-serif">تصفح حسب النوع</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {ALL_COLLECTIONS.map((c) => (
            <Link href={`/collections/${c.id}`} key={c.id} className="group bg-white border border-gray-200 p-3 sm:p-5 rounded-2xl hover:shadow-lg hover:-translate-y-0.5 hover:border-[#1B4D3E]/30 transition flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-3xl w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#F3EFE3] flex items-center justify-center shrink-0">{c.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-gray-900 group-hover:text-[#1B4D3E] text-[13px] sm:text-sm md:text-base leading-snug [overflow-wrap:anywhere]">{c.name}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{countOf(c.id).toLocaleString('ar-EG')} مادة</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pt-14">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1B4D3E] mb-6 font-serif">الأقسام والتخصصات</h2>
        <div className="space-y-5">
          {orgs.filter(o => o.kind === 'faculty').map(f => (
            <div key={f.id} className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
              <Link href={`/browse/${f.path}`} className="inline-flex items-center gap-2 text-lg md:text-xl font-bold text-[#1B4D3E] hover:underline font-serif py-2">{f.name_ar} <ArrowLeft className="w-4 h-4" /></Link>
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {orgs.filter(d => d.parent_id === f.id).map(d => (
                  <div key={d.id} className="rounded-xl border border-gray-200 bg-[#FAF8F2] p-4">
                    <Link href={`/browse/${d.path}`} className="flex items-center gap-2 font-bold text-gray-900 hover:text-[#1B4D3E] py-2"><Folder className="w-4 h-4 text-[#D4AF37]" />{d.name_ar}</Link>
                    {orgs.filter(x => x.parent_id === d.id).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-x-3 text-sm">
                        {orgs.filter(x => x.parent_id === d.id).map(x => (
                          <Link key={x.id} href={`/browse/${x.path}`} className="text-gray-500 hover:text-[#1B4D3E] inline-block py-2">{x.name_ar}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pt-14">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1B4D3E] font-serif">أحدث الإضافات</h2>
          <Link href="/search" className="text-sm font-bold text-[#1B4D3E] hover:underline py-2">عرض الكل</Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {latestItems.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
        {!loading && latestItems.length === 0 && <p className="text-center text-gray-500 py-4">لا توجد مواد مضافة.</p>}
      </section>

      <section className="max-w-6xl mx-auto px-4 pt-14">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1B4D3E] mb-6 font-serif">الأكثر زيارة</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {mostViewed.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
      </section>
    </main>
  );
}
