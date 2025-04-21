import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './RecommendCard.module.css';
import { useGetListItemsQuery } from '@/app/store/api/listApi';

interface SourceLink {
  link: string;
  psw: string;
  size: string;
}

interface ListItem {
  uuid: string;
  name: string;
  category: string;
  images: string[];
  tags: string[];
  source_links: Record<string, SourceLink>;
  uploaded: number;
  update_time: number;
  introduction: string;
  resource_information: Record<string, string>;
  link: string;
  rating: number;
  comments: number;
  download_count: number;
  download_limit: number;
  other_information: Record<string, unknown>;
}

interface RecommendCardProps {
  title: string;
  type: 'recommend' | 'hot' | 'latest' | 'top';
}

const RecommendCard: React.FC<RecommendCardProps> = ({ title, type }) => {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useGetListItemsQuery();

  const [visibleItems, setVisibleItems] = useState<ListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  const itemsPerPage = 20;

  const loadItems = useCallback(() => {
    if (data && data[type]) {
      const start = currentPage * itemsPerPage;
      const end = start + itemsPerPage;
      setVisibleItems(data[type].slice(start, end));
    }
  }, [currentPage, data, type]);

  useEffect(() => {
    if (!isLoading && !isError) {
      loadItems();
    }
  }, [loadItems, isLoading, isError]);

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (data && data[type] && (currentPage + 1) * itemsPerPage < data[type].length) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleRefresh = useCallback(() => {
    setCurrentPage(0);
    refetch();
    router.refresh();
  }, [refetch, router]);

  const renderSkeletonItems = () => {
    return Array.from({ length: itemsPerPage }, (_, index) => (
      <div key={index} className={styles.skeletonItem}>
        <div className={styles.skeletonName}></div>
        <div className={styles.skeletonDescription}></div>
        <div className={styles.skeletonSize}></div>
      </div>
    ));
  };

  const renderContent = () => {
    if (isLoading) {
      return renderSkeletonItems();
    }
    if (isError) {
      return <div className={styles.errorMessage}>加载失败，请重试</div>;
    }
    return visibleItems.map((item) => (
      <Link href={`/resource/${item.uuid}`} key={item.uuid} className={styles.item}>
        <span className={styles.itemName}>{item.name}</span>
        <span className={styles.itemDescription}>{item.category}</span>
        <span className={styles.itemSize}>
          {Object.values(item.source_links)[0]?.size || 'N/A'}
        </span>
      </Link>
    ));
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>{title}</h2>
        <button onClick={handleRefresh} className={styles.refreshButton} aria-label="刷新">
          <RefreshCw size={16} />
        </button>
      </div>
      <div className={styles.cardContent}>
        {renderContent()}
      </div>
      <div className={styles.cardFooter}>
        <button onClick={handlePrevPage} disabled={currentPage === 0} aria-label="上一页">
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={handleNextPage}
          disabled={!data || !data[type] || (currentPage + 1) * itemsPerPage >= data[type].length}
          aria-label="下一页"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default RecommendCard;
