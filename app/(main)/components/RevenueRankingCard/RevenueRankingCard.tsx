import React, { useState } from 'react';
import styles from './RevenueRankingCard.module.css';
import Link from 'next/link';
import { useGetListItemsQuery } from '@/app/store/api/listApi';

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
        <ul className={styles.list}>
            {[...Array(8)].map((_, index) => (
                <li key={index} className={`${styles.item} ${styles.skeleton}`}>
                    <div className={styles.skeletonTitle}></div>
                    <div className={styles.skeletonDetails}>
                        <div className={styles.skeletonDescription}></div>
                        <div className={styles.skeletonRating}></div>
                        <div className={styles.skeletonCategory}></div>
                    </div>
                </li>
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
            <div className={styles.hotCard}>
                <h2 className={styles.title}>{title}</h2>
                <Skeleton />
            </div>
        );
    }

    if (isError) {
        return <div className={styles.hotCard}>加载失败，请重试</div>;
    }

    const top: TopItem[] = (data?.top || []).map(item => ({
        ...item,
        score: (item as any).score || 0,
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
        <div className={styles.hotCard}>
            <h2 className={styles.title}>{title}</h2>
            <ul className={styles.list}>
                {currentItems.map((item, index) => (
                    <li key={item.uuid} className={styles.item}>
                        <Link href={`/resource/${item.uuid}`} className={styles.link}>
                            <span className={styles.itemTitle}>{item.name}</span>
                            <div 
                                className={styles.itemDetails} 
                                style={{backgroundImage: `url(${item.images[0]}?${index + currentPage * itemsPerPage})`}}
                            >
                                <div className={styles.itemInfo}>
                                    <p className={styles.itemDescription}>{item.introduction}</p>
                                    <p className={styles.itemRating}>评分: {item.score}</p>
                                    <p className={styles.itemCategory}>类别: {item.category}</p>
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
            <div className={styles.navigationWrapper}>
                <button onClick={prevPage} className={`${styles.navButton} ${styles.prevButton}`}>&#9664;</button>
                <button onClick={nextPage} className={`${styles.navButton} ${styles.nextButton}`}>&#9654;</button>
            </div>
            <div className={styles.pageIndicator}>
                {[...Array(pageCount)].map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToPage(index)}
                        className={`${styles.dot} ${index === currentPage ? styles.activeDot : ''}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default RevenueRankingCard;
