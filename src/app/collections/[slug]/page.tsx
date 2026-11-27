'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { flat } from '@/lib/repo';
import { ArrowRight, BookOpen, User, Eye } from 'lucide-react';

export default function CollectionPage() {
  const params = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionName, setCollectionName] = useState('');

  useEffect(() => {
    if (params.slug) {
      const slug = decodeURIComponent(params.slug as string);
      const fetchItems = async () => {
        try {
          const { data, error } = await supabase.from('items')
            .select('id,created_at,title,author,abstract,access,status,collections!inner(slug,name_ar),orgs(name_ar,path),item_stats(views)')
            .eq('status', 'approved').eq('collections.slug', slug).order('created_at', { ascending: false }).limit(200);
          if (error) throw error;
          const rows = (data || []).map(flat);
          setItems(rows);
          if (rows[0]) setCollectionName(rows[0].collection);
          else {
            const { data: c } = await supabase.from('collections').select('name_ar').eq('slug', slug).limit(1);
            setCollectionName(c?.[0]?.name_ar || slug);
          }
        } catch (err) { console.error(err); } finally { setLoading(false); }
      };
      fetchItems();
    }
  }, [params.slug]);

  return (
    <main className="flex-1 bg-[#F8F6F0] py-10 px-4" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#1B4D3E] font-serif">{collectionName || 'جاري التحميل...'}</h1>
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#1B4D3E] bg-gray-50 hover:bg-gray-100 px-5 py-2.5 rounded-xl border border-gray-200 transition">
            <ArrowRight className="w-4 h-4" /> العودة للرئيسية
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B4D3E] mx-auto"></div></div>
        ) : items.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl shadow-sm border border-gray-200 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-500 font-bold">لا توجد مواد في هذا القسم حتى الآن.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <Link href={`/item/${item.id}`} key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition group">
                <div>
                  <h2 className="text-xl font-bold text-[#1B4D3E] mb-2 group-hover:text-[#b59555] transition font-serif">{item.title}</h2>
                  <p className="text-sm text-gray-600 mb-4 flex items-center gap-2"><User className="w-4 h-4 text-[#D4AF37]" /> {item.author || 'غير محدد'}</p>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{item.abstract || 'لا يوجد مستخلص'}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="flex items-center gap-1 text-gray-400 text-xs"><Eye className="w-3 h-3" /> {item.views || 0}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.access === 'open' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                    {item.access === 'open' ? 'متاح مفتوح' : 'مقيد'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}