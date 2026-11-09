'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Upload, X, User, Shield, Menu } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // حالة المستخدم والصلاحية
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');

  // حالة نافذة الإيداع
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  
  // حالة قائمة الموبايل
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [form, setForm] = useState({
    title: '', author: '', abstract: '',
    collection: 'أبحاث علمية', department: 'النحو والصرف',
    file_url: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const collections = [
    { id: 'كتب ومراجع', name: 'الكتب والمراجع', icon: '📚' },
    { id: 'رسائل جامعية', name: 'الرسائل الجامعية', icon: '🎓' },
    { id: 'أبحاث علمية', name: 'الأبحاث العلمية', icon: '🔬' },
    { id: 'مخطوطات', name: 'المخطوطات والتراث', icon: '📜' },
    { id: 'إنتاج هيئة التدريس', name: 'إنتاج هيئة التدريس', icon: '🖋️' },
    { id: 'مشروعات الطلاب', name: 'مشروعات الطلاب', icon: '📝' },
    { id: 'الدوريات والمجلات', name: 'الدوريات والمجلات', icon: '📰' },
    { id: 'المحاضرات والمواد', name: 'المحاضرات والمواد', icon: '🎧' },
  ];

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setItems(data);
      setFilteredItems(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    
    // جلب بيانات المستخدم وصلاحيته
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile) setRole(profile.role);
      }
    }
    getUserData();

    // مراقبة تغير حالة الدخول
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setRole('user');
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowDropdown(true); 
    
    if (query.trim() === '') {
      setFilteredItems(items);
      setShowDropdown(false); 
    } else {
      const filtered = items.filter(item => 
        item.title.includes(query) || 
        item.author.includes(query) || 
        item.abstract.includes(query)
      );
      setFilteredItems(filtered);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('يجب تسجيل الدخول أولاً لتتمكن من إيداع بحث!');
    if (!file) return alert('الرجاء اختيار ملف PDF');
    
    setUploading(true);

    const fileName = `${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage.from('books').upload(fileName, file, { contentType: 'application/pdf' });

    if (uploadError) {
      alert('خطأ في رفع الملف: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(fileName);
    const { error } = await supabase.from('items').insert([{ ...form, file_url: publicUrl, submitted_by: user.id }]);

    if (error) {
      alert('حدث خطأ أثناء الحفظ: ' + error.message);
      setUploading(false);
    } else {
      alert('تم إيداع البحث بنجاح! 🎉');
      setIsDepositOpen(false);
      setForm({ title: '', author: '', abstract: '', collection: 'أبحاث علمية', department: 'النحو والصرف', file_url: '' });
      setFile(null);
      setUploading(false);
      fetchData(); 
    }
  };

  return (
    <>
      {/* شريط التنقل */}
      <header className="bg-[#1B4D3E] text-white sticky top-0 z-50 shadow-md">
        <div className="container mx-auto max-w-6xl px-4 flex h-20 items-center justify-between">
          
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="شعار الكلية" className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white p-1" />
            <div>
              <span className="font-bold text-base md:text-lg block">المستودع الرقمي</span>
              <span className="text-[10px] md:text-xs text-[#D4AF37]">كلية اللغة العربية بالمنوفية</span>
            </div>
          </Link>

          {/* روابط الكمبيوتر */}
          <nav className="hidden md:flex gap-6 text-sm">
            <Link href="/" className="hover:text-[#D4AF37]">الرئيسية</Link>
            <Link href="#collections" className="hover:text-[#D4AF37]">المجموعات</Link>
            <Link href="#latest" className="hover:text-[#D4AF37]">أحدث الإضافات</Link>
          </nav>
          
          <div className="flex items-center gap-2 md:gap-3">
            {/* أزرار الكمبيوتر */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  {role === 'admin' && (
                    <Link href="/dashboard" className="bg-red-600 text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-red-700 transition flex items-center gap-2 shadow-md">
                      <Shield className="w-4 h-4" />
                      لوحة التحكم
                    </Link>
                  )}
                  <Link href="/profile" className="flex items-center gap-2 bg-white text-[#1B4D3E] px-4 py-2 rounded-md font-bold text-sm hover:bg-gray-100 transition">
                    <User className="w-4 h-4" />
                    حسابي
                  </Link>
                </div>
              ) : (
                <Link href="/login" className="text-white hover:text-[#D4AF37] font-bold text-sm transition">
                  دخول
                </Link>
              )}
              <button onClick={() => setIsDepositOpen(true)} className="bg-[#D4AF37] text-[#1B4D3E] px-4 py-2 rounded-md font-bold text-sm hover:bg-[#c29d30] transition flex items-center gap-2 shadow-lg">
                <Upload className="w-4 h-4" />
                إيداع بحث
              </button>
            </div>

            {/* زرار قائمة الموبايل */}
            <button 
              className="md:hidden bg-[#D4AF37] text-[#1B4D3E] p-2 rounded-md"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* قائمة الموبايل المنسدلة */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#153d31] border-t border-[#D4AF37]/30 px-4 py-4 shadow-xl">
            <div className="flex flex-col gap-4">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#D4AF37]">الرئيسية</Link>
              <Link href="#collections" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#D4AF37]">المجموعات</Link>
              <Link href="#latest" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#D4AF37]">أحدث الإضافات</Link>
              
              <div className="h-px bg-white/10 my-1"></div>
              
              {user ? (
                <>
                  {role === 'admin' && (
                    <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-red-400 font-bold">لوحة التحكم</Link>
                  )}
                  <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="font-bold">حسابي</Link>
                </>
              ) : (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="font-bold text-[#D4AF37]">تسجيل الدخول</Link>
              )}
              
              <button onClick={() => { setIsDepositOpen(true); setIsMobileMenuOpen(false); }} className="bg-[#D4AF37] text-[#1B4D3E] w-full py-2 rounded-md font-bold mt-2">
                إيداع بحث
              </button>
            </div>
          </div>
        )}
      </header>

      {/* الغلاف الرئيسي مع البحث */}
      <main className="flex-1">
        <section className="bg-[#1B4D3E] text-white py-16 md:py-24 px-4 text-center relative z-40">
          <div className="relative z-10 max-w-3xl mx-auto">
            <h1 className="font-serif text-3xl md:text-6xl font-bold mb-4 text-white">المستودع الرقمي الأكاديمي</h1>
            <p className="text-lg md:text-2xl text-[#D4AF37] mb-6">كلية اللغة العربية بالمنوفية — جامعة الأزهر</p>
            <p className="text-gray-300 mb-8 text-sm md:text-lg px-4">أرشيف علمي شامل — رسائل جامعية، كتب، أبحاث محكمة، ومخطوطات — مجاناً للباحثين حول العالم.</p>

            <div className="relative max-w-xl mx-auto mb-6 z-50 px-2">
              <input 
                type="text" 
                placeholder="ابحث عن عنوان، مؤلف، أو كلمة..." 
                value={searchQuery} 
                onChange={handleSearch} 
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
                className="w-full py-3 md:py-4 px-5 md:px-6 pr-12 md:pr-14 rounded-full text-sm md:text-base text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/50 shadow-xl" 
              />
              <Search className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 md:w-6 md:h-6" />

              {showDropdown && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 text-right z-50">
                  {filteredItems.length === 0 ? (
                    <div className="p-4 text-gray-500 text-center text-sm">لا توجد نتائج.</div>
                  ) : (
                    <>
                      {filteredItems.slice(0, 5).map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => {
                            if(item.file_url) window.open(item.file_url, '_blank');
                            setShowDropdown(false); 
                          }}
                          className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <h4 className="font-bold text-[#1B4D3E] text-sm">{item.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">المؤلف: {item.author}</p>
                          </div>
                          {item.file_url && <span className="text-xs bg-[#D4AF37] text-[#1B4D3E] px-2 py-1 rounded font-bold">PDF</span>}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              {showDropdown && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowDropdown(false)}></div>
              )}
            </div>
            
            <p className="text-xs md:text-sm text-gray-400 mt-2">لدينا حالياً <strong className="text-[#D4AF37]">{items.length}</strong> مادة علمية متاحة.</p>
          </div>
        </section>

        {/* المجموعات */}
        <section id="collections" className="py-12 md:py-16 max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1B4D3E] mb-8 md:mb-10 font-serif">المجموعات العلمية</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {collections.map((c) => (
              <Link href={`/collections/${c.id}`} key={c.id} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border hover:shadow-lg hover:border-[#D4AF37] transition text-center cursor-pointer block">
                <div className="text-4xl md:text-5xl mb-2 md:mb-4">{c.icon}</div>
                <h3 className="font-bold text-sm md:text-base text-[#1B4D3E]">{c.name}</h3>
              </Link>
            ))}
          </div>
        </section>

        {/* قسم الأبحاث */}
        <section id="latest" className="py-8 md:py-12 max-w-6xl mx-auto px-4 bg-gray-50 rounded-2xl mb-12 md:mb-16 border shadow-sm">
          <div className="flex justify-between items-center mb-6 md:mb-8 px-2 md:px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1B4D3E] font-serif">{searchQuery ? 'نتائج البحث' : 'أحدث الإضافات'}</h2>
            {searchQuery && <button onClick={() => {setSearchQuery(''); setFilteredItems(items);}} className="text-xs md:text-sm text-red-500 hover:underline">مسح البحث</button>}
          </div>
          
          {loading ? (
            <p className="text-center text-lg md:text-xl text-gray-500 py-10">جاري تحميل الأبحاث... ⏳</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-center text-gray-500 text-base md:text-lg py-10">لا توجد نتائج مطابقة.</p>
          ) : (
            <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 px-2 md:px-4">
              {filteredItems.map((item) => (
                <div key={item.id} className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-[#1B4D3E] mb-2 line-clamp-2">{item.title}</h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>المؤلف: {item.author}</p>
                    <p className="text-sm md:text-base text-gray-700 leading-relaxed mb-4 line-clamp-3">{item.abstract}</p>
                  </div>
                  <div>
                    {item.file_url && (
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="w-full block text-center mb-4 bg-[#1B4D3E] text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-[#153d31] transition">📄 فتح ملف PDF</a>
                    )}
                    <div className="flex flex-wrap gap-2 text-[10px] md:text-xs font-bold pt-4 border-t border-gray-100">
                      <span className="bg-gray-100 text-gray-700 px-2 md:px-3 py-1 rounded-full">{item.collection}</span>
                      <span className="bg-[#D4AF37]/20 text-[#1B4D3E] px-2 md:px-3 py-1 rounded-full">{item.department}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* التذييل */}
      <footer className="bg-[#1B4D3E] text-white py-8 md:py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <img src="/logo.jpg" alt="شعار الكلية" className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-white p-1 mx-auto mb-4" />
          <h3 className="text-base md:text-xl font-bold mb-2">المستودع الرقمي الأكاديمي - كلية اللغة العربية بالمنوفية</h3>
          <p className="text-xs md:text-sm text-gray-300 mb-6">جامعة الأزهر - شبين الكوم</p>
          <div className="bg-[#153d31] inline-block px-6 md:px-8 py-3 md:py-4 rounded-xl shadow-inner mb-6 border border-[#D4AF37]/30">
            <p className="font-bold text-base md:text-lg text-[#D4AF37]">تطوير وتصميم: أحمد محمود محمد نوار</p>
            <p className="text-xs md:text-sm text-gray-300 mt-1">طالب بكلية اللغة العربية بالمنوفية - شعبة المكتبات</p>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400">© {new Date().getFullYear()} جميع الحقوق محفوظة - جامعة الأزهر.</p>
        </div>
      </footer>

      {/* نافذة الإيداع */}
      {isDepositOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 relative">
            <button onClick={() => setIsDepositOpen(false)} className="absolute top-4 left-4 text-gray-500 hover:text-red-500 bg-gray-100 p-2 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
            <div className="p-5 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-[#1B4D3E] mb-4 md:mb-6 font-serif border-b pb-4">إيداع بحث جديد</h2>
              <form onSubmit={handleDeposit} className="space-y-3 md:space-y-4">
                <div><label className="block text-sm font-bold mb-1">عنوان البحث</label><input required type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full border p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-[#1B4D3E] outline-none text-sm md:text-base" /></div>
                <div><label className="block text-sm font-bold mb-1">اسم المؤلف</label><input required type="text" value={form.author} onChange={(e) => setForm({...form, author: e.target.value})} className="w-full border p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-[#1B4D3E] outline-none text-sm md:text-base" /></div>
                <div><label className="block text-sm font-bold mb-1">المستخلص</label><textarea required rows={3} value={form.abstract} onChange={(e) => setForm({...form, abstract: e.target.value})} className="w-full border p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-[#1B4D3E] outline-none text-sm md:text-base" /></div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div><label className="block text-xs md:text-sm font-bold mb-1">نوع المادة</label><select value={form.collection} onChange={(e) => setForm({...form, collection: e.target.value})} className="w-full border p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-[#1B4D3E] outline-none text-xs md:text-sm"><option>أبحاث علمية</option><option>رسائل جامعية</option><option>كتب ومراجع</option><option>مخطوطات</option></select></div>
                  <div><label className="block text-xs md:text-sm font-bold mb-1">القسم</label><select value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} className="w-full border p-2 md:p-3 rounded-lg focus:ring-2 focus:ring-[#1B4D3E] outline-none text-xs md:text-sm"><option>النحو والصرف</option><option>الأدب والنقد</option><option>البلاغة والنقد</option><option>الوثائق والمكتبات</option></select></div>
                </div>
                <div><label className="block text-sm font-bold mb-1">ملف البحث (PDF)</label><input required type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full border p-2 md:p-3 rounded-lg bg-gray-50 text-sm" /></div>
                <button type="submit" disabled={uploading} className="w-full bg-[#1B4D3E] text-white font-bold py-3 md:py-4 rounded-lg hover:bg-[#153d31] transition mt-4 shadow-lg text-base md:text-lg">{uploading ? 'جاري الرفع والحفظ...' : 'تأكيد الإيداع'}</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}