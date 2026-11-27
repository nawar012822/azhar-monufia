'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bookmark, Clock, Heart, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { clearRecent, getReading, getRecent, toggleReading, Mini } from '@/lib/local-library';

function List({ items, onRemove }: { items: Mini[]; onRemove?: (m: Mini) => void }) {
  return (
    <ul className="space-y-3">
      {items.map(m => (
        <li key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <Link href={`/item/${m.id}`} className="min-w-0">
            <p className="font-bold text-[#1B4D3E] font-serif truncate">{m.title}</p>
            {m.author && <p className="text-sm text-gray-500 truncate">{m.author}</p>}
          </Link>
          {onRemove && <button aria-label="إزالة" onClick={() => onRemove(m)} className="p-3 text-gray-400 hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>}
        </li>
      ))}
    </ul>
  );
}

export default function MyLibraryPage() {
  const [reading, setReading] = useState<Mini[]>([]);
  const [recent, setRecent] = useState<Mini[]>([]);
  const [favs, setFavs] = useState<Mini[] | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setReading(getReading()); setRecent(getRecent());
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (!user) return;
      const { data } = await supabase.from('favorites').select('item_id, items(id,title,author)').eq('user_id', user.id);
      setFavs((data || []).map((r: any) => { const i = Array.isArray(r.items) ? r.items[0] : r.items; return i ? { id: i.id, title: i.title, author: i.author, at: 0 } : null; }).filter(Boolean) as Mini[]);
    });
  }, []);

  const Empty = ({ t }: { t: string }) => <p className="text-gray-500 bg-white border rounded-xl p-6 text-center">{t}</p>;

  return (
    <main className="flex-1 bg-[#F8F6F0] py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-[#1B4D3E] font-serif">مكتبتي</h1>
          <Link href="/" className="flex items-center gap-2 text-gray-600 bg-white px-4 py-2 rounded-lg border"><ArrowRight className="w-4 h-4" /> الرئيسية</Link>
        </div>

        <section>
          <h2 className="flex items-center gap-2 text-xl font-bold mb-3"><Bookmark className="w-5 h-5 text-amber-600" /> قائمة القراءة</h2>
          <p className="text-xs text-gray-500 mb-3">محفوظة على هذا الجهاز فقط.</p>
          {reading.length ? <List items={reading} onRemove={m => { toggleReading(m); setReading(getReading()); }} /> : <Empty t="لم تضف شيئًا بعد. اضغط «للقراءة لاحقًا» في أي مادة." />}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Clock className="w-5 h-5 text-gray-500" /> شاهدتها مؤخرًا</h2>
            {recent.length > 0 && <button onClick={() => { clearRecent(); setRecent([]); }} className="text-sm text-gray-500 underline p-2">مسح السجل</button>}
          </div>
          {recent.length ? <List items={recent} /> : <Empty t="لا يوجد سجل بعد." />}
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-xl font-bold mb-3"><Heart className="w-5 h-5 text-red-500" /> المفضلة</h2>
          {!user ? <Empty t="سجّل الدخول لتظهر مفضلتك هنا." /> : favs && favs.length ? <List items={favs} /> : <Empty t="لا توجد مواد في المفضلة." />}
        </section>
      </div>
    </main>
  );
}
