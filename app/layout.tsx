import React, { Suspense } from 'react';
import './globals.css';
import './design-tokens.css';
import './animations.css';
import 'react-tooltip/dist/react-tooltip.css';
import { Fraunces } from 'next/font/google';
import { Providers } from './components/Providers';
import { Toaster } from "@/components/ui/toaster";
import 'nprogress/nprogress.css';
import ClientLayout from './ClientLayout';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';
import GoogleAnalytics from './components/GoogleAnalytics';
import type { Metadata } from 'next';
import { getAllSettings } from '@/lib/data/settings';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

// 从数据库读取站点配置生成 SEO metadata(异步,服务端执行)
export async function generateMetadata(): Promise<Metadata> {
  let title = '四次元资源桶';
  let description = '资源管理与分享平台';
  let faviconUrl = '/favicon.ico';
  try {
    const settings = await getAllSettings();
    if (typeof settings.site_title_seo === 'string' && settings.site_title_seo) {
      title = settings.site_title_seo;
    }
    if (typeof settings.site_description_seo === 'string' && settings.site_description_seo) {
      description = settings.site_description_seo;
    }
    if (typeof settings.favicon_url === 'string' && settings.favicon_url) {
      faviconUrl = settings.favicon_url;
    }
  } catch (e) {
    // 读取失败保持默认
  }
  return {
    title,
    description,
    icons: { icon: faviconUrl },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
      </head>
      <body className={fraunces.className}>
        <GoogleAnalytics />
        <Providers>
          <Suspense fallback={<LoadingAnimation />}>
            <ClientLayout>
              {children}
              <Toaster />
            </ClientLayout>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
