import Toaster from '@/components/Toaster';
import type { Metadata } from "next";
import { Cairo, Amiri } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import ResearchAssistantWidget from "@/components/ResearchAssistantWidget";

const cairo = Cairo({ subsets: ["arabic"], variable: "--font-cairo" });
const amiri = Amiri({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-amiri" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "المستودع الرقمي | جامعة الأزهر - كلية اللغة العربية بالمنوفية",
  description: "أرشيف علمي شامل - جامعة الأزهر",
  openGraph: {
    title: "المستودع الرقمي | جامعة الأزهر - كلية اللغة العربية بالمنوفية",
    description: "أرشيف علمي شامل - جامعة الأزهر",
    locale: "ar_EG",
    type: "website",
    images: ["/logo.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${amiri.variable} font-sans min-h-screen flex flex-col`}>
        {children}
        <Toaster />
        <ResearchAssistantWidget />
      </body>
    </html>
  );
}