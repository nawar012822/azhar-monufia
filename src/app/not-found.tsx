import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F8F6F0] flex items-center justify-center px-4" dir="rtl">
      <div className="bg-white p-12 rounded-3xl border border-gray-200 shadow-sm text-center max-w-md">
        <p className="text-6xl font-bold text-[#D4AF37] mb-4">404</p>
        <h1 className="text-2xl font-bold text-[#1B4D3E] font-serif mb-3">الصفحة غير موجودة</h1>
        <p className="text-gray-600 mb-6">الرابط الذي طلبته غير صحيح أو تم نقله.</p>
        <Link href="/" className="inline-block bg-[#1B4D3E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#153d31]">العودة للرئيسية</Link>
      </div>
    </main>
  );
}
