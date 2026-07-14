import React, { useState, useEffect, memo } from 'react';
import { useGetListItemsQuery } from '@/app/store/api/listApi';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 添加类型定义
interface CarouselCardProps {
    title: string;
}

// 加载骨架（统一风格：仅 bg-gt-muted + animate-pulse，匹配轮播图结构）
const Skeleton: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col px-5 pb-4 gap-3">
            <div className="h-[200px] w-full bg-gt-muted animate-pulse rounded-gt" />
            <div className="flex justify-center gap-1.5">
                <div className="h-2 w-2 bg-gt-muted animate-pulse rounded-full" />
                <div className="h-2 w-2 bg-gt-muted animate-pulse rounded-full" />
                <div className="h-2 w-2 bg-gt-muted animate-pulse rounded-full" />
            </div>
        </div>
    );
};

const CarouselCard: React.FC<CarouselCardProps> = ({ title }) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const { data, isLoading, isError } = useGetListItemsQuery();

    const carousel = data?.carousel || [];

    useEffect(() => {
        if (carousel.length > 0 && currentIndex >= carousel.length) {
            setCurrentIndex(0);
        }
    }, [carousel, currentIndex]);

    if (isLoading) {
        return (
            <div className="relative w-full h-[330px] bg-gt-card text-gt-primary-foreground rounded-gt overflow-hidden shadow-gt bg-cover bg-center transition-shadow duration-300 ease-in-out border border-gt-border hover:shadow-gt-md">
                <h2 className="text-lg font-bold font-gt m-0 tracking-gt [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]">{title}</h2>
                <Skeleton />
            </div>
        );
    }

    if (isError || carousel.length === 0) {
        return (
            <div className="relative w-full h-[330px] bg-gt-card text-gt-foreground rounded-gt overflow-hidden shadow-gt transition-shadow duration-300 ease-in-out border border-gt-border hover:shadow-gt-md flex flex-col">
                <h2 className="text-lg font-bold font-gt m-0 tracking-gt px-5 pt-5 text-gt-foreground">{title}</h2>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5 pb-8 text-gt-muted-foreground">
                    <svg
                        className="w-16 h-16 opacity-40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <p className="text-sm font-gt tracking-gt m-0 text-center">
                        {isError ? '轮播图加载失败' : '暂无轮播图片'}
                    </p>
                    <p className="text-xs font-gt m-0 text-center opacity-70">
                        请在管理后台添加轮播图配置
                    </p>
                </div>
            </div>
        );
    }

    const nextSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % carousel.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + carousel.length) % carousel.length);
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    // 键盘导航支持
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            prevSlide();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
        }
    };

    return (
        <div
            className="relative w-full h-[330px] bg-gt-card text-gt-primary-foreground rounded-gt overflow-hidden shadow-gt bg-cover bg-center transition-shadow duration-300 ease-in-out border border-gt-border hover:shadow-gt-md"
            style={{ backgroundImage: `url(${carousel[currentIndex]})` }}
            role="region"
            aria-label={`${title} 轮播图`}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(59,53,43,0.2),rgba(59,53,43,0.5))] flex flex-col justify-between p-5">
                <h2 className="text-lg font-bold font-gt m-0 tracking-gt [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]">{title}</h2>
                <div className="group/nav absolute inset-0 flex justify-between items-center px-3">
                    <button
                        onClick={prevSlide}
                        className="block min-[768px]:opacity-0 min-[768px]:group-hover/nav:block bg-transparent border-none text-gt-foreground cursor-pointer p-2 transition-transform duration-300 ease-in-out hover:scale-125 hover:text-gt-secondary"
                        aria-label="上一张图片"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="block min-[768px]:opacity-0 min-[768px]:group-hover/nav:block bg-transparent border-none text-gt-foreground cursor-pointer p-2 transition-transform duration-300 ease-in-out hover:scale-125 hover:text-gt-secondary"
                        aria-label="下一张图片"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex justify-center items-center z-[1]" role="group" aria-label="轮播图页面指示器">
                    {carousel.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={cn(
                                'w-2 h-2 rounded-full bg-[rgba(251,250,249,0.5)] mx-1 transition-all duration-300 ease-in-out border-none cursor-pointer p-[6px] min-w-[20px] min-h-[20px] hover:bg-[rgba(251,250,249,0.75)]',
                                index === currentIndex && 'bg-gt-primary-foreground'
                            )}
                            aria-label={`跳转到第 ${index + 1} 张图片`}
                            aria-current={index === currentIndex ? 'true' : 'false'}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(CarouselCard);
