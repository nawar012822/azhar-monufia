'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Menu, Eye, X, User, Shield, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ResearchAssistantWidget from '@/components/ResearchAssistantWidget'; // تم إضافة المساعد هنا

const ALL_COLLECTIONS = [
  { id: 'كتب ومراجع', name: 'الكتب والمراجع', icon: '📚' },
  { id: 'رسائل جامعية', name: 'الرسائل الجامعية', icon: '🎓' },
  { id: 'أبحاث علمية', name: 'الأبحاث العلمية', icon: '🔬' },
  { id: 'مخطوطات', name: 'المخطوطات والتراث', icon: '📜' },
  { id: 'إنتاج هيئة التدريس', name: 'إنتاج أعضاء هيئة التدريس', icon: '🖋️' },
  { id: 'مشروعات الطلاب', name: 'مشروعات الطلاب', icon: '📝' },
  { id: 'الدوريات والمجلات', name: 'الدوريات والمجلات', icon: '📰' },
  { id: 'المحاضرات والمواد', name: 'المحاضرات والمواد التعليمية', icon: '🎧' },
];

export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالة البحث
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
        if (!error && data) setItems(data);

        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profile) setRole(profile.role);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setRole('user');
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  // دالة البحث
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowDropdown(false);
    }
  };

  // نتائج البحث المنسدلة (أول 5 نتائج)
  const dropdownResults = searchQuery 
    ? items.filter(item => item.title.includes(searchQuery) || item.author.includes(searchQuery) || item.abstract.includes(searchQuery)).slice(0, 5)
    : [];

  const totalItems = items.length;
  const totalViews = items.reduce((sum, item) => sum + (item.views || 0), 0);
  const booksCount = items.filter(i => i.collection === 'كتب ومراجع').length;
  const thesesCount = items.filter(i => i.collection === 'رسائل جامعية').length;
  const researchCount = items.filter(i => i.collection === 'أبحاث علمية').length;
  const manuscriptsCount = items.filter(i => i.collection === 'مخطوطات').length;

  const mostViewed = [...items].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
  const latestItems = items.slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F6F0] font-sans" dir="rtl">
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex h-24 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 md:gap-4 shrink-0">
            <img src="/logo.jpg" alt="الشعار" className="h-12 w-12 md:h-16 md:w-16 rounded-full object-cover border-2 border-gray-100 shadow-sm shrink-0" />
            <div className="text-right flex flex-col justify-center">
              <span className="font-bold text-lg md:text-2xl text-[#1B4D3E] block leading-tight font-serif">المستودع الرقمي</span>
              <span className="text-[10px] md:text-sm text-gray-500 block mt-1">كلية اللغة العربية - شبين الكوم</span>
            </div>
          </Link>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 border rounded-lg text-gray-600 hover:bg-gray-50 shrink-0">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* القائمة الجانبية */}
        {isMobileMenuOpen && (
          <div className="absolute w-full bg-[#F8F6F0] border-b border-gray-200 shadow-xl flex flex-col text-right z-50">
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="p-5 border-b border-gray-200/50 font-bold text-gray-800 hover:bg-white transition">الرئيسية</Link>
            <Link href="/search" onClick={() => setIsMobileMenuOpen(false)} className="p-5 border-b border-gray-200/50 font-bold text-gray-800 hover:bg-white transition">البحث المتقدم</Link>
            <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="p-5 border-b border-gray-200/50 font-bold text-gray-800 hover:bg-white transition">عن المستودع</Link>
            <Link href="/policies" onClick={() => setIsMobileMenuOpen(false)} className="p-5 border-b border-gray-200/50 font-bold text-gray-800 hover:bg-white transition">سياسة الاستخدام</Link>
            <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="p-5 border-b border-gray-200/50 font-bold text-gray-800 hover:bg-white transition">اتصل بنا</Link>
            
            <Link href="/deposit" onClick={() => setIsMobileMenuOpen(false)} className="p-5 border-b border-gray-200/50 font-bold text-[#b59555] hover:bg-white transition text-right">+ إيداع مادة</Link>
            
            {user ? (
              <>
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="p-5 border-b border-gray-200/50 font-bold text-gray-800 hover:bg-white transition">حسابي</Link>
                {role === 'admin' && (
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="p-5 border-b border-gray-200/50 font-bold text-[#1B4D3E] hover:bg-white transition">لوحة التحكم</Link>
                )}
                <button onClick={handleLogout} className="p-5 font-bold text-red-600 hover:bg-white transition text-right">خروج</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="p-5 font-bold text-[#1B4D3E] hover:bg-white transition">تسجيل الدخول</Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <section className="bg-[#0C422E] py-16 px-4 text-center relative overflow-hidden" 
                 style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          
          <div className="relative z-30 max-w-3xl mx-auto">
            <img src="/logo.jpg" alt="الشعار" className="h-28 w-28 rounded-full mx-auto mb-6 border-4 border-white shadow-lg object-cover" />
            <p className="text-[#D4AF37] text-lg mb-2 font-bold">جامعة الأزهر - فرع شبين الكوم</p>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-serif leading-tight">المستودع الرقمي لكلية اللغة العربية</h1>
            <p className="text-gray-300 text-lg md:text-xl mb-10 leading-relaxed">حفظ الإنتاج العلمي للكلية وتنظيمه وإتاحته للطلاب والباحثين وأعضاء هيئة التدريس.</p>

            {/* شريط البحث التفاعلي */}
            <div className="relative max-w-2xl mx-auto z-50">
              <form onSubmit={handleSearchSubmit} className="bg-white p-2 rounded-xl shadow-xl flex">
                <button type="submit" className="bg-[#1B4D3E] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#153d31] transition-colors">بحث</button>
                <input 
                  type="text" 
                  placeholder="ابحث بالعنوان أو المؤلف أو الموضوع..." 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="flex-1 bg-transparent px-4 outline-none text-gray-700 text-lg"
                />
              </form>

              {/* القائمة المنسدلة لنتائج البحث */}
              {showDropdown && searchQuery && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowDropdown(false)}></div>
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 text-right z-50">
                    {dropdownResults.length === 0 ? (
                      <div className="p-4 text-gray-500 text-center">لا توجد نتائج سريعة.</div>
                    ) : (
                      dropdownResults.map(item => (
                        <Link href={`/item/${item.id}`} key={item.id} onClick={() => setShowDropdown(false)} className="block p-4 border-b border-gray-50 hover:bg-gray-50 transition">
                          <h4 className="font-bold text-[#1B4D3E] text-sm">{item.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">{item.author}</p>
                        </Link>
                      ))
                    )}
                    <button onClick={handleSearchSubmit} className="w-full bg-gray-50 text-[#1B4D3E] font-bold text-sm p-3 hover:bg-gray-100 transition">عرض كل النتائج في البحث المتقدم</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* كارت الإحصائيات المتداخل */}
        <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20 mb-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 grid grid-cols-3 gap-y-8 gap-x-4 text-center">
            <div>
              <span className="block text-3xl font-bold text-[#1B4D3E] mb-1">{totalItems.toLocaleString('ar-EG')}</span>
              <span className="text-sm text-gray-500 font-bold">إجمالي المواد</span>
            </div>
            <div>
              <span className="block text-3xl font-bold text-[#1B4D3E] mb-1">{booksCount.toLocaleString('ar-EG')}</span>
              <span className="text-sm text-gray-500 font-bold">الكتب</span>
            </div>
            <div>
              <span className="block text-3xl font-bold text-[#1B4D3E] mb-1">{thesesCount.toLocaleString('ar-EG')}</span>
              <span className="text-sm text-gray-500 font-bold">الرسائل</span>
            </div>
            <div>
              <span className="block text-3xl font-bold text-[#1B4D3E] mb-1">{researchCount.toLocaleString('ar-EG')}</span>
              <span className="text-sm text-gray-500 font-bold">الأبحاث</span>
            </div>
            <div>
              <span className="block text-3xl font-bold text-[#1B4D3E] mb-1">{manuscriptsCount.toLocaleString('ar-EG')}</span>
              <span className="text-sm text-gray-500 font-bold">المخطوطات</span>
            </div>
            <div>
              <span className="block text-3xl font-bold text-[#1B4D3E] mb-1">{totalViews.toLocaleString('ar-EG')}</span>
              <span className="text-sm text-gray-500 font-bold">المشاهدات</span>
            </div>
          </div>
        </div>

        <section className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold text-[#1B4D3E] mb-8 font-serif text-right">تصفح حسب المجموعة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ALL_COLLECTIONS.map((c) => {
              const count = items.filter(i => i.collection === c.id).length;
              return (
                <Link href={`/collections/${c.id}`} key={c.id} className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-md transition text-center flex flex-col items-center justify-center">
                  <span className="text-4xl mb-4">{c.icon}</span>
                  <h3 className="font-bold text-[#1B4D3E] text-sm md:text-base mb-1">{c.name}</h3>
                  <span className="text-xs text-gray-400">{count} مادة</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold text-[#1B4D3E] mb-6 font-serif text-right">أحدث الإضافات</h2>
          <div className="space-y-4">
            {latestItems.map(item => (
              <Link href={`/item/${item.id}`} key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition block">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    {ALL_COLLECTIONS.find(c => c.id === item.collection)?.icon} {item.collection} • {item.date_issued || '2024'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#1B4D3E] mb-2 font-serif">{item.title}</h3>
                <p className="text-gray-600 text-sm mb-4">د. {item.author}</p>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1 text-gray-500 text-sm"><Eye className="w-4 h-4" /> {item.views || 0}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.access === 'open' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                    {item.access === 'open' ? 'متاح مفتوح' : 'مقيد للمسجلين'}
                  </span>
                </div>
              </Link>
            ))}
            {latestItems.length === 0 && <p className="text-center text-gray-500 py-4">لا توجد مواد مضافة.</p>}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-8 mb-12">
          <h2 className="text-3xl font-bold text-[#1B4D3E] mb-6 font-serif text-right">الأكثر زيارة</h2>
          <div className="space-y-4">
            {mostViewed.map(item => (
              <Link href={`/item/${item.id}`} key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition block">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    {ALL_COLLECTIONS.find(c => c.id === item.collection)?.icon} {item.collection} • {item.date_issued || '2024'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#1B4D3E] mb-2 font-serif">{item.title}</h3>
                <p className="text-gray-600 text-sm mb-4">د. {item.author}</p>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1 text-gray-500 text-sm"><Eye className="w-4 h-4" /> {item.views || 0}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.access === 'open' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                    {item.access === 'open' ? 'متاح مفتوح' : 'مقيد للمسجلين'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[#0C422E] text-white py-12 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-2xl font-bold mb-4 font-serif">المستودع الرقمي لكلية اللغة العربية - جامعة الأزهر - فرع شبين الكوم</h3>
          <p className="text-gray-300 mb-8 text-sm">نموذج غير رسمي قيد التطوير. بعض المواد المعروضة تجريبية لأغراض العرض.</p>
          <div className="border-t border-white/20 pt-6">
            <p className="text-[#D4AF37] font-bold text-lg mb-1">© 2026 جميع الحقوق محفوظة - أحمد محمود نوار</p>
            <p className="text-gray-400 text-sm">طالب بكلية اللغة العربية بالمنوفية، جامعة الأزهر - شعبة المكتبات.</p>
          </div>
        </div>
      </footer>

      <ResearchAssistantWidget />
    </div>
  );
}