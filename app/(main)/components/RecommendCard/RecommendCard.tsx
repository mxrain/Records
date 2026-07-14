import React, { useState, useEffect, useCallback, memo } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGetListItemsQuery } from '@/app/store/api/listApi';
import { FiAlertCircle } from 'react-icons/fi';

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
    return Array.from({ length: 6 }, (_, index) => (
      <div key={index} className="flex justify-between items-center h-[40px] px-2.5 mb-2">
        <div className="w-[30%] h-[14px] bg-gt-muted animate-pulse rounded-gt" />
        <div className="w-1/2 h-[14px] bg-gt-muted animate-pulse rounded-gt" />
        <div className="w-[15%] h-[14px] bg-gt-muted animate-pulse rounded-gt" />
      </div>
    ));
  };

  const renderContent = () => {
    if (isLoading) {
      return renderSkeletonItems();
    }
    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <FiAlertCircle className="w-12 h-12 text-gt-muted-foreground opacity-50" />
          <p className="text-sm text-gt-muted-foreground font-gt tracking-gt m-0 text-center">加载失败，请稍后重试</p>
        </div>
      );
    }
    return visibleItems.map((item) => (
      <Link href={`/resource/${item.uuid}`} key={item.uuid} className="flex items-center h-[40px] px-2.5 rounded-gt mb-2 transition-all duration-300 no-underline text-gt-foreground hover:bg-gt-muted">
        <span className="flex-1 font-semibold text-sm truncate font-gt tracking-gt">{item.name}</span>
        <span className="flex-[2] text-gt-muted-foreground text-[0.8125rem] truncate">{item.category}</span>
        <span className="flex-[0_0_70px] text-right text-gt-muted-foreground text-xs">
          {Object.values(item.source_links)[0]?.size || 'N/A'}
        </span>
      </Link>
    ));
  };

  return (
    <div className="w-full h-[330px] shadow-gt rounded-gt overflow-hidden flex flex-col transition-shadow duration-300 bg-gt-card border border-gt-border hover:shadow-gt-md max-[870px]:h-auto max-[870px]:min-h-[330px]">
      <div className="flex justify-between items-center pt-4 px-5 pb-2 text-lg font-bold text-gt-foreground font-gt tracking-gt">
        <h2>{title}</h2>
        <button onClick={handleRefresh} className="bg-none border-none cursor-pointer transition-transform duration-500 select-none text-gt-muted-foreground hover:origin-center hover:rotate-[360deg] hover:scale-[1.3] hover:text-gt-secondary" aria-label="刷新">
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="grow px-5 overflow-y-auto scrollbar-hide h-[260px] max-[870px]:h-auto max-[870px]:max-h-[280px]">
        {renderContent()}
      </div>
      <div className="flex justify-between py-3 px-4">
        <button onClick={handlePrevPage} disabled={currentPage === 0} className="bg-none border-none cursor-pointer transition-opacity duration-200 text-gt-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed" aria-label="上一页">
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={handleNextPage}
          disabled={!data || !data[type] || (currentPage + 1) * itemsPerPage >= data[type].length}
          className="bg-none border-none cursor-pointer transition-opacity duration-200 text-gt-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="下一页"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default memo(RecommendCard);
