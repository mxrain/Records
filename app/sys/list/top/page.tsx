'use client';

import React, { Suspense } from 'react';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';
import dynamic from 'next/dynamic';

const TopListContent = dynamic(
  () => import('./TopListContent'),
  { 
    loading: () => <LoadingAnimation />,
    ssr: false
  }
);

export default function TopListPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <TopListContent />
    </Suspense>
  );
}
