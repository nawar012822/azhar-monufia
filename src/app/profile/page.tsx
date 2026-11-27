'use client';

import { notify } from '@/lib/notify';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { loadAccess, Access, ITEM_SELECT, flat, STATUS_AR, ACCESS_AR } from '@/lib/repo';
import { Save, LogOut, Heart, FileText } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({ full_name: '', orcid: '' });
  const [myItems, setMyItems] = useState<any[]>([]);
  const [favItems, setFavItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (profileData) setProfile(profileData);

      setAccess(await loadAccess(supabase));
      const { data: itemsData } = await supabase.from('items').select(ITEM_SELECT).eq('submitted_by', user.id).order('created_at', { ascending: false });
      setMyItems((itemsData || []).map(flat));

      const { data: favsData } = await supabase.from('favorites').select(`item_id, items(${ITEM_SELECT})`).eq('user_id', user.id);
      setFavItems(favsData?.map((f: any) => f.items).filter(Boolean).map(flat) || []);

      setLoading(false);
    }
    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({ id: user.id, email: user.email, full_name: profile.full_name, orcid: profile.orcid });
    if (error) { notify('تعذر الحفظ: ' + error.message); setSaving(false); return; }
    notify('تم حفظ البيانات بنجاح!');
    setSaving(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); router.refresh(); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F6F0]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B4D3E]"></div></div>;

  return (
    <main className="flex-1 bg-[#F8F6F0] py-12 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="bg-[#1B4D3E] text-white p-8 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">حسابي</h1>
            <p className="text-gray-300">{access?.isSuper ? 'المدير العام' : access && access.best >= 3 ? 'مدير' : access && access.best === 2 ? 'مراجع' : access && access.best === 1 ? 'رافع مواد' : 'عضو مسجل (عرض وتحميل)'}</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500/20 text-red-100 hover:bg-red-500/40 px-5 py-2 rounded-xl transition flex items-center gap-2"><LogOut className="w-4 h-4"/> خروج</button>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-md shadow-black/5 border border-gray-200/80">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">البريد الإلكتروني</label>
                <input type="email" value={user?.email} disabled className="w-full p-3 border rounded-xl bg-gray-50 text-gray-500 outline-none" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">الاسم الكامل</label>
                <input type="text" value={profile.full_name || ''} onChange={(e) => setProfile({...profile, full_name: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">معرّف ORCID (اختياري)</label>
                <input type="text" value={profile.orcid || ''} onChange={(e) => setProfile({...profile, orcid: e.target.value})} placeholder="0000-0000-0000-0000" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E]" dir="ltr" />
              </div>
            </div>
            <button type="submit" disabled={saving} className="bg-[#1B4D3E] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#153d31]">
              <Save className="w-5 h-5" /> {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        </div>

        <div className="pt-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#1B4D3E] font-serif flex items-center gap-2"><FileText className="w-6 h-6 text-[#D4AF37]"/> موادي المودعة ({myItems.length})</h2>
            {access?.canUpload && (<Link href="/deposit" className="bg-[#b59555] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#a08245] transition">+ إيداع مادة جديدة</Link>)}
          </div>
          
          {myItems.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border text-gray-500">{access?.canUpload ? 'لم تقم بإيداع أي مواد بعد.' : 'حسابك للعرض والتحميل. رفع المواد يفعّله مدير القسم أو المدير العام.'}</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myItems.map(item => (
                <Link href={`/item/${item.id}`} key={item.id} className="bg-white p-5 rounded-2xl border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition">
                  <h3 className="text-lg font-bold text-[#1B4D3E] mb-2 font-serif line-clamp-1">{item.title}</h3>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full">{STATUS_AR[item.status] || item.status}</span>
                    <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full">{ACCESS_AR[item.access]}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 pb-12">
          <h2 className="text-2xl font-bold text-[#1B4D3E] mb-6 font-serif flex items-center gap-2"><Heart className="w-6 h-6 text-red-500"/> المفضلة ({favItems.length})</h2>
          {favItems.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-dashed border-gray-300 text-gray-500 flex flex-col items-center">
              <Heart className="w-10 h-10 text-gray-300 mb-4" />
              اضغط «إضافة للمفضلة» في أي صفحة مادة لتظهر هنا.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {favItems.map(item => (
                <Link href={`/item/${item.id}`} key={item.id} className="bg-white p-5 rounded-2xl border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition">
                  <h3 className="text-lg font-bold text-[#1B4D3E] mb-2 font-serif line-clamp-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.author}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}