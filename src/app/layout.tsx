import type { Metadata } from "next";
import { Cairo, Amiri } from "next/font/google";
import "./globals.css";
import ResearchAssistantWidget from "@/components/ResearchAssistantWidget";

const cairo = Cairo({ subsets: ["arabic"], variable: "--font-cairo" });
const amiri = Amiri({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-amiri" });

export const metadata: Metadata = {
  title: "المستودع الرقمي | كلية اللغة العربية بالمنوفية",
  description: "أرشيف علمي شامل - جامعة الأزهر",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${amiri.variable} font-sans min-h-screen flex flex-col`}>
        {children}
        <ResearchAssistantWidget />
      </body>
    </html>
  );
}