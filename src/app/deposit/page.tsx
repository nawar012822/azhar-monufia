'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function DepositPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    author: '',
    abstract: '',
    collection: 'رسائل جامعية',
    department: 'النحو والصرف',
    file_url: ''
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('الرجاء اختيار ملف PDF');
    setLoading(true);

    // 1. رفع الملف إلى Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`; // اسم فريد للملف عشان ميتعارضش مع غيره
    
    const { error: uploadError } = await supabase.storage
      .from('books')
      .upload(fileName, file, { contentType: 'application/pdf' });

    if (uploadError) {
      alert('خطأ في رفع الملف: ' + uploadError.message);
      setLoading(false);
      return;
    }

    // 2. الحصول على الرابط العام للملف
    const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(fileName);

    // 3. حفظ البيانات مع الرابط في قاعدة البيانات
    const { error } = await supabase.from('items').insert([{ ...form, file_url: publicUrl }]);

    if (error) {
      alert('حدث خطأ أثناء الحفظ: ' + error.message);
      setLoading(false);
    } else {
      alert('تم إيداع البحث بنجاح! 🎉');
      router.push('/');
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-10" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#1B4D3E]">إيداع بحث جديد</h1>
          <Link href="/" className="text-gray-500 hover:text-[#1B4D3E]">العودة للرئيسية</Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">عنوان البحث</label>
            <input required type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full border p-3 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">اسم المؤلف</label>
            <input required type="text" value={form.author} onChange={(e) => setForm({...form, author: e.target.value})} className="w-full border p-3 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">المستخلص</label>
            <textarea required rows={4} value={form.abstract} onChange={(e) => setForm({...form, abstract: e.target.value})} className="w-full border p-3 rounded-lg" />
          </div>
          
          {/* حقل رفع الملف الجديد */}
          <div>
            <label className="block text-sm font-bold mb-1">ملف البحث (PDF)</label>
            <input required type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full border p-3 rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">نوع المادة</label>
              <select value={form.collection} onChange={(e) => setForm({...form, collection: e.target.value})} className="w-full border p-3 rounded-lg">
                <option>رسائل جامعية</option>
                <option>أبحاث علمية</option>
                <option>كتب ومراجع</option>
                <option>مخطوطات</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">القسم</label>
              <select value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} className="w-full border p-3 rounded-lg">
                <option>النحو والصرف</option>
                <option>الأدب والنقد</option>
                <option>البلاغة والنقد</option>
                <option>الوثائق والمكتبات</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#1B4D3E] text-white font-bold py-3 rounded-lg hover:bg-[#153d31]">
            {loading ? 'جاري الرفع والحفظ...' : 'إيداع البحث'}
          </button>
        </form>
      </div>
    </main>
  );
}