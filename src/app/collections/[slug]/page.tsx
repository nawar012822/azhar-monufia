'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function CollectionPage() {
  const params = useParams();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionName, setCollectionName] = useState('');

  useEffect(() => {
    if (params.slug) {
      // فك تشفير اسم القسم
      const decodedName = decodeURIComponent(params.slug as string);
      setCollectionName(decodedName);

      async function fetchItems() {
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
      }
      fetchItems();
    }
  }, [params.slug]);

  return (
    <main className="min-h-screen bg-gray-50 p-10" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border">
          <h1 className="text-3xl font-bold text-[#1B4D3E]">{collectionName || 'جاري التحميل...'}</h1>
          <Link href="/" className="text-[#D4AF37] font-bold hover:underline">العودة للرئيسية</Link>
        </div>

        {loading ? (
          <p className="text-center text-xl text-gray-500">جاري تحميل الأبحاث... ⏳</p>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-500 text-lg bg-white p-8 rounded-xl shadow-sm border">
            لا توجد مواد في هذا القسم حتى الآن.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {items.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-[#1B4D3E] mb-2">{item.title}</h2>
                <p className="text-sm text-gray-600 mb-4">المؤلف: {item.author}</p>
                <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">{item.abstract}</p>
                
                {item.file_url && (
                  <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 bg-[#D4AF37] text-[#1B4D3E] px-4 py-2 rounded-md font-bold text-sm hover:bg-[#c29d30]">
                    📄 فتح ملف PDF
                  </a>
                )}

                <div className="flex gap-2 text-xs font-bold mt-4">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{item.collection}</span>
                  <span className="bg-[#D4AF37]/20 text-[#1B4D3E] px-3 py-1 rounded-full">{item.department}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}