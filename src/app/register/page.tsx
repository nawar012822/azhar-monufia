'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } }
    });

    if (error) {
      setErrorMsg('حدث خطأ: ' + error.message);
      setLoading(false);
    } else {
      alert('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.');
      router.push('/login');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1B4D3E]/5 via-background to-background"></div>
      
      <div className="bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md border border-border/50 relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#1B4D3E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <img src="/logo.jpg" alt="Logo" className="w-14 h-14 rounded-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2 font-serif">حساب جديد</h1>
          <p className="text-muted-foreground text-sm">انضم إلى المستودع الرقمي للكلية</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-foreground">الاسم الكامل</label>
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input required type="text" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} className="w-full bg-gray-50 border border-border p-3 pr-12 rounded-xl focus:ring-2 focus:ring-[#1B4D3E] outline-none transition-all" placeholder="أحمد محمود..." />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-foreground">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full bg-gray-50 border border-border p-3 pr-12 rounded-xl focus:ring-2 focus:ring-[#1B4D3E] outline-none transition-all" placeholder="name@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-foreground">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input required type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full bg-gray-50 border border-border p-3 pr-12 pl-12 rounded-xl focus:ring-2 focus:ring-[#1B4D3E] outline-none transition-all" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#1B4D3E]">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {errorMsg && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl text-center font-bold">{errorMsg}</p>}

          <button type="submit" disabled={loading} className="w-full bg-[#1B4D3E] text-white font-bold py-3.5 rounded-xl hover:bg-[#153d31] transition-all shadow-lg flex justify-center items-center gap-2 mt-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تسجيل حساب'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-muted-foreground font-medium">
          لديك حساب بالفعل؟ <Link href="/login" className="text-[#1B4D3E] font-bold hover:underline">تسجيل الدخول</Link>
        </p>
      </div>
    </main>
  );
}