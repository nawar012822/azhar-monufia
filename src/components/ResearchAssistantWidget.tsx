'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { X, ArrowUp, Sparkles, Copy, Check, RotateCcw } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const WELCOME: Msg = {
  role: 'assistant',
  content: 'أهلًا بك في المستودع الرقمي لكلية اللغة العربية بالمنوفية. أستطيع أن أشرح لك مصطلحًا، أو ألخّص فكرة، أو أرشدك إلى طريقة البحث.',
};
const SUGGESTIONS = ['اشرح لي الفرق بين الحال والتمييز', 'كيف أبحث عن كتب في البلاغة؟', 'لخّص لي مفهوم فقه اللغة', 'كيف أوثّق مرجعًا في بحثي؟'];
const KEY = 'azhar-assistant-v1';

// Very small, safe formatter: **bold**, "- " bullets and line breaks. No HTML is ever injected.
function Rich({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const bullet = /^\s*[-*•]\s+/.test(line);
        const body = bullet ? line.replace(/^\s*[-*•]\s+/, '') : line;
        const parts = body.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <strong key={j}>{p.slice(2, -2)}</strong> : <Fragment key={j}>{p}</Fragment>
        );
        return bullet ? (
          <div key={i} className="flex gap-2 my-0.5"><span className="text-[#D4AF37]">•</span><span>{parts}</span></div>
        ) : (
          <div key={i} className={line.trim() ? 'my-0.5' : 'h-2'}>{parts}</div>
        );
      })}
    </>
  );
}

export default function ResearchAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { const s = sessionStorage.getItem(KEY); if (s) { const m = JSON.parse(s); if (Array.isArray(m) && m.length) setMessages(m); } } catch {}
  }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-30))); } catch {} }, [messages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading, open]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    setTimeout(() => taRef.current?.focus(), 150);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: t }];
    setMessages(next);
    setLoading(true);
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.filter(m => m !== WELCOME) }) });
      const d = await r.json().catch(() => ({}));
      setMessages([...next, { role: 'assistant', content: d.reply || 'عذرًا، حدث خطأ. حاول مرة أخرى.' }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'تعذّر الاتصال الآن. تأكد من الإنترنت وحاول مرة أخرى.' }]);
    } finally { setLoading(false); }
  };

  const copy = async (i: number, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(null), 1500); } catch {}
  };
  const reset = () => { setMessages([WELCOME]); setInput(''); };
  const onlyWelcome = messages.length === 1;

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="افتح المساعد الذكي"
          className="fixed bottom-5 left-5 z-50 h-14 pl-5 pr-4 rounded-full bg-gradient-to-br from-[#1B4D3E] to-[#0f3328] text-white shadow-xl shadow-[#1B4D3E]/30 hover:scale-105 active:scale-95 transition flex items-center gap-2 border border-[#D4AF37]/40">
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          <span className="text-sm font-bold hidden sm:inline">اسأل المساعد</span>
        </button>
      )}

      {open && (
        <div role="dialog" aria-label="المساعد الذكي" dir="rtl"
          className="fixed z-50 inset-0 sm:inset-auto sm:bottom-5 sm:left-5 sm:w-[400px] sm:h-[600px] sm:max-h-[calc(100vh-40px)] bg-white sm:rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="relative bg-gradient-to-br from-[#1B4D3E] to-[#0f3328] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-[#D4AF37]/50 flex items-center justify-center"><Sparkles className="w-5 h-5 text-[#D4AF37]" /></div>
              <div>
                <h3 className="font-bold leading-tight">المساعد الذكي</h3>
                <p className="text-[11px] text-white/70">يساعدك في البحث والشرح والتلخيص</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={reset} aria-label="محادثة جديدة" title="محادثة جديدة" className="p-2 rounded-full hover:bg-white/10"><RotateCcw className="w-4 h-4" /></button>
              <button onClick={() => setOpen(false)} aria-label="إغلاق" className="p-2 rounded-full hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#faf8f3] space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-start'} ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`group relative max-w-[88%] px-4 py-3 text-[15px] leading-7 rounded-2xl ${m.role === 'user' ? 'bg-[#1B4D3E] text-white rounded-tl-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tr-sm shadow-sm'}`}>
                  <Rich text={m.content} />
                  {m.role === 'assistant' && i > 0 && (
                    <button onClick={() => copy(i, m.content)} aria-label="نسخ" className="absolute -bottom-3 left-2 bg-white border border-gray-200 rounded-full p-1.5 text-gray-500 hover:text-[#1B4D3E] shadow-sm">
                      {copied === i ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {onlyWelcome && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} className="text-sm bg-white border border-[#1B4D3E]/20 text-[#1B4D3E] px-3 py-2 rounded-full hover:bg-[#1B4D3E] hover:text-white transition">{s}</button>
                ))}
              </div>
            )}
            {loading && (
              <div className="flex"><div className="bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm flex items-center gap-1.5" aria-label="جارٍ الكتابة">
                {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-[#1B4D3E]/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div></div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={e => { e.preventDefault(); send(input); }} className="p-3 bg-white border-t border-gray-100 flex items-end gap-2">
            <textarea ref={taRef} rows={1} value={input} maxLength={1500}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
              placeholder="اكتب سؤالك هنا..."
              className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#1B4D3E] max-h-[120px]" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="إرسال" className="h-11 w-11 shrink-0 rounded-full bg-[#1B4D3E] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#153d31] transition">
              <ArrowUp className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
