'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Users, FileText, Settings, Shield, UserCheck } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [stats, setStats] = useState({ items: 0, users: 0 });
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      
      // لو مش مدير عام، اطرده
      if (profile?.role !== 'admin') {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // جلب الإحصائيات
      const { count: itemsCount } = await supabase.from('items').select('*', { count: 'exact', head: true });
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setStats({ items: itemsCount || 0, users: usersCount || 0 });

      // جلب قائمة المستخدمين
      const { data: usersData } = await supabase.from('profiles').select('*').order('email');
      setUsersList(usersData || []);
      
      setLoading(false);
    }
    loadDashboard();
  }, [router]);

  // دالة تغيير صلاحية المستخدم
  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      alert('خطأ في التحديث: ' + error.message);
    } else {
      // تحديث القائمة بعد التغيير
      setUsersList(usersList.map(u => u.id === userId ? { ...u, role: newRole } : u));
      alert('تم تحديث الصلاحية بنجاح!');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-xl">جاري التحقق من الصلاحيات... ⏳</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-12 rounded-2xl shadow-xl text-center max-w-md">
          <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح لك بالدخول</h1>
          <p className="text-gray-500 mb-6">هذه الصفحة مخصصة للمدير العام فقط.</p>
          <Link href="/" className="bg-[#1B4D3E] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#153d31]">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* الهيدر */}
        <div className="bg-[#1B4D3E] rounded-2xl p-8 text-white flex flex-col md:flex-row justify-between items-center shadow-lg gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#D4AF37]" /> 
              لوحة تحكم المدير العام
            </h1>
            <p className="text-[#D4AF37]">إدارة المستخدمين والصلاحيات في المستودع.</p>
          </div>
          <Link href="/" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition">الرئيسية</Link>
        </div>

        {/* التبويبات */}
        <div className="flex gap-4 border-b border-gray-200">
          <button onClick={() => setActiveTab('stats')} className={`pb-4 px-4 font-bold text-lg transition ${activeTab === 'stats' ? 'text-[#1B4D3E] border-b-4 border-[#D4AF37]' : 'text-gray-400'}`}>الإحصائيات</button>
          <button onClick={() => setActiveTab('users')} className={`pb-4 px-4 font-bold text-lg transition ${activeTab === 'users' ? 'text-[#1B4D3E] border-b-4 border-[#D4AF37]' : 'text-gray-400'}`}>إدارة المستخدمين</button>
        </div>

        {/* محتوى الإحصائيات */}
        {activeTab === 'stats' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-2xl border shadow-sm flex items-center gap-6">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-full"><FileText className="w-10 h-10" /></div>
              <div><p className="text-gray-500 font-bold mb-1">إجمالي الأبحاث</p><h2 className="text-4xl font-bold text-[#1B4D3E]">{stats.items}</h2></div>
            </div>
            <div className="bg-white p-8 rounded-2xl border shadow-sm flex items-center gap-6">
              <div className="bg-purple-50 text-purple-600 p-4 rounded-full"><Users className="w-10 h-10" /></div>
              <div><p className="text-gray-500 font-bold mb-1">المستخدمون</p><h2 className="text-4xl font-bold text-[#1B4D3E]">{stats.users}</h2></div>
            </div>
          </div>
        )}

        {/* محتوى إدارة المستخدمين */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-6 bg-gray-50 border-b">
              <h3 className="font-bold text-[#1B4D3E] flex items-center gap-2"><UserCheck className="w-5 h-5"/> قائمة المستخدمين المسجلين</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-white text-gray-500 text-sm border-b">
                  <tr>
                    <th className="p-4 font-bold">الاسم</th>
                    <th className="p-4 font-bold">البريد الإلكتروني</th>
                    <th className="p-4 font-bold">الصلاحية الحالية</th>
                    <th className="p-4 font-bold">تغيير الصلاحية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-[#1B4D3E]">{u.full_name || 'بدون اسم'}</td>
                      <td className="p-4 text-sm text-gray-600">{u.email}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          u.role === 'admin' ? 'bg-red-100 text-red-700' :
                          u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {u.role === 'admin' ? 'مدير عام' : u.role === 'manager' ? 'مدير قسم' : 'باحث'}
                        </span>
                      </td>
                      <td className="p-4">
                        {/* لو المستخدم ده هو أنت (المدير) متسمحش بتغيير صلاحيتك */}
                        {u.role === 'admin' ? (
                          <span className="text-xs text-gray-400">لا يمكن التغيير</span>
                        ) : (
                          <select 
                            value={u.role} 
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                            className="border p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1B4D3E] outline-none"
                          >
                            <option value="user">باحث</option>
                            <option value="manager">مدير قسم</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}