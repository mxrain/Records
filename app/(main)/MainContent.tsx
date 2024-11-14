'use client';

import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import RecommendCard from '@/app/(main)/componets/RecommendCard/RecommendCard';
import CarouselCard from '@/app/(main)/componets/CarouselCard/CarouselCard';
import ResourceList from '@/app/components/ResourceList/ResourceList';
import LatestResourceCard from '@/app/(main)/componets/LatestResourceCard/LatestResourceCard';
import HotCard from '@/app/(main)/componets/HotCard/HotCard';
import RevenueRankingCard from '@/app/(main)/componets/RevenueRankingCard/RevenueRankingCard';
import HeatmapCard from '@/app/(main)/componets/HeatmapCard/HeatmapCard'

export default function MainContent() {
  const searchParams = useSearchParams();
  
  // 使用 searchParams 的其余代码...

  return (
    // 渲染主页内容    
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
