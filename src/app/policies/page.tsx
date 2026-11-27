import Link from 'next/link';

export default function PoliciesPage() {
  return (
    <main className="flex-1 bg-[#F8F6F0] py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#1B4D3E] text-white p-8 rounded-2xl mb-8">
          <h1 className="text-3xl font-bold font-serif">سياسة الاستخدام وحقوق الملكية الفكرية</h1>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-200 space-y-8 text-gray-700 leading-relaxed text-lg">
          
          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-4 font-serif">مستويات الإتاحة</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>متاح مفتوح:</strong> يمكن للجميع عرض الملف وتحميله.</li>
              <li><strong>مقيد:</strong> العرض والتحميل للمستخدمين المسجلين من منسوبي الكلية.</li>
              <li><strong>بيانات وصفية فقط:</strong> يظهر وصف المادة دون إتاحة الملف.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-4 font-serif">حقوق المؤلفين</h2>
            <p>لا تُنشر أي مادة محمية بحقوق النشر إلا بإذن مكتوب من صاحب الحق. الرسائل الجامعية والأبحاث لا تُتاح للتحميل تلقائيًا، وتمر كل مادة بمراجعة واعتماد قبل نشرها.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-4 font-serif">الاستخدام المسموح</h2>
            <p>يُسمح بالاستخدام للأغراض التعليم والبحث العلمي مع ذكر المصدر. يُمنع إعادة النشر التجاري دون إذن.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-4 font-serif">الخصوصية</h2>
            <p>لا تُعرض بيانات المستخدمين الشخصية للعامة، وتُحمى حسابات الإدارة، وتُحفظ نسخ احتياطية دورية للبيانات والملفات.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-4 font-serif">طلب إزالة مادة</h2>
            <p>إذا رأيت أن مادة منشورة تمس حقًا لك، تواصل معنا من صفحة «اتصل بنا» وسيُحجب الملف فورًا حتى تتم المراجعة.</p>
          </section>

        </div>
      </div>
    </main>
  );
}