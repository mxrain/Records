'use client'

import React, { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronDown,
  LayoutGrid,
  Eye,
  ExternalLink,
  Search,
} from 'lucide-react'
import { useGetResourcesQuery } from '@/app/store/api/resourcesApi'
import { useGetCategoriesQuery } from '@/app/store/api/categoriesApi'
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation'

const PAGE_SIZE = 9

type SortKey = 'latest' | 'oldest' | 'name'

function ResourceListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryFromUrl = searchParams?.get('q') || ''

  const { data: resources = {}, isLoading } = useGetResourcesQuery()
  const { data: categories = {} } = useGetCategoriesQuery()

  const [search, setSearch] = useState(queryFromUrl)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('latest')
  const [page, setPage] = useState(1)

  // 同步 URL 查询参数到搜索框
  React.useEffect(() => {
    setSearch(queryFromUrl)
    setPage(1)
  }, [queryFromUrl])

  // 过滤、排序、分页
  const filtered = useMemo(() => {
    const list = Object.entries(resources).map(([uuid, r]) => ({ uuid, ...r }))
    const filteredList = list.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const inName = (r.name || '').toLowerCase().includes(q)
        const inIntro = (r.introduction || '').toLowerCase().includes(q)
        const inCat = (r.category || '').toLowerCase().includes(q)
        if (!inName && !inIntro && !inCat) return false
      }
      return true
    })
    filteredList.sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '', 'zh-CN')
      if (sort === 'oldest') return (a.uploaded || 0) - (b.uploaded || 0)
      return (b.uploaded || b.update_time || 0) - (a.uploaded || a.update_time || 0)
    })
    return filteredList
  }, [resources, categoryFilter, search, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const categoryNames = useMemo(() => Object.keys(categories), [categories])

  if (isLoading) {
    return <LoadingAnimation />
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索框 */}
        <div
          className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md"
          style={{
            padding: '0.5rem 0.875rem',
            borderRadius: '2rem',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
          }}
        >
          <Search size={16} style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
          <input
            type="text"
            placeholder="搜索资源..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            aria-label="搜索资源"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'hsl(var(--foreground))',
              fontSize: '0.875rem',
              minWidth: 0,
            }}
          />
        </div>

        {/* 分类筛选 */}
        <FilterDropdown
          label={categoryFilter === 'all' ? '全部分类' : categoryFilter}
          value={categoryFilter}
          options={[{ value: 'all', label: '全部分类' }, ...categoryNames.map((n) => ({ value: n, label: n }))]}
          onChange={(v) => { setCategoryFilter(v); setPage(1) }}
        />

        {/* 排序 */}
        <FilterDropdown
          label={sort === 'latest' ? '最近更新' : sort === 'oldest' ? '最早添加' : '名称排序'}
          value={sort}
          options={[
            { value: 'latest', label: '最近更新' },
            { value: 'oldest', label: '最早添加' },
            { value: 'name', label: '名称排序' },
          ]}
          onChange={(v) => { setSort(v as SortKey); setPage(1) }}
        />
      </div>

      {/* 卡片网格 */}
      {pageItems.length === 0 ? (
        <div
          className="sys-card flex flex-col items-center justify-center py-16"
          style={{ borderRadius: '2rem', color: 'hsl(var(--muted-foreground))' }}
        >
          <Search size={48} aria-hidden="true" style={{ opacity: 0.4, marginBottom: 12 }} />
          <p className="text-sm">没有找到匹配的资源</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pageItems.map((r) => (
            <ResourceCard key={r.uuid} resource={r} />
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 pt-2">
          <PageButton
            disabled={safePage === 1}
            onClick={() => setPage(safePage - 1)}
            label="上一页"
          >
            <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} aria-hidden="true" />
          </PageButton>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              // 显示首页、末页、当前页前后2页
              if (p === 1 || p === totalPages) return true
              if (Math.abs(p - safePage) <= 1) return true
              return false
            })
            .map((p, idx, arr) => {
              const prev = arr[idx - 1]
              const showEllipsis = prev && p - prev > 1
              return (
                <React.Fragment key={p}>
                  {showEllipsis && (
                    <span
                      className="px-2 text-sm"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      ...
                    </span>
                  )}
                  <PageButton
                    active={p === safePage}
                    onClick={() => setPage(p)}
                    label={`第 ${p} 页`}
                  >
                    {p}
                  </PageButton>
                </React.Fragment>
              )
            })}
          <PageButton
            disabled={safePage === totalPages}
            onClick={() => setPage(safePage + 1)}
            label="下一页"
          >
            <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true" />
          </PageButton>
        </div>
      )}
    </div>
  )
}

interface ResourceCardProps {
  resource: {
    uuid: string
    name: string
    category?: string
    images?: string[]
    introduction?: string
    source_links?: Record<string, { link: string; psw: string; size: string }>
    resource_information?: Record<string, string | number>
    uploaded?: number
  }
}

function ResourceCard({ resource }: ResourceCardProps) {
  const router = useRouter()
  const thumb = resource.images?.[0]
  const firstLink = resource.source_links
    ? Object.values(resource.source_links)[0]
    : null
  const views = (resource.resource_information?.浏览量 as number) || 0

  return (
    <article
      className="sys-card sys-card-hover overflow-hidden flex flex-col cursor-pointer"
      style={{ borderRadius: '2rem' }}
      onClick={() => router.push(`/resource/${resource.uuid}`)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/resource/${resource.uuid}`)
        }
      }}
    >
      {/* 缩略图 */}
      <div
        className="relative overflow-hidden bg-gt-muted"
        style={{ height: 180 }}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={resource.name || '资源缩略图'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 300ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />
        ) : (
          <div
            className="flex items-center justify-center w-full h-full"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            <LayoutGrid size={40} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* 内容区 */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {resource.category && (
            <span className="sys-pill sys-pill-rounded">{resource.category}</span>
          )}
        </div>
        <h3
          className="font-semibold truncate"
          style={{ fontSize: '1.125rem', color: 'hsl(var(--foreground))' }}
        >
          {resource.name || '未命名资源'}
        </h3>
        <p
          className="text-sm"
          style={{
            color: 'hsl(var(--muted-foreground))',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.6rem',
          }}
        >
          {resource.introduction || '暂无简介'}
        </p>

        {/* 底部信息 */}
        <div
          className="flex items-center justify-between gap-2 pt-2 mt-auto"
          style={{ borderTop: '1px solid hsl(var(--border))' }}
        >
          {firstLink?.link ? (
            <a
              href={firstLink.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: 'hsl(var(--primary))' }}
            >
              <ExternalLink size={12} aria-hidden="true" />
              <span className="truncate" style={{ maxWidth: '8rem' }}>
                {(() => {
                  try {
                    return new URL(firstLink.link).hostname
                  } catch {
                    return '访问链接'
                  }
                })()}
              </span>
            </a>
          ) : (
            <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
              无链接
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 text-xs whitespace-nowrap"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            <Eye size={12} aria-hidden="true" />
            {views > 0 ? (views >= 1000 ? `${(views / 1000).toFixed(1)}K` : views) : '—'}
          </span>
        </div>
      </div>
    </article>
  )
}

interface FilterDropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        className="sys-btn-outline"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 mt-1 min-w-full shadow-lg z-20"
            style={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '1rem',
              padding: '0.375rem',
              minWidth: '10rem',
            }}
            role="listbox"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={value === opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className="block w-full text-left px-3 py-2 text-sm whitespace-nowrap"
                style={{
                  borderRadius: '0.625rem',
                  color: 'hsl(var(--popover-foreground))',
                  background: value === opt.value ? 'hsl(var(--accent) / 0.5)' : 'transparent',
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => {
                  if (value !== opt.value) e.currentTarget.style.background = 'hsl(var(--accent) / 0.3)'
                }}
                onMouseLeave={(e) => {
                  if (value !== opt.value) e.currentTarget.style.background = 'transparent'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface PageButtonProps {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
}

function PageButton({ children, active, disabled, onClick, label }: PageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center"
      style={{
        minWidth: '2.25rem',
        height: '2.25rem',
        padding: '0 0.625rem',
        borderRadius: '1rem',
        fontSize: '0.875rem',
        fontWeight: active ? 600 : 400,
        background: active ? 'hsl(var(--primary))' : 'transparent',
        color: active ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
        border: active ? 'none' : '1px solid hsl(var(--border))',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 150ms, transform 150ms',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) e.currentTarget.style.background = 'hsl(var(--accent) / 0.4)'
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

export default function ResourceListPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <ResourceListContent />
    </Suspense>
  )
}
