'use client';

import { Suspense } from 'react';
import ExternalLinkRedirect from '../components/ExternalLinkRedirect';
import LoadingAnimation from '../components/LoadingAnimation/LoadingAnimation';
import { useSearchParams } from 'next/navigation';

// 将使用 useSearchParams 的逻辑提取到子组件
function ExternalRedirectContent() {
  const searchParams = useSearchParams();
  const url = searchParams?.get('url');

  if (!url) {
    return <div>无效的URL</div>;
  }

  return <ExternalLinkRedirect href={url} />;
}

export default function ExternalRedirectPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <ExternalRedirectContent />
    </Suspense>
  );
}
