'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';

function NotFoundContentInner() {
  const searchParams = useSearchParams();
  const referrer = searchParams?.get('from') || '/';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-4">404 - 页面未找到</h1>
      <p className="text-xl mb-8">抱歉，您请求的页面不存在。</p>
      <Link href={referrer} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
        返回上一页
      </Link>
    </div>
  );
}

export default function NotFoundContent() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <NotFoundContentInner />
    </Suspense>
  );
}
