'use client';
import { useEffect, useState } from 'react';

export default function Toaster() {
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const id = ++n;
      const text = String((e as CustomEvent).detail || '');
      setItems(l => [...l.slice(-3), { id, text }]);
      setTimeout(() => setItems(l => l.filter(x => x.id !== id)), 6000);
    };
    window.addEventListener('azhar-notify', on);
    return () => window.removeEventListener('azhar-notify', on);
  }, []);
  return (
    <div dir="rtl" role="status" aria-live="polite" className="fixed top-4 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {items.map(i => (
        <div key={i.id} className="pointer-events-auto max-w-md w-full bg-[#1B4D3E] text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold text-center">
          {i.text}
        </div>
      ))}
    </div>
  );
}
