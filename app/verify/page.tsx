'use client';

import { Suspense } from 'react';
import VerifyContent from './VerifyContent';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';

export default function VerifyPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <VerifyContent />
    </Suspense>
  );
}
