'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#F8F6F0] flex items-center justify-center px-4" dir="rtl">
      <div className="bg-white p-12 rounded-3xl border border-gray-200 shadow-sm text-center max-w-md">
        <h1 className="text-2xl font-bold text-[#1B4D3E] font-serif mb-3">حدث خطأ غير متوقع</h1>
        <button onClick={reset} className="bg-[#1B4D3E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#153d31]">حاول مرة أخرى</button>
      </div>
    </main>
  );
}
