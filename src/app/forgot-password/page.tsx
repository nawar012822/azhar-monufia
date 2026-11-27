'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

function friendly(e: { message: string; status?: number }) {
  const m = (e.message || '').toLowerCase();
  if (e.status === 429 || m.includes('rate limit') || m.includes('seconds')) return 'محاولات كثيرة، انتظر قليلًا ثم حاول مرة أخرى.';
  if (m.includes('same') && m.includes('password')) return 'اختر كلمة مرور مختلفة عن القديمة.';
  if (m.includes('password')) return 'كلمة المرور ضعيفة: استخدم ٨ أحرف على الأقل.';
  return 'تعذّر تنفيذ الطلب الآن، حاول لاحقًا.';
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [cool, setCool] = useState(0);
  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(t); }, [cool]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (cool > 0) return;
    setLoading(true); setErr('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) { setErr(friendly(error)); return; }
    // The same answer is shown whether or not the email exists (no account probing).
    setStep('code'); setCool(60);
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { setErr('كلمة المرور لازم تكون ٨ أحرف على الأقل.'); return; }
    setLoading(true); setErr('');
    const v = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
    if (v.error) { setErr('الكود غير صحيح أو انتهت صلاحيته.'); setLoading(false); return; }
    const u = await supabase.auth.updateUser({ password: pw });
    if (u.error) { setErr(friendly(u.error)); setLoading(false); return; }
    await supabase.auth.signOut();
    notify('تم تغيير كلمة المرور. سجّل الدخول بالكلمة الجديدة.');
    router.push('/login');
  };

  const input = 'w-full bg-gray-50 border border-border p-3 pr-12 rounded-xl focus:ring-2 focus:ring-[#1B4D3E] outline-none transition-all';

  return (
    <main className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md border border-border/50">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 font-serif">نسيت كلمة المرور</h1>
          <p className="text-muted-foreground text-sm">{step === 'email' ? 'اكتب بريدك وهنبعتلك كود تأكيد' : 'اكتب الكود اللي وصلك على بريدك وكلمة المرور الجديدة'}</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={send} className="space-y-5">
            <div className="relative">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="name@example.com" />
            </div>
            {err && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl text-center font-bold">{err}</p>}
            <button type="submit" disabled={loading} className="w-full bg-[#1B4D3E] text-white font-bold py-3.5 rounded-xl hover:bg-[#153d31] flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إرسال الكود'}
            </button>
            <button type="button" onClick={() => { if (email.includes('@')) { setErr(''); setStep('code'); } else setErr('اكتب بريدك أولًا.'); }} className="w-full text-sm text-[#1B4D3E] font-bold">عندي كود بالفعل</button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-5">
            <p className="text-sm text-center text-gray-600">لو البريد <b dir="ltr">{email}</b> مسجّل عندنا، هيوصله كود خلال دقيقة.</p>
            <input required inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} dir="ltr" className="w-full bg-gray-50 border border-border p-4 rounded-xl text-center text-2xl tracking-[0.4em] focus:ring-2 focus:ring-[#1B4D3E] outline-none" placeholder="••••••" />
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input required type="password" minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={input} placeholder="كلمة المرور الجديدة (٨ أحرف على الأقل)" />
            </div>
            {err && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl text-center font-bold">{err}</p>}
            <button type="submit" disabled={loading || code.length < 6} className="w-full bg-[#1B4D3E] text-white font-bold py-3.5 rounded-xl hover:bg-[#153d31] disabled:opacity-50 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تغيير كلمة المرور'}
            </button>
            <button type="button" onClick={() => send()} disabled={cool > 0} className="w-full text-sm text-[#1B4D3E] font-bold disabled:text-gray-400">{cool > 0 ? `إعادة إرسال الكود بعد ${cool} ثانية` : 'إعادة إرسال الكود'}</button>
          </form>
        )}

        <p className="text-center mt-8 text-sm text-muted-foreground font-medium">
          <Link href="/login" className="text-[#1B4D3E] font-bold hover:underline">العودة لتسجيل الدخول</Link>
        </p>
      </div>
    </main>
  );
}
