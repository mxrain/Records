import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { defaultAuthConfig as authConfig, validateAuthConfig } from '@/lib/auth/config'
import { verifyAccessToken } from '@/lib/auth/tokens'

// 启动时校验认证配置完整性(模块级,仅执行一次)
// 用 try-catch 包裹:配置缺失只记录错误,不中断请求处理(避免整体崩溃)
try {
  validateAuthConfig(authConfig)
} catch (err) {
  console.error('[auth] 认证配置校验失败:', err instanceof Error ? err.message : err)
}

/**
 * 校验 JWT Token 有效性(含 Redis 黑名单检查)
 *
 * 与 lib/auth/tokens.ts 的 verifyAccessToken 行为一致:
 * - 签名 + issuer/audience 校验
 * - jti 在 Redis 黑名单中则拒绝(已登出/已撤销的 token)
 * - Redis 故障时降级为仅签名校验(fail-open,避免锁死正常用户)
 */
async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const payload = await verifyAccessToken(token)
  return payload !== null
}

/**
 * 身份验证代理（原 middleware，Next.js 16 已更名为 proxy）
 * - 全局开关关闭时直接放行
 * - 公开路径（/verify, /login）直接放行
 * - 受保护路径（/sys, /admin）校验 cookie 中的 token(含黑名单检查),失败则重定向到 /verify
 *
 * 注意:此 proxy 使用 nodejs runtime,以便直接访问 Redis 检查 token 黑名单。
 * 黑名单检查仅在 /sys /admin 受保护路径触发,其他路径不受影响。
 */
export async function proxy(req: NextRequest) {
  // 全局开关检查
  if (!authConfig.enabled) return NextResponse.next()

  const { pathname } = req.nextUrl

  // 公开路径直接放行
  if (authConfig.paths.public.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 受保护路径校验 token(含 Redis 黑名单检查)
  const isProtected = authConfig.paths.protected.some(p => pathname.startsWith(p))
  if (isProtected) {
    const token = req.cookies.get(authConfig.tokens.access.cookieName)?.value

    if (!(await verifyToken(token))) {
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

// 使用 nodejs runtime 以便直接访问 Redis 检查 token 黑名单
// 匹配所有路由,排除静态资源和 favicon
export const config = {
  runtime: 'nodejs',
  matcher: '/((?!_next/static|favicon.ico).*)',
}