"use client"

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  PlusCircle,
  FolderTree,
  List as ListIcon,
  ChevronRight,
  Home,
  History,
  Star,
  Flame,
  Clock,
  Pin,
  PanelLeftClose,
  PanelLeft,
  Settings,
  HardDrive,
  Code2,
  Sparkles,
  Plug,
  KeyRound,
} from 'lucide-react'
import ChangeHistoryDrawer from './components/ChangeHistoryDrawer'
import { useAppSelector } from '@/app/store/hooks'
import { useGetSiteSettingsQuery } from '@/app/store/api/settingsApi'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

interface NavGroup {
  key: string
  label: string
  icon: React.ElementType
  items: NavItem[]
}

type NavEntry = NavItem | NavGroup

const NAV_ENTRIES: NavEntry[] = [
  { href: '/sys/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/sys/add', label: '添加资源', icon: PlusCircle },
  { href: '/sys/categories', label: '分类管理', icon: FolderTree },
  {
    key: 'list-management',
    label: '列表管理',
    icon: ListIcon,
    items: [
      { href: '/sys/list/recommend', label: '推荐列表', icon: Star },
      { href: '/sys/list/hot', label: '热门列表', icon: Flame },
      { href: '/sys/list/latest', label: '最新列表', icon: Clock },
      { href: '/sys/list/top', label: '置顶列表', icon: Pin },
    ],
  },
  { href: '/sys/storage', label: '对象存储', icon: HardDrive },
  {
    key: 'api-management',
    label: '接口',
    icon: Code2,
    items: [
      { href: '/sys/api', label: 'API', icon: Code2 },
      { href: '/sys/apikeys', label: 'API Keys', icon: KeyRound },
      { href: '/sys/skill', label: 'Skill', icon: Sparkles },
      { href: '/sys/mcp', label: 'MCP', icon: Plug },
    ],
  },
]

function isGroup(entry: NavEntry): entry is NavGroup {
  return (entry as NavGroup).items !== undefined
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  // 变更记录数量,用于变更历史按钮的右上角提示泡泡
  const changeCount = useAppSelector((state) => state.changeRecords.records.length)
  // 站点配置:网站名称与 logo
  const { data: settings } = useGetSiteSettingsQuery()
  const siteName = settings?.site_name || '四次元资源桶'
  const faviconUrl = settings?.favicon_url || '/favicon.ico'

  // 根据当前路径判断"列表管理"子菜单是否默认展开
  const isInListSubmenu = useMemo(
    () => pathname?.startsWith('/sys/list/') ?? false,
    [pathname]
  )
  const [listExpanded, setListExpanded] = useState<boolean>(isInListSubmenu)

  // 根据当前路径判断"接口"子菜单是否默认展开
  const isInApiSubmenu = useMemo(
    () =>
      pathname?.startsWith('/sys/api') ||
      pathname?.startsWith('/sys/apikeys') ||
      pathname?.startsWith('/sys/skill') ||
      pathname?.startsWith('/sys/mcp') ||
      false,
    [pathname]
  )
  const [apiExpanded, setApiExpanded] = useState<boolean>(isInApiSubmenu)

  // 进入对应页时自动展开子菜单
  useEffect(() => {
    if (isInListSubmenu) setListExpanded(true)
  }, [isInListSubmenu])
  useEffect(() => {
    if (isInApiSubmenu) setApiExpanded(true)
  }, [isInApiSubmenu])

  const handleNav = (href: string) => {
    router.push(href)
  }

  return (
    <aside
      className="sys-sidebar"
      style={{
        background: 'hsl(var(--sidebar))',
        borderRight: '1px solid hsl(var(--sidebar-border))',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* 品牌区 */}
      <div
        style={{
          padding: '1.25rem',
          borderBottom: '1px solid hsl(var(--sidebar-border))',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <Link
          href="/sys"
          className="flex items-center gap-3 min-w-0"
          onClick={(e) => {
            e.preventDefault()
            handleNav('/sys/dashboard')
          }}
        >
          <Image
            src={faviconUrl}
            alt={siteName}
            width={28}
            height={28}
            className="shrink-0"
          />
          <span
            className="sys-brand-text font-semibold whitespace-nowrap"
            style={{
              fontSize: '1.0625rem',
              color: 'hsl(var(--sidebar-foreground))',
              letterSpacing: '0.01em',
            }}
          >
            {siteName}
          </span>
        </Link>
        {/* 展开时显示的折叠按钮 */}
        <button
          type="button"
          className="sys-header-action sys-collapse-toggle"
          onClick={onToggleCollapse}
          aria-label="折叠侧边栏"
          style={{ width: 32, height: 32, flexShrink: 0 }}
        >
          <PanelLeftClose size={18} aria-hidden="true" />
        </button>
      </div>

      {/* 导航 */}
      <nav
        className="sys-no-scrollbar"
        style={{
          flex: 1,
          padding: '0.75rem',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div className="flex flex-col gap-0.5">
          {NAV_ENTRIES.map((entry) => {
            if (isGroup(entry)) {
              const expanded = entry.key === 'list-management' ? listExpanded : apiExpanded
              const setExpanded = entry.key === 'list-management' ? setListExpanded : setApiExpanded
              return (
                <div
                  key={entry.key}
                  className="sys-submenu-group"
                  data-expanded={expanded ? 'true' : 'false'}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}
                >
                  <button
                    type="button"
                    className="sys-nav-item sys-submenu-toggle"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                  >
                    <entry.icon className="shrink-0" size={20} aria-hidden="true" />
                    <span className="sys-nav-label flex-1">{entry.label}</span>
                    <ChevronRight
                      className="sys-chevron shrink-0"
                      size={16}
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                      aria-hidden="true"
                    />
                  </button>
                  <div className="sys-submenu-body">
                    {entry.items.map((sub) => {
                      const active = pathname === sub.href
                      return (
                        <button
                          key={sub.href}
                          type="button"
                          className="sys-nav-item"
                          data-nested="true"
                          data-active={active ? 'true' : 'false'}
                          onClick={() => handleNav(sub.href)}
                        >
                          <sub.icon className="shrink-0" size={16} aria-hidden="true" />
                          <span className="sys-nav-label">{sub.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            }

            const active = pathname === entry.href
            return (
              <button
                key={entry.href}
                type="button"
                className="sys-nav-item"
                data-active={active ? 'true' : 'false'}
                onClick={() => handleNav(entry.href)}
              >
                <entry.icon className="shrink-0" size={20} aria-hidden="true" />
                <span className="sys-nav-label">{entry.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* 底部操作区 */}
      <div
        style={{
          padding: '0.75rem',
          borderTop: '1px solid hsl(var(--sidebar-border))',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.125rem',
        }}
      >
        {/* 折叠时显示的展开按钮 */}
        <button
          type="button"
          className="sys-nav-item sys-expand-toggle"
          onClick={onToggleCollapse}
          aria-label="展开侧边栏"
        >
          <PanelLeft className="shrink-0" size={20} aria-hidden="true" />
          <span className="sys-nav-label">展开</span>
        </button>
        <button
          type="button"
          className="sys-nav-item"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="变更历史"
        >
          <span className="sys-nav-icon-wrap" style={{ position: 'relative', display: 'inline-flex' }}>
            <History className="shrink-0" size={20} aria-hidden="true" />
            {changeCount > 0 && (
              <span
                className="sys-nav-badge"
                aria-label={`${changeCount} 条待同步变更`}
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 8,
                  background: 'hsl(var(--destructive))',
                  color: 'hsl(var(--destructive-foreground))',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  lineHeight: '16px',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  border: '1.5px solid hsl(var(--sidebar))',
                  boxSizing: 'border-box',
                }}
              >
                {changeCount > 99 ? '99+' : changeCount}
              </span>
            )}
          </span>
          <span className="sys-nav-label">变更历史</span>
        </button>
        <button
          type="button"
          className="sys-nav-item"
          onClick={() => router.push('/')}
        >
          <Home className="shrink-0" size={20} aria-hidden="true" />
          <span className="sys-nav-label">返回主页</span>
        </button>
        <button
          type="button"
          className="sys-nav-item"
          onClick={() => router.push('/sys/settings')}
        >
          <Settings className="shrink-0" size={20} aria-hidden="true" />
          <span className="sys-nav-label">系统设置</span>
        </button>
      </div>

      <ChangeHistoryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </aside>
  )
}
