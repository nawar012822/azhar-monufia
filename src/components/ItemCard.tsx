import Link from 'next/link';
import { Eye, FileText } from 'lucide-react';

const ACCESS: Record<string, [string, string]> = {
  open: ['متاح للجميع', 'bg-emerald-50 text-emerald-700'],
  restricted: ['للمسجلين', 'bg-amber-50 text-amber-700'],
  metadata: ['بيانات فقط', 'bg-gray-100 text-gray-600'],
};

export default function ItemCard({ item, showAuthorPrefix = false }: { item: any; showAuthorPrefix?: boolean }) {
  const [accessLabel, accessCls] = ACCESS[item.access] || ACCESS.open;
  const lang = item.language && item.language !== 'العربية' ? item.language : null;
  return (
    <Link href={`/item/${item.id}`} className="group relative flex flex-col bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-[#1B4D3E]/30 transition duration-200">
      <span aria-hidden className="absolute top-0 right-6 left-6 h-1 rounded-b-full bg-gradient-to-l from-[#D4AF37] to-[#1B4D3E] opacity-0 group-hover:opacity-100 transition" />
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
        <span className="text-base leading-none">{item.collection_icon}</span>
        <span className="font-bold text-[#1B4D3E]">{item.collection}</span>
        {item.department && <span className="text-gray-400">• {item.department}</span>}
      </div>
      <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#1B4D3E] leading-snug font-serif line-clamp-2 mb-1.5">{item.title}</h3>
      {item.author && <p className="text-sm text-gray-600 line-clamp-1 mb-2">{showAuthorPrefix ? 'د. ' : ''}{item.author}</p>}
      {item.abstract && <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">{item.abstract}</p>}
      <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap text-xs">
        <span className={`px-2.5 py-1 rounded-full font-bold ${accessCls}`}>{accessLabel}</span>
        {lang && <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 font-bold">{lang}</span>}
        {item.pages ? <span className="flex items-center gap-1 text-gray-400"><FileText className="w-3.5 h-3.5" />{Number(item.pages).toLocaleString('ar-EG')} ص</span> : null}
        <span className="flex items-center gap-1 text-gray-400 mr-auto"><Eye className="w-3.5 h-3.5" />{(item.views || 0).toLocaleString('ar-EG')}</span>
      </div>
    </Link>
  );
}
