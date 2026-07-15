import 'server-only';
import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/tokens';

/**
 * 后台写操作 API 统一鉴权守卫
 *
 * 用法:
 *   const authErr = await requireAuth(req);
 *   if (authErr) return authErr;
 *
 * 校验 cookie 中的 access token(JWT),并检查 Redis 黑名单(支持登出撤销)。
 * proxy.ts 仅保护页面路由 /sys /admin,不会拦截 /api/*,
 * 因此所有后台写接口必须在入口自行调用此守卫。
 *
 * Redis 不可用时降级为仅签名校验(fail-open,避免影响正常用户)。
 */

const COOKIE_NAME = 'token';

export async function requireAuth(req: Request): Promise<NextResponse | null> {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];

  if (!token) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  return null;
}
