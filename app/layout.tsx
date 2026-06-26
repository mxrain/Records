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

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Records',
  description: 'Resource management application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
          #nprogress .bar {
            background: #3b352b;
            height: 2px;
          }
          #nprogress .peg {
            box-shadow: 0 0 8px rgba(59,53,43,0.5), 0 0 4px rgba(59,53,43,0.3);
          }
        `}</style>
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
