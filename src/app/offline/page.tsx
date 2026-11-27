export const metadata = { title: 'لا يوجد اتصال | المستودع الرقمي' };

export default function OfflinePage() {
  return (
    <main className="flex-1 flex items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-primary">لا يوجد اتصال بالإنترنت</h1>
        <p className="text-muted-foreground">
          تعذّر الوصول إلى المستودع الآن. الصفحات التي زرتها من قبل تعمل بدون إنترنت. حاول مرة أخرى عند عودة الاتصال.
        </p>
        <a href="/" className="inline-block rounded-xl bg-primary px-5 py-2 text-primary-foreground">إعادة المحاولة</a>
      </div>
    </main>
  );
}
