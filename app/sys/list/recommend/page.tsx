'use client';

import React, { Suspense } from 'react';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';
import dynamic from 'next/dynamic';

const RecommendListContent = dynamic(
  () => import('./RecommendListContent'),
  { 
    loading: () => <LoadingAnimation />,
    ssr: false
  }
);

export default function RecommendListPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <RecommendListContent />
    </Suspense>
  );
}
