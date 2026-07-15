import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { defaultAuthConfig as authConfig } from '@/lib/auth/config'

/**
 * 直接校验 JWT Token 有效性（避免自 fetch /api/verify 带来的额外开销）
 */
function verifyToken(token: string | undefined): boolean {
  if (!token) return false
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error('JWT_SECRET 环境变量未配置')
    return false
  }
  try {
    jwt.verify(token, secret)
    return true
  } catch {
    return false
  }
}

/**
 * 身份验证代理（原 middleware，Next.js 16 已更名为 proxy）
 * - 全局开关关闭时直接放行
 * - 公开路径（/verify, /login）直接放行
 * - 受保护路径（/sys, /admin）校验 cookie 中的 token，失败则重定向到 /verify
 */
export function proxy(req: NextRequest) {
  // 全局开关检查
  if (!authConfig.enabled) return NextResponse.next()

  const { pathname } = req.nextUrl

  // 公开路径直接放行
  if (authConfig.paths.public.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 受保护路径校验 token
  const isProtected = authConfig.paths.protected.some(p => pathname.startsWith(p))
  if (isProtected) {
    const token = req.cookies.get(authConfig.tokens.access.cookieName)?.value

    if (!verifyToken(token)) {
      const redirectUrl = new URL(authConfig.paths.redirectTo, req.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 为 API 路由设置 CORS 头(基于白名单回显 Origin,而非通配符 *)
  const response = NextResponse.next()
  if (pathname.startsWith('/api')) {
    const origin = req.headers.get('origin')
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    // 开发环境放行 localhost
    const isDevAllowed =
      process.env.NODE_ENV !== 'production' &&
      (origin?.includes('localhost') || origin?.includes('127.0.0.1'))
    if (origin && (allowedOrigins.includes(origin) || isDevAllowed)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Vary', 'Origin')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    }
  }

  return response
}

// 匹配所有路由，排除静态资源和 favicon
export const config = {
  matcher: '/((?!_next/static|favicon.ico).*)',
}
