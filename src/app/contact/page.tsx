import Link from 'next/link';

export default function ContactPage() {
  return (
    <main className="flex-1 bg-[#F8F6F0] py-12 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#1B4D3E] text-white p-8 rounded-2xl mb-8">
          <h1 className="text-3xl font-bold font-serif mb-2">اتصل بنا</h1>
          <p className="text-sm text-gray-300">للاستفسارات وطلبات إضافة المواد أو إزالتها.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-5">
          <div>
            <input type="text" placeholder="الاسم" className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white" />
          </div>
          <div>
            <input type="email" placeholder="البريد الإلكتروني" className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white" dir="ltr" />
          </div>
          <div>
            <select className="w-full p-4 border rounded-xl outline-none text-gray-600 bg-white">
              <option>استفسار عام</option>
              <option>طلب إضافة مادة</option>
              <option>طلب إزالة مادة</option>
            </select>
          </div>
          <div>
            <textarea rows={5} placeholder="الرسالة" className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white"></textarea>
          </div>
          <div className="flex justify-end pt-2">
            <button type="button" className="bg-[#1B4D3E] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#153d31]">إرسال</button>
          </div>
        </div>
      </div>
    </main>
  );
}