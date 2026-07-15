import 'server-only';
import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/tokens';
import { verifyApiKey, checkApiKeyRateLimit } from '@/lib/auth/apikey';

/**
 * 后台写操作 API 统一鉴权守卫
 *
 * 用法:
 *   const authErr = await requireAuth(req);
 *   if (authErr) return authErr;
 *
 * 支持两种鉴权方式(任一通过即可):
 * 1. Cookie 中的 access token(JWT) —— 适用于同源后台前端
 *    proxy.ts 仅保护页面路由 /sys /admin,不会拦截 /api/*,
 *    因此所有后台写接口必须在入口自行调用此守卫。
 * 2. X-API-Key 请求头 —— 适用于第三方服务端调用
 *    Key 明文格式 `rak_<48hex>`,服务端存 SHA-256 哈希。
 *    每 Key 每分钟限 60 次,超限返回 429。
 *
 * Redis 不可用时降级为仅签名校验(fail-open,避免影响正常用户)。
 */

const COOKIE_NAME = 'token';
const API_KEY_HEADER = 'x-api-key';

export async function requireAuth(req: Request): Promise<NextResponse | null> {
  // 1. 优先尝试 Cookie 中的 JWT(同源后台前端)
  const cookieHeader = req.headers.get('cookie') || '';
  const cookieMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const cookieToken = cookieMatch?.[1];

  if (cookieToken) {
    const payload = await verifyAccessToken(cookieToken);
    if (payload) return null;
    // cookie 存在但无效 → 继续尝试 API Key(不直接 401,给 API Key 一个机会)
  }

  // 2. 尝试 X-API-Key(第三方调用)
  const apiKey = req.headers.get(API_KEY_HEADER);
  if (apiKey) {
    const meta = await verifyApiKey(apiKey);
    if (!meta) {
      return NextResponse.json({ error: '无效的 API Key' }, { status: 401 });
    }
    // 限速检查
    const limit = await checkApiKeyRateLimit(meta.id);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'API Key 请求过于频繁' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter || 60) } }
      );
    }
    return null;
  }

  // 两种鉴权方式都没提供/都失败
  return NextResponse.json({ error: '未授权' }, { status: 401 });
}
