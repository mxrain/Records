'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';

const CategoriesContent = dynamic(
  () => import('./CategoriesContent'),
  { 
    loading: () => <LoadingAnimation />,
    ssr: false
  }
);

export default function CategoriesPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <div className="container mx-auto py-10">
        <CategoriesContent />
      </div>
    </Suspense>
  );
}
