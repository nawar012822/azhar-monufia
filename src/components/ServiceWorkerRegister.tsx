'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const go = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }, []);
  return null;
}
