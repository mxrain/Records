import React, { useState, useEffect, useRef } from 'react';
import styles from './TabComponent.module.css';
import Link from 'next/link';
import { useGetCategoriesQuery } from '@/app/store/api/categoriesApi';
import { Skeleton } from "@/components/ui/skeleton";

interface Tab {
  name: string;
  link: string;
}

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
      <Skeleton key={index} className={`${styles.tabItem} ${styles.skeletonTab}`} />
    ));
  };
  useEffect(() => {
    if (data) {
      const extractCategories = (obj: any): Tab[] => {
        let categories: Tab[] = [];
        for (let key in obj) {
          if (obj[key] && typeof obj[key] === 'object') {
            if (obj[key].items) {
              categories = [...categories, ...extractCategories(obj[key].items)];
            } else {
              categories.push({ name: key, link: obj[key].link });
            }
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
      <div className={styles.tabContainer} ref={headerRef}>
        <div className={styles.tabList}>
          {renderSkeletons()}
        </div>
      </div>
    );
  }

  if (isError) {
    return <div>加载分类失败</div>;
  }

  return (
    <div className={`${styles.noOverflow}`}>
      <div className={`${styles.tabContainer} ${styles.noHorizontalScroll}`} ref={headerRef}>
        {!isExceed && (
          <div className={styles.tabList}>
            {/* 如果是小屏幕，显示所有标签；否则只显示前23个 */}
            {(isSmallScreen ? tabs : tabs.slice(0, 23)).map((tab, index) => (
              <Link href={`/category/${tab.link}`} className={styles.tabItem} key={index}>{tab.name}</Link>
            ))}
            {/* 只在非小屏幕时显示"更多"按钮 */}
            {!isSmallScreen && (
              <div className={styles.tabItem} onClick={toggleMoreModal} ref={moreButtonRef}>
                更多
              </div>
            )}
            {/* "更多"模态框的逻辑保持不变 */}
            {showMoreModal && (
              <>
                <div className={styles.modalOverlay} onClick={() => setShowMoreModal(false)}>
                  <div className={styles.moreModal} ref={moreModalRef} onClick={e => e.stopPropagation()}>
                    {tabs.slice(19).map((tab, index) => (
                      <Link href={`/category/${tab.link}`} className={styles.tabItem} key={index + 23}>
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
          <div className={`${styles.exceedList} ${styles.fadeIn}`}>
            {tabs.map((tab, index) => (
              <Link href={`/category/${tab.link}`} className={styles.exceedListItem} key={index}>{tab.name}</Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
