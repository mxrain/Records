import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useGetListItemsQuery } from '@/app/store/api/listApi';
import { FiAlertCircle } from 'react-icons/fi';

interface LatestResourceCardProps {
    title: string;
}

interface ListItem {
    uuid: string;
    name: string;
    introduction: string;
    images: string[];
    tags: string[] | Record<string, string>;
    update_time: number;
}

const Skeleton: React.FC = () => {
    return (
        <div className="px-5 h-[280px] overflow-hidden overflow-y-auto scrollbar-hide max-[870px]:h-auto max-[870px]:max-h-[280px]">
            {[...Array(4)].map((_, index) => (
                <div key={index} className="relative overflow-hidden rounded-gt my-1.5 h-[72px] bg-gt-muted animate-pulse" />
            ))}
        </div>
    );
};

const LatestResourceCard: React.FC<LatestResourceCardProps> = ({ title }) => {
    const { data, isLoading, isError } = useGetListItemsQuery();
    
    const latestItems: ListItem[] = data?.latest || [];

    const truncateTitle = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '..';
    };

    const renderTags = (tags: string[] | Record<string, string> | undefined) => {
        if (!tags) return null;
        const tagsArray = Array.isArray(tags) ? tags : Object.values(tags);
        return tagsArray.map((tag, tagIndex) => (
            <span key={tagIndex} className="inline-block bg-[rgba(203,192,170,0.3)] px-1.5 py-0.5 rounded-gt mr-1 mb-0.5 text-[0.6875rem] text-gt-primary-foreground">{truncateTitle(tag, 8)}</span>
        ));
    };

    if (isLoading) {
        return (
            <div className="p-0 m-0 h-[330px] shadow-gt rounded-gt transition-shadow duration-300 bg-gt-card border border-gt-border overflow-hidden hover:shadow-gt-md max-[870px]:h-auto max-[870px]:min-h-[330px]">
                <h2 className="pt-4 px-5 pb-2 text-lg font-bold text-gt-foreground font-gt tracking-gt">{title}</h2>
                <Skeleton />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-0 m-0 h-[330px] shadow-gt rounded-gt transition-shadow duration-300 bg-gt-card border border-gt-border overflow-hidden hover:shadow-gt-md max-[870px]:h-auto max-[870px]:min-h-[330px] flex flex-col items-center justify-center gap-3 px-5">
                <FiAlertCircle className="w-12 h-12 text-gt-muted-foreground opacity-50" />
                <p className="text-sm text-gt-muted-foreground font-gt tracking-gt m-0 text-center">加载失败，请稍后重试</p>
            </div>
        );
    }

    return (
        <div className="p-0 m-0 h-[330px] shadow-gt rounded-gt transition-shadow duration-300 bg-gt-card border border-gt-border overflow-hidden hover:shadow-gt-md max-[870px]:h-auto max-[870px]:min-h-[330px]">
            <h2 className="pt-4 px-5 pb-2 text-lg font-bold text-gt-foreground font-gt tracking-gt">{title}</h2>
            <div className="px-5 h-[280px] overflow-hidden overflow-y-auto scrollbar-hide max-[870px]:h-auto max-[870px]:max-h-[280px]">
                {latestItems.map((item, index) => (
                    <Link key={item.uuid} href={`/resource/${item.uuid}`} className="group relative overflow-hidden rounded-gt my-1.5 flex flex-col justify-start h-[72px] w-auto cursor-pointer transition-[transform,box-shadow] duration-300 no-underline hover:-translate-y-px hover:shadow-gt-md hover:z-[2]" title={item.introduction}>
                        <div className="absolute inset-0 bg-cover bg-center blur-[4px] scale-110" style={{ backgroundImage: `url(${item.images[0]}?${index})` }} />
                        <div className="relative z-[1] p-3 bg-[linear-gradient(to_bottom,rgba(59,53,43,0.6),rgba(59,53,43,0.8))] text-gt-primary-foreground h-full w-full flex flex-col justify-between overflow-hidden box-border">
                            <div className="absolute text-sm font-semibold mb-1 truncate transition-all duration-300 w-full font-gt tracking-gt group-hover:text-base group-hover:w-[calc(100%-1.875rem)]">{item.name}</div>
                            <div className="flex flex-wrap mt-6 mb-1 transition-all duration-300 overflow-hidden group-hover:hidden">
                                {renderTags(item.tags)}
                            </div>
                            <p className="text-[0.6875rem] opacity-80 mt-auto truncate group-hover:text-sm group-hover:font-semibold">
                                {(() => {
                                    const timeDiff = Date.now() - new Date(item.update_time * 1000).getTime();
                                    const hoursDiff = timeDiff / (1000 * 60 * 60);
                                    if (hoursDiff < 1) {
                                        return '刚刚';
                                    } else if (hoursDiff < 24) {
                                        return `${Math.floor(hoursDiff)}小时前`;
                                    } else {
                                        return `${Math.floor(hoursDiff / 24)}天前`;
                                    }
                                })()}
                            </p>
                        </div>
                        <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-5 h-5 flex justify-center items-center transition-all duration-300 opacity-0 text-gt-primary-foreground bg-[rgba(59,53,43,0.6)] rounded-full group-hover:right-2.5 group-hover:opacity-100">
                            <ChevronRight size={24} strokeWidth={3} color="white" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default LatestResourceCard;
