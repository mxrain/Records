'use client';

import React, { Suspense } from 'react';
import './globals.css';
import 'react-tooltip/dist/react-tooltip.css';
import { Inter } from 'next/font/google';
import { Providers } from './components/Providers';
import { Toaster } from "@/components/ui/toaster";
import 'nprogress/nprogress.css';
import ClientLayout from './ClientLayout';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';

const inter = Inter({ subsets: ['latin'] });

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
            background: #000000;
            height: 3px;
          }
          #nprogress .peg {
            box-shadow: 0 0 10px #000000, 0 0 5px #000000;
          }
        `}</style>
      </head>
      <body>
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
