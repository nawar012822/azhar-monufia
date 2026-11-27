'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronUp, ShieldCheck, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Access, ROLE_AR } from '@/lib/repo';

type U = {
  id: string; email: string; full_name: string | null; created_at: string; last_sign_in_at: string | null;
  is_owner: boolean; is_super: boolean; banned: boolean; suspended_until: string | null;
  no_download: boolean; no_upload: boolean; roles: { org_id: number; org: string; path: string; role: string; can_publish: boolean }[];
};

const ROLE_OPTIONS: [string, string, string][] = [
  ['member', 'عضو عادي', 'يعرض ويحمّل فقط'],
  ['uploader', 'رافع مواد', 'يرفع كتب، وتُراجع قبل النشر'],
  ['moderator', 'مراجع', 'يراجع وينشر مواد القسم'],
  ['admin', 'مدير', 'يدير القسم أو الكلية وناسها'],
  ['super', 'مدير عام', 'كل الصلاحيات على كل الجامعة'],
];

function Switch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative w-12 h-7 rounded-full transition shrink-0 ${on ? 'bg-red-600' : 'bg-gray-300'} ${disabled ? 'opacity-50' : ''}`}>
      <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${on ? 'right-0.5' : 'right-[22px]'}`} />
    </button>
  );
}

export default function MembersPanel({ access, orgs }: { access: Access; orgs: any[] }) {
  const [users, setUsers] = useState<U[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [role, setRole] = useState('uploader');
  const [scope, setScope] = useState('');
  const [days, setDays] = useState('0');
  const [email, setEmail] = useState('');
  const PAGE = 30;
  const isSuper = access.isSuper;

  // owner = the platform admin flagged as owner (looked up from the list itself)
  const iAmOwner = users.some(u => u.id === access.userId && u.is_owner);

  const scopes = useMemo(() => {
    const mine = isSuper ? orgs : orgs.filter(o => access.memberships.some(m => m.role === 'admin' && (() => {
      const base = orgs.find(x => x.id === m.org_id)?.path; return base && (o.path === base || o.path.startsWith(base + '/'));
    })()));
    return mine.filter(o => o.kind !== 'university');
  }, [orgs, access, isSuper]);

  useEffect(() => { if (!scope && scopes[0]) setScope(String(scopes[0].id)); }, [scopes]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_users', { p_q: q, p_limit: PAGE, p_offset: page * PAGE });
    if (error) setMsg({ t: 'تعذر تحميل القائمة: ' + error.message, ok: false });
    else { setUsers(data || []); setTotal(data?.[0]?.total ?? 0); }
    setLoading(false);
  }, [q, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const run = async (fn: string, args: any, ok = 'تم الحفظ ✓') => {
    const { error } = await supabase.rpc(fn, args);
    if (error) {
      const m = error.message;
      setMsg({ ok: false, t: m.includes('owner') ? 'صاحب الموقع لا يمكن تغيير صلاحياته.' : m.includes('last administrator') ? 'لازم يفضل مدير واحد على الأقل.' : m.includes('give the person a role') ? 'أعطِ الشخص دور (رافع مواد أو أكثر) الأول.' : 'تعذر الحفظ: ' + m });
    } else setMsg({ ok: true, t: ok });
    await load();
    setTimeout(() => setMsg(null), 5000);
  };

  const addByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.rpc('find_user_by_email', { p_email: email.trim() });
    const u = data?.[0];
    if (!u) return setMsg({ ok: false, t: 'مفيش حساب بالإيميل ده. لازم الشخص يسجّل في الموقع الأول.' });
    setQ(email.trim()); setEmail(''); setOpen(u.id);
  };

  const badge = (u: U) => {
    const b: { t: string; c: string }[] = [];
    if (u.is_owner) b.push({ t: 'صاحب الموقع', c: 'bg-[#1B4D3E] text-white' });
    else if (u.is_super) b.push({ t: 'مدير عام', c: 'bg-red-100 text-red-700' });
    u.roles.forEach(r => b.push({ t: `${ROLE_AR[r.role]} • ${r.org}`, c: r.role === 'admin' ? 'bg-amber-100 text-amber-800' : r.role === 'moderator' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700' }));
    if (!u.is_super && u.roles.length === 0) b.push({ t: 'عضو عادي', c: 'bg-gray-100 text-gray-600' });
    if (u.banned) b.push({ t: 'محظور', c: 'bg-red-600 text-white' });
    else if (u.suspended_until && new Date(u.suspended_until) > new Date()) b.push({ t: 'موقوف حتى ' + new Date(u.suspended_until).toLocaleDateString('ar-EG'), c: 'bg-orange-500 text-white' });
    if (u.no_download) b.push({ t: 'ممنوع من التحميل', c: 'bg-gray-800 text-white' });
    if (u.no_upload) b.push({ t: 'ممنوع من الرفع والنشر', c: 'bg-gray-800 text-white' });
    return b;
  };

  const saveRole = (u: U) => {
    if (role === 'super') return run('set_super_admin', { p_user: u.id, p_on: true });
    if (role === 'member') return run('set_user_role', { p_user: u.id, p_role: 'member', p_org: null });
    return run('set_user_role', { p_user: u.id, p_role: role, p_org: Number(scope) });
  };

  const roleOptions = ROLE_OPTIONS.filter(([k]) => k === 'member' || k === 'uploader' || k === 'moderator' || (k === 'admin' && isSuper) || (k === 'super' && iAmOwner));
  const suspended = (u: U) => !!u.suspended_until && new Date(u.suspended_until) > new Date();

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="ابحث بالإيميل أو الاسم..." className="w-full py-3 pr-12 pl-4 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]" />
      </div>
      <p className="text-sm text-gray-500">{isSuper ? `كل المسجلين في الموقع: ${total.toLocaleString('ar-EG')}` : `الأشخاص في نطاقك: ${total.toLocaleString('ar-EG')}`}. الشخص لازم يسجّل بحساب جديد في الموقع الأول عشان يظهر هنا.</p>

      {!isSuper && (
        <form onSubmit={addByEmail} className="bg-white p-4 rounded-2xl border flex gap-2">
          <input type="email" dir="ltr" required value={email} onChange={e => setEmail(e.target.value)} placeholder="إيميل شخص مسجّل لإضافة صلاحية له" className="flex-1 p-3 border rounded-xl" />
          <button className="bg-[#1B4D3E] text-white px-5 rounded-xl font-bold">بحث</button>
        </form>
      )}

      {msg && <div className={`rounded-xl p-3 font-bold border ${msg.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{msg.t}</div>}

      {loading && users.length === 0 ? <div className="text-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B4D3E] mx-auto"></div></div> : (
        <div className="space-y-3">
          {users.map(u => {
            const isOpen = open === u.id;
            const locked = u.is_owner || (u.is_super && !iAmOwner) || u.id === access.userId && !iAmOwner;
            return (
              <div key={u.id} className={`bg-white rounded-2xl border ${u.banned ? 'border-red-300' : ''}`}>
                <button type="button" onClick={() => { setOpen(isOpen ? null : u.id); setRole('uploader'); setDays('0'); }} className="w-full text-right p-5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#1B4D3E] flex items-center gap-2 flex-wrap">
                      {u.is_owner ? <Crown className="w-4 h-4 text-[#D4AF37]" /> : u.is_super ? <ShieldCheck className="w-4 h-4 text-red-600" /> : null}
                      <span dir="ltr" className="truncate">{u.email}</span>
                    </p>
                    {u.full_name && <p className="text-sm text-gray-500">{u.full_name}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">{badge(u).map((b, i) => <span key={i} className={`text-xs font-bold px-2.5 py-1 rounded-full ${b.c}`}>{b.t}</span>)}</div>
                  </div>
                  <span className="text-gray-400 shrink-0 mt-1">{isOpen ? <ChevronUp /> : <ChevronDown />}</span>
                </button>

                {isOpen && (
                  <div className="border-t px-5 pb-5 pt-4 space-y-5 bg-gray-50/60 rounded-b-2xl">
                    {u.is_owner ? (
                      <p className="text-sm text-gray-600 leading-relaxed">هذا صاحب الموقع. صلاحياته ثابتة ومحدش يقدر يغيّرها أو يمسحها.</p>
                    ) : locked ? (
                      <p className="text-sm text-gray-600">{u.id === access.userId ? 'مينفعش تغيّر صلاحياتك بنفسك.' : 'مدير عام: صاحب الموقع فقط هو اللي يغيّر صلاحياته.'}</p>
                    ) : (
                      <>
                        <div>
                          <p className="font-bold text-gray-800 mb-2">الدور</p>
                          {u.roles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {u.roles.map(r => (
                                <span key={r.org_id} className="inline-flex items-center gap-2 bg-white border rounded-full pl-1 pr-3 py-1 text-sm">
                                  {ROLE_AR[r.role]} • {r.org}
                                  <button type="button" onClick={() => run('remove_user_role', { p_user: u.id, p_org: r.org_id }, 'تم إلغاء الدور ✓')} className="w-6 h-6 rounded-full hover:bg-red-50 text-red-600 font-bold" aria-label="إلغاء">×</button>
                                </span>
                              ))}
                              {u.is_super && iAmOwner && (
                                <span className="inline-flex items-center gap-2 bg-white border rounded-full pl-1 pr-3 py-1 text-sm">مدير عام
                                  <button type="button" onClick={() => run('set_super_admin', { p_user: u.id, p_on: false }, 'تم إلغاء المدير العام ✓')} className="w-6 h-6 rounded-full hover:bg-red-50 text-red-600 font-bold" aria-label="إلغاء">×</button>
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex flex-col md:flex-row gap-2">
                            <select aria-label="الدور" value={role} onChange={e => setRole(e.target.value)} className="p-3 border rounded-xl bg-white flex-1">
                              {roleOptions.map(([k, n, h]) => <option key={k} value={k}>{n} — {h}</option>)}
                            </select>
                            {['uploader', 'moderator', 'admin'].includes(role) && (
                              <select aria-label="النطاق" value={scope} onChange={e => setScope(e.target.value)} className="p-3 border rounded-xl bg-white flex-1">
                                {scopes.map(o => <option key={o.id} value={o.id}>{o.kind === 'faculty' ? 'كل أقسام: ' : '— '.repeat(Math.max(0, o.path.split('/').length - 3)) + 'قسم: '}{o.name_ar}</option>)}
                              </select>
                            )}
                            <button type="button" onClick={() => saveRole(u)} className="bg-[#1B4D3E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#153d31]">حفظ الدور</button>
                          </div>
                          {role === 'member' && <p className="text-xs text-gray-500 mt-2">هيشيل كل أدواره ويفضل يعرض ويحمّل بس.</p>}
                        </div>

                        {isSuper && (
                          <div className="space-y-4">
                            {u.roles.length > 0 && (
                              <Row t="نشر مباشر بدون مراجعة" h="مواده تنزل على الموقع على طول. إنت بس اللي تسمح بده.">
                                <Switch on={u.roles.some(r => r.can_publish)} onChange={v => run('set_direct_publish', { p_user: u.id, p_on: v })} />
                              </Row>
                            )}
                            <Row t="منع الرفع والنشر" h="مايقدرش يرفع ولا ينشر ولا يوافق على مواد.">
                              <Switch on={u.no_upload} onChange={v => run('set_user_flags', { p_user: u.id, p_patch: { no_upload: v } })} />
                            </Row>
                            <Row t="منع التحميل" h="مايقدرش يفتح ملفات ولا يحمّلها.">
                              <Switch on={u.no_download} onChange={v => run('set_user_flags', { p_user: u.id, p_patch: { no_download: v } })} />
                            </Row>
                            <Row t="إيقاف مؤقت" h="مايقدرش يدخل الموقع لحد ما المدة تخلص.">
                              <div className="flex gap-2 items-center">
                                <select aria-label="مدة الإيقاف" value={suspended(u) ? 'keep' : days} onChange={e => setDays(e.target.value)} className="p-2 border rounded-lg bg-white text-sm">
                                  {suspended(u) && <option value="keep">موقوف حتى {new Date(u.suspended_until!).toLocaleDateString('ar-EG')}</option>}
                                  <option value="0">غير موقوف</option><option value="1">يوم</option><option value="7">٧ أيام</option><option value="30">٣٠ يوم</option>
                                </select>
                                <button type="button" onClick={() => run('set_user_flags', { p_user: u.id, p_patch: { suspend_days: days === 'keep' ? 0 : Number(days) } })} className="px-3 py-2 rounded-lg border text-sm font-bold hover:bg-white">تطبيق</button>
                              </div>
                            </Row>
                            <Row t="حظر من الموقع" h="مايقدرش يسجّل دخول نهائيًا. تقدر ترجعه في أي وقت.">
                              <Switch on={u.banned} onChange={v => { if (!v || confirm('تحظر هذا الحساب من الموقع؟')) run('set_user_flags', { p_user: u.id, p_patch: { banned: v } }, v ? 'تم الحظر ✓' : 'تم فك الحظر ✓'); }} />
                            </Row>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {users.length === 0 && <p className="text-center text-gray-500 py-10 bg-white rounded-2xl border">لا يوجد أحد.</p>}
        </div>
      )}

      {total > PAGE && (
        <div className="flex justify-between items-center pt-2">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-4 py-2 rounded-lg border bg-white disabled:opacity-40">السابق</button>
          <span className="text-sm text-gray-500">صفحة {(page + 1).toLocaleString('ar-EG')} من {Math.ceil(total / PAGE).toLocaleString('ar-EG')}</span>
          <button disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)} className="px-4 py-2 rounded-lg border bg-white disabled:opacity-40">التالي</button>
        </div>
      )}
    </div>
  );
}

function Row({ t, h, children }: { t: string; h: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div><p className="font-bold text-gray-800">{t}</p><p className="text-xs text-gray-500">{h}</p></div>
      {children}
    </div>
  );
}
