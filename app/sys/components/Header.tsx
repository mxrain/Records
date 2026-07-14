'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { addTab, removeTab, setActiveTab } from '@/app/store/features/tabs/tabsSlice'

interface HeaderProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onToggleMobile: () => void
}

// 路径到中文标题的映射（与设计稿页面标题一致）
const TITLE_MAP: Record<string, string> = {
  '/sys/dashboard': '仪表盘',
  '/sys/add': '添加资源',
  '/sys/categories': '分类管理',
  '/sys/list/recommend': '推荐列表',
  '/sys/list/hot': '热门列表',
  '/sys/list/latest': '最新列表',
  '/sys/list/top': '置顶列表',
  '/sys/settings': '系统设置',
  '/sys/storage': '对象存储',
  '/sys/api': 'API',
  '/sys/skill': 'Skill',
  '/sys/mcp': 'MCP',
}

const Header: React.FC<HeaderProps> = () => {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { tabs, activeTab } = useAppSelector((state) => state.tabs)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 路由变化时同步添加 tab
  useEffect(() => {
    if (!isMounted || !pathname) return
    const title = TITLE_MAP[pathname]
    if (title) {
      dispatch(addTab({ path: pathname, title }))
    }
  }, [pathname, isMounted, dispatch])

  const handleTabClick = (path: string) => {
    dispatch(setActiveTab(path))
    router.push(path)
  }

  const handleTabClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    dispatch(removeTab(path))
    // 如果关闭的是当前激活的 tab，切换到剩余的最后一个
    if (activeTab === path) {
      const remaining = tabs.filter((t) => t.path !== path)
      if (remaining.length > 0) {
        router.push(remaining[remaining.length - 1].path)
      }
    }
  }

  if (!isMounted) {
    return (
      <header
        style={{
          height: 68,
          background: 'hsl(var(--card))',
          borderBottom: '1px solid hsl(var(--border))',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <header
      style={{
        height: 68,
        background: 'hsl(var(--card))',
        borderBottom: '1px solid hsl(var(--border))',
        display: 'flex',
        alignItems: 'center',
        padding: '0 0.75rem',
        gap: '0.5rem',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      {/* Tabs 标签页栏 */}
      <div
        className="sys-tabs-bar flex items-center gap-1"
        style={{ flex: 1, minWidth: 0, height: '100%', overflowX: 'auto', overflowY: 'hidden' }}
      >
        {tabs.length === 0 && (
          <span
            className="sys-tabs-empty"
            style={{
              color: 'hsl(var(--muted-foreground))',
              fontSize: '0.8125rem',
              padding: '0 0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            暂无打开的页面
          </span>
        )}
        {tabs.map((tab) => {
          const isActive = tab.path === activeTab
          return (
            <div
              key={tab.path}
              className="sys-tab-item"
              data-active={isActive ? 'true' : 'false'}
              onClick={() => handleTabClick(tab.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? 'hsl(var(--foreground))'
                  : 'hsl(var(--muted-foreground))',
                background: isActive
                  ? 'hsl(var(--secondary))'
                  : 'transparent',
                border: '1px solid',
                borderColor: isActive
                  ? 'hsl(var(--border))'
                  : 'transparent',
                transition: 'all 150ms cubic-bezier(.2,.8,.2,1)',
                flexShrink: 0,
              }}
            >
              <span>{tab.title}</span>
              <button
                type="button"
                className="sys-tab-close"
                onClick={(e) => handleTabClose(e, tab.path)}
                aria-label={`关闭 ${tab.title}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: '0.25rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'hsl(var(--muted-foreground))',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </header>
  )
}

export default Header
