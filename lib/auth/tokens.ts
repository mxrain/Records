import 'server-only';
import * as jwt from 'jsonwebtoken';
import { redis } from '@/lib/cache/redis';

/**
 * JWT token 签发与校验服务
 *
 * - payload 规范化:加入 sub/iss/aud/jti/iat
 * - 基于 Redis 的 jti 黑名单实现 token 撤销(登出)
 */

const ISSUER = 'records-app';
const AUDIENCE = 'records-app-users';

// token 黑名单 key 前缀;jti 作为唯一标识
const REVOKE_PREFIX = 'revoked:jti:';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET 环境变量未配置');
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET 环境变量未配置');
  return secret;
}

function genJti(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface TokenPayload {
  sub: string;       // 用户标识(单一管理员场景用 'admin')
  iss: string;       // 签发者
  aud: string;       // 接收方
  jti: string;       // 唯一 ID,用于撤销
  iat?: number;      // 签发时间(由 jwt 库自动填入)
  timestamp?: number;
}

/**
 * 签发 access token
 */
export function signAccessToken(subject = 'admin', expiresIn = '7d'): string {
  const payload: TokenPayload = {
    sub: subject,
    iss: ISSUER,
    aud: AUDIENCE,
    jti: genJti(),
    timestamp: Date.now(),
  };
  return jwt.sign(payload, getSecret(), { expiresIn: expiresIn as any });
}

/**
 * 签发 refresh token
 */
export function signRefreshToken(subject = 'admin', expiresIn = '30d'): string {
  const payload: TokenPayload = {
    sub: subject,
    iss: ISSUER,
    aud: AUDIENCE,
    jti: genJti(),
    timestamp: Date.now(),
  };
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: expiresIn as any });
}

/**
 * 校验 access token,返回 payload;若被撤销或无效则返回 null
 * Redis 故障时降级为仅签名校验(fail-open,避免锁死正常用户)
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as TokenPayload;
  } catch {
    return null;
  }
  if (!payload.jti) return null;
  // 检查黑名单(Redis 故障时跳过,降级为仅签名校验)
  try {
    const revoked = await redis.exists(`${REVOKE_PREFIX}${payload.jti}`);
    if (revoked) return null;
  } catch (err) {
    console.error('[auth] Redis 黑名单查询失败,降级为仅签名校验:', err);
  }
  return payload;
}

/**
 * 校验 refresh token,返回 payload;若被撤销或无效则返回 null
 * Redis 故障时降级为仅签名校验
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, getRefreshSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as TokenPayload;
  } catch {
    return null;
  }
  if (!payload.jti) return null;
  try {
    const revoked = await redis.exists(`${REVOKE_PREFIX}${payload.jti}`);
    if (revoked) return null;
  } catch (err) {
    console.error('[auth] Redis 黑名单查询失败,降级为仅签名校验:', err);
  }
  return payload;
}

/**
 * 撤销 token(加入黑名单),用于登出
 * @param token access 或 refresh token
 * @param tokenType 'access' | 'refresh'
 */
export async function revokeToken(
  token: string,
  tokenType: 'access' | 'refresh' = 'access'
): Promise<void> {
  try {
    const secret = tokenType === 'access' ? getSecret() : getRefreshSecret();
    const payload = jwt.verify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      ignoreExpiration: true, // 即使过期也能撤销(清理用)
    }) as TokenPayload;
    if (!payload.jti) return;
    // 黑名单保留 31 天(覆盖 refresh token 最大生命周期)
    await redis.set(`${REVOKE_PREFIX}${payload.jti}`, '1', 31 * 24 * 60 * 60);
  } catch (err) {
    // token 无效则无需撤销
    console.warn('revokeToken: 无法解析 token', err instanceof Error ? err.message : err);
  }
}
