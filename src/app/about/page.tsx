import Link from 'next/link';

const STAGES = [
  { num: '١', title: 'دراسة المتطلبات وتصميم شكل المستودع', status: 'جارٍ', color: 'bg-[#1B4D3E] text-white' },
  { num: '٢', title: 'نموذج تجريبي مجاني يعمل على الإنترنت', status: 'قادم', color: 'bg-[#1B4D3E] text-white' },
  { num: '٣', title: 'قاعدة بيانات المواد العلمية', status: 'قادم', color: 'bg-[#1B4D3E] text-white' },
  { num: '٤', title: 'نظام البحث والفهرسة', status: 'قادم', color: 'bg-[#1B4D3E] text-white' },
  { num: '٥', title: 'لوحة تحكم إدارة المحتوى والصلاحيات', status: 'قادم', color: 'bg-[#1B4D3E] text-white' },
  { num: '٦', title: 'التجربة وإصلاح الأخطاء', status: 'قادم', color: 'bg-[#1B4D3E] text-white' },
  { num: '٧', title: 'العرض على إدارة الكلية', status: 'قادم', color: 'bg-[#1B4D3E] text-white' },
  { num: '٨', title: 'التحول إلى مستودع رسمي (DSpace) أو الأنسب', status: 'قادم', color: 'bg-[#1B4D3E] text-white' },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F8F6F0] py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#1B4D3E] text-white p-8 rounded-2xl mb-8">
          <h1 className="text-3xl font-bold font-serif mb-2">عن المستودع</h1>
          <p className="text-sm text-gray-300">مشروع تجريبي غير رسمي، في انتظار اعتماد إدارة الكلية.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-gray-700 leading-loose text-lg mb-8">
          <p className="mb-4">
            المستودع الرقمي منصة لحفظ وتنظيم وإتاحة الإنتاج العلمي لكلية اللغة العربية بجامعة الأزهر – فرع شبين الكوم: الكتب، والرسائل الجامعية، والأبحاث، والمخطوطات، والدوريات، والمحاضرات.
          </p>
          <p>
            تُوصف المواد وفق معيار <strong>Dublin Core</strong> للبيانات الوصفية، مع قابلية التطوير لاحقًا إلى <strong>MARC 21</strong> و<strong>RDA</strong>، ونقل البيانات إلى نظام <strong>DSpace</strong>.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-[#1B4D3E] mb-6 font-serif">مراحل المشروع</h2>
        <div className="space-y-4">
          {STAGES.map((stage) => (
            <div key={stage.num} className="bg-white p-5 rounded-xl border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${stage.color}`}>
                  {stage.num}
                </div>
                <h3 className="font-bold text-[#1B4D3E]">{stage.title}</h3>
              </div>
              <span className="text-gray-400 text-sm">{stage.status}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}