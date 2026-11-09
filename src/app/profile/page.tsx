'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LogOut, User as UserIcon, FileText } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myItems, setMyItems] = useState<any[]>([]);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login'); // لو مش مسجل يروح لصفحة الدخول
        return;
      }
      
      setUser(user);

      // جلب بيانات الملف الشخصي
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // جلب الأبحاث اللي المستخدم ده رفعها
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false });
      
      setMyItems(itemsData || []);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">جاري تحميل البيانات... ⏳</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* كارت بيانات المستخدم */}
        <div className="bg-white rounded-2xl shadow-sm border p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-[#1B4D3E] text-white rounded-full flex items-center justify-center text-4xl font-bold shadow-lg">
              {profile?.full_name ? profile.full_name.charAt(0) : <UserIcon className="w-10 h-10" />}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1B4D3E] font-serif">{profile?.full_name || 'مستخدم جديد'}</h1>
              <p className="text-gray-500 mt-1">{user?.email}</p>
              <div className="mt-2 inline-block bg-[#D4AF37]/20 text-[#1B4D3E] px-3 py-1 rounded-full text-xs font-bold">
                {profile?.role === 'admin' ? 'مدير عام' : 'باحث'}
              </div>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Link href="/" className="flex-1 md:flex-none text-center px-6 py-2 border rounded-lg hover:bg-gray-50 transition font-bold text-gray-700">
              الرئيسية
            </Link>
            <button onClick={handleLogout} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-bold">
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>

        {/* قسم أبحاث المستخدم */}
        <div>
          <h2 className="text-2xl font-bold text-[#1B4D3E] mb-4 font-serif flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#D4AF37]" />
            أبحاثي المودعة ({myItems.length})
          </h2>

          {myItems.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border text-gray-500">
              لم تقم بإيداع أي أبحاث حتى الآن. <br />
              <Link href="/" className="text-[#1B4D3E] font-bold mt-2 inline-block hover:underline">اذهب للرئيسية وأودع بحثك الأول!</Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myItems.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-[#1B4D3E] mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.abstract}</p>
                  </div>
                  <div className="flex justify-between items-center border-t pt-4 mt-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.collection}</span>
                    {item.file_url && (
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#1B4D3E] hover:text-[#D4AF37] transition">
                        📄 عرض الملف
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}