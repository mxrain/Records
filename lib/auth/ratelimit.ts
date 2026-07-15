import 'server-only';
import { redis } from '@/lib/cache/redis';

/**
 * 简单的固定窗口速率限制器(基于 Redis)
 *
 * 用法:
 *   const { ok, retryAfter } = await rateLimit(`login:${ip}`, 10, 60);
 *   if (!ok) return 429;
 *
 * @param key   限流键(建议带维度前缀,如 login:、upload:)
 * @param limit 时间窗口内允许的请求次数
 * @param windowSec 窗口大小(秒)
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ ok: true; remaining: number } | { ok: false; retryAfter: number }> {
  try {
    const redisKey = `ratelimit:${key}`;
    const current = await redis.get(redisKey);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limit) {
      return { ok: false, retryAfter: windowSec };
    }

    await redis.set(redisKey, String(count + 1), windowSec);
    return { ok: true, remaining: Math.max(0, limit - count - 1) };
  } catch (err) {
    // Redis 不可用时降级放行(避免影响正常用户),记录日志
    console.error('Rate limit check failed (fail-open):', err);
    return { ok: true, remaining: limit };
  }
}

/**
 * 提取客户端真实 IP(兼容常见代理头)
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
