'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import LoadingAnimation from '../components/LoadingAnimation/LoadingAnimation';

// 统一的卡片加载占位（带标题栏骨架，高度与实际卡片一致避免跳动）
function CardPlaceholder() {
  return (
    <div className="w-full h-[330px] bg-gt-card rounded-gt overflow-hidden shadow-gt border border-gt-border flex flex-col">
      {/* 标题栏骨架 */}
      <div className="h-[44px] px-5 pt-4 pb-2 flex items-center">
        <div className="h-5 w-24 bg-gt-muted animate-pulse rounded-gt" />
      </div>
      {/* 内容区骨架 */}
      <div className="flex-1 px-5 pb-4 space-y-2.5">
        <div className="h-[18px] w-[80%] bg-gt-muted animate-pulse rounded-gt" />
        <div className="h-[18px] w-[60%] bg-gt-muted animate-pulse rounded-gt" />
        <div className="h-[18px] w-[70%] bg-gt-muted animate-pulse rounded-gt" />
        <div className="h-[18px] w-[50%] bg-gt-muted animate-pulse rounded-gt" />
        <div className="h-[18px] w-[65%] bg-gt-muted animate-pulse rounded-gt" />
      </div>
    </div>
  );
}

// 动态导入非关键组件，实现代码分割
const CarouselCard = dynamic(
  () => import('./components/CarouselCard/CarouselCard'),
  {
    loading: () => <CardPlaceholder />,
    ssr: true
  }
);

const RecommendCard = dynamic(
  () => import('./components/RecommendCard/RecommendCard'),
  {
    loading: () => <CardPlaceholder />,
    ssr: false
  }
);

const LatestResourceCard = dynamic(
  () => import('./components/LatestResourceCard/LatestResourceCard'),
  {
    loading: () => <CardPlaceholder />,
    ssr: false
  }
);

const HotCard = dynamic(
  () => import('./components/HotCard/HotCard'),
  {
    loading: () => <CardPlaceholder />,
    ssr: false
  }
);

const RevenueRankingCard = dynamic(
  () => import('./components/RevenueRankingCard/RevenueRankingCard'),
  {
    loading: () => <CardPlaceholder />,
    ssr: false
  }
);

const HeatmapCard = dynamic(
  () => import('./components/HeatmapCard/HeatmapCard'),
  {
    loading: () => <CardPlaceholder />,
    ssr: false
  }
);

const ResourceList = dynamic(
  () => import('../components/ResourceList/ResourceList'),
  {
    loading: () => <CardPlaceholder />,
    ssr: false
  }
);

function MainContentInner() {
  const searchParams = useSearchParams();
  
  return (
    <div>
      <div className="main-grid">
        <CarouselCard title="轮播图" />
        <RecommendCard title="推荐资源" type="recommend" />
        <LatestResourceCard title="最新资源" />
        <HotCard title="热门资源" />
        <RevenueRankingCard title="收入排行榜" />
        <HeatmapCard />
      </div>
      <ResourceList />
    </div>
  );
}

export default function MainContent() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <MainContentInner />
    </Suspense>
  );
}
