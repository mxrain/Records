'use client';

import { Suspense } from 'react';
import MainContent from './MainContent';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';

export default function Home() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <MainContent />
    </Suspense>
  );
}
