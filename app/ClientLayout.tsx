"use client"

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { usePageTracking } from '@/hooks/usePageTracking'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirstRender = useRef(true)

  usePageTracking();

  useEffect(() => {
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 100,
      minimum: 0.3
    })
  }, [])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    NProgress.start()

    const timer = setTimeout(() => {
      NProgress.done()
    }, 500)

    return () => {
      clearTimeout(timer)
      NProgress.done()
    }
  }, [pathname, searchParams])

  return children
}
