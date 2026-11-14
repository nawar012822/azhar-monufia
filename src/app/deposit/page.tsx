'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Upload, CheckCircle } from 'lucide-react';

const ALL_COLLECTIONS = ['كتب ومراجع', 'رسائل جامعية', 'أبحاث علمية', 'مخطوطات', 'إنتاج هيئة التدريس', 'مشروعات الطلاب', 'الدوريات والمجلات', 'المحاضرات والمواد'];
const ALL_DEPARTMENTS = ['الوثائق والمكتبات والمعلومات', 'النحو والصرف', 'البلاغة والنقد', 'الأدب والنقد', 'أصول اللغة', 'التاريخ والحضارة'];

export default function DepositPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '', author: '', orcid: '', collection: 'كتب ومراجع', department: 'النحو والصرف',
    contributors: '', supervisor: '', abstract: '', subjects: '', keywords: '',
    date_issued: new Date().getFullYear(), pages: '', isbn: '', publisher: 'كلية اللغة العربية بشبين الكوم',
    language: 'العربية', access: 'open', rights: 'جميع الحقوق محفوظة للمؤلف'
  });
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return alert('يجب الموافقة على إقرار حقوق الملكية');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('يجب تسجيل الدخول أولاً!'); router.push('/login'); return; }
    if (!file) return alert('الرجاء اختيار ملف');

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('books').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(fileName);
      
      const { error } = await supabase.from('items').insert([{
        ...form,
        file_url: publicUrl,
        submitted_by: user.id,
        status: 'pending',
        pages: form.pages ? parseInt(form.pages) : 0
      }]);
      
      if (error) throw error;
      
      alert('تم الإيداع بنجاح وسيتم مراجعته! 🎉');
      router.push('/profile');
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F6F0] py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        
        <div className="bg-[#1B4D3E] text-white p-8 rounded-2xl mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">إيداع مادة جديدة</h1>
            <p className="text-sm text-gray-300">سيتم مراجعة المادة قبل النشر.</p>
          </div>
          <Link href="/" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </Link>
        </div>

        <form onSubmit={handleDeposit} className="space-y-8">
          
          {/* 1. البيانات الأساسية */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#1B4D3E] mb-6 font-serif">١. البيانات الأساسية</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">العنوان (dc.title) *</label>
                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">المؤلف (dc.creator) *</label>
                  <input required type="text" value={form.author} onChange={e => setForm({...form, author: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">معرّف ORCID للمؤلف</label>
                  <input type="text" value={form.orcid} onChange={e => setForm({...form, orcid: e.target.value})} placeholder="0000-0000-0000-0000" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" dir="ltr" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">نوع المادة *</label>
                  <select value={form.collection} onChange={e => setForm({...form, collection: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white">
                    {ALL_COLLECTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">القسم العلمي *</label>
                  <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white">
                    {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">المشاركون (افصل بين الأسماء بفاصلة)</label>
                <input type="text" value={form.contributors} onChange={e => setForm({...form, contributors: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">المشرف الأكاديمي</label>
                <input type="text" value={form.supervisor} onChange={e => setForm({...form, supervisor: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">الملخص (dc.description.abstract) *</label>
                <textarea required rows={4} value={form.abstract} onChange={e => setForm({...form, abstract: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]"></textarea>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">الموضوعات (dc.subject)</label>
                  <input type="text" value={form.subjects} onChange={e => setForm({...form, subjects: e.target.value})} placeholder="مثال: النحو، البلاغة" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">الكلمات المفتاحية</label>
                  <input type="text" value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} placeholder="افصل بفاصلة" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. بيانات النشر */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#1B4D3E] mb-6 font-serif">٢. بيانات النشر</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">سنة النشر</label>
                <input type="number" value={form.date_issued} onChange={e => setForm({...form, date_issued: parseInt(e.target.value)})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">عدد الصفحات</label>
                <input type="number" value={form.pages} onChange={e => setForm({...form, pages: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">ISBN / ISSN</label>
                <input type="text" value={form.isbn} onChange={e => setForm({...form, isbn: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">جهة النشر (dc.publisher)</label>
                <input type="text" value={form.publisher} onChange={e => setForm({...form, publisher: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-gray-50" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">اللغة (dc.language)</label>
                <input type="text" value={form.language} onChange={e => setForm({...form, language: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-gray-50" />
              </div>
            </div>
          </div>

          {/* 3. الملف والإتاحة */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#1B4D3E] mb-6 font-serif">٣. الملف والإتاحة</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">الملف (PDF أو صور، حتى 50 ميجابايت)</label>
              <input required type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full p-3 border rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#1B4D3E]/10 file:text-[#1B4D3E] hover:file:bg-[#1B4D3E]/20 cursor-pointer" />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold mb-2">مستوى الإتاحة</label>
              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer ${form.access === 'open' ? 'border-[#1B4D3E] bg-[#1B4D3E]/5' : ''}`}>
                <input type="radio" value="open" checked={form.access === 'open'} onChange={e => setForm({...form, access: e.target.value})} className="w-4 h-4 accent-[#1B4D3E]" />
                <span className="font-bold">متاح مفتوح</span>
              </label>
              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer ${form.access === 'restricted' ? 'border-[#1B4D3E] bg-[#1B4D3E]/5' : ''}`}>
                <input type="radio" value="restricted" checked={form.access === 'restricted'} onChange={e => setForm({...form, access: e.target.value})} className="w-4 h-4 accent-[#1B4D3E]" />
                <span className="font-bold">مقيد للمسجلين</span>
              </label>
              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer ${form.access === 'metadata' ? 'border-[#1B4D3E] bg-[#1B4D3E]/5' : ''}`}>
                <input type="radio" value="metadata" checked={form.access === 'metadata'} onChange={e => setForm({...form, access: e.target.value})} className="w-4 h-4 accent-[#1B4D3E]" />
                <span className="font-bold">بيانات وصفية فقط</span>
              </label>
            </div>
          </div>

          {/* 4. حقوق الاستخدام والإقرار */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-[#1B4D3E] mb-6 font-serif">٤. حقوق الاستخدام</h2>
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">حقوق الاستخدام (dc.rights)</label>
              <input type="text" value={form.rights} onChange={e => setForm({...form, rights: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
            </div>
            
            <label className="flex items-start gap-3 p-4 bg-gray-50 border rounded-xl cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 mt-0.5 accent-[#1B4D3E]" />
              <span className="text-sm font-bold text-gray-700">أقر بأنني صاحب هذه المادة أو مخوّل بإيداعها، وأنها لا تنتهك حقوق الآخرين.</span>
            </label>
          </div>

          <button type="submit" disabled={uploading} className="w-full bg-[#1B4D3E] text-white font-bold py-4 rounded-xl hover:bg-[#153d31] transition-all shadow-lg text-lg flex items-center justify-center gap-2">
            {uploading ? 'جاري الرفع...' : <><Upload className="w-5 h-5" /> إرسال الإيداع</>}
          </button>

        </form>
      </div>
    </main>
  );
}