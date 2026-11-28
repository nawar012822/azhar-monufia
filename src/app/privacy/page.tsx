import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-[#F8F6F0] py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#1B4D3E] text-white p-8 rounded-2xl mb-8">
          <h1 className="text-3xl font-bold font-serif mb-2">سياسة الخصوصية</h1>
          <p className="text-sm text-gray-300">آخر تحديث: 28 نوفمبر 2026</p>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-200 space-y-8 text-gray-700 leading-relaxed text-lg">

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-3 font-serif">من نحن</h2>
            <p>
              المستودع الرقمي لكلية اللغة العربية بجامعة الأزهر – فرع المنوفية، مشروع طلابي غير رسمي
              قيد التطوير. هذه الصفحة توضّح أي بيانات يجمعها الموقع، وكيف تُستخدم، ومن يراها.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-3 font-serif">المساعد الذكي وأسئلتك</h2>
            <p className="mb-3">
              المساعد البحثي في الموقع يعمل بنموذج ذكاء اصطناعي خارجي تقدمه خدمة <strong>Groq</strong>.
              عند كتابة سؤال في المساعد:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>يُرسل نص سؤالك (مع آخر رسائل قصيرة من المحادثة نفسها) إلى خدمة Groq لتوليد الرد.</li>
              <li>لا نرسل اسمك ولا بريدك ولا أي بيانات حساب إلى الخدمة؛ النداء لا يحمل هوية المستخدم.</li>
              <li>لا يُحفظ نص سؤالك ولا نص الرد في قاعدة بيانات المستودع؛ يُستخدم لحظياً ثم ينتهي.</li>
              <li>قد تعالج Groq النص وفق سياستها الخاصة كمزوّد خدمة، وقد تحتفظ بسجلات تقنية لأغراض التشغيل.</li>
              <li>يُرجى عدم كتابة بيانات شخصية أو سرية (كلمات مرور، أرقام هواتف، بيانات مرضى) في المساعد.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-3 font-serif">ما نجمعه فعلياً</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>عدّاد أسئلة يومي:</strong> معرّف عشوائي يُنشئه متصفحك ويُحفظ في التخزين المحلي، ولا يدل على هويتك، ويُستخدم فقط لعدّ الأسئلة اليومية. يمكنك حذفه من إعدادات المتصفح فيبدأ العدّ من جديد.</li>
              <li><strong>عدّادات إجمالية:</strong> عدد الأسئلة وعدد الرموز المستهلكة في اليوم، بلا أي ربط بشخص.</li>
              <li><strong>بيانات الحساب:</strong> عند التسجيل نحفظ بريدك واسمك وكلمة مرور مشفّرة، والقسم التابع لك، لتتمكن من الإيداع والتحميل حسب الصلاحيات.</li>
              <li><strong>المواد التي ترفعها:</strong> الملف والبيانات الوصفية التي تدخلها، وتظهر للعامة حسب مستوى الإتاحة الذي تختاره.</li>
              <li><strong>سجلات تقنية:</strong> سجلات الخدمة (أخطاء، أوقات) لدى مزوّدي الاستضافة والتخزين، لأغراض التشغيل والأمان.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-3 font-serif">من يرى بياناتك</h2>
            <p>
              لا تُعرض بيانات المستخدمين الشخصية للعامة، ولا تُباع ولا تُشارك لأغراض تسويقية.
              تُشارك البيانات فقط مع مزوّدي الخدمة الذين يقوم عليهم الموقع (الاستضافة، قاعدة البيانات،
              تخزين الملفات، والبريد، ومزوّد الذكاء الاصطناعي المذكور أعلاه)، وبالحد اللازم لتشغيل الخدمة،
              أو إذا طُلب ذلك قانوناً.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-3 font-serif">مدة الاحتفاظ</h2>
            <p>
              العدّادات اليومية تُحفظ يومياً وتتراكم كأرقام فقط. بيانات الحساب تبقى حتى تطلب حذفها.
              المواد المرفوعة تبقى حتى تُحذف أو تُسحب. ولا نحتفظ بنصوص أسئلة المساعد أصلاً.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-3 font-serif">حقوقك</h2>
            <p>
              يمكنك طلب الاطلاع على بيانات حسابك أو تصحيحها أو حذف حسابك وموادك من صفحة
              <Link href="/contact" className="text-[#1B4D3E] font-bold underline"> اتصل بنا</Link>.
              وسيُنفَّذ الطلب بعد التحقق من ملكية الحساب.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#1B4D3E] mb-3 font-serif">ملاحظة</h2>
            <p>
              هذا الموقع نموذج غير رسمي قيد التطوير، وسياسة الاستخدام وحقوق الملكية الفكرية في
              صفحة <Link href="/policies" className="text-[#1B4D3E] font-bold underline">سياسة الاستخدام</Link>.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
