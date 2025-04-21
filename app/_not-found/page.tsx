'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';

const NotFoundContent = dynamic(
  () => import('./NotFoundContent'),
  { 
    loading: () => <LoadingAnimation />,
    ssr: false
  }
);

export default function NotFoundPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <NotFoundContent />
    </Suspense>
  );
}
