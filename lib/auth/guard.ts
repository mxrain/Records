import 'server-only';
import { NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

/**
 * 后台写操作 API 统一鉴权守卫
 *
 * 用法:
 *   const authErr = requireAuth(req);
 *   if (authErr) return authErr;
 *
 * 校验 cookie 中的 access token(JWT),失败返回 401。
 * proxy.ts 仅保护页面路由 /sys /admin,不会拦截 /api/*,
 * 因此所有后台写接口必须在入口自行调用此守卫。
 */

const COOKIE_NAME = 'token';

export function requireAuth(req: Request): NextResponse | null {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    jwt.verify(token, secret);
    return null;
  } catch {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
}
