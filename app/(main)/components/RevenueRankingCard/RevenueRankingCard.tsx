import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useGetListItemsQuery } from '@/app/store/api/listApi';
import { FiAlertCircle } from 'react-icons/fi';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TopItem {
    uuid: string;
    name: string;
    introduction: string;
    images: string[];
    category: string;
    score: number;
}

interface RevenueRankingCardProps {
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

const RevenueRankingCard: React.FC<RevenueRankingCardProps> = ({ title }) => {
    const { data, isLoading, isError } = useGetListItemsQuery();
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 8;

    if (isLoading) {
        return (
            <div className="group relative w-full h-[330px] overflow-hidden bg-gt-card rounded-gt text-gt-foreground shadow-gt transition-shadow duration-300 border border-gt-border hover:shadow-gt-md">
                <h2 className="text-lg font-bold font-gt mt-4 mx-5 mb-1.5 tracking-gt">{title}</h2>
                <Skeleton />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="group relative w-full h-[330px] overflow-hidden bg-gt-card rounded-gt text-gt-foreground shadow-gt transition-shadow duration-300 border border-gt-border hover:shadow-gt-md flex flex-col items-center justify-center gap-3 px-5">
                <FiAlertCircle className="w-12 h-12 text-gt-muted-foreground opacity-50" />
                <p className="text-sm text-gt-muted-foreground font-gt tracking-gt m-0 text-center">加载失败，请稍后重试</p>
            </div>
        );
    }

    const top: TopItem[] = (data?.top || []).map(item => ({
        ...item,
        score: item.score || 0,
    }));
    const pageCount = Math.ceil(top.length / itemsPerPage);

    const nextPage = () => {
        setCurrentPage((prev) => (prev + 1) % pageCount);
    };

    const prevPage = () => {
        setCurrentPage((prev) => (prev - 1 + pageCount) % pageCount);
    };

    const goToPage = (pageIndex: number) => {
        setCurrentPage(pageIndex);
    };

    const currentItems = top.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

    return (
        <div className="group relative w-full h-[330px] overflow-hidden bg-gt-card rounded-gt text-gt-foreground shadow-gt transition-shadow duration-300 border border-gt-border hover:shadow-gt-md">
            <h2 className="text-lg font-bold font-gt mt-4 mx-5 mb-1.5 tracking-gt">{title}</h2>
            <ul className="list-none py-2 px-4 m-0 h-[240px] overflow-y-auto scrollbar-hide">
                {currentItems.map((item, index) => (
                    <li key={item.uuid} className="group/item relative mb-1 h-[32px] transition-[height] duration-300 overflow-hidden rounded-gt hover:h-[100px] hover:bg-gt-muted hover:shadow-gt">
                        <Link href={`/resource/${item.uuid}`} className="block no-underline text-inherit h-full">
                            <span className="block text-[0.8125rem] font-semibold truncate px-2 py-1.5 font-gt tracking-gt">{item.name}</span>
                            <div
                                className="absolute top-[32px] left-0 right-0 bottom-0 bg-[linear-gradient(to_bottom,rgba(59,53,43,0.7),rgba(59,53,43,0.85))] text-gt-primary-foreground py-2 px-3 flex flex-col justify-center opacity-0 transition-opacity duration-300 bg-cover bg-center group-hover/item:opacity-100"
                                style={{backgroundImage: `url(${item.images[0]}?${index + currentPage * itemsPerPage})`}}
                            >
                                <div className="bg-[rgba(59,53,43,0.5)] py-2 px-2.5 absolute bottom-0 left-0 right-0 text-[0.6875rem] rounded-b-gt">
                                    <p className="my-[2px] truncate">{item.introduction}</p>
                                    <p className="my-[2px] truncate">评分: {item.score}</p>
                                    <p className="my-[2px] truncate">类别: {item.category}</p>
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between p-0 opacity-100 min-[768px]:opacity-0 min-[768px]:group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={prevPage} aria-label="上一页" className="bg-transparent border-none text-gt-foreground cursor-pointer p-1.5 pointer-events-auto transition-transform duration-300 flex items-center justify-center hover:scale-125 hover:text-gt-secondary"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={nextPage} aria-label="下一页" className="bg-transparent border-none text-gt-foreground cursor-pointer p-1.5 pointer-events-auto transition-transform duration-300 flex items-center justify-center hover:scale-125 hover:text-gt-secondary"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center items-center">
                {[...Array(pageCount)].map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToPage(index)}
                        aria-label={`跳转到第 ${index + 1} 页`}
                        className={cn(
                            'flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer border-none bg-transparent transition-all duration-300 hover:bg-gt-muted/50 rounded-gt',
                        )}
                    >
                        <span className={cn(
                            'block rounded-full bg-gt-muted transition-all duration-300',
                            index === currentPage ? 'w-[8px] h-[8px] bg-gt-foreground' : 'w-[5px] h-[5px] hover:bg-gt-secondary'
                        )} />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RevenueRankingCard;
