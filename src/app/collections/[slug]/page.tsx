'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowRight, BookOpen } from 'lucide-react';

export default function CollectionPage() {
  const params = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionName, setCollectionName] = useState('');

  useEffect(() => {
    if (params.slug) {
      const decodedName = decodeURIComponent(params.slug as string);
      setCollectionName(decodedName);

      const fetchItems = async () => {
        try {
          const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('collection', decodedName);
          
          if (error) throw error;
          setItems(data || []);
        } catch (err) {
          console.error('Error fetching items:', err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchItems();
    }
  }, [params.slug]);

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        {/* شريط علوي أنيق */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#1B4D3E] font-serif">
            {collectionName || 'جاري التحميل...'}
          </h1>
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#1B4D3E] transition bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg">
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-xl text-gray-500">جاري تحميل الأبحاث... ⏳</div>
        ) : items.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-bold">لا توجد مواد في هذا القسم حتى الآن.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden hover:shadow-md transition">
                
                {/* محتوى الكارت */}
                <div className="p-5 flex-1">
                  <h2 className="text-lg font-bold text-[#1B4D3E] mb-2 leading-snug">{item.title}</h2>
                  <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
                    المؤلف: {item.author || 'غير محدد'}
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{item.abstract || 'لا يوجد مستخلص'}</p>
                </div>

                {/* الأزرار والوسوم */}
                <div className="px-5 pb-5 pt-2">
                  {item.file_url && (
                    <a 
                      href={item.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-full flex items-center justify-center gap-2 bg-[#1B4D3E] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#153d31] transition"
                    >
                      📄 فتح ملف PDF
                    </a>
                  )}

                  <div className="flex flex-wrap gap-2 text-[10px] md:text-xs font-bold mt-4 pt-4 border-t border-gray-100">
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{item.collection}</span>
                    <span className="bg-[#D4AF37]/15 text-[#8a6d1c] px-3 py-1 rounded-full">{item.department}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}