import React, { useEffect, useState, useMemo } from 'react';
import { Spin, Popover } from 'antd';
import styles from './HeatmapCard.module.css';

type HeatmapValue = {
  date: string;
  count: number;
  month: number;
  details: string[];
};

const DAYS_IN_WEEK = 7;
const WEEKS_IN_YEAR = 52;
const CELL_SIZE = 25;
const CELL_PADDING = 3;
const LABEL_OFFSET = 50;

export default function HeatmapCard() {
  const [contributions, setContributions] = useState<HeatmapValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/github/zyt-heatmap');
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        const formattedData = result.data.map((item: any) => ({
          date: item.date,
          count: item.count,
          month: new Date(item.date).getMonth(),
          details: item.details || []
        }));

        setContributions(formattedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败，请稍后重试');
        console.error('Error fetching contributions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContributions();
  }, []);

  // 生成网格数据时过滤掉未来日期
  const gridData = useMemo(() => {
    const grid: (HeatmapValue | null)[][] = Array(WEEKS_IN_YEAR).fill(null)
      .map(() => Array(DAYS_IN_WEEK).fill(null));

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 设置为今天的开始时间

    contributions.forEach(contribution => {
      const date = new Date(contribution.date);
      // 跳过未来日期
      if (date > today) return;

      const dayOfWeek = date.getDay();
      const weekOfYear = WEEKS_IN_YEAR - 1 - Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      if (weekOfYear >= 0) {
        grid[weekOfYear][dayOfWeek] = contribution;
      }
    });

    return grid;
  }, [contributions]);

  const getColorForValue = (value: HeatmapValue | null): string => {
    if (!value || value.count <= 0) return 'var(--heatmap-empty-color)';
    if (value.count <= 2) return 'var(--heatmap-scale-1)';
    if (value.count <= 4) return 'var(--heatmap-scale-2)';
    if (value.count <= 6) return 'var(--heatmap-scale-3)';
    return 'var(--heatmap-scale-4)';
  };

  const getMonthLabels = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [];
    let currentMonth = -1;

    for (let week = 0; week < WEEKS_IN_YEAR; week++) {
      const firstDayOfWeek = gridData[week]?.[0];
      if (firstDayOfWeek) {
        const month = new Date(firstDayOfWeek.date).getMonth();
        if (month !== currentMonth) {
          currentMonth = month;
          labels.push({
            text: months[month],
            x: week * (CELL_SIZE + CELL_PADDING)
          });
        }
      }
    }

    return labels;
  };

  // 渲染更新详情内容
  const renderDetails = (value: HeatmapValue) => (
    <div className={styles.detailsPopover}>
      <div className={styles.detailsHeader}>
        {value.date} 的更新记录 ({value.count}次)
      </div>
      <div className={styles.detailsList}>
        {value.details.map((detail, index) => (
          <div key={index} className={styles.detailItem}>
            • {detail}
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={styles.heatmapCard}>
        <div className={styles.loadingWrapper}>
          <Spin tip="Loading..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.heatmapCard}>
        <div className={styles.errorWrapper}>
          <span className={styles.errorMessage}>{error}</span>
          <button className={styles.retryButton} onClick={() => window.location.reload()}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.heatmapCard}>
      <h3 className={styles.title}>更新热力</h3>
      <div className={styles.heatmapWrapper}>
        <div className={styles.weekdayLabels}>
          {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
            <div key={day} className={styles.weekdayLabel}>
              {day}
            </div>
          ))}
        </div>
        <div className={styles.scrollContainer}>
          <div className={styles.monthLabelsContainer}>
            {getMonthLabels().map((label, index) => (
              <div
                key={index}
                className={styles.monthLabel}
                style={{
                  transform: `translateY(${label.x}px)`
                }}
              >
                {label.text.replace('Jan', '一月')
                  .replace('Feb', '二月')
                  .replace('Mar', '三月')
                  .replace('Apr', '四月')
                  .replace('May', '五月')
                  .replace('Jun', '六月')
                  .replace('Jul', '七月')
                  .replace('Aug', '八月')
                  .replace('Sep', '九月')
                  .replace('Oct', '十月')
                  .replace('Nov', '十一月')
                  .replace('Dec', '十二月')}
              </div>
            ))}
          </div>
          <svg
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMin meet"
            viewBox={`0 0 ${DAYS_IN_WEEK * (CELL_SIZE + CELL_PADDING)} ${WEEKS_IN_YEAR * (CELL_SIZE + CELL_PADDING)}`}
            className={styles.heatmap}
          >
            {gridData.map((week, weekIndex) =>
              week.map((day, dayIndex) => {
                // 计算当前格子的日期
                const currentDate = new Date();
                currentDate.setFullYear(currentDate.getFullYear() - 1);
                currentDate.setDate(currentDate.getDate() + (weekIndex * 7 + dayIndex));
                
                // 检查是否是未来日期
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (currentDate > today) return null;

                return (
                  <g
                    key={`${weekIndex}-${dayIndex}`}
                    transform={`translate(${dayIndex * (CELL_SIZE + CELL_PADDING)}, ${weekIndex * (CELL_SIZE + CELL_PADDING)})`}
                  >
                    {day ? (
                      <Popover
                        content={renderDetails(day)}
                        title={null}
                        trigger="click"
                        placement="top"
                        overlayClassName={`${styles.detailsPopover} ${styles.popoverWrapper}`}
                      >
                        <rect
                          width={CELL_SIZE}
                          height={CELL_SIZE}
                          rx={6}
                          ry={6}
                          fill={getColorForValue(day)}
                          className={styles.cell}
                        />
                      </Popover>
                    ) : (
                      <rect
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                        rx={6}
                        ry={6}
                        fill="var(--heatmap-empty-color)"
                        className={styles.cell}
                      />
                    )}
                  </g>
                );
              })
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
