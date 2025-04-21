'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import CarouselCard from './components/CarouselCard/CarouselCard';
import RecommendCard from './components/RecommendCard/RecommendCard';
import LatestResourceCard from './components/LatestResourceCard/LatestResourceCard';
import HotCard from './components/HotCard/HotCard';
import RevenueRankingCard from './components/RevenueRankingCard/RevenueRankingCard';
import HeatmapCard from './components/HeatmapCard/HeatmapCard';
import ResourceList from '../components/ResourceList/ResourceList';
import LoadingAnimation from '../components/LoadingAnimation/LoadingAnimation';

// 将使用 useSearchParams 的逻辑提取到子组件
function MainContentInner() {
  const searchParams = useSearchParams();
  
  return (
    <div>
      <div className={styles.grid}>
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
