'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Download, Eye, Heart, Calendar, BookOpen } from 'lucide-react';

export default function ItemView({ initialItem, id }: { initialItem: any | null; id: string }) {
  const params = { id };
  const router = useRouter();
  const [item, setItem] = useState<any>(initialItem);
  const [loading, setLoading] = useState(!initialItem);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthChecked(true);

      let current = initialItem;
      if (!current) {
        const { data: itemData, error } = await supabase.from('items').select('*').eq('id', params.id).maybeSingle();
        if (!error && itemData) { current = itemData; setItem(itemData); }
      }
      if (current && current.status === 'approved') {
        // زيادة المشاهدات (best effort)
        await supabase.from('items').update({ views: (current.views || 0) + 1 }).eq('id', current.id);
      }

      if (user) {
        const { data: favData } = await supabase.from('favorites').select('*').eq('user_id', user.id).eq('item_id', params.id).maybeSingle();
        if (favData) setIsFavorite(true);
      }
      setLoading(false);
    }
    loadData();
  }, [params.id]);

  const toggleFavorite = async () => {
    if (!user) { alert('يجب تسجيل الدخول أولاً لإضافة المادة للمفضلة'); router.push('/login'); return; }
    
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('item_id', params.id);
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert([{ user_id: user.id, item_id: params.id }]);
      setIsFavorite(true);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F6F0]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B4D3E]"></div></div>;
  if (!item) return <div className="min-h-screen flex items-center justify-center bg-[#F8F6F0] text-xl">المادة غير موجودة.</div>;

  return (
    <main className="min-h-screen bg-[#F8F6F0] py-12 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <Link href={`/collections/${item.collection}`} className="flex items-center gap-2 text-gray-600 hover:text-[#1B4D3E] bg-white px-4 py-2 rounded-lg border"><ArrowRight className="w-4 h-4"/> العودة للمجموعة</Link>
          <button onClick={toggleFavorite} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${isFavorite ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white hover:bg-gray-50'}`}>
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-600' : ''}`} />
            {isFavorite ? 'في المفضلة' : 'إضافة للمفضلة'}
          </button>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-200">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-[#1B4D3E]/10 text-[#1B4D3E] px-3 py-1 rounded-full text-sm font-bold">{item.collection}</span>
            <span className="bg-[#D4AF37]/10 text-[#8a6d1c] px-3 py-1 rounded-full text-sm font-bold">{item.department}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${item.access === 'open' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
              {item.access === 'open' ? 'متاح مفتوح' : 'مقيد للمسجلين'}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-[#1B4D3E] mb-4 font-serif leading-tight">{item.title}</h1>
          
          <div className="flex items-center gap-4 text-gray-600 mb-8 border-b pb-6">
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4"/> {item.author}</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {item.date_issued}</span>
            <span className="flex items-center gap-1"><Eye className="w-4 h-4"/> {item.views || 0} مشاهدة</span>
          </div>

          <h2 className="text-xl font-bold text-[#1B4D3E] mb-4 font-serif">المستخلص</h2>
          <p className="text-gray-700 leading-loose text-lg mb-8 whitespace-pre-wrap">{item.abstract}</p>

          {item.keywords && (
            <div className="mb-8">
              <h3 className="font-bold mb-2">الكلمات المفتاحية:</h3>
              <div className="flex flex-wrap gap-2">
                {item.keywords.split(',').map((kw: string, i: number) => (
                  <span key={i} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-sm">{kw.trim()}</span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mt-8">
            <div className="text-sm text-gray-500">
              <p>جهة النشر: {item.publisher}</p>
              <p className="mt-1">حقوق الاستخدام: {item.rights}</p>
            </div>
            
            {item.file_url && item.access !== 'metadata' && (item.access === 'open' || user) && (
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* زرار العرض */}
                <a 
                  href={item.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-white border-2 border-[#1B4D3E] text-[#1B4D3E] px-6 py-3 rounded-xl font-bold hover:bg-[#F8F6F0] transition flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" /> عرض الملف
                </a>
                
                {/* زرار التحميل (تم إضافة ?download لإجبار المتصفح على التحميل) */}
                <a 
                  href={`${item.file_url}?download`} download 
                  className="bg-[#1B4D3E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#153d31] transition flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" /> تحميل
                </a>
              </div>
            )}
            {item.access === 'restricted' && authChecked && !user && (
              <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-4 w-full md:w-auto">هذه المادة مقيدة. <Link href="/login" className="underline font-bold">سجّل الدخول</Link> لعرض الملف وتحميله.</p>
            )}
            {item.access === 'metadata' && (
              <p className="text-sm text-gray-600 bg-gray-100 rounded-xl p-4 w-full md:w-auto">بيانات وصفية فقط، الملف غير متاح للعرض.</p>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}