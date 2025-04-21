"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import Sidebar from './components/Sidebar/Sidebar'
import Header from './components/Header'
import { addTab, setActiveTab } from '../store/features/tabs/tabsSlice'
import { RootState } from '../store/store'
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation'
// import DebugWindow from './components/DebugWindow/DebugWindow'

export default function SysLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useDispatch()
  const tabs = useSelector((state: RootState) => state.tabs.tabs)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 这段代码的意思是：
  // 1. 当用户访问 '/sys' 路径时，自动重定向到 '/sys/add' 页面
  // 2. 当没有打开任何标签页（tabs.length === 0）且用户访问 '/sys/dashboard' 时，也重定向到 '/sys/add' 页面
  // 这样可以确保用户总是有一个默认的页面可以查看，避免空白页面的出现
  useEffect(() => {
    if (!isMounted) return
    
    if (pathname === '/sys' || (tabs.length === 0 && pathname === '/sys/dashboard')) {
      router.push('/sys/add')
    }
  }, [pathname, router, tabs.length, isMounted])
  
  // 这段代码的意思是：
  // 1. 当路径名（pathname）存在且不是'/sys'时
  // 2. 添加一个新的标签页（tab），包含当前路径和标题
  // 3. 将新添加的标签页设置为活动标签页
  // 这样可以确保每次用户访问新页面时，都会在标签栏中添加相应的标签，并自动切换到该标签
  useEffect(() => {
    if (!isMounted) return
    
    if (pathname && pathname !== '/sys') {
      dispatch(addTab({ path: pathname, title: getTabTitle(pathname) }))
      dispatch(setActiveTab(pathname))
    }
  }, [pathname, dispatch, isMounted])

  const getTabTitle = (path: string): string => {
    return path.split('/').pop() || '首页'
  }

  if (!isMounted) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="w-64 bg-white"></div>
        <div className="flex flex-col flex-grow overflow-hidden">
          <header className="bg-white shadow"></header>
          <main className="flex-grow p-0 sm:p-10 overflow-auto">
            <LoadingAnimation />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-grow overflow-hidden">
        <Header />
        <main className="flex-grow p-0 sm:p-10 overflow-auto">
          {children}
        </main>
      </div>
      {/* <DebugWindow /> */}
    </div>
  )
}
