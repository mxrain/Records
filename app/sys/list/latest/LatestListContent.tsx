'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Pin,
  Plus,
  ChevronDown,
  Image as ImageIcon,
} from 'lucide-react';
import { useGetResourcesQuery } from '@/app/store/api/resourcesApi';
import { useToast } from '@/hooks/use-toast';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';
import type { Resource } from '@/app/sys/add/types';

type GroupKey = 'today' | 'yesterday' | 'week' | 'earlier';

const GROUP_LABELS: Record<GroupKey, string> = {
  today: '今天',
  yesterday: '昨天',
  week: '本周',
  earlier: '更早',
};

// 分组归属
function groupOf(ts: number): GroupKey {
  const now = Date.now();
  const dayMs = 86400000;
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const diff = startOfToday - ts;
  if (diff < 0) return 'today';
  if (diff < dayMs) return 'yesterday';
  if (diff < 7 * dayMs) return 'week';
  return 'earlier';
}

// 相对时间显示
function relativeTime(ts: number, g: GroupKey): string {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60000);
  if (g === 'today') {
    if (m < 60) return `${Math.max(1, m)}分钟前`;
    return `${Math.floor(m / 60)}小时前`;
  }
  if (g === 'yesterday') {
    const d = new Date(ts);
    return `昨天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (g === 'week') {
    const d = Math.floor(diff / 86400000);
    return `${d}天前`;
  }
  return new Date(ts).toLocaleDateString('zh-CN');
}

function getThumb(r: Resource): string {
  if (Array.isArray(r.images) && r.images.length > 0) return r.images[0];
  return '';
}

// 取简短分类名（最后一级）
function shortCategory(cat: string): string {
  if (!cat) return '';
  const parts = cat.split(' > ');
  return parts[parts.length - 1] || cat;
}

export default function LatestListContent() {
  const { data: resources, isLoading } = useGetResourcesQuery();
  const { toast } = useToast();
  const [addedToRecommend, setAddedToRecommend] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(8);

  // 按时间倒序
  const sortedList = useMemo(() => {
    if (!resources) return [];
    return Object.entries(resources)
      .map(([id, r]) => ({ id, ...r }))
      .sort((a, b) => (b.update_time ?? b.uploaded ?? 0) - (a.update_time ?? a.uploaded ?? 0));
  }, [resources]);

  // 分组
  const groups = useMemo(() => {
    const m = new Map<GroupKey, { id: string; resource: Resource; ts: number; group: GroupKey }[]>();
    for (const r of sortedList) {
      const ts = r.update_time ?? r.uploaded ?? Date.now();
      const g = groupOf(ts);
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push({ id: r.id, resource: r, ts, group: g });
    }
    const order: GroupKey[] = ['today', 'yesterday', 'week', 'earlier'];
    return order
      .map((k) => ({ key: k, items: m.get(k) ?? [] }))
      .filter((x) => x.items.length > 0);
  }, [sortedList]);

  // 全局第一条（accent 左边框）
  const firstId = sortedList[0]?.id;

  // 可见条目
  const visibleGroups = useMemo(() => {
    let remaining = visibleCount;
    const result: { key: GroupKey; items: { id: string; resource: Resource; ts: number; group: GroupKey }[] }[] = [];
    for (const g of groups) {
      if (remaining <= 0) {
        result.push({ key: g.key, items: [] });
        continue;
      }
      const take = g.items.slice(0, remaining);
      remaining -= take.length;
      result.push({ key: g.key, items: take });
    }
    return result.filter((g) => g.items.length > 0);
  }, [groups, visibleCount]);

  const hasMore = sortedList.length > visibleCount;

  const handleAddToRecommend = (id: string, name: string) => {
    setAddedToRecommend((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast({ title: '已从推荐移除', description: name, variant: 'default' });
      } else {
        next.add(id);
        toast({ title: '已添加到推荐', description: name, variant: 'default' });
      }
      return next;
    });
  };

  if (isLoading || !resources) return <LoadingAnimation />;

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
      {/* ===== 页面头部 ===== */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <h1
            className="sys-page-title text-[1.875rem] font-semibold leading-[1.2] tracking-[0.01em]"
            style={{ fontFamily: 'var(--font-serif)', textWrap: 'balance' }}
          >
            最新列表
          </h1>
          <p className="text-[0.875rem] text-muted-foreground leading-[1.5]">
            按时间排序的最新添加资源
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/sys/list/top"
            className="inline-flex items-center justify-center gap-2 px-[1.125rem] py-2.5 rounded-[2rem] border border-border bg-transparent text-foreground text-[0.8125rem] font-medium whitespace-nowrap cursor-pointer transition-all hover:bg-accent hover:-translate-y-px"
          >
            <Pin className="w-4 h-4" />
            <span>置顶列表</span>
          </Link>
          <button
            type="button"
            onClick={() => toast({ title: '打开添加资源面板', variant: 'default' })}
            className="inline-flex items-center justify-center gap-2 px-[1.125rem] py-2.5 rounded-[2rem] bg-primary text-primary-foreground text-[0.8125rem] font-medium whitespace-nowrap cursor-pointer transition-transform hover:-translate-y-px"
          >
            <Plus className="w-4 h-4" />
            <span>添加到列表</span>
          </button>
        </div>
      </div>

      {/* ===== 时间线分组卡片 ===== */}
      {visibleGroups.length === 0 ? (
        <div className="sys-card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-[0.9375rem] text-muted-foreground">暂无最新资源</p>
        </div>
      ) : (
        visibleGroups.map((g) => (
          <div key={g.key} className="flex flex-col gap-3">
            {/* 组标题 */}
            <div className="flex flex-col gap-1.5">
              <h2
                className="text-[0.75rem] font-semibold uppercase tracking-[0.06em]"
                style={{ color: 'hsl(var(--secondary))' }}
              >
                {GROUP_LABELS[g.key]}
              </h2>
              <div
                className="h-[2px] w-8 rounded-full"
                style={{ background: 'hsl(var(--accent))' }}
              />
            </div>

            {/* 组卡片 */}
            <div className="flex flex-col gap-3">
              {g.items.map(({ id, resource: r, ts, group }) => {
                const isNewest = id === firstId;
                const added = addedToRecommend.has(id);
                const thumb = getThumb(r);
                return (
                  <div
                    key={id}
                    className={`sys-card sys-card-hover flex items-center gap-4 p-4 px-5 flex-wrap ${
                      isNewest ? 'border-l-[3px] border-l-accent' : ''
                    }`}
                  >
                    {/* 时间 */}
                    <div className="shrink-0 w-16 text-center">
                      <span className="text-[0.75rem] text-muted-foreground whitespace-nowrap tabular-nums">
                        {relativeTime(ts, group)}
                      </span>
                    </div>
                    {/* 缩略图 */}
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={r.name}
                        className="w-20 h-20 rounded-[2rem] object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-[2rem] bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    {/* 标题+分类+描述 */}
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <h3
                        className="text-[1.0625rem] font-semibold text-foreground leading-[1.3] truncate"
                        style={{ fontFamily: 'var(--font-serif)', letterSpacing: '0.01em' }}
                      >
                        {r.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="sys-pill sys-pill-rounded bg-accent text-accent-foreground text-[0.6875rem] font-medium whitespace-nowrap">
                          {shortCategory(r.category)}
                        </span>
                      </div>
                      <p className="text-[0.8125rem] text-muted-foreground leading-[1.4] truncate">
                        {r.introduction || '暂无描述'}
                      </p>
                    </div>
                    {/* 添加到推荐按钮 */}
                    <button
                      type="button"
                      onClick={() => handleAddToRecommend(id, r.name)}
                      className={`sys-touch-target inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[2rem] border text-[0.75rem] font-medium whitespace-nowrap cursor-pointer shrink-0 transition-all hover:-translate-y-px ${
                        added
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-border bg-transparent text-foreground hover:bg-accent'
                      }`}
                    >
                      <Pin className={`w-4 h-4 ${added ? 'fill-current' : ''}`} />
                      {added ? '已推荐' : '添加到推荐'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* ===== 加载更多 / 统计 ===== */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <span className="text-[0.75rem] text-muted-foreground whitespace-nowrap">
          共 {sortedList.length} 条记录
        </span>
        <div className="flex justify-center flex-1">
          {hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + 8)}
              className="inline-flex items-center justify-center gap-1.5 px-[1.125rem] py-2 rounded-[2rem] border border-border bg-card text-foreground text-[0.75rem] font-medium whitespace-nowrap cursor-pointer transition-all hover:bg-accent hover:-translate-y-px"
            >
              <ChevronDown className="w-4 h-4" />
              加载更多
            </button>
          ) : (
            <span className="text-[0.75rem] text-muted-foreground">已加载全部</span>
          )}
        </div>
        <div className="w-[4.5rem] shrink-0" />
      </div>
    </div>
  );
}
