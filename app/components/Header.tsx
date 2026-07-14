'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { useGetCategoriesQuery } from '@/app/store/api/categoriesApi';
import { useGetSiteSettingsQuery } from '@/app/store/api/settingsApi';
import { Skeleton } from "@/components/ui/skeleton";
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store/store';
import { CategoryData } from '@/app/types';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface CategoryMenuProps {
  categories: Record<string, CategoryData>;
  depth?: number;
}

const CategoryMenu: React.FC<CategoryMenuProps> = memo(({ categories, depth = 0 }) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  return (
    <ul
      className={cn(
        'list-none m-0 p-0 animate-in fade-in-0 slide-in-from-top-1 duration-[250ms] ease-out',
        depth === 0
          ? 'absolute top-[calc(100%+8px)] right-0 bg-gt-card rounded-gt min-w-[140px] z-[1011] border border-gt-border shadow-gt-md py-1 max-[768px]:min-w-[120px]'
          : 'absolute -top-px right-[calc(100%+4px)] bg-gt-card rounded-gt min-w-[140px] border border-gt-border z-[1011] shadow-gt-md py-1 max-[768px]:min-w-[120px]'
      )}
      role={depth === 0 ? 'menu' : 'group'}
      aria-label={depth === 0 ? '分类菜单' : undefined}
    >
      {Object.entries(categories).map(([key, value]) => (
        <li
          key={key}
          className="relative"
          onMouseEnter={() => setHoveredCategory(key)}
          onMouseLeave={() => setHoveredCategory(null)}
          role="none"
        >
          <Link
            href={`/category/${value.link.replace(/\//g, '')}`}
            className="flex items-center justify-end py-1.5 px-3 whitespace-nowrap text-sm text-gt-foreground transition-all duration-300 no-underline font-gt tracking-gt rounded-[calc(var(--gt-radius)-0.25rem)] mx-0.5 hover:text-gt-secondary hover:bg-gt-muted hover:pl-[1.125rem] max-[768px]:text-xs max-[768px]:px-2 max-[768px]:py-1"
            role="menuitem"
            aria-label={`查看${key}分类`}
          >
            <span style={{ fontWeight: value.items ? 'bold' : 'normal' }}>{key}</span>
          </Link>
          {value.items && hoveredCategory === key && (
            <>
              {/* 透明桥接：覆盖菜单项与子菜单之间的 4px 缝隙，避免鼠标穿过时触发 mouseLeave */}
              <div className="absolute top-0 right-full h-full w-1" aria-hidden="true" />
              <CategoryMenu categories={value.items} depth={depth + 1} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
});

CategoryMenu.displayName = 'CategoryMenu';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: categories, isLoading, isError, error } = useGetCategoriesQuery();
  const { data: settings } = useGetSiteSettingsQuery();
  const [logoText, setLogoText] = useState('');
  const fullLogoText = settings?.site_name || '四次元资源桶';

  // 直接从 Redux store 中获取数据
  const categoriesFromStore = useSelector((state: RootState) => state.categoriesApi.queries['getCategories(undefined)']?.data);

  // 添加窗口宽度监听，使用防抖
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768);
      }, 150);
    };

    // 初始化检查
    setIsMobile(window.innerWidth <= 768);

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullLogoText.length) {
        setLogoText(fullLogoText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 200);

    return () => {
      clearInterval(timer);
      setLogoText(fullLogoText); // 确保在组件卸载时显示完整文本
    };
  }, []);

  // 如果logoText为空，显示完整文本
  const displayLogoText = logoText || fullLogoText;

  useEffect(() => {
  }, [categories, categoriesFromStore, isLoading, isError, error]);

  // 修改资源机器人按钮的渲染逻辑
  const renderResourceBotButton = () => (
    <Link
      href="https://chatbot.weixin.qq.com/webapp/zR6XpGC9NjMrGjpuuboUQACIxqCwLZ?robotName=%E8%B5%84%E6%BA%90%E6%90%9C%E7%B4%A2%E6%9C%BA%E5%99%A8%E4%BA%BA"
      className="group flex items-center px-4 py-2 bg-none border-none cursor-pointer text-base transition-all duration-300 whitespace-nowrap overflow-hidden font-semibold relative z-[9999] text-gt-foreground font-gt tracking-gt rounded-gt hover:bg-gt-muted max-[768px]:px-3 max-[768px]:py-1.5 max-[576px]:px-2 max-[576px]:py-1 max-[360px]:px-1.5 max-[360px]:py-1"
      aria-label="打开资源搜索机器人"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="relative z-[1] font-semibold text-base text-gt-foreground transition-colors duration-300 font-gt tracking-gt group-hover:text-gt-secondary max-[768px]:text-sm max-[576px]:text-[0.8125rem] max-[360px]:text-xs min-[1400px]:text-[1.0625rem]">
        {isMobile ? '机器人' : '资源机器人'}
      </span>
    </Link>
  );

  return (
    <header className="bg-gt-background h-16 fixed top-0 left-0 right-0 z-[1010] max-[768px]:h-14 max-[576px]:h-12">
      <div className="max-w-[1400px] mx-auto px-6 flex justify-between items-center h-full max-[1200px]:max-w-[1100px] max-[992px]:max-w-[800px] max-[768px]:text-sm max-[768px]:px-4 max-[768px]:max-w-full max-[576px]:text-xs max-[576px]:px-3 max-[576px]:w-full min-[1400px]:max-w-[1320px]">
        <Link href="/" className="group flex items-center no-underline" aria-label="四次元资源桶首页">
          <span className="text-[1.75rem] pl-0 font-bold text-gt-foreground tracking-gt transition-colors duration-300 font-gt group-hover:text-gt-secondary max-[992px]:text-[1.5rem] max-[768px]:text-[1.375rem] max-[576px]:text-[1.125rem] min-[1400px]:text-[1.875rem] max-[360px]:text-base">
            {displayLogoText}
          </span>
        </Link>
        <nav className="flex items-center max-[768px]:shrink-0 max-[768px]:ml-1">
          {isLoading ? (
            <div className="flex gap-4">
              <Skeleton className="h-10 w-[100px] max-[576px]:h-8 max-[576px]:w-[80px]" />
              {!isMobile && <Skeleton className="h-10 w-[100px] max-[576px]:h-8 max-[576px]:w-[80px]" />}
            </div>
          ) : isError ? (
            <div className="text-gt-secondary text-sm">
              {error && 'status' in error && (
                <span> (状态码: {error.status})</span>
              )}
            </div>
          ) : categories && Object.keys(categories).length > 0 ? (
            <>
              <div
                className="relative mr-2 z-[1011] max-[768px]:hidden"
                onMouseEnter={() => setIsMenuOpen(true)}
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <button
                  className="group flex items-center px-4 py-2 bg-none border-none cursor-pointer text-base transition-all duration-300 whitespace-nowrap overflow-hidden font-semibold relative z-[9999] text-gt-foreground font-gt tracking-gt rounded-gt hover:bg-gt-muted max-[768px]:px-3 max-[768px]:py-1.5 max-[576px]:px-2 max-[576px]:py-1 max-[360px]:px-1.5 max-[360px]:py-1"
                  aria-label="打开分类菜单"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="relative z-[1] font-semibold text-base text-gt-foreground transition-colors duration-300 font-gt tracking-gt group-hover:text-gt-secondary max-[768px]:text-sm max-[576px]:text-[0.8125rem] max-[360px]:text-xs min-[1400px]:text-[1.0625rem]">
                    分类
                  </span>
                  <ChevronDown className="w-[14px] h-[14px] ml-1.5 transition-transform duration-300 text-gt-muted-foreground group-hover:rotate-180" aria-hidden="true" />
                </button>
                {isMenuOpen && (
                  <>
                    {/* 透明桥接：覆盖按钮与弹窗之间的 8px 缝隙，避免鼠标穿过时触发 mouseLeave */}
                    <div className="absolute top-full right-0 h-2 min-w-[220px] max-[768px]:min-w-[180px]" aria-hidden="true" />
                    <CategoryMenu categories={categories as Record<string, CategoryData>} />
                  </>
                )}
              </div>
              {renderResourceBotButton()}
            </>
          ) : (
            <div className="text-gt-secondary text-sm">没有可用的分类数据</div>
          )}
        </nav> 
      </div>
    </header>
  );
};

export default memo(Header);
