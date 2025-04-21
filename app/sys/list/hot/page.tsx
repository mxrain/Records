'use client';

import React, { Suspense } from 'react';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';
import dynamic from 'next/dynamic';

const HotListContent = dynamic(
  () => import('./HotListContent'),
  { 
    loading: () => <LoadingAnimation />,
    ssr: false
  }
);

export default function HotListPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <HotListContent />
    </Suspense>
  );
}
