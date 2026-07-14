'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useGetCategoriesQuery } from '@/app/store/api/categoriesApi';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';

interface Tab {
  name: string;
  link: string;
}

// 基础 tab 项样式（含响应式字体/间距）
const tabItemClassName = cn(
  'gt-tab-item inline-block px-2.5 py-[3px] rounded-gt cursor-pointer text-lg font-semibold bg-gt-background text-gt-foreground no-underline whitespace-nowrap transition-colors duration-slow ease-out font-gt tracking-gt hover:bg-gt-muted hover:text-gt-secondary touch-manipulation [-webkit-tap-highlight-color:transparent]',
  'max-[768px]:flex-shrink-0 max-[768px]:w-auto max-[768px]:max-w-[calc(100vw-30px)] max-[768px]:text-sm',
  'max-[480px]:text-xs',
  'min-[768px]:max-[991px]:text-base min-[768px]:max-[991px]:px-3',
  'min-[576px]:max-[767px]:text-base',
  'max-[575px]:text-sm max-[575px]:px-2',
  'max-[320px]:text-xs max-[320px]:px-1.5 max-[320px]:py-[2px]'
);

// 模态框内 tab 项样式（覆盖 base：flex 居中、bg-gt-muted、hover:bg-gt-accent）
const modalTabItemClassName = cn(
  tabItemClassName,
  'flex justify-center items-center p-1 bg-gt-muted hover:bg-gt-accent'
);

// 骨架屏 tab 项样式
const skeletonTabClassName = 'w-20 h-[30px] mx-2.5 rounded-[15px]';

// tab 容器样式（大屏与 Header 内容区 max-w-[1400px] mx-auto px-6 对齐）
const tabContainerClassName = cn(
  'gt-tab-container w-full max-w-[1400px] mx-auto flex justify-center items-center bg-transparent mt-16 min-h-[50px] relative overflow-x-hidden box-border px-6 z-[1007]',
  'max-[768px]:h-[60px] max-[768px]:px-4 max-[768px]:mt-14',
  'max-[480px]:h-[50px]',
  'min-[768px]:max-[991px]:h-[60px]',
  'min-[576px]:max-[767px]:h-[55px] min-[576px]:max-[767px]:mt-14',
  'max-[575px]:h-[50px] max-[575px]:mt-12 max-[575px]:px-3',
  'min-[1024px]:max-[1366px]:h-[65px]',
  'max-[320px]:h-[45px] max-[320px]:mt-10'
);

// tab 列表样式（grid 布局，含响应式 flex 切换；w-full 撑满 tabContainer）
const tabListClassName = cn(
  'w-full grid grid-cols-[repeat(10,1fr)] grid-rows-[repeat(2,1fr)] grid-auto-flow-col gap-2.5 p-2.5 text-center overflow-hidden scrollbar-hide min-h-[40px] min-w-auto scroll-smooth',
  'max-[768px]:flex max-[768px]:flex-nowrap max-[768px]:overflow-x-auto max-[768px]:scrollbar-hide max-[768px]:px-3.5 max-[768px]:py-2.5 max-[768px]:[-webkit-overflow-scrolling:touch]',
  'min-[1200px]:grid-cols-[repeat(12,1fr)]',
  'min-[768px]:max-[991px]:flex min-[768px]:max-[991px]:flex-nowrap min-[768px]:max-[991px]:overflow-x-auto min-[768px]:max-[991px]:py-2.5 min-[768px]:max-[991px]:px-5',
  'min-[576px]:max-[767px]:flex min-[576px]:max-[767px]:py-2 min-[576px]:max-[767px]:px-3.5',
  'max-[575px]:flex max-[575px]:py-1.5 max-[575px]:px-3',
  'min-[1024px]:max-[1366px]:grid-cols-[repeat(8,1fr)] min-[1024px]:max-[1366px]:py-3 min-[1024px]:max-[1366px]:px-6'
);

// 无溢出容器样式
const noOverflowClassName = 'overflow-x-hidden w-full max-w-[100vw] relative [touch-action:pan-y_pinch-zoom] [-webkit-overflow-scrolling:touch] m-0 p-0';

// 无水平滚动样式
const noHorizontalScrollClassName = 'overflow-x-hidden w-full touch-pan-y';

// 模态遮罩样式
const modalOverlayClassName = 'fixed inset-0 bg-[rgba(0,0,0,0.5)] z-[1008] flex justify-center items-center';

// 更多模态框样式（含响应式宽度/列数）
const moreModalClassName = cn(
  'fixed bg-gt-card p-2.5 rounded-gt border border-gt-border z-[1008] grid grid-cols-[repeat(3,1fr)] gap-2.5 max-h-[80vh] overflow-y-auto scrollbar-hide left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[600px]',
  'max-[768px]:w-[95%] max-[768px]:translate-y-0 max-[768px]:grid-cols-[repeat(2,1fr)]',
  'max-[575px]:w-[95%] max-[575px]:grid-cols-[repeat(2,1fr)] max-[575px]:gap-2'
);

// 超出列表样式（含响应式 top/padding/touch-action；top 对齐 header 高度避免缝隙）
const exceedListClassName = cn(
  'gt-exceed-list fixed top-16 left-0 right-0 z-[1007] flex flex-nowrap overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide bg-gt-background p-2.5 px-3.5 [-webkit-overflow-scrolling:touch] border-b border-[#efece3] scroll-smooth',
  'max-[768px]:[touch-action:pan-x_pan-y_pinch-zoom] max-[768px]:top-14',
  'min-[992px]:max-[1199px]:py-2.5 min-[992px]:max-[1199px]:px-[calc((100%-992px)/2)]',
  'min-[576px]:max-[767px]:top-14 min-[576px]:max-[767px]:py-2 min-[576px]:max-[767px]:px-3.5',
  'max-[575px]:top-12 max-[575px]:py-1.5 max-[575px]:px-3',
  'max-[320px]:top-11 max-[320px]:py-1 max-[320px]:px-2.5'
);

// 超出列表项样式（含响应式字体/间距）
const exceedListItemClassName = cn(
  'gt-exceed-list-item px-2.5 py-[3px] mx-1 rounded-gt cursor-pointer text-lg font-semibold bg-gt-background text-gt-foreground flex-shrink-0 whitespace-nowrap font-gt tracking-gt touch-manipulation [-webkit-tap-highlight-color:transparent]',
  'max-[768px]:text-sm max-[768px]:px-2',
  'min-[576px]:max-[767px]:text-base',
  'max-[575px]:text-sm max-[575px]:px-2 max-[575px]:mx-0.5',
  'max-[320px]:text-xs max-[320px]:px-1.5 max-[320px]:py-[2px] max-[320px]:mx-0.5'
);

// 淡入动画样式（替代 @keyframes fadeIn）
const fadeInClassName = 'animate-in fade-in-0 slide-in-from-y-2 duration-300';

export default function TabComponent() {
  const [isExceed, setIsExceed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768); // 添加检查
  const [showMoreModal, setShowMoreModal] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLDivElement>(null);
  const moreModalRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useGetCategoriesQuery();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

   // 渲染骨架屏的函数
   const renderSkeletons = () => {
    return Array(10).fill(0).map((_, index) => (
      <Skeleton key={index} className={cn(tabItemClassName, skeletonTabClassName)} />
    ));
  };
  useEffect(() => {
    if (data) {
      const extractCategories = (obj: any, parentSlug?: string): Tab[] => {
        let categories: Tab[] = [];
        const entries = Array.isArray(obj)
          ? obj.map((item) => ({ key: item.slug || item.name, value: item }))
          : Object.entries(obj).map(([k, v]) => ({ key: k, value: v as any }));

        for (const { key, value } of entries) {
          if (!value || typeof value !== 'object') continue;

          // 优先用 name 字段，其次用 key
          const name = value.name || key;
          // 优先用 link 字段，其次用 slug 拼接
          const link = value.link || (parentSlug ? `${parentSlug}/${value.slug || key}` : `/${value.slug || key}`);

          // 同时检查 items 和 children（数组形式）
          const hasChildren = value.items || (Array.isArray(value.children) && value.children.length > 0);
          const childObj = value.items || value.children;

          if (hasChildren) {
            // 递归处理子分类
            categories = [...categories, ...extractCategories(childObj, value.slug || key)];
          } else {
            categories.push({ name, link });
          }
        }
        return categories;
      };

      const allCategories = extractCategories(data);
      setTabs(allCategories);
    }

    const handleScroll = () => {
      if (headerRef.current) {
        const headerBottom = headerRef.current.getBoundingClientRect().bottom;
        setIsExceed(headerBottom <= 50);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (moreModalRef.current && !moreModalRef.current.contains(event.target as Node) &&
          moreButtonRef.current && !moreButtonRef.current.contains(event.target as Node)) {
        setShowMoreModal(false);
      }
    };

    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const isSmall = window.innerWidth < 768;
        setIsSmallScreen(isSmall);
        setIsExceed(isSmall || (headerRef.current?.getBoundingClientRect().bottom || 0) <= 50);
        
        // 强制重新计算布局
        if (headerRef.current) {
          headerRef.current.style.width = '100%';
          setTimeout(() => {
            if (headerRef.current) {
              headerRef.current.style.width = '';
            }
          }, 0);
        }
      }
    };

    // 初始化时调用一次
    handleResize();

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [data]);

  const toggleMoreModal = () => {
    setShowMoreModal(!showMoreModal);
  };

  // 添加一个新的 useEffect 来处理视口大小变化
  useEffect(() => {
    const handleResize = () => {
      // 强制重新计算布局
      if (headerRef.current) {
        headerRef.current.style.width = '100%';
        setTimeout(() => {
          if (headerRef.current) {
            headerRef.current.style.width = '';
          }
        }, 0);
      }
    };

    // 监听 resize 事件
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (isLoading) {
    return (
      <div className={tabContainerClassName} ref={headerRef}>
        <div className={tabListClassName}>
          {renderSkeletons()}
        </div>
      </div>
    );
  }

  if (isError) {
    return <div>加载分类失败</div>;
  }

  return (
    <div className={noOverflowClassName}>
      <div className={cn(tabContainerClassName, noHorizontalScrollClassName)} ref={headerRef}>
        {!isExceed && (
          <div className={tabListClassName}>
            {/* 如果是小屏幕，显示所有标签；否则只显示前23个 */}
            {(isSmallScreen ? tabs : tabs.slice(0, 23)).map((tab, index) => (
              <Link href={`/category${tab.link.startsWith('/') ? tab.link : `/${tab.link}`}`} className={tabItemClassName} key={index}>{tab.name}</Link>
            ))}
            {/* 只在非小屏幕时显示"更多"按钮 */}
            {!isSmallScreen && (
              <div className={tabItemClassName} onClick={toggleMoreModal} ref={moreButtonRef}>
                更多
              </div>
            )}
            {/* "更多"模态框的逻辑保持不变 */}
            {showMoreModal && (
              <>
                <div className={modalOverlayClassName} onClick={() => setShowMoreModal(false)}>
                  <div className={moreModalClassName} ref={moreModalRef} onClick={e => e.stopPropagation()}>
                    {tabs.slice(19).map((tab, index) => (
                      <Link href={`/category${tab.link.startsWith('/') ? tab.link : `/${tab.link}`}`} className={modalTabItemClassName} key={index + 23}>
                        {tab.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {isExceed && (
          <div className={cn(exceedListClassName, fadeInClassName)}>
            {tabs.map((tab, index) => (
              <Link href={`/category${tab.link.startsWith('/') ? tab.link : `/${tab.link}`}`} className={exceedListItemClassName} key={index}>{tab.name}</Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
