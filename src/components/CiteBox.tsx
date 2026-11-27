'use client';
import { useState } from 'react';
import { Quote, Copy, Download } from 'lucide-react';
import { apa, bibtex, ris, CiteItem } from '@/lib/citation';
import { notify } from '@/lib/notify';
import { SITE_URL } from '@/lib/constants';

const FORMATS = { apa: 'APA', bibtex: 'BibTeX', ris: 'RIS' } as const;

export default function CiteBox({ item }: { item: CiteItem }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<keyof typeof FORMATS>('apa');
  const url = `${SITE_URL}/item/${item.id}`;
  const text = f === 'apa' ? apa(item, url) : f === 'bibtex' ? bibtex(item, url) : ris(item, url);

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); notify('تم نسخ الاقتباس'); } catch { notify('تعذر النسخ، حدد النص وانسخه يدويًا'); }
  };
  const save = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `azhar-${item.id}.${f === 'bibtex' ? 'bib' : f === 'ris' ? 'ris' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mt-8">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-2 text-[#1B4D3E] font-bold py-3">
        <Quote className="w-4 h-4" /> اقتباس هذه المادة
      </button>
      {open && (
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="flex gap-2 mb-3" role="tablist">
            {(Object.keys(FORMATS) as (keyof typeof FORMATS)[]).map(k => (
              <button key={k} role="tab" aria-selected={f === k} onClick={() => setF(k)} className={`px-4 py-2 rounded-lg text-sm font-bold border ${f === k ? 'bg-[#1B4D3E] text-white border-[#1B4D3E]' : 'bg-white text-gray-700'}`}>{FORMATS[k]}</button>
            ))}
          </div>
          <pre dir="ltr" data-testid="cite-text" className="whitespace-pre-wrap break-words text-sm bg-white border rounded-xl p-3 text-left">{text}</pre>
          <div className="flex gap-2 mt-3">
            <button onClick={copy} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border font-bold text-sm"><Copy className="w-4 h-4" /> نسخ</button>
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border font-bold text-sm"><Download className="w-4 h-4" /> حفظ كملف</button>
          </div>
        </div>
      )}
    </div>
  );
}
