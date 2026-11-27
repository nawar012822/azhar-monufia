'use client';

import { useEffect, useRef } from 'react';

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
  useEffect(() => {
    if (!CAPTCHA_SITE_KEY || !ref.current) return;
    let id: string | undefined; let dead = false;
    onToken(null);
    loadScript().then(() => {
      if (dead || !ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, {
        sitekey: CAPTCHA_SITE_KEY, language: 'ar', theme: 'light',
        callback: (t: string) => onToken(t), 'expired-callback': () => onToken(null), 'error-callback': () => onToken(null),
      });
    }).catch(() => onToken(null));
    return () => { dead = true; try { if (id && window.turnstile) window.turnstile.remove(id); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);
  if (!CAPTCHA_SITE_KEY) return null;
  return <div ref={ref} className="flex justify-center my-2" />;
}
