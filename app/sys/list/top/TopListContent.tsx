'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  GripVertical,
  Pin,
  X,
  ExternalLink,
  Search,
  LayoutDashboard,
  Image as ImageIcon,
} from 'lucide-react';
import { useGetResourcesQuery } from '@/app/store/api/resourcesApi';
import { useToast } from '@/hooks/use-toast';
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation';
import type { Resource } from '@/app/sys/add/types';

const MAX_PINS = 10;

function getThumb(r: Resource): string {
  if (Array.isArray(r.images) && r.images.length > 0) return r.images[0];
  return '';
}

// 取访问链接：优先 link 字段，回退 source_links 的第一个
function getLink(r: Resource): string {
  if (r.link) return r.link;
  if (r.source_links) {
    const first = Object.values(r.source_links)[0];
    if (first?.link) return first.link;
  }
  return '';
}

// 取简短分类名（最后一级）
function shortCategory(cat: string): string {
  if (!cat) return '';
  const parts = cat.split(' > ');
  return parts[parts.length - 1] || cat;
}

export default function TopListContent() {
  const { data: resources, isLoading } = useGetResourcesQuery();
  const { toast } = useToast();

  // 置顶顺序：id 数组
  const [pinnedOrder, setPinnedOrder] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // 全部资源列表
  const allResources = useMemo(() => {
    if (!resources) return [];
    return Object.entries(resources).map(([id, r]) => ({ id, ...r }));
  }, [resources]);

  // 已置顶资源（按 pinnedOrder 顺序）
  const pinnedList = useMemo(() => {
    return pinnedOrder
      .map((id) => allResources.find((r) => r.id === id))
      .filter((r): r is (typeof allResources)[number] => Boolean(r));
  }, [pinnedOrder, allResources]);

  // 可置顶资源（未置顶，且匹配搜索）
  const unpinnedList = useMemo(() => {
    return allResources
      .filter((r) => !pinnedOrder.includes(r.id))
      .filter((r) => {
        if (!search.trim()) return true;
        return r.name.toLowerCase().includes(search.trim().toLowerCase());
      });
  }, [allResources, pinnedOrder, search]);

  // 拖拽
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...pinnedOrder];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(index);
    setPinnedOrder(next);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    toast({ title: '置顶顺序已更新', variant: 'default' });
  };

  // 置顶
  const handlePin = (id: string, name: string) => {
    if (pinnedOrder.length >= MAX_PINS) {
      toast({
        title: '已达置顶上限',
        description: `最多展示 ${MAX_PINS} 个资源`,
        variant: 'destructive',
      });
      return;
    }
    setPinnedOrder((prev) => [...prev, id]);
    toast({ title: '已置顶', description: name, variant: 'default' });
  };
  // 取消置顶
  const handleUnpin = (id: string, name: string) => {
    setPinnedOrder((prev) => prev.filter((x) => x !== id));
    toast({ title: '已取消置顶', description: name, variant: 'default' });
  };

  if (isLoading || !resources) return <LoadingAnimation />;

  const used = pinnedList.length;
  const remaining = MAX_PINS - used;
  const progressPct = Math.round((used / MAX_PINS) * 100);

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
      {/* ===== 页面头部 ===== */}
      <header className="flex flex-col gap-2">
        <h1
          className="sys-page-title font-semibold leading-[1.18] tracking-[-0.02em]"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(28px, 3vw, 40px)',
            textWrap: 'balance',
          }}
        >
          置顶列表
        </h1>
        <p className="text-[0.9375rem] leading-[1.6] text-muted-foreground">
          拖拽调整置顶顺序，最多展示 {MAX_PINS} 个资源
        </p>
      </header>

      {/* ===== 统计带 ===== */}
      <section
        className="sys-card flex items-center gap-4 flex-wrap p-4 px-5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[0.8125rem] text-muted-foreground whitespace-nowrap">
            当前置顶资源
          </span>
          <span
            className="text-[1.25rem] font-semibold whitespace-nowrap tabular-nums tracking-[0.01em]"
            style={{ fontFamily: 'var(--font-serif)', color: 'hsl(var(--foreground))' }}
          >
            {used} <span className="text-muted-foreground font-normal">/ {MAX_PINS}</span>
          </span>
        </div>
        {/* 进度条 */}
        <div
          className="flex-1 min-w-[140px] h-2 rounded-full overflow-hidden"
          style={{ background: 'hsl(var(--muted))' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progressPct}%`,
              background: 'hsl(var(--secondary))',
              transition: 'width 320ms cubic-bezier(.3,0,0,1)',
            }}
          />
        </div>
        {/* 添加置顶按钮 */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('unpinned-section');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 bg-primary text-primary-foreground rounded-[2rem] px-[1.125rem] py-2.5 text-[0.875rem] font-semibold tracking-[0.01em] cursor-pointer transition-transform hover:-translate-y-px"
        >
          <Plus className="w-4 h-4" />
          <span>添加置顶</span>
        </button>
      </section>

      {/* ===== 置顶卡片网格 ===== */}
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pinnedList.map((r, index) => {
            const thumb = getThumb(r);
            return (
              <article
                key={r.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`sys-card sys-card-hover flex flex-col gap-3 p-4 ${
                  dragIndex === index ? 'opacity-50' : ''
                }`}
                style={{ cursor: 'grab' }}
              >
                {/* 顶部：手柄 | 徽章 | 取消置顶 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-[2rem] px-2.5 py-0.5 text-[0.75rem] font-semibold tracking-[0.01em]"
                      style={{
                        background: 'hsl(var(--secondary))',
                        color: 'hsl(var(--secondary-foreground))',
                      }}
                    >
                      <Pin className="w-3 h-3 fill-current" />
                      <span className="tabular-nums">置顶 #{index + 1}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="取消置顶"
                    onClick={() => handleUnpin(r.id, r.name)}
                    className="sys-touch-target inline-flex items-center justify-center shrink-0 w-8 h-8 rounded-[2rem] cursor-pointer transition-colors"
                    style={{
                      border: '1px solid hsl(var(--secondary))',
                      background: 'hsl(var(--secondary))',
                      color: 'hsl(var(--secondary-foreground))',
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* 缩略图 */}
                {thumb ? (
                  <img
                    src={thumb}
                    alt={r.name}
                    className="w-full h-[140px] object-cover rounded-[2rem] block"
                  />
                ) : (
                  <div className="w-full h-[140px] rounded-[2rem] bg-muted flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                {/* 内容 */}
                <div className="flex flex-col gap-2 min-w-0">
                  <h3
                    className="truncate text-[1.0625rem] font-semibold leading-[1.3]"
                    style={{ fontFamily: 'var(--font-serif)', letterSpacing: '0.01em' }}
                  >
                    {r.name}
                  </h3>
                  <span className="sys-pill sys-pill-muted self-start whitespace-nowrap text-[0.75rem]">
                    {shortCategory(r.category)}
                  </span>
                  <p className="text-[0.8125rem] leading-[1.5] text-muted-foreground">
                    {r.introduction || '暂无描述'}
                  </p>
                </div>
                {/* 访问链接 */}
                {(() => {
                  const link = getLink(r);
                  return link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 whitespace-nowrap self-start text-[0.8125rem] font-medium pt-0.5 hover:underline"
                      style={{ color: 'hsl(var(--primary))' }}
                    >
                      <span>访问链接</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null;
                })()}
              </article>
            );
          })}

          {/* 空位卡片（仅当有空位时显示，占满整行） */}
          {remaining > 0 && (
            <article
              className="md:col-span-2 flex flex-col items-center justify-center gap-3 text-center rounded-[2rem] p-7 px-6"
              style={{
                background: 'hsl(var(--card))',
                border: `1px dashed hsl(var(--border))`,
              }}
            >
              <div
                className="w-[120px] h-[120px] rounded-full flex items-center justify-center text-muted-foreground"
                style={{ background: 'hsl(var(--muted))' }}
              >
                <Plus className="w-10 h-10" />
              </div>
              <p className="text-[0.9375rem] text-muted-foreground">
                还有 {remaining} 个空位
              </p>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('unpinned-section');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2rem] px-4 py-2 text-[0.8125rem] font-medium cursor-pointer transition-colors hover:bg-accent/40"
                style={{
                  background: 'transparent',
                  border: `1px dashed hsl(var(--border))`,
                  color: 'hsl(var(--foreground))',
                }}
              >
                <Plus className="w-4 h-4" />
                <span>添加置顶资源</span>
              </button>
            </article>
          )}

          {/* 空状态：还未置顶任何资源 */}
          {used === 0 && (
            <article
              className="md:col-span-2 flex flex-col items-center justify-center gap-3 text-center rounded-[2rem] p-10"
              style={{
                background: 'hsl(var(--card))',
                border: `1px dashed hsl(var(--border))`,
              }}
            >
              <Pin className="w-10 h-10 text-muted-foreground" />
              <p className="text-[0.9375rem] text-muted-foreground">
                还没有置顶资源，从下方列表中选择添加
              </p>
            </article>
          )}
        </div>
      </section>

      {/* ===== 可置顶资源列表 ===== */}
      <section id="unpinned-section" className="flex flex-col gap-3 scroll-mt-20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
            <h2
              className="text-[1.125rem] font-semibold"
              style={{ fontFamily: 'var(--font-serif)', letterSpacing: '0.01em' }}
            >
              可置顶资源
            </h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[2rem] border border-border bg-card flex-1 min-w-[180px] max-w-[20rem]">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索资源..."
              className="flex-1 bg-transparent outline-none text-[0.8125rem] text-foreground placeholder:text-muted-foreground min-w-0"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {unpinnedList.length === 0 ? (
            <div className="sys-card flex items-center justify-center py-10 text-[0.875rem] text-muted-foreground">
              {search ? '没有匹配的资源' : '所有资源均已置顶'}
            </div>
          ) : (
            unpinnedList.map((r) => {
              const thumb = getThumb(r);
              return (
                <div
                  key={r.id}
                  className="sys-card flex items-center gap-3 p-2.5 px-3.5 transition-colors hover:border-accent"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={r.name}
                      className="w-12 h-12 object-cover rounded-[2rem] shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-[2rem] bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="truncate text-[0.875rem] font-medium text-foreground whitespace-nowrap min-w-0">
                      {r.name}
                    </span>
                    <span className="sys-pill sys-pill-muted whitespace-nowrap text-[0.6875rem]">
                      {shortCategory(r.category)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePin(r.id, r.name)}
                    className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 bg-transparent border border-border rounded-[2rem] px-3 py-1.5 text-[0.75rem] font-medium text-muted-foreground cursor-pointer transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>置顶</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ===== 返回仪表盘 ===== */}
      <div className="flex justify-center pt-2">
        <Link
          href="/sys/dashboard"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-muted-foreground text-[0.875rem] px-4 py-2 rounded-[2rem] font-medium hover:bg-accent/30 transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>返回仪表盘</span>
        </Link>
      </div>
    </div>
  );
}
