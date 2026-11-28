'use client';

import { useEffect, useRef, useState } from 'react';

declare global { interface Window { turnstile?: any; __tsLoading?: Promise<void>; } }

export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (window.__tsLoading) return window.__tsLoading;
  window.__tsLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('captcha script'));
    document.head.appendChild(s);
  });
  return window.__tsLoading;
}

/** Cloudflare Turnstile widget. Renders nothing when no site key is configured. `resetKey` remounts it for a fresh token. */
export default function Captcha({ onToken, resetKey = 0 }: { onToken: (t: string | null) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [errCode, setErrCode] = useState<string | null>(null);
  useEffect(() => {
    if (!CAPTCHA_SITE_KEY || !ref.current) return;
    let id: string | undefined; let dead = false;
    onToken(null); setErrCode(null);
    loadScript().then(() => {
      if (dead || !ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, {
        sitekey: CAPTCHA_SITE_KEY, language: 'ar', theme: 'light',
        // Cloudflare retries failed checks by itself and renews an expired token; the error code is shown to the visitor.
        retry: 'auto', 'retry-interval': 4000, 'refresh-expired': 'auto', 'refresh-timeout': 'auto',
        callback: (t: string) => { setErrCode(null); onToken(t); },
        'expired-callback': () => onToken(null),
        'timeout-callback': () => onToken(null),
        'unsupported-callback': () => { setErrCode('unsupported'); onToken(null); },
        'error-callback': (code?: string | number) => { setErrCode(String(code ?? 'unknown')); onToken(null); return true; },
      });
    }).catch(() => { setErrCode('script'); onToken(null); });
    return () => { dead = true; try { if (id && window.turnstile) window.turnstile.remove(id); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);
  if (!CAPTCHA_SITE_KEY) return null;
  return (
    <div className="my-2">
      <div ref={ref} className="flex justify-center" />
      {errCode && (
        <p className="text-xs text-center text-red-600 mt-2 leading-relaxed" dir="rtl">
          {errCode === 'script' ? 'تعذّر تحميل اختبار التحقق. تأكد من الاتصال أو أوقف مانع الإعلانات أو الـ VPN وحدّث الصفحة.' : 'فشل اختبار التحقق، وبنعيد المحاولة تلقائيًا.'}
          {' '}كود الخطأ: <span dir="ltr">{errCode}</span>
        </p>
      )}
    </div>
  );
}
