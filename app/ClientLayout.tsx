"use client"

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import LoadingAnimation from '@/app/components/LoadingAnimation/LoadingAnimation'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    NProgress.configure({ 
      showSpinner: false,
      trickleSpeed: 100,
      minimum: 0.3
    })
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const handleStart = () => NProgress.start()
    const handleComplete = () => NProgress.done()

    handleStart()  // 立即开始进度条
    
    const timer = setTimeout(() => {
      handleComplete()
    }, 500)

    return () => {
      clearTimeout(timer)
      handleComplete()
    }
  }, [pathname, searchParams, isMounted])

  // 使用单一的 LoadingAnimation，避免多层 Suspense 嵌套
  if (!isMounted) {
    return <LoadingAnimation />
  }

  return children
}
