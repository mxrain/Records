'use client';

import React, { Suspense } from 'react';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';
import dynamic from 'next/dynamic';

const LatestListContent = dynamic(
  () => import('./LatestListContent'),
  { 
    loading: () => <LoadingAnimation />,
    ssr: false
  }
);

export default function LatestListPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <LatestListContent />
    </Suspense>
  );
}
