'use client';

import { notify } from '@/lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { COLLECTIONS, ROOT_PATH } from '@/lib/constants';
import { loadAccess, Access, treeSort, ITEM_SELECT, flat, ROLE_AR, STATUS_AR, ACCESS_AR, slugify } from '@/lib/repo';
import MembersPanel from '@/components/MembersPanel';
import { ShieldAlert, Search, Trash2, CheckCircle, XCircle, Eye, Download } from 'lucide-react';

type Tab = 'review' | 'materials' | 'members' | 'structure' | 'stats';
const KIND_AR: Record<string, string> = { university: 'جامعة', faculty: 'كلية', department: 'قسم' };

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<Access | null>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('review');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  // add-org form
  const [oParent, setOParent] = useState('');
  const [oName, setOName] = useState('');
  const [oSlug, setOSlug] = useState('');

  const canAdmin = !!access && (access.isSuper || access.best >= 3);

  // orgs the current user administers (a role covers everything below it)
  const adminOrgs = useMemo(() => {
    if (!access) return [];
    if (access.isSuper) return orgs;
    const mine = access.memberships.filter(m => m.role === 'admin').map(m => orgs.find(o => o.id === m.org_id)?.path).filter(Boolean) as string[];
    return orgs.filter(o => mine.some(p => o.path === p || o.path.startsWith(p + '/')));
  }, [access, orgs]);

  const [stats, setStats] = useState<any>(null);
  const load = async () => {
    const a = await loadAccess(supabase);
    if (!a.userId) { router.push('/login'); return; }
    setAccess(a);
    if (a.canReview || a.best >= 3) {
      const { data: o } = await supabase.from('orgs').select('id,parent_id,kind,name_ar,path,sort').or(`path.eq.${ROOT_PATH},path.like.${ROOT_PATH}/%`);
      setOrgs(treeSort(o || []));
      const all: any[] = [];
      for (let from = 0; from < 20000; from += 500) {
        const { data: it } = await supabase.from('items').select(ITEM_SELECT).order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, from + 499);
        all.push(...(it || []));
        if (!it || it.length < 500) break;
      }
      setItems(all.map(flat));
      const { data: st } = await supabase.rpc('dashboard_stats');
      if (st) setStats(st as any);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 6000); };
  const orgName = (id: number) => orgs.find(o => o.id === id)?.name_ar || '';

  const setStatus = async (id: number, status: string) => {
    const { error } = await supabase.from('items').update({ status }).eq('id', id);
    if (error) return notify('خطأ: ' + error.message);
    setItems(items.map(i => i.id === id ? { ...i, status } : i));
  };
  const setAccessLevel = async (id: number, a: string) => {
    const { error } = await supabase.from('items').update({ access: a }).eq('id', id);
    if (error) return notify('خطأ: ' + error.message);
    setItems(items.map(i => i.id === id ? { ...i, access: a } : i));
  };
  const del = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه المادة نهائياً؟')) return;
    const { error, count } = await supabase.from('items').delete({ count: 'exact' }).eq('id', id);
    if (error) return notify('خطأ: ' + error.message);
    if (!count) return notify('الحذف للمدير فقط.');
    setItems(items.filter(i => i.id !== id));
  };

  const addOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oParent || !oName.trim()) return;
    const slug = slugify(oSlug) || `d-${Date.now().toString(36)}`;
    const parent = orgs.find(o => o.id === Number(oParent));
    const { data, error } = await supabase.from('orgs').insert({ parent_id: Number(oParent), slug, name_ar: oName.trim(), kind: 'department' }).select('id').single();
    if (error) return notify('خطأ: ' + error.message);
    if (parent?.kind === 'university') {
      // a new faculty starts with the standard collections
      await supabase.from('collections').insert(COLLECTIONS.map((c, i) => ({ org_id: data.id, slug: c.slug, name_ar: c.name, icon: c.icon, sort: i + 1 })));
    }
    setOName(''); setOSlug(''); flash('تمت الإضافة.'); load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B4D3E]"></div></div>;
  if (!access || !(access.canReview || canAdmin)) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md border">
        <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-4">غير مصرح لك بالدخول</h1>
        <Link href="/" className="bg-[#1B4D3E] text-white px-8 py-3 rounded-xl font-bold">العودة للرئيسية</Link>
      </div>
    </div>
  );

  const shown = items.filter(i => (i.title || '').includes(q) || (i.author || '').includes(q));
  const pending = shown.filter(i => i.status === 'pending');
  const total = stats?.total ?? items.length, published = stats?.approved ?? items.filter(i => i.status === 'approved').length;
  const pendingCount = stats?.pending ?? items.filter(i => i.status === 'pending').length;
  const views = stats?.views ?? items.reduce((s, i) => s + (i.views || 0), 0), downloads = stats?.downloads ?? items.reduce((s, i) => s + (i.downloads || 0), 0);
  const byColl: Record<string, number> = stats?.by_collection ?? (() => { const m: Record<string, number> = {}; items.forEach(i => { m[i.collection] = (m[i.collection] || 0) + 1; }); return m; })();
  const top: any[] = stats?.top ?? [...items].sort((a, b) => b.views - a.views).slice(0, 5);
  const tabs: [Tab, string][] = [['review', `صندوق المراجعة${pending.length ? ` (${pending.length})` : ''}`], ['materials', 'كل المواد']];
  if (canAdmin) tabs.push(['members', 'الأعضاء'], ['structure', 'الكليات والأقسام'], ['stats', 'الإحصائيات']);
  const label = access.isSuper ? 'المدير العام' : access.best >= 3 ? 'مدير' : 'مراجع';

  return (
    <main className="flex-1 bg-[#F8F6F0] pb-20" dir="rtl">
      <div className="bg-gradient-to-l from-[#0C422E] to-[#1B4D3E] text-white py-8 md:py-12 px-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">لوحة التحكم</h1>
            <p className="text-[#D4AF37] text-lg">{label}</p>
          </div>
          <Link href="/" className="bg-white/10 hover:bg-white/20 px-5 py-2 rounded-xl text-sm font-bold">الرئيسية</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {([['بانتظار المراجعة', pendingCount, 'text-amber-600'], ['منشورة', published, 'text-emerald-700'], ['كل المواد', total, 'text-[#1B4D3E]'], ['المشاهدات', views, 'text-sky-700']] as [string, number, string][]).map(([l, n, c]) => (
            <div key={l} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 text-center fade-up">
              <span className={`block text-2xl md:text-3xl font-bold font-serif ${c}`}>{n.toLocaleString('ar-EG')}</span>
              <span className="text-xs md:text-sm text-gray-500 font-bold">{l}</span>
            </div>
          ))}
        </div>
        <div className="bg-white/95 backdrop-blur p-2 rounded-2xl shadow-md border flex gap-2 mb-6 overflow-x-auto sticky top-[72px] z-30">
          {tabs.map(([k, t]) => (
            <button key={k} onClick={() => { setTab(k); setQ(''); }} className={`flex-1 min-w-[110px] py-3 rounded-xl font-bold text-sm transition ${tab === k ? 'bg-[#F8F6F0] shadow-inner text-[#1B4D3E]' : 'text-gray-500 hover:bg-gray-50'}`}>{t}</button>
          ))}
        </div>
        {msg && <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 mb-4 font-bold">{msg}</div>}

        {(tab === 'review' || tab === 'materials') && (
          <div className="relative mb-6">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالعنوان أو المؤلف..." className="w-full py-3 pr-12 pl-4 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
          </div>
        )}

        {tab === 'review' && (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-dashed text-gray-500 flex flex-col items-center"><CheckCircle className="w-16 h-16 text-green-400 mb-4" /><p className="text-lg font-bold">لا توجد إيداعات تنتظر المراجعة</p></div>
            ) : pending.map(i => (
              <div key={i.id} className="bg-white p-6 rounded-2xl border-2 border-orange-200">
                <h3 className="text-xl font-bold text-[#1B4D3E] mb-1">{i.title}</h3>
                <p className="text-sm text-gray-500 mb-1">{i.author} • {i.collection}</p>
                <p className="text-xs text-gray-400 mb-3">القسم: {i.department}</p>
                <p className="text-gray-700 text-sm mb-4 line-clamp-2">{i.abstract}</p>
                <div className="flex gap-3">
                  <button onClick={() => setStatus(i.id, 'approved')} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700"><CheckCircle className="w-4 h-4" /> نشر</button>
                  <button onClick={() => setStatus(i.id, 'rejected')} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700"><XCircle className="w-4 h-4" /> رفض</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'materials' && (
          <div className="space-y-4">
            {shown.map(i => (
              <div key={i.id} className="bg-white p-6 rounded-2xl border">
                <Link href={`/item/${i.id}`} className="text-xl font-bold text-[#1B4D3E] hover:underline">{i.title}</Link>
                <p className="text-sm text-gray-500 mb-4">{i.author} • {i.department} • {i.collection}</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">حالة النشر</label>
                    <select aria-label="الحالة" value={i.status} onChange={e => setStatus(i.id, e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 text-sm">
                      {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">مستوى الوصول</label>
                    <select aria-label="الإتاحة" value={i.access} onChange={e => setAccessLevel(i.id, e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50 text-sm">
                      {Object.entries(ACCESS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                {canAdmin && <div className="flex justify-end pt-3 border-t"><button onClick={() => del(i.id)} className="flex items-center gap-1 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-bold"><Trash2 className="w-4 h-4" /> حذف</button></div>}
              </div>
            ))}
            {shown.length === 0 && <p className="text-center text-gray-500 py-10 bg-white rounded-2xl border">لا توجد مواد.</p>}
          </div>
        )}

        {tab === 'members' && canAdmin && <MembersPanel access={access} orgs={orgs} />}

        {tab === 'structure' && canAdmin && (
          <div className="space-y-6">
            <form onSubmit={addOrg} className="bg-white p-6 rounded-2xl border space-y-4">
              <h3 className="text-lg font-bold text-[#1B4D3E]">إضافة قسم فرعي أو كلية</h3>
              <select aria-label="الجهة الأعلى" required value={oParent} onChange={e => setOParent(e.target.value)} className="w-full p-3 border rounded-xl">
                <option value="">تابع لـ...</option>
                {adminOrgs.map(o => <option key={o.id} value={o.id}>{'— '.repeat(Math.max(0, o.path.split('/').length - 1))}{o.name_ar} ({KIND_AR[o.kind]})</option>)}
              </select>
              <div className="grid md:grid-cols-2 gap-3">
                <input required value={oName} onChange={e => setOName(e.target.value)} placeholder="الاسم بالعربي" className="p-3 border rounded-xl" />
                <input dir="ltr" value={oSlug} onChange={e => setOSlug(e.target.value)} placeholder="رابط بالإنجليزي (اختياري) مثل: tafsir" className="p-3 border rounded-xl" />
              </div>
              <button className="bg-[#1B4D3E] text-white px-6 py-3 rounded-xl font-bold">إضافة</button>
            </form>
            <div className="bg-white p-6 rounded-2xl border space-y-2">
              {orgs.map(o => (
                <div key={o.id} style={{ paddingRight: `${(o.path.split('/').length - 1) * 20}px` }} className="flex gap-2 items-center">
                  <span className="text-xs bg-gray-100 rounded px-2 py-0.5">{KIND_AR[o.kind]}</span>
                  <Link href={`/browse/${o.path}`} className="font-bold text-[#1B4D3E] hover:underline">{o.name_ar}</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'stats' && canAdmin && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[['كل المواد', total], ['منشورة', published], ['قيد المراجعة', pendingCount]].map(([t, n]) => (
                <div key={t as string} className="bg-white p-6 rounded-2xl border text-center"><span className="text-4xl font-bold text-[#1B4D3E]">{n}</span><p className="text-gray-500 font-bold mt-2">{t}</p></div>
              ))}
              <div className="bg-white p-6 rounded-2xl border text-center"><div className="flex justify-center items-center gap-2 text-2xl font-bold text-gray-700"><Eye className="w-6 h-6 text-gray-400" /> {views}</div><p className="text-gray-500 font-bold mt-2">المشاهدات</p></div>
              <div className="bg-white p-6 rounded-2xl border text-center"><div className="flex justify-center items-center gap-2 text-2xl font-bold text-gray-700"><Download className="w-6 h-6 text-gray-400" /> {downloads}</div><p className="text-gray-500 font-bold mt-2">التحميلات</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="text-xl font-bold text-[#1B4D3E] mb-4">حسب النوع</h3>
              {Object.entries(byColl).map(([name, n]) => (
                <div key={name} className="flex items-center gap-4 mb-3"><span className="w-44 text-sm font-bold text-gray-700">{name}</span><div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#b59555]" style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div><span className="w-8 text-sm font-bold text-gray-500">{n}</span></div>
              ))}
            </div>
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="text-xl font-bold text-[#1B4D3E] mb-4">الأكثر مشاهدة</h3>
              {top.map((i, k) => <div key={i.id} className="flex justify-between p-2 text-sm font-bold text-gray-700"><span>{k + 1}. {i.title}</span><span>{i.views}</span></div>)}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
