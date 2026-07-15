import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revokeToken } from '@/lib/auth/tokens';

/**
 * POST /api/logout
 * 登出:撤销当前 access + refresh token(加入 Redis 黑名单),并清除 cookie
 */
export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('token')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  // 并行撤销两个 token(忽略错误,即使 token 无效也继续清 cookie)
  await Promise.allSettled([
    accessToken ? revokeToken(accessToken, 'access') : Promise.resolve(),
    refreshToken ? revokeToken(refreshToken, 'refresh') : Promise.resolve(),
  ]);

  // 清除 cookie
  cookieStore.delete('token');
  cookieStore.delete('refreshToken');

  return NextResponse.json({ success: true });
}
