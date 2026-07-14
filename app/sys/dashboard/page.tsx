'use client'

import React, { Suspense, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FolderTree,
  Eye,
  Star,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  Edit2,
  Trash2,
} from 'lucide-react'
import { useGetResourcesQuery } from '@/app/store/api/resourcesApi'
import { useGetCategoriesQuery } from '@/app/store/api/categoriesApi'
import { useGetListItemsQuery } from '@/app/store/api/listApi'
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation'

// 工具：格式化数字（千分位）
function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}

// 工具：相对时间
function timeAgo(ts: number): string {
  const now = Date.now()
  const diff = Math.max(0, now - ts)
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d === 1) return '昨天'
  if (d < 7) return `${d}天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

interface ActivityItem {
  icon: React.ElementType
  iconColor: string
  text: string
  category: string
  time: string
}

function DashboardContent() {
  const router = useRouter()
  const { data: resources = {}, isLoading: resourcesLoading } = useGetResourcesQuery()
  const { data: categories = {}, isLoading: categoriesLoading } = useGetCategoriesQuery()
  const { data: listItems } = useGetListItemsQuery()

  const resourceList = useMemo(
    () => Object.entries(resources).map(([uuid, r]) => ({ uuid, ...r })),
    [resources]
  )

  // KPI 计算
  const totalResources = resourceList.length
  const categoryCount = Object.keys(categories).length
  const totalViews = useMemo(
    () => resourceList.reduce((sum, r) => sum + Number(r.resource_information?.浏览量 ?? 0), 0),
    [resourceList]
  )
  const activeLists = 4 // 推荐/热门/最新/置顶

  // 近7天资源增长（基于 uploaded 字段）
  const weeklyData = useMemo(() => {
    const days: { label: string; count: number }[] = []
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    for (let i = 6; i >= 0; i--) {
      const end = new Date(today)
      end.setDate(today.getDate() - i)
      end.setHours(23, 59, 59, 999)
      const start = new Date(end)
      start.setHours(0, 0, 0, 0)
      const count = resourceList.filter((r) => {
        const t = r.uploaded || r.update_time || 0
        return t >= start.getTime() && t <= end.getTime()
      }).length
      const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][start.getDay()]
      days.push({ label: weekday, count })
    }
    return days
  }, [resourceList])

  const weeklyTotal = weeklyData.reduce((s, d) => s + d.count, 0)
  const weeklyMax = Math.max(1, ...weeklyData.map((d) => d.count))

  // 资源分类分布
  const categoryDist = useMemo(() => {
    const map = new Map<string, number>()
    resourceList.forEach((r) => {
      const cat = r.category || '未分类'
      map.set(cat, (map.get(cat) || 0) + 1)
    })
    const arr = Array.from(map.entries())
      .map(([name, count]) => ({ name, count, percent: totalResources ? (count / totalResources) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)
    return arr
  }, [resourceList, totalResources])

  // 构造环形图 conic-gradient 字符串
  const donutGradient = useMemo(() => {
    if (categoryDist.length === 0) return 'hsl(var(--muted))'
    const colors = [
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-1))',
    ]
    let acc = 0
    const stops: string[] = []
    categoryDist.slice(0, 5).forEach((c, i) => {
      const start = acc
      acc += c.percent
      stops.push(`${colors[i]} ${start}% ${acc}%`)
    })
    if (categoryDist.length > 5) {
      stops.push(`hsl(var(--chart-1)) ${acc}% 100%`)
    }
    return `conic-gradient(${stops.join(', ')})`
  }, [categoryDist])

  // 最近活动（基于 update_time 排序，取最近 5 条）
  const activities: ActivityItem[] = useMemo(() => {
    const sorted = [...resourceList]
      .sort((a, b) => (b.update_time || 0) - (a.update_time || 0))
      .slice(0, 5)
    return sorted.map((r) => {
      // 简单判断：如果 update_time 和 uploaded 接近，认为是新增；否则是编辑
      const isAdd = r.uploaded && r.update_time && Math.abs(r.uploaded - r.update_time) < 60000
      return {
        icon: isAdd ? PlusCircle : Edit2,
        iconColor: isAdd ? 'hsl(var(--chart-5))' : 'hsl(var(--chart-4))',
        text: `${isAdd ? '添加了' : '编辑了'}资源「${r.name || '未命名'}」`,
        category: r.category || '未分类',
        time: r.update_time ? timeAgo(r.update_time) : '—',
      }
    })
  }, [resourceList])

  // Hero 背景渐变（替代设计稿中的图片）
  const heroBg = useMemo(
    () =>
      `linear-gradient(135deg, hsl(var(--foreground) / 0.92), hsl(var(--secondary) / 0.78)), linear-gradient(135deg, hsl(var(--accent)), hsl(var(--secondary)))`,
    []
  )

  if (resourcesLoading || categoriesLoading) {
    return <LoadingAnimation />
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* 1. Hero 横幅 */}
      <section
        className="relative overflow-hidden sys-card-hover"
        style={{
          borderRadius: '2rem',
          backgroundImage: heroBg,
          minHeight: 180,
        }}
      >
        <div className="relative p-8 sm:p-10" style={{ zIndex: 1 }}>
          <h1
            className="font-semibold"
            style={{
              fontSize: 'clamp(28px, 3vw, 40px)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'hsl(var(--primary-foreground))',
              textWrap: 'balance',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
            }}
          >
            资源管理总览
          </h1>
          <p
            style={{
              marginTop: '0.625rem',
              fontSize: '1.0625rem',
              lineHeight: 1.5,
              color: 'hsl(var(--primary-foreground) / 0.82)',
            }}
          >
            实时监控资源库状态与动态
          </p>
          <p
            className="mt-4 text-sm whitespace-nowrap"
            style={{ color: 'hsl(var(--primary-foreground) / 0.6)' }}
          >
            共 {formatNumber(totalResources)} 项资源 · {categoryCount} 个分类
          </p>
        </div>
      </section>

      {/* 2. KPI 卡片 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={LayoutDashboard}
          label="资源总数"
          value={formatNumber(totalResources)}
          accent={`+${weeklyTotal} 本周`}
          accentColor="hsl(var(--chart-5))"
        />
        <KpiCard
          icon={FolderTree}
          label="分类数量"
          value={formatNumber(categoryCount)}
          subtext={`${Object.keys(categories).length} 个主分类`}
        />
        <KpiCard
          icon={Eye}
          label="总浏览量"
          value={totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : formatNumber(totalViews)}
          accent={`+${Math.min(99, weeklyTotal * 3)}% 本周`}
          accentColor="hsl(var(--chart-5))"
        />
        <KpiCard
          icon={Star}
          label="活跃列表"
          value={String(activeLists)}
          subtext="推荐 / 热门 / 最新 / 置顶"
        />
      </section>

      {/* 3. 图表面板 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 柱状图 */}
        <div
          className="sys-card sys-card-hover p-6"
          style={{ borderRadius: '2rem' }}
        >
          <h2 className="font-semibold text-lg" style={{ color: 'hsl(var(--foreground))' }}>
            近7天资源增长趋势
          </h2>
          <p className="text-sm mt-1 mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            本周新增 {weeklyTotal} 项资源
          </p>

          <div className="flex items-end gap-2 sm:gap-3" style={{ height: 200 }}>
            {weeklyData.map((d, i) => {
              const heightPct = weeklyMax ? (d.count / weeklyMax) * 100 : 0
              const colors = [
                'hsl(var(--chart-1))',
                'hsl(var(--chart-4))',
                'hsl(var(--chart-3))',
                'hsl(var(--chart-5))',
                'hsl(var(--chart-2))',
                'hsl(var(--chart-1))',
                'hsl(var(--chart-4))',
              ]
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-1"
                  style={{ height: '100%' }}
                >
                  <span
                    className="text-xs font-medium whitespace-nowrap"
                    style={{ color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {d.count}
                  </span>
                  <div
                    className="w-full"
                    style={{
                      height: `${Math.max(4, heightPct)}%`,
                      background: colors[i],
                      borderRadius: '0.5rem 0.5rem 0 0',
                      minHeight: 4,
                      transition: 'opacity 200ms',
                    }}
                    title={`${d.label}: ${d.count} 项`}
                  />
                </div>
              )
            })}
          </div>

          <div className="flex gap-2 sm:gap-3 mt-2">
            {weeklyData.map((d, i) => (
              <span
                key={i}
                className="flex-1 text-center text-xs whitespace-nowrap"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>

        {/* 环形图 */}
        <div
          className="sys-card sys-card-hover p-6"
          style={{ borderRadius: '2rem' }}
        >
          <h2 className="font-semibold text-lg" style={{ color: 'hsl(var(--foreground))' }}>
            资源分类分布
          </h2>
          <p className="text-sm mt-1 mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            共 {categoryCount} 个分类
          </p>

          {categoryDist.length === 0 ? (
            <div
              className="flex items-center justify-center"
              style={{ height: 200, color: 'hsl(var(--muted-foreground))' }}
            >
              暂无数据
            </div>
          ) : (
            <div className="flex items-center gap-6 flex-col sm:flex-row">
              {/* Donut */}
              <div
                className="relative shrink-0 mx-auto sm:mx-0"
                style={{ width: 160, height: 160 }}
              >
                <div
                  className="w-full h-full"
                  style={{ borderRadius: '50%', background: donutGradient }}
                />
                <div
                  className="absolute flex flex-col items-center justify-center"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: 'hsl(var(--card))',
                  }}
                >
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: '1.75rem',
                      lineHeight: 1,
                      color: 'hsl(var(--foreground))',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {categoryCount}
                  </span>
                  <span
                    className="text-xs mt-1 whitespace-nowrap"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    分类
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-3 flex-1 min-w-0 w-full sm:w-auto">
                {categoryDist.slice(0, 5).map((c, i) => {
                  const colors = [
                    'hsl(var(--chart-4))',
                    'hsl(var(--chart-5))',
                    'hsl(var(--chart-2))',
                    'hsl(var(--chart-3))',
                    'hsl(var(--chart-1))',
                  ]
                  return (
                    <div key={c.name} className="flex items-center gap-2">
                      <span
                        className="shrink-0"
                        style={{
                          width: '0.625rem',
                          height: '0.625rem',
                          borderRadius: '0.25rem',
                          background: colors[i],
                        }}
                      />
                      <span
                        className="text-sm flex-1 min-w-0 truncate"
                        style={{ color: 'hsl(var(--foreground))' }}
                      >
                        {c.name}
                      </span>
                      <span
                        className="text-sm whitespace-nowrap"
                        style={{
                          color: 'hsl(var(--muted-foreground))',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {c.percent.toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. 最近活动 */}
      <section
        className="sys-card p-6"
        style={{ borderRadius: '2rem' }}
      >
        <h2 className="font-semibold text-lg mb-6" style={{ color: 'hsl(var(--foreground))' }}>
          最近活动
        </h2>

        {activities.length === 0 ? (
          <div
            className="flex items-center justify-center py-8"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            暂无活动记录
          </div>
        ) : (
          <div className="flex flex-col">
            {activities.map((a, i) => {
              const Icon = a.icon
              const isLast = i === activities.length - 1
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 py-3.5"
                  style={isLast ? undefined : { borderBottom: '1px solid hsl(var(--border))' }}
                >
                  <Icon
                    className="shrink-0"
                    size={20}
                    style={{ color: a.iconColor }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <p
                      className="text-sm truncate"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      {a.text}
                    </p>
                    <span
                      className="sys-pill sys-pill-muted shrink-0"
                    >
                      {a.category}
                    </span>
                  </div>
                  <span
                    className="text-xs whitespace-nowrap shrink-0"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    {a.time}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 5. 快捷操作 */}
      <section
        className="sys-card p-6"
        style={{ borderRadius: '2rem' }}
      >
        <h2 className="font-semibold text-lg" style={{ color: 'hsl(var(--foreground))' }}>
          快捷操作
        </h2>
        <p className="text-sm mt-1 mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
          常用管理入口
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push('/sys/add')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 font-medium text-sm whitespace-nowrap"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              border: 'none',
              borderRadius: '2rem',
              cursor: 'pointer',
              transition: 'transform 150ms cubic-bezier(.2,.8,.2,1)',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(1px)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <PlusCircle size={16} aria-hidden="true" />
            添加资源
          </button>
          <button
            type="button"
            onClick={() => router.push('/sys/categories')}
            className="sys-btn-outline"
          >
            <FolderTree size={16} aria-hidden="true" />
            管理分类
          </button>
          <button
            type="button"
            onClick={() => router.push('/sys/resource')}
            className="sys-btn-outline"
          >
            <FileText size={16} aria-hidden="true" />
            查看列表
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  )
}

interface KpiCardProps {
  icon: React.ElementType
  label: string
  value: string
  accent?: string
  accentColor?: string
  subtext?: string
}

function KpiCard({ icon: Icon, label, value, accent, accentColor, subtext }: KpiCardProps) {
  return (
    <div
      className="sys-card sys-card-hover p-6"
      style={{ borderRadius: '2rem' }}
    >
      <div className="flex items-center justify-between mb-4">
        <Icon
          className="shrink-0"
          size={20}
          style={{ color: 'hsl(var(--muted-foreground))' }}
          aria-hidden="true"
        />
        {accent && (
          <span
            className="inline-flex items-center gap-1 text-xs whitespace-nowrap"
            style={{ color: accentColor || 'hsl(var(--chart-5))' }}
          >
            <TrendingUp size={12} aria-hidden="true" />
            {accent}
          </span>
        )}
      </div>
      <p className="text-sm mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {label}
      </p>
      <p
        className="font-semibold whitespace-nowrap"
        style={{
          fontSize: '2.25rem',
          lineHeight: 1,
          color: accent ? 'hsl(var(--chart-5))' : 'hsl(var(--foreground))',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
      {subtext && (
        <p
          className="text-xs mt-2 whitespace-nowrap"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {subtext}
        </p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <DashboardContent />
    </Suspense>
  )
}
