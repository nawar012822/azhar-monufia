import { Cairo, Amiri } from 'next/font/google';
import './globals.css';

const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });
const amiri = Amiri({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-amiri' });

export const metadata = { title: 'المستودع الرقمي | كلية اللغة العربية بالمنوفية' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${amiri.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">{children}</body>
    </html>
  );
}