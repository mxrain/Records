import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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

const MONTH_NAMES_CN = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

export default function HeatmapCard() {
  const [contributions, setContributions] = useState<HeatmapValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentMonthLabel, setCurrentMonthLabel] = useState('');

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
    if (!value || value.count <= 0) return 'var(--heatmap-empty)';
    if (value.count <= 2) return 'var(--heatmap-scale-1)';
    if (value.count <= 4) return 'var(--heatmap-scale-2)';
    if (value.count <= 6) return 'var(--heatmap-scale-3)';
    return 'var(--heatmap-scale-4)';
  };

  // 计算每个周对应的月份（用于滚动时显示当前月份）
  const weekMonthMap = useMemo(() => {
    const map: number[] = [];
    let lastMonth = -1;
    for (let week = 0; week < WEEKS_IN_YEAR; week++) {
      const firstDay = gridData[week]?.[0];
      if (firstDay) {
        const m = new Date(firstDay.date).getMonth();
        lastMonth = m;
      }
      map.push(lastMonth);
    }
    return map;
  }, [gridData]);

  // 滚动时更新当前月份标签（显示在顶部 sticky 标题栏）
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    // 根据滚动位置估算当前可见的周
    const scrollTop = container.scrollTop;
    const weekHeight = CELL_SIZE + CELL_PADDING;
    const visibleWeek = Math.floor(scrollTop / weekHeight);
    if (visibleWeek >= 0 && visibleWeek < WEEKS_IN_YEAR) {
      const monthIdx = weekMonthMap[visibleWeek];
      if (monthIdx >= 0) {
        setCurrentMonthLabel(MONTH_NAMES_CN[monthIdx]);
      }
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [weekMonthMap]);

  // 渲染更新详情内容
  const renderDetails = (value: HeatmapValue) => (
    <div className="max-w-[300px] max-h-[400px]">
      <div className="text-sm font-semibold pb-2 border-b border-gt-border mb-2 font-gt">
        {value.date} 的更新记录 ({value.count}次)
      </div>
      <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
        {value.details.map((detail, index) => (
          <div key={index} className="text-xs leading-[1.5] py-[2px] text-gt-muted-foreground break-words">
            • {detail}
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-gt-card rounded-gt p-4 shadow-gt border border-gt-border h-[330px] flex flex-col">
        {/* 标题骨架 */}
        <div className="h-[24px] w-[100px] bg-gt-muted animate-pulse rounded-gt mb-3" />
        {/* 星期标签骨架 */}
        <div className="flex gap-1 mb-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-[25px] h-[25px] bg-gt-muted animate-pulse rounded-gt" />
          ))}
        </div>
        {/* 热力图网格骨架 */}
        <div className="flex-1 overflow-hidden px-[6px]">
          <div className="grid grid-cols-7 gap-1">
            {[...Array(28)].map((_, i) => (
              <div key={i} className="w-[25px] h-[25px] bg-gt-muted animate-pulse rounded-gt" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gt-card rounded-gt p-4 shadow-gt border border-gt-border h-[330px] flex flex-col">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <span className="text-gt-secondary text-center font-gt">{error}</span>
          <button className="py-2 px-5 bg-gt-foreground border-none rounded-gt text-gt-primary-foreground cursor-pointer transition-opacity duration-300 font-gt hover:opacity-85" onClick={() => window.location.reload()}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gt-card rounded-gt p-4 shadow-gt border border-gt-border h-[330px] flex flex-col">
      <h3 className="text-lg font-bold mb-3 text-gt-foreground shrink-0 font-gt tracking-gt">更新热力</h3>
      <div className="grow relative p-0 flex flex-col min-h-0 w-full overflow-hidden">
        {/* 星期标签 + 当前月份（sticky 固定在顶部，跟随滚动显示当前月份） */}
        <div className="flex items-center justify-between bg-gt-card sticky top-0 z-[1] px-1">
          <div className="flex">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div key={day} className="text-xs font-semibold text-gt-muted-foreground w-[25px] h-[25px] text-center leading-[25px] rounded-gt transition-colors duration-300 font-gt hover:bg-gt-muted">
                {day}
              </div>
            ))}
          </div>
          {currentMonthLabel && (
            <span className="text-xs font-semibold text-gt-secondary font-gt tracking-gt shrink-0">{currentMonthLabel}</span>
          )}
        </div>
        {/* 热力图网格（纵向滚动，无左侧月份标签避免裁切） */}
        <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-[6px] mt-[6px] w-full box-border scrollbar-hide" ref={scrollContainerRef}>
          <svg
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMin meet"
            viewBox={`0 0 ${DAYS_IN_WEEK * (CELL_SIZE + CELL_PADDING)} ${WEEKS_IN_YEAR * (CELL_SIZE + CELL_PADDING)}`}
            className="block w-full h-auto mx-auto"
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <rect
                            width={CELL_SIZE}
                            height={CELL_SIZE}
                            rx={6}
                            ry={6}
                            fill={getColorForValue(day)}
                            className="transition-all duration-300"
                            style={{ cursor: 'pointer' }}
                          />
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto max-w-[300px] p-0"
                          side="top"
                        >
                          {renderDetails(day)}
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <rect
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                        rx={6}
                        ry={6}
                        fill="var(--heatmap-empty)"
                        className="transition-all duration-300"
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
