'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Plus,
  GripVertical,
  Star,
  X,
  ChevronDown,
  Search,
} from 'lucide-react';
import { useGetResourcesQuery } from '@/app/store/api/resourcesApi';
import { useGetCategoriesQuery } from '@/app/store/api/categoriesApi';
import { useToast } from '@/hooks/use-toast';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';
import type { Resource } from '@/app/sys/add/types';

// 计算推荐分数：rating 优先，回退到浏览量/100
function getScore(r: Resource): number {
  if (typeof r.rating === 'number' && r.rating > 0) return Math.round(r.rating);
  const views = (r.resource_information?.views as number) ?? 0;
  return Math.min(99, Math.max(60, Math.round(60 + views / 100)));
}

// 取简短分类名（最后一级）
function shortCategory(cat: string): string {
  if (!cat) return '';
  const parts = cat.split(' > ');
  return parts[parts.length - 1] || cat;
}

// 格式化分数显示
function formatScore(s: number): string {
  return `${s}分`;
}

// 缩略图回退
function getThumb(r: Resource): string {
  if (Array.isArray(r.images) && r.images.length > 0) return r.images[0];
  return '';
}

export default function RecommendListContent() {
  const { data: resources, isLoading } = useGetResourcesQuery();
  const { data: categories } = useGetCategoriesQuery();
  const { toast } = useToast();

  // 本地排序状态（拖拽后会更新）
  const [order, setOrder] = useState<string[] | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pinned' | 'normal'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // 推荐资源列表：按分数降序
  const recommendList = useMemo(() => {
    if (!resources) return [];
    const arr = Object.entries(resources).map(([id, r]) => ({ id, ...r }));
    const sorted = arr.sort((a, b) => getScore(b) - getScore(a));
    return sorted;
  }, [resources]);

  // 应用排序与筛选
  const visibleList = useMemo(() => {
    let list = recommendList;
    if (order) {
      list = order
        .map((id) => list.find((r) => r.id === id))
        .filter((r): r is typeof list[number] => Boolean(r));
    }
    if (statusFilter === 'pinned') list = list.filter((r) => pinned.has(r.id));
    else if (statusFilter === 'normal') list = list.filter((r) => !pinned.has(r.id));
    if (categoryFilter !== 'all') list = list.filter((r) => (r.category || '').split(' > ')[0] === categoryFilter || (r.category || '').startsWith(categoryFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return list;
  }, [recommendList, order, statusFilter, categoryFilter, search, pinned]);

  // 分类选项
  const categoryOptions = useMemo(() => {
    if (!categories) return [];
    return Object.keys(categories);
  }, [categories]);

  // 拖拽：开始
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };
  // 拖拽：经过
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...visibleList];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(index);
    setOrder(next.map((r) => r.id));
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    toast({ title: '排序已更新', variant: 'default' });
  };

  // 置顶/取消置顶
  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast({ title: '已取消置顶', variant: 'default' });
      } else {
        next.add(id);
        toast({ title: '已置顶', variant: 'default' });
      }
      return next;
    });
  };

  // 移除推荐
  const handleRemove = (id: string, name: string) => {
    setOrder((prev) => (prev ? prev.filter((x) => x !== id) : null));
    toast({
      title: '已从推荐列表移除',
      description: name,
      variant: 'destructive',
    });
  };

  if (isLoading || !resources) return <LoadingAnimation />;

  return (
    <div className="flex flex-col gap-6">
      {/* ==================== 页面头部 ==================== */}
      <div className="flex items-start justify-between gap-6 flex-wrap mb-0">
        <div className="min-w-0">
          <h1
            className="sys-page-title text-[2.25rem] font-semibold leading-[1.15] tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-serif)', textWrap: 'balance' }}
          >
            推荐列表
          </h1>
          <p className="text-[0.9375rem] text-muted-foreground leading-[1.6] mt-2">
            管理首页推荐资源，拖拽调整排序
          </p>
        </div>
        <Link
          href="/sys/list/hot"
          className="sys-btn-outline shrink-0 whitespace-nowrap"
        >
          <Flame className="w-4 h-4" />
          <span>热门列表</span>
        </Link>
      </div>

      {/* ==================== 筛选栏 ==================== */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 状态筛选 */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="appearance-none inline-flex items-center gap-2 px-4 py-2 pr-9 whitespace-nowrap rounded-[2rem] border border-border bg-card text-foreground text-[0.875rem] cursor-pointer outline-none transition-colors hover:bg-accent/40"
          >
            <option value="all">全部状态</option>
            <option value="pinned">已置顶</option>
            <option value="normal">普通推荐</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* 分类筛选 */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none inline-flex items-center gap-2 px-4 py-2 pr-9 whitespace-nowrap rounded-[2rem] border border-border bg-card text-foreground text-[0.875rem] cursor-pointer outline-none transition-colors hover:bg-accent/40"
          >
            <option value="all">全部分类</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* 搜索框 */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-[2rem] border border-border bg-card flex-1 min-w-[180px] max-w-[20rem]">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索推荐资源..."
            className="flex-1 bg-transparent outline-none text-[0.875rem] text-foreground placeholder:text-muted-foreground min-w-0"
          />
        </div>

        {/* 添加推荐 */}
        <button
          type="button"
          onClick={() => toast({ title: '打开添加推荐面板', variant: 'default' })}
          className="inline-flex items-center gap-2 px-4 py-2 ml-auto whitespace-nowrap rounded-[2rem] bg-primary text-primary-foreground text-[0.875rem] font-medium cursor-pointer transition-all hover:opacity-90 hover:-translate-y-px"
        >
          <Plus className="w-4 h-4" />
          <span>添加推荐</span>
        </button>
      </div>

      {/* ==================== 排名卡片列表 ==================== */}
      {visibleList.length === 0 ? (
        <div className="sys-card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-[0.9375rem] text-muted-foreground">
            {search || statusFilter !== 'all' || categoryFilter !== 'all'
              ? '没有符合条件的推荐资源'
              : '暂无推荐资源，点击"添加推荐"创建'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleList.map((r, index) => {
            const rank = index + 1;
            const score = getScore(r);
            const isPinned = pinned.has(r.id);
            const thumb = getThumb(r);
            return (
              <article
                key={r.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`sys-card sys-card-hover sys-rank-card flex items-center gap-3 p-4 ${
                  dragIndex === index ? 'opacity-50' : ''
                } ${isPinned ? 'border-accent' : ''}`}
                style={{ cursor: 'grab' }}
              >
                {/* 排名徽章 */}
                <div
                  className="sys-rank-badge flex items-center justify-center shrink-0 w-12 h-12 rounded-full bg-secondary text-secondary-foreground text-[1.25rem] font-semibold"
                  style={{ fontFamily: 'var(--font-serif)', letterSpacing: '0.01em' }}
                >
                  {String(rank).padStart(2, '0')}
                </div>

                {/* 拖拽手柄 */}
                <button
                  type="button"
                  aria-label="拖拽排序"
                  className="sys-touch-target inline-flex items-center justify-center shrink-0 p-2 border-none bg-transparent text-muted-foreground cursor-grab active:cursor-grabbing transition-colors hover:text-foreground"
                >
                  <GripVertical className="w-5 h-5" />
                </button>

                {/* 缩略图 */}
                {thumb ? (
                  <img
                    src={thumb}
                    alt={r.name}
                    className="sys-rank-thumb shrink-0 object-cover w-20 h-20 rounded-[2rem] border border-border"
                  />
                ) : (
                  <div className="sys-rank-thumb shrink-0 w-20 h-20 rounded-[2rem] border border-border bg-muted flex items-center justify-center text-muted-foreground">
                    <Star className="w-6 h-6" />
                  </div>
                )}

                {/* 标题+分类+描述 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className="truncate text-[1rem] font-semibold text-foreground"
                      style={{ fontFamily: 'var(--font-serif)', letterSpacing: '0.01em' }}
                    >
                      {r.name}
                    </h3>
                    <span className="sys-pill sys-pill-muted whitespace-nowrap text-[0.75rem]">
                      {shortCategory(r.category)}
                    </span>
                  </div>
                  <p className="truncate text-[0.875rem] text-muted-foreground leading-[1.5]">
                    {r.introduction || '暂无描述'}
                  </p>
                </div>

                {/* 分数 pill */}
                <div
                  className="inline-flex items-center justify-center shrink-0 whitespace-nowrap px-3 py-1 rounded-[2rem] bg-accent text-accent-foreground text-[0.875rem] font-semibold"
                  title="推荐分数"
                >
                  {formatScore(score)}
                </div>

                {/* 操作按钮 */}
                <div className="sys-rank-actions flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePin(r.id)}
                    aria-label={isPinned ? '取消置顶' : '置顶'}
                    className={`sys-touch-target inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-[2rem] border border-border bg-transparent cursor-pointer transition-colors hover:bg-accent ${
                      isPinned ? 'text-secondary' : 'text-muted-foreground'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(r.id, r.name)}
                    aria-label="移除"
                    className="sys-touch-target inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-[2rem] border border-border bg-transparent text-muted-foreground cursor-pointer transition-colors hover:bg-accent hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
