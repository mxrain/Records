"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './components/Sidebar/Sidebar'
import Header from './components/Header'
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation'

export default function SysLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 访问 /sys 根路径时重定向到 /sys/dashboard（仪表盘为入口）
  useEffect(() => {
    if (!isMounted) return
    if (pathname === '/sys') {
      router.push('/sys/dashboard')
    }
  }, [pathname, router, isMounted])

  // 路由切换时关闭移动端抽屉
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const toggleCollapse = useCallback(() => setCollapsed(v => !v), [])
  const toggleMobile = useCallback(() => setMobileOpen(v => !v), [])

  if (!isMounted) {
    return (
      <div className="sys-theme sys-shell" data-collapsed="false">
        <aside className="sys-sidebar" style={{ background: 'hsl(var(--sidebar))', borderRight: '1px solid hsl(var(--sidebar-border))' }} />
        <div className="flex flex-col flex-grow overflow-hidden">
          <header style={{ height: 68, background: 'hsl(var(--card))', borderBottom: '1px solid hsl(var(--border))' }} />
          <main className="flex-grow overflow-auto flex items-center justify-center">
            <LoadingAnimation />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div
      className="sys-theme sys-shell"
      data-collapsed={collapsed ? 'true' : 'false'}
      data-mobile-open={mobileOpen ? 'true' : 'false'}
    >
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      {/* 移动端遮罩 */}
      <div
        className="sys-mobile-overlay"
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <div className="flex flex-col flex-grow overflow-hidden min-w-0">
        <Header
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onToggleMobile={toggleMobile}
        />
        <main className="flex-grow overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
