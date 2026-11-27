import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="bg-[#0C422E] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 md:grid-cols-3 text-sm">
        <div className="md:col-span-1">
          <h3 className="text-xl font-bold font-serif mb-2">المستودع الرقمي</h3>
          <p className="text-gray-300 leading-relaxed">جامعة الأزهر - كلية اللغة العربية بالمنوفية. حفظ الإنتاج العلمي وإتاحته للطلاب والباحثين.</p>
        </div>
        <nav aria-label="روابط" className="grid grid-cols-2 gap-x-6 gap-y-1 content-start">
          {[['/', 'الرئيسية'], ['/search', 'البحث المتقدم'], ['/my-library', 'مكتبتي'], ['/about', 'عن المستودع'], ['/policies', 'سياسة الاستخدام'], ['/contact', 'اتصل بنا']].map(([h, t]) => (
            <Link key={h} href={h} className="py-2 text-gray-200 hover:text-[#D4AF37] transition">{t}</Link>
          ))}
        </nav>
        <div className="text-gray-300">
          <p className="mb-2">نموذج غير رسمي قيد التطوير. بعض المواد المعروضة تجريبية.</p>
          <p className="text-[#D4AF37] font-bold">© 2026 أحمد محمود نوار</p>
          <p className="text-xs text-gray-400 mt-1">طالب بكلية اللغة العربية بالمنوفية، جامعة الأزهر - شعبة المكتبات.</p>
        </div>
      </div>
    </footer>
  );
}
