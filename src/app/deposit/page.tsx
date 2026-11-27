'use client';

import { notify } from '@/lib/notify';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ROOT_PATH } from '@/lib/constants';
import { loadAccess, Access } from '@/lib/repo';
import { ArrowRight, Upload, CheckCircle } from 'lucide-react';


export default function DepositPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '', author: '', orcid: '', collection: '', department: '',
    contributors: '', supervisor: '', abstract: '', subjects: '', keywords: '',
    date_issued: new Date().getFullYear(), pages: '', isbn: '', publisher: '',
    language: 'ar', access: 'open', rights: 'جميع الحقوق محفوظة للمؤلف'
  });
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [access, setAccess] = useState<Access | null>(null);
  const [depts, setDepts] = useState<any[]>([]);
  const [colls, setColls] = useState<any[]>([]);
  const [direct, setDirect] = useState(false);
  const [ready, setReady] = useState(false);
  const [facId, setFacId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const a = await loadAccess(supabase);
      setAccess(a);
      if (a.userId && a.canUpload) {
        const { data: all } = await supabase.from('orgs').select('id,parent_id,kind,name_ar,path').like('path', `${ROOT_PATH}/%`).order('path');
        const { data: mine } = await supabase.from('orgs').select('id,path').in('id', a.memberships.map(m => m.org_id).concat([-1]));
        const mp = (mine || []).map((o: any) => o.path);
        const ok = (all || []).filter((o: any) => o.kind === 'department' && (a.isSuper || mp.some((p: string) => o.path === p || o.path.startsWith(p + '/'))));
        setDepts(ok);
        const { data: cs } = await supabase.from('collections').select('id,org_id,slug,name_ar').order('sort');
        setColls(cs || []);
        if (ok[0]) setForm(f => ({ ...f, department: String(ok[0].id) }));
      }
      setReady(true);
    })();
  }, []);

  // direct publishing depends on the chosen department (the super admin grants it per person)
  useEffect(() => {
    if (!form.department) return;
    supabase.rpc('can_publish', { p_org: Number(form.department) }).then(({ data }) => setDirect(data === true));
    const dep = depts.find(d => String(d.id) === form.department);
    const facPath = dep ? dep.path.split('/').slice(0, 2).join('/') : '';
    supabase.from('orgs').select('id').eq('path', facPath).maybeSingle().then(({ data }) => {
      setFacId(data?.id ?? null);
      const first = colls.find(c => c.org_id === data?.id);
      setForm(f => (colls.some(c => String(c.id) === f.collection && c.org_id === data?.id) ? f : { ...f, collection: first ? String(first.id) : '' }));
    });
  }, [form.department, depts, colls]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return notify('يجب الموافقة على إقرار حقوق الملكية');
    if (!access?.userId) { notify('يجب تسجيل الدخول أولاً!'); router.push('/login'); return; }
    if (!file) return notify('الرجاء اختيار ملف');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return notify('الملف لازم يكون PDF');
    if (file.size > 50 * 1024 * 1024) return notify('حجم الملف أكبر من 50 ميجابايت');
    if (!form.department || !form.collection) return notify('اختر القسم ونوع المادة');

    setUploading(true);
    let key = '';
    try {
      const orgId = Number(form.department);
      key = `${orgId}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage.from('files').upload(key, file, { contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      const { data: row, error } = await supabase.from('items').insert([{
        org_id: orgId, collection_id: Number(form.collection),
        title: form.title, author: form.author, abstract: form.abstract, keywords: form.keywords,
        language: form.language, date_issued: String(form.date_issued), publisher: form.publisher || null,
        rights: form.rights, isbn: form.isbn || null, pages: form.pages ? parseInt(form.pages) : null,
        access: form.access, submitted_by: access.userId, status: direct ? 'approved' : 'pending',
        metadata: { supervisor: form.supervisor, contributors: form.contributors, subjects: form.subjects, orcid: form.orcid },
      }]).select('id').single();
      if (error) throw error;

      const { error: fe } = await supabase.from('item_files').insert([{ item_id: row.id, bucket: 'files', file_key: key, size_bytes: file.size, mime: 'application/pdf' }]);
      if (fe) throw fe;

      notify(direct ? 'تم النشر مباشرة 🎉' : 'تم الإيداع بنجاح وسيتم مراجعته! 🎉');
      router.push('/profile');
    } catch (error: any) {
      if (key) await supabase.storage.from('files').remove([key]);
      notify('حدث خطأ: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-[#F8F6F0]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B4D3E]"></div></div>;
  if (!access?.userId || !access.canUpload) return (
    <main className="flex-1 bg-[#F8F6F0] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-10 rounded-3xl shadow text-center max-w-md border">
        <h1 className="text-2xl font-bold mb-3">رفع المواد بصلاحية خاصة</h1>
        <p className="text-gray-600 mb-6 leading-relaxed">{access?.userId ? 'حسابك للعرض والتحميل فقط. رفع المواد بيتفعل لكل قسم بواسطة مدير القسم أو المدير العام. اطلب منهم يضيفوك.' : 'سجّل الدخول أولاً.'}</p>
        <Link href={access?.userId ? '/' : '/login'} className="bg-[#1B4D3E] text-white px-8 py-3 rounded-xl font-bold">{access?.userId ? 'الرئيسية' : 'تسجيل الدخول'}</Link>
      </div>
    </main>
  );

  return (
    <main className="flex-1 bg-[#F8F6F0] py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        
        <div className="bg-[#1B4D3E] text-white p-8 rounded-2xl mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">إيداع مادة جديدة</h1>
            <p className="text-sm text-gray-300">{direct ? 'عندك صلاحية النشر المباشر في هذا القسم.' : 'سيتم مراجعة المادة قبل النشر.'}</p>
          </div>
          <Link href="/" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </Link>
        </div>

        <form onSubmit={handleDeposit} className="space-y-8">
          
          {/* 1. البيانات الأساسية */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md shadow-black/5 border border-gray-200/80">
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
                  <select aria-label="المجموعة" value={form.collection} onChange={e => setForm({...form, collection: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white">
                    {colls.filter(c => c.org_id === facId).map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">القسم العلمي *</label>
                  <select aria-label="القسم" value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white">
                    {depts.map(d => <option key={d.id} value={d.id}>{'— '.repeat(Math.max(0, d.path.split('/').length - 3))}{d.name_ar}</option>)}
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
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md shadow-black/5 border border-gray-200/80">
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
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md shadow-black/5 border border-gray-200/80">
            <h2 className="text-xl font-bold text-[#1B4D3E] mb-6 font-serif">٣. الملف والإتاحة</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">الملف (PDF فقط، حتى 50 ميجابايت)</label>
              <input required type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full p-3 border rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#1B4D3E]/10 file:text-[#1B4D3E] hover:file:bg-[#1B4D3E]/20 cursor-pointer" />
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
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md shadow-black/5 border border-gray-200/80">
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