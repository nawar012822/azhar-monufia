import Toaster from '@/components/Toaster';
import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { Cairo, Amiri } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/constants";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LazyAssistant from "@/components/LazyAssistant";

const cairo = Cairo({ subsets: ["arabic"], variable: "--font-cairo" });
const amiri = Amiri({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-amiri" });

export const viewport: Viewport = {
  themeColor: "#12543c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "مستودع الأزهر",
  appleWebApp: { capable: true, title: "مستودع الأزهر", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  metadataBase: new URL(SITE_URL),
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
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
        <SiteHeader />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'المستودع الرقمي - كلية اللغة العربية بالمنوفية', url: SITE_URL, inLanguage: 'ar', potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }) }} />
        <div className="flex-1 flex flex-col">{children}</div>
        <SiteFooter />
        <Toaster />
        <LazyAssistant />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}