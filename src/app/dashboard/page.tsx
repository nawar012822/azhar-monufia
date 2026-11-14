'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Users, FileText, Shield, UserCheck, Search, Trash2, CheckCircle, XCircle, Eye, Download } from 'lucide-react';

// قائمة الأقسام الثمانية مع الإيموجي
const ALL_COLLECTIONS = [
  { id: 'كتب ومراجع', name: 'الكتب والمراجع', icon: '📚' },
  { id: 'رسائل جامعية', name: 'الرسائل الجامعية', icon: '🎓' },
  { id: 'أبحاث علمية', name: 'الأبحاث العلمية', icon: '🔬' },
  { id: 'مخطوطات', name: 'المخطوطات والتراث', icon: '📜' },
  { id: 'إنتاج هيئة التدريس', name: 'إنتاج هيئة التدريس', icon: '🖋️' },
  { id: 'مشروعات الطلاب', name: 'مشروعات الطلاب', icon: '📝' },
  { id: 'الدوريات والمجلات', name: 'الدوريات والمجلات', icon: '📰' },
  { id: 'المحاضرات والمواد', name: 'المحاضرات والمواد', icon: '🎧' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  
  // البيانات
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  
  // التبويبات (المشرف مش هيشوف تبويب الأعضاء ولا الإحصائيات)
  const [activeTab, setActiveTab] = useState<'review' | 'materials' | 'users' | 'stats'>('review');
  const [searchQuery, setSearchQuery] = useState('');

  // دالة جلب البيانات
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      
      // التحقق من الصلاحية: لازم يكون مدير أو مشرف
      if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
        setUserRole('unauthorized');
        setLoading(false);
        return;
      }
      
      setUserRole(profile.role);

      const { data: itemsData } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      setItemsList(itemsData || []);

      // جلب المستخدمين للمدير فقط
      if (profile.role === 'admin') {
        const { data: usersData } = await supabase.from('profiles').select('*').order('email');
        setUsersList(usersData || []);
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  // دوال التحديث
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('items').update({ status: newStatus }).eq('id', id);
    if (!error) setItemsList(itemsList.map(item => item.id === id ? { ...item, status: newStatus } : item));
    else alert('خطأ: ' + error.message);
  };

  const handleUpdateAccess = async (id: string, newAccess: string) => {
    const { error } = await supabase.from('items').update({ access: newAccess }).eq('id', id);
    if (!error) setItemsList(itemsList.map(item => item.id === id ? { ...item, access: newAccess } : item));
    else alert('خطأ: ' + error.message);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المادة نهائياً؟')) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (!error) setItemsList(itemsList.filter(item => item.id !== id));
    else alert('خطأ: ' + error.message);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) setUsersList(usersList.map(u => u.id === userId ? { ...u, role: newRole } : u));
    else alert('خطأ: ' + error.message);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B4D3E]"></div></div>;

  // لو المستخدم مش مدير ولا مشرف
  if (userRole === 'unauthorized') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md border border-border/50">
        <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-4">غير مصرح لك بالدخول</h1>
        <Link href="/" className="bg-[#1B4D3E] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#153d31]">العودة للرئيسية</Link>
      </div>
    </div>
  );

  const filteredItems = itemsList.filter(item => item.title.includes(searchQuery) || item.author.includes(searchQuery));
  const pendingItems = filteredItems.filter(item => item.status === 'pending');
  const filteredUsers = usersList.filter(u => u.full_name?.includes(searchQuery) || u.email.includes(searchQuery));

  // حسابات الإحصائيات
  const totalItems = itemsList.length;
  const publishedItems = itemsList.filter(i => i.status === 'approved').length;
  const pendingReview = itemsList.filter(i => i.status === 'pending').length;
  const revisionItems = itemsList.filter(i => i.status === 'revision').length;
  const totalViews = itemsList.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalDownloads = itemsList.reduce((sum, item) => sum + (item.downloads || 0), 0);
  const collectionsCount = itemsList.reduce((acc: any, item) => {
    acc[item.collection] = (acc[item.collection] || 0) + 1;
    return acc;
  }, {});
  const mostViewedItems = [...itemsList].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  return (
    <main className="min-h-screen bg-[#F8F6F0] pb-20" dir="rtl">
      
      {/* الهيدر */}
      <div className="bg-[#1B4D3E] text-white py-12 px-4 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold font-serif mb-2">لوحة التحكم</h1>
            <p className="text-[#D4AF37] text-lg">
              {userRole === 'admin' ? 'المدير العام - صلاحيات كاملة' : 'مشرف ومراجع - صلاحيات المراجعة والنشر'}
            </p>
          </div>
          <Link href="/" className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-xl transition text-sm font-bold">الرئيسية</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 relative z-20">
        
        {/* التبويبات (بتظهر حسب الصلاحية) */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-border/50 flex gap-2 mb-8 overflow-x-auto">
          <button onClick={() => {setActiveTab('review'); setSearchQuery('');}} className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm md:text-base transition-all ${activeTab === 'review' ? 'bg-[#F8F6F0] shadow text-[#1B4D3E]' : 'text-gray-500 hover:bg-gray-50'}`}>
            صندوق المراجعة {pendingReview > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full mr-1">{pendingReview}</span>}
          </button>
          <button onClick={() => {setActiveTab('materials'); setSearchQuery('');}} className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm md:text-base transition-all ${activeTab === 'materials' ? 'bg-[#F8F6F0] shadow text-[#1B4D3E]' : 'text-gray-500 hover:bg-gray-50'}`}>كل المواد</button>
          
          {/* تبويب الأعضاء والإحصائيات للمدير فقط */}
          {userRole === 'admin' && (
            <>
              <button onClick={() => {setActiveTab('users'); setSearchQuery('');}} className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm md:text-base transition-all ${activeTab === 'users' ? 'bg-[#F8F6F0] shadow text-[#1B4D3E]' : 'text-gray-500 hover:bg-gray-50'}`}>الأعضاء والصلاحيات</button>
              <button onClick={() => {setActiveTab('stats'); setSearchQuery('');}} className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-sm md:text-base transition-all ${activeTab === 'stats' ? 'bg-[#F8F6F0] shadow text-[#1B4D3E]' : 'text-gray-500 hover:bg-gray-50'}`}>الإحصائيات</button>
            </>
          )}
        </div>

        {/* شريط البحث */}
        {activeTab !== 'stats' && (
          <div className="relative mb-6">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder={activeTab === 'users' ? "ابحث بالاسم أو البريد..." : "ابحث بالعنوان أو المؤلف..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 pr-12 pl-4 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white shadow-sm text-sm"
            />
          </div>
        )}

        {/* 1. صندوق المراجعة */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            {pendingItems.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-dashed border-gray-300 text-gray-500 flex flex-col items-center">
                <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
                <p className="text-lg font-bold">لا توجد إيداعات تنتظر المراجعة</p>
              </div>
            ) : (
              pendingItems.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border-2 border-orange-200">
                  <h3 className="text-xl font-bold text-[#1B4D3E] mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{item.author} • {item.collection}</p>
                  <p className="text-gray-700 text-sm mb-4 line-clamp-2">{item.abstract}</p>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => handleUpdateStatus(item.id, 'approved')} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition"><CheckCircle className="w-4 h-4" /> اعتماد النشر</button>
                    <button onClick={() => handleUpdateStatus(item.id, 'rejected')} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition"><XCircle className="w-4 h-4" /> رفض</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. كل المواد */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-border/50">
                <h3 className="text-xl font-bold text-[#1B4D3E] mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{item.author} • <span className="text-xs">{item.identifier}</span></p>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">حالة النشر</label>
                    <select value={item.status} onChange={(e) => handleUpdateStatus(item.id, e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-[#1B4D3E] outline-none">
                      <option value="approved">معتمد ومنشور</option>
                      <option value="pending">قيد المراجعة</option>
                      <option value="revision">طلب تعديل</option>
                      <option value="rejected">مرفوض</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">مستوى الوصول</label>
                    <select value={item.access} onChange={(e) => handleUpdateAccess(item.id, e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-[#1B4D3E] outline-none">
                      <option value="open">متاح مفتوح</option>
                      <option value="restricted">مقيد للمسجلين</option>
                      <option value="metadata">بيانات فقط</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <span className="bg-[#1B4D3E]/10 text-[#1B4D3E] px-3 py-1 rounded-full text-xs font-bold">{item.collection}</span>
                  <button onClick={() => handleDeleteItem(item.id)} className="flex items-center gap-1 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition text-sm font-bold"><Trash2 className="w-4 h-4" /> حذف</button>
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && <p className="text-center text-gray-500 py-10 bg-white rounded-2xl border">لا توجد مواد.</p>}
          </div>
        )}

        {/* 3. الأعضاء والصلاحيات (للمدير فقط) */}
        {activeTab === 'users' && userRole === 'admin' && (
          <div className="space-y-4">
            {filteredUsers.map(u => (
              <div key={u.id} className="bg-white p-6 rounded-2xl shadow-sm border border-border/50">
                <h3 className="text-xl font-bold text-[#1B4D3E]">{u.full_name || 'بدون اسم'}</h3>
                <p className="text-sm text-gray-500 mb-4">{u.email}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'moderator' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {u.role === 'admin' ? 'مدير عام' : u.role === 'moderator' ? 'مشرف ومراجع' : 'عضو مسجل'}
                  </span>
                </div>
                <div className="flex items-center gap-4 border-t border-gray-100 pt-4">
                  <span className="text-sm font-bold text-gray-700">تعديل الصلاحية:</span>
                  <select value={u.role} onChange={(e) => handleUpdateRole(u.id, e.target.value)} className="flex-1 p-2 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-[#1B4D3E] outline-none max-w-xs">
                    <option value="user">باحث</option>
                    <option value="moderator">مشرف ومراجع</option>
                    <option value="admin">مدير عام</option>
                  </select>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && <p className="text-center text-gray-500 py-10 bg-white rounded-2xl border">لا يوجد أعضاء.</p>}
          </div>
        )}

        {/* 4. الإحصائيات (للمدير فقط) */}
        {activeTab === 'stats' && userRole === 'admin' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-border/50 text-center flex flex-col items-center justify-center shadow-sm">
                <span className="text-4xl font-bold text-[#1B4D3E]">{totalItems}</span>
                <span className="text-gray-500 font-bold mt-2">كل المواد</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border/50 text-center flex flex-col items-center justify-center shadow-sm">
                <span className="text-4xl font-bold text-[#1B4D3E]">{publishedItems}</span>
                <span className="text-gray-500 font-bold mt-2">منشورة</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border/50 text-center flex flex-col items-center justify-center shadow-sm">
                <span className="text-4xl font-bold text-orange-500">{pendingReview}</span>
                <span className="text-gray-500 font-bold mt-2">قيد المراجعة</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border/50 text-center flex flex-col items-center justify-center shadow-sm">
                <span className="text-4xl font-bold text-red-500">{revisionItems}</span>
                <span className="text-gray-500 font-bold mt-2">مطلوب تعديل</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border/50 text-center flex flex-col items-center justify-center shadow-sm">
                <div className="flex items-center gap-2 text-2xl font-bold text-gray-700"><Eye className="w-6 h-6 text-gray-400" /> {totalViews}</div>
                <span className="text-gray-500 font-bold mt-2">المشاهدات</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border/50 text-center flex flex-col items-center justify-center shadow-sm">
                <div className="flex items-center gap-2 text-2xl font-bold text-gray-700"><Download className="w-6 h-6 text-gray-400" /> {totalDownloads}</div>
                <span className="text-gray-500 font-bold mt-2">التحميلات</span>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl border border-border/50 shadow-sm">
              <h3 className="text-xl font-bold text-[#1B4D3E] mb-6">حسب القسم</h3>
              <div className="space-y-4">
                {ALL_COLLECTIONS.map((c) => {
                  const count = collectionsCount[c.id] || 0;
                  const percentage = totalItems > 0 ? (count / totalItems) * 100 : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-4">
                      <span className="w-40 text-sm font-bold text-gray-700 flex items-center gap-1">
                        <span className="text-lg">{c.icon}</span> {c.name}
                      </span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#b59555] rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className="w-8 text-sm font-bold text-gray-500 text-left">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl border border-border/50 shadow-sm">
              <h3 className="text-xl font-bold text-[#1B4D3E] mb-6">الأكثر مشاهدة</h3>
              <div className="space-y-3">
                {mostViewedItems.map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition">
                    <span className="font-bold text-gray-700 text-sm">
                      {index + 1}. {item.title}
                    </span>
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="font-bold">{item.views || 0}</span>
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                ))}
                {mostViewedItems.length === 0 && <p className="text-gray-500 text-sm">لا يوجد بيانات.</p>}
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}