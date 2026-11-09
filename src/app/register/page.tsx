'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react'; // ضفنا أيقونات العين

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false); // متغير إظهار الباسورد

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName }
      }
    });

    if (error) {
      alert('حدث خطأ: ' + error.message);
    } else {
      alert('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.');
      router.push('/login');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1B4D3E] mb-2 font-serif">إنشاء حساب جديد</h1>
          <p className="text-gray-500 text-sm">انضم إلى المستودع الرقمي لكلية اللغة العربية</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">الاسم الكامل</label>
            <input required type="text" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1B4D3E] outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">البريد الإلكتروني</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#1B4D3E] outline-none" />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">كلمة المرور</label>
            <div className="relative">
              <input 
                required 
                type={showPassword ? "text" : "password"} // هنا بنغير النوع
                value={form.password} 
                onChange={(e) => setForm({...form, password: e.target.value})} 
                className="w-full border p-3 pl-10 rounded-lg focus:ring-2 focus:ring-[#1B4D3E] outline-none" 
              />
              {/* زرار العين */}
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B4D3E] transition"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#1B4D3E] text-white font-bold py-3 rounded-lg hover:bg-[#153d31] transition">
            {loading ? 'جاري التسجيل...' : 'تسجيل حساب'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          لديك حساب بالفعل؟ <Link href="/login" className="text-[#D4AF37] font-bold hover:underline">تسجيل الدخول</Link>
        </p>
      </div>
    </main>
  );
}