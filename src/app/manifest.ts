import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'المستودع الرقمي - جامعة الأزهر',
    short_name: 'مستودع الأزهر',
    description: 'أرشيف علمي - جامعة الأزهر، كلية اللغة العربية بالمنوفية',
    lang: 'ar',
    dir: 'rtl',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#12543c',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
