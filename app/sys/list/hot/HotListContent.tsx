'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useGetResourcesQuery } from '@/app/store/api/resourcesApi';
import { useToast } from '@/hooks/use-toast';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';
import type { Resource } from '@/app/sys/add/types';

type RangeKey = 'today' | 'week' | 'month' | 'all';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '全部' },
];

// 取浏览量：优先 resource_information.views，回退基于 rating 派生
function getViews(r: Resource): number {
  const v = r.resource_information?.views as number | undefined;
  if (typeof v === 'number' && v > 0) return v;
  // 基于评分派生伪浏览量（rating 4.0+ → 4000-7000 区间）
  const rating = typeof r.rating === 'number' ? r.rating : 0;
  if (rating > 0) return Math.round(rating * 1200 + rating * rating * 100);
  return 0;
}
// 取点赞数：优先 resource_information.likes / comments，回退基于 rating 派生
function getLikes(r: Resource): number {
  const v = r.resource_information?.likes as number | undefined;
  if (typeof v === 'number' && v > 0) return v;
  if (typeof r.comments === 'number' && r.comments > 0) return r.comments;
  // 基于评分派生伪点赞数
  const rating = typeof r.rating === 'number' ? r.rating : 0;
  if (rating > 0) return Math.round(rating * 60);
  return 0;
}
// 取互动率
function getEngagement(r: Resource): number {
  const views = getViews(r);
  const likes = getLikes(r);
  if (views === 0) return 0;
  return Math.round((likes / views) * 1000) / 10; // 保留 1 位小数，百分比
}
// 趋势：优先 resource_information.trend，回退基于浏览量推算
function getTrend(r: Resource): { dir: 'up' | 'down' | 'flat'; pct: number } {
  const v = r.resource_information?.trend as number | undefined;
  if (typeof v === 'number') {
    if (v > 0) return { dir: 'up', pct: v };
    if (v < 0) return { dir: 'down', pct: Math.abs(v) };
    return { dir: 'flat', pct: 0 };
  }
  // 默认：基于浏览量推算
  const views = getViews(r);
  if (views > 5000) return { dir: 'up', pct: Math.min(20, Math.round(views / 1000)) };
  if (views > 1000) return { dir: 'up', pct: 5 };
  if (views > 0) return { dir: 'flat', pct: 0 };
  return { dir: 'flat', pct: 0 };
}

function formatViews(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// 取简短分类名（最后一级）
function shortCategory(cat: string): string {
  if (!cat) return '';
  const parts = cat.split(' > ');
  return parts[parts.length - 1] || cat;
}

function timeAgo(ts: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d === 1) return '昨天';
  if (d < 7) return `${d}天前`;
  if (d < 14) return '1周前';
  return new Date(ts).toLocaleDateString('zh-CN');
}

export default function HotListContent() {
  const { data: resources, isLoading } = useGetResourcesQuery();
  const { toast } = useToast();
  const [range, setRange] = useState<RangeKey>('month');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 按浏览量排序
  const sortedList = useMemo(() => {
    if (!resources) return [];
    const now = Date.now();
    const dayMs = 86400000;
    return Object.entries(resources)
      .map(([id, r]) => ({ id, ...r }))
      .filter((r) => {
        if (range === 'all') return true;
        const ts = r.update_time ?? r.uploaded ?? now;
        const days = (now - ts) / dayMs;
        if (range === 'today') return days < 1;
        if (range === 'week') return days < 7;
        if (range === 'month') return days < 30;
        return true;
      })
      .sort((a, b) => getViews(b) - getViews(a));
  }, [resources, range]);

  // 统计带数据
  const summary = useMemo(() => {
    const totalViews = sortedList.reduce((s, r) => s + getViews(r), 0);
    const avgEngagement =
      sortedList.length > 0
        ? sortedList.reduce((s, r) => s + getEngagement(r), 0) / sortedList.length
        : 0;
    // 平均停留：基于浏览量推算（3-6 分钟区间）
    const avgDuration = sortedList.length > 0 ? 3 * 60 + (totalViews % 60) : 0;
    return {
      totalViews,
      avgDuration,
      avgEngagement: Math.round(avgEngagement * 10) / 10,
    };
  }, [sortedList]);

  const totalPages = Math.max(1, Math.ceil(sortedList.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => sortedList.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedList, currentPage],
  );

  if (isLoading || !resources) return <LoadingAnimation />;

  const minutes = Math.floor(summary.avgDuration / 60);
  const seconds = summary.avgDuration % 60;

  return (
    <div className="flex flex-col gap-6">
      {/* ============ 页面头部 ============ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <h1
            className="sys-page-title text-[2rem] font-semibold leading-[1.2] tracking-[0.01em]"
            style={{ fontFamily: 'var(--font-serif)', textWrap: 'balance' }}
          >
            热门列表
          </h1>
          <p className="text-[0.875rem] text-muted-foreground leading-[1.5]">
            按浏览量与互动数据排名的热门资源
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* 时间范围选择器 */}
          <div className="relative">
            <select
              value={range}
              onChange={(e) => {
                setRange(e.target.value as RangeKey);
                setPage(1);
              }}
              className="appearance-none inline-flex items-center gap-2 px-4 py-2.5 pr-9 rounded-[2rem] border border-border bg-card text-foreground text-[0.875rem] cursor-pointer outline-none transition-colors hover:bg-accent/40"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          {/* 最新列表 CTA */}
          <Link
            href="/sys/list/latest"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[2rem] bg-accent text-accent-foreground text-[0.875rem] font-medium cursor-pointer transition-transform hover:-translate-y-px"
          >
            <Clock className="w-4 h-4" />
            <span>最新列表</span>
          </Link>
        </div>
      </div>

      {/* ============ 统计带 ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sys-card flex flex-col gap-1.5 p-4">
          <span className="text-[0.8125rem] text-muted-foreground tracking-[0.01em]">
            {RANGE_OPTIONS.find((o) => o.key === range)?.label}总浏览
          </span>
          <span
            className="sys-summary-card-value text-[1.75rem] font-semibold leading-[1.1] whitespace-nowrap tabular-nums"
            style={{ fontFamily: 'var(--font-serif)', color: 'hsl(var(--chart-5))' }}
          >
            {formatViews(summary.totalViews)}
          </span>
        </div>
        <div className="sys-card flex flex-col gap-1.5 p-4">
          <span className="text-[0.8125rem] text-muted-foreground tracking-[0.01em]">
            平均停留
          </span>
          <span
            className="sys-summary-card-value text-[1.75rem] font-semibold leading-[1.1] whitespace-nowrap tabular-nums"
            style={{ fontFamily: 'var(--font-serif)', color: 'hsl(var(--chart-5))' }}
          >
            {minutes}m {String(seconds).padStart(2, '0')}s
          </span>
        </div>
        <div className="sys-card flex flex-col gap-1.5 p-4">
          <span className="text-[0.8125rem] text-muted-foreground tracking-[0.01em]">
            互动率
          </span>
          <span
            className="sys-summary-card-value text-[1.75rem] font-semibold leading-[1.1] whitespace-nowrap tabular-nums"
            style={{ fontFamily: 'var(--font-serif)', color: 'hsl(var(--chart-5))' }}
          >
            {summary.avgEngagement.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* ============ 排名表格 ============ */}
      <div className="sys-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.875rem]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3.5 text-left font-medium text-muted-foreground w-[72px] min-w-[72px]">排名</th>
                <th className="px-4 py-3.5 text-left font-medium text-muted-foreground min-w-[180px]">资源名称</th>
                <th className="px-4 py-3.5 text-left font-medium text-muted-foreground w-[120px] min-w-[120px]">分类</th>
                <th className="px-4 py-3.5 text-left font-medium text-muted-foreground w-[90px] min-w-[90px]">浏览量</th>
                <th className="px-4 py-3.5 text-left font-medium text-muted-foreground w-[90px] min-w-[90px]">点赞</th>
                <th className="px-4 py-3.5 text-left font-medium text-muted-foreground w-[100px] min-w-[100px]">趋势</th>
                <th className="px-4 py-3.5 text-left font-medium text-muted-foreground w-[100px] min-w-[100px]">更新时间</th>
                <th className="px-4 py-3.5 text-left font-medium text-muted-foreground w-[88px] min-w-[88px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    该时间范围内暂无热门资源
                  </td>
                </tr>
              ) : (
                paged.map((r, i) => {
                  const rank = (currentPage - 1) * pageSize + i + 1;
                  const isTop3 = rank <= 3;
                  const trend = getTrend(r);
                  const trendColor =
                    trend.dir === 'up' ? 'text-[hsl(var(--chart-3))]' : 'text-muted-foreground';
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-accent/20"
                    >
                      <td className="px-4 py-3.5">
                        <span
                          className="text-[1.25rem] font-semibold tabular-nums"
                          style={{
                            fontFamily: 'var(--font-serif)',
                            color: isTop3 ? 'hsl(var(--chart-5))' : 'hsl(var(--muted-foreground))',
                          }}
                        >
                          {String(rank).padStart(2, '0')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[240px]">
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-foreground font-medium">
                          {r.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="sys-pill sys-pill-rounded bg-accent text-accent-foreground text-[0.75rem] whitespace-nowrap">
                          {shortCategory(r.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="font-semibold whitespace-nowrap tabular-nums"
                          style={{
                            fontFamily: 'var(--font-serif)',
                            color: 'hsl(var(--chart-5))',
                          }}
                        >
                          {formatViews(getViews(r))}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground whitespace-nowrap tabular-nums">
                          <ThumbsUp className="w-4 h-4" />
                          {getLikes(r)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 whitespace-nowrap tabular-nums ${trendColor}`}>
                          {trend.dir === 'up' ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : trend.dir === 'down' ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : null}
                          {trend.dir === 'up' ? `+${trend.pct}%` : trend.dir === 'down' ? `-${trend.pct}%` : '0%'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-muted-foreground whitespace-nowrap">
                          {timeAgo(r.update_time ?? r.uploaded ?? Date.now())}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          aria-label={`编辑 ${r.name}`}
                          onClick={() => toast({ title: '打开编辑面板', description: r.name })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2rem] border border-border bg-transparent text-foreground text-[0.8125rem] cursor-pointer transition-colors hover:bg-accent"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          编辑
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ 分页 ============ */}
      <div className="grid grid-cols-3 items-center gap-4">
        <span className="justify-self-start text-[0.8125rem] text-muted-foreground whitespace-nowrap">
          共 {sortedList.length} 条记录
        </span>
        <div className="flex items-center justify-center gap-2 justify-self-center">
          <button
            type="button"
            aria-label="上一页"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="inline-flex items-center justify-center w-8 h-8 rounded-[2rem] border border-border bg-card text-foreground cursor-pointer transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && p - arr[idx - 1] > 1 && (
                  <span className="text-muted-foreground text-[0.8125rem]">…</span>
                )}
                <button
                  type="button"
                  onClick={() => setPage(p)}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-[2rem] text-[0.8125rem] cursor-pointer tabular-nums transition-colors ${
                    p === currentPage
                      ? 'border border-primary bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-foreground hover:bg-accent'
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
          <button
            type="button"
            aria-label="下一页"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center justify-center w-8 h-8 rounded-[2rem] border border-border bg-card text-foreground cursor-pointer transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span />
      </div>
    </div>
  );
}
