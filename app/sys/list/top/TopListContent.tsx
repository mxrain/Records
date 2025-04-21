'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

export default function TopListContent() {
  const searchParams = useSearchParams();
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">置顶列表</h1>
      {/* TODO: 实现置顶列表内容 */}
    </div>
  );
}