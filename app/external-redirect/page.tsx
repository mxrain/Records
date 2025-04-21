'use client';

import { Suspense } from 'react';
import ExternalLinkRedirect from '../components/ExternalLinkRedirect';
import LoadingAnimation from '../components/LoadingAnimation/LoadingAnimation';
import { useSearchParams } from 'next/navigation';

function ExternalRedirectContent() {
  const searchParams = useSearchParams();
  const url = searchParams?.get('url');

  if (!url) {
    return <div>无效的URL</div>;
  }

  return (
    <Suspense fallback={<LoadingAnimation />}>
      <ExternalLinkRedirect href={url} />
    </Suspense>
  );
}

export default function ExternalRedirectPage() {
  return <ExternalRedirectContent />;
}
