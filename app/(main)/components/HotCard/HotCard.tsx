import React, { memo } from 'react';
import Link from 'next/link';
import { useGetListItemsQuery } from '@/app/store/api/listApi';
import { usePagination } from '@/hooks/usePagination';
import { cn } from '@/lib/utils';
import { FiAlertCircle } from 'react-icons/fi';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HotItem {
    uuid: string;
    name: string;
    introduction: string;
    images: string[];
    rating: number;
    category: string;
}

interface HotCardProps {
    title: string;
}

const Skeleton: React.FC = () => {
    return (
        <ul className="list-none py-2 px-4 m-0 h-[240px] overflow-y-auto scrollbar-hide">
            {[...Array(8)].map((_, index) => (
                <li key={index} className="mb-1 h-[32px] rounded-gt bg-gt-muted animate-pulse" />
            ))}
        </ul>
    );
};

const HotCard: React.FC<HotCardProps> = ({ title }) => {
    const { data, isLoading, isError } = useGetListItemsQuery();
    const hot: HotItem[] = data?.hot || [];
    const itemsPerPage = 8;

    const { currentPage, pageCount, nextPage, prevPage, goToPage, startIndex, endIndex } = usePagination({
        totalItems: hot.length,
        itemsPerPage,
    });

    if (isLoading) {
        return (
            <div className="relative w-full h-[330px] bg-gt-card text-gt-foreground rounded-gt overflow-hidden shadow-gt transition-shadow duration-300 ease-in-out border border-gt-border hover:shadow-gt-md">
                <h2 className="text-lg font-bold font-gt tracking-gt mt-4 mx-5 mb-1.5">{title}</h2>
                <Skeleton />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="relative w-full h-[330px] bg-gt-card text-gt-foreground rounded-gt overflow-hidden shadow-gt transition-shadow duration-300 ease-in-out border border-gt-border hover:shadow-gt-md flex flex-col items-center justify-center gap-3 px-5">
                <FiAlertCircle className="w-12 h-12 text-gt-muted-foreground opacity-50" />
                <p className="text-sm text-gt-muted-foreground font-gt tracking-gt m-0 text-center">加载失败，请稍后重试</p>
            </div>
        );
    }

    // 键盘导航支持
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            prevPage();
        } else if (e.key === 'ArrowRight') {
            nextPage();
        }
    };

    const currentItems = hot.slice(startIndex, endIndex);

    return (
        <div
            className="group/hot relative w-full h-[330px] bg-gt-card text-gt-foreground rounded-gt overflow-hidden shadow-gt transition-shadow duration-300 ease-in-out border border-gt-border hover:shadow-gt-md"
            role="region"
            aria-label={`${title} 热门资源列表`}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <h2 className="text-lg font-bold font-gt tracking-gt mt-4 mx-5 mb-1.5">{title}</h2>
            <ul className="list-none py-2 px-4 m-0 h-[240px] overflow-y-auto scrollbar-hide" role="list">
                {currentItems.map((item, index) => (
                    <li key={item.uuid} className="group/item relative mb-1 h-[32px] transition-[height] duration-300 ease-in-out overflow-hidden rounded-gt hover:h-[100px] hover:bg-gt-muted hover:shadow-gt">
                        <Link
                            href={`/resource/${item.uuid}`}
                            className="block h-full no-underline text-inherit"
                            aria-label={`查看 ${item.name} 的详细信息`}
                        >
                            <span className="block text-[0.8125rem] font-semibold whitespace-nowrap overflow-hidden text-ellipsis py-[6px] px-[8px] font-gt tracking-gt">{item.name}</span>
                            <div
                                className="absolute top-[32px] left-0 right-0 bottom-0 bg-[linear-gradient(to_bottom,rgba(59,53,43,0.7),rgba(59,53,43,0.85))] text-gt-primary-foreground py-2 px-3 flex flex-col justify-center opacity-0 transition-opacity duration-300 ease-in-out bg-cover bg-center group-hover/item:opacity-100"
                                style={{backgroundImage: `url(${item.images[0]}?${index + startIndex})`}}
                                aria-hidden="true"
                            >
                                <div className="absolute bottom-0 left-0 right-0 bg-[rgba(59,53,43,0.5)] py-2 px-2.5 text-[0.6875rem] rounded-b-gt">
                                    <p className="my-[2px] whitespace-nowrap overflow-hidden text-ellipsis">{item.introduction}</p>
                                    <p className="my-[2px] whitespace-nowrap overflow-hidden text-ellipsis">评分: {item.rating}</p>
                                    <p className="my-[2px] whitespace-nowrap overflow-hidden text-ellipsis">类别: {item.category}</p>
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between p-0 opacity-100 min-[768px]:opacity-0 min-[768px]:group-hover/hot:opacity-100 transition-opacity duration-300 ease-in-out">
                <button
                    onClick={prevPage}
                    className="bg-transparent border-none text-gt-foreground cursor-pointer p-1.5 pointer-events-auto transition-transform duration-300 ease-in-out flex items-center justify-center hover:scale-125 hover:text-gt-secondary"
                    aria-label="上一页"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={nextPage}
                    className="bg-transparent border-none text-gt-foreground cursor-pointer p-1.5 pointer-events-auto transition-transform duration-300 ease-in-out flex items-center justify-center hover:scale-125 hover:text-gt-secondary"
                    aria-label="下一页"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center items-center" role="group" aria-label="页面指示器">
                {[...Array(pageCount)].map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToPage(index)}
                        aria-label={`跳转到第 ${index + 1} 页`}
                        aria-current={index === currentPage ? 'true' : undefined}
                        className={cn(
                            'flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer border-none bg-transparent transition-all duration-300 ease-in-out hover:bg-gt-muted/50 rounded-gt',
                        )}
                    >
                        <span className={cn(
                            'block rounded-full transition-all duration-300 ease-in-out',
                            index === currentPage ? 'w-[8px] h-[8px] bg-gt-foreground' : 'w-[5px] h-[5px] bg-gt-muted hover:bg-gt-secondary'
                        )} />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default memo(HotCard);
