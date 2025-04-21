import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import styles from './LatestResourceCard.module.css';
import { useGetListItemsQuery } from '@/app/store/api/listApi';

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
        <div className={styles.itemList}>
            {[...Array(5)].map((_, index) => (
                <div key={index} className={`${styles.item} ${styles.skeleton}`}>
                    <div className={styles.skeletonBackground}></div>
                    <div className={styles.skeletonContent}>
                        <div className={styles.skeletonTitle}></div>
                        <div className={styles.skeletonTags}>
                            <div className={styles.skeletonTag}></div>
                            <div className={styles.skeletonTag}></div>
                        </div>
                        <div className={styles.skeletonUpdateTime}></div>
                    </div>
                </div>
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
            <span key={tagIndex} className={styles.tag}>{truncateTitle(tag, 8)}</span>
        ));
    };

    if (isLoading) {
        return (
            <div className={styles.card}>
                <h2>{title}</h2>
                <Skeleton />
            </div>
        );
    }

    if (isError) {
        return <div className={styles.card}>加载失败，请重试</div>;
    }

    return (
        <div className={styles.card}>
            <h2>{title}</h2>
            <div className={styles.itemList}>
                {latestItems.map((item, index) => (
                    <Link key={item.uuid} href={`/resource/${item.uuid}`} className={styles.item} title={item.introduction}>
                        <div className={styles.backgroundImage} style={{ backgroundImage: `url(${item.images[0]}?${index})` }} />
                        <div className={styles.content}>
                            <div className={styles.title}>{item.name}</div>
                            <div className={styles.tags}>
                                {renderTags(item.tags)}
                            </div>
                            <p className={styles.updateTime}>
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
                        <div className={styles.arrowIcon}>
                            <ChevronRight size={24} strokeWidth={3} color="white" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default LatestResourceCard;
