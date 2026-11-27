'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Search, Bookmark } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { loadAccess, Access } from '@/lib/repo';
import { mergeLocalIntoAccount } from '@/lib/local-library';

const LINKS: [string, string][] = [['/', 'الرئيسية'], ['/search', 'البحث'], ['/my-library', 'مكتبتي'], ['/about', 'عن المستودع'], ['/contact', 'اتصل بنا']];

export default function SiteHeader() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { setUser(user); if (user) { loadAccess(supabase).then(setAccess); mergeLocalIntoAccount(user.id); } });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (!s) setAccess(null); else { loadAccess(supabase).then(setAccess); if (_e === 'SIGNED_IN') mergeLocalIntoAccount(s.user.id); }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => setOpen(false), [path]);

  const logout = async () => { await supabase.auth.signOut(); setOpen(false); router.push('/'); router.refresh(); };
  const active = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  const lk = (h: string) => `px-3 py-2 rounded-lg font-bold text-sm transition ${active(h) ? 'bg-[#1B4D3E]/10 text-[#1B4D3E]' : 'text-gray-700 hover:bg-gray-100'}`;

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur border-b border-gray-200/70" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <img src="/logo-sm.jpg" width={44} height={44} alt="الشعار" className="h-11 w-11 rounded-full object-cover border border-gray-200" />
          <span className="leading-tight">
            <span className="block font-bold text-[#1B4D3E] font-serif text-lg">المستودع الرقمي</span>
            <span className="block text-[11px] text-gray-500">كلية اللغة العربية بالمنوفية</span>
          </span>
        </Link>

        <nav aria-label="الرئيسية" className="hidden lg:flex items-center gap-1">
          {LINKS.map(([h, t]) => <Link key={h} href={h} className={lk(h)}>{t}</Link>)}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          {access?.canUpload && <Link href="/deposit" className="px-4 py-2 rounded-lg bg-[#D4AF37]/15 text-[#8a6d1c] font-bold text-sm hover:bg-[#D4AF37]/25">+ إيداع مادة</Link>}
          {user ? (
            <>
              {access && (access.canReview || access.canUpload) && <Link href="/dashboard" className={lk('/dashboard')}>لوحة التحكم</Link>}
              <Link href="/profile" className={lk('/profile')}>حسابي</Link>
              <button onClick={logout} className="px-3 py-2 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50">خروج</button>
            </>
          ) : (
            <Link href="/login" className="px-5 py-2 rounded-lg bg-[#1B4D3E] text-white font-bold text-sm hover:bg-[#153d31]">تسجيل الدخول</Link>
          )}
        </div>

        <div className="flex lg:hidden items-center gap-1">
          <Link href="/search" aria-label="بحث" className="p-3 rounded-lg text-gray-700 hover:bg-gray-100"><Search className="w-5 h-5" /></Link>
          <button aria-label="القائمة" aria-expanded={open} onClick={() => setOpen(!open)} className="p-3 rounded-lg text-gray-700 hover:bg-gray-100">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="القائمة" className="lg:hidden border-t border-gray-200 bg-white shadow-xl px-4 py-3 flex flex-col">
          {LINKS.map(([h, t]) => <Link key={h} href={h} className={`${lk(h)} py-3 text-base`}>{t}</Link>)}
          <Link href="/policies" className="px-3 py-3 font-bold text-gray-700">سياسة الاستخدام</Link>
          {access?.canUpload && <Link href="/deposit" className="px-3 py-3 font-bold text-[#8a6d1c]">+ إيداع مادة</Link>}
          {user ? (
            <>
              {access && (access.canReview || access.canUpload) && <Link href="/dashboard" className="px-3 py-3 font-bold text-[#1B4D3E]">لوحة التحكم</Link>}
              <Link href="/profile" className="px-3 py-3 font-bold text-gray-700">حسابي</Link>
              <button onClick={logout} className="px-3 py-3 font-bold text-red-600 text-right">خروج</button>
            </>
          ) : <Link href="/login" className="mt-2 px-3 py-3 rounded-xl bg-[#1B4D3E] text-white font-bold text-center">تسجيل الدخول</Link>}
        </nav>
      )}
    </header>
  );
}
