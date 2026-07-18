import 'server-only';
import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';
import { redis } from '@/lib/cache/redis';
import { rateLimit } from '@/lib/auth/ratelimit';

/**
 * API Key 服务
 *
 * 设计要点:
 * - Key 明文格式 `rak_<48hex>`,签发时返回一次
 * - 哈希算法 SHA-256,Redis 中存哈希用于校验
 * - 明文用 AES-256-GCM 加密后存 Redis(密钥来自 JWT_SECRET 派生),支持后续再次展示
 * - 每次调用更新 lastUsedAt(惰性写入,不阻塞请求)
 * - 限速 60 次/60s,基于已有 rateLimit 工具
 * - Redis 不可用时:校验 fail-open(放行),限速 fail-open(放行)
 *
 * Redis 键结构:
 *   apikey:hash:<sha256>   → JSON ApiKeyMeta(包含 id/name/createdAt/lastUsedAt/encKey)
 *   apikey:index           → JSON 数组,仅含元信息(无 hash/encKey),用于列表展示
 *   apikey:idhash:<id>     → <sha256>,用于吊销时反查 hash
 */

const PREFIX = 'rak_';
const KEY_BYTES = 24; // 24 字节 → 48 hex 字符
const INDEX_KEY = 'apikey:index';
const HASH_KEY_PREFIX = 'apikey:hash:';
const RATE_LIMIT_PER_MIN = 60;
const RATE_LIMIT_WINDOW_SEC = 60;

// AES-256-GCM 加密用密钥(从 JWT_SECRET 派生 32 字节)
// 惰性求值:JWT_SECRET 缺失时在真正使用时才抛错,避免模块加载阶段就崩溃
let _ENC_KEY: Buffer | null = null;
function getEncKey(): Buffer {
  if (_ENC_KEY === null) {
    _ENC_KEY = deriveEncKey();
  }
  return _ENC_KEY;
}

export interface ApiKeyMeta {
  id: string;
  name: string;
  prefix: string;        // 明文前缀(rak_xxxxxxxx)
  hash: string;          // SHA-256 哈希(校验用)
  encKey: string;        // 加密后的明文(base64:iv:ciphertext:tag)
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * 生成新 API Key 明文 + 元信息
 * 返回明文(仅此一次)与元信息
 */
export async function createApiKey(name: string): Promise<{ plaintext: string; meta: ApiKeyListItem }> {
  const raw = randomBytes(KEY_BYTES).toString('hex');
  const plaintext = `${PREFIX}${raw}`;
  const hash = hashKey(plaintext);
  const id = `k${randomBytes(4).toString('hex')}`; // 8 字符短 ID
  const now = new Date().toISOString();

  const meta: ApiKeyMeta = {
    id,
    name,
    prefix: plaintext.slice(0, PREFIX.length + 8),
    hash,
    encKey: encryptPlaintext(plaintext),
    createdAt: now,
    lastUsedAt: null,
  };

  await redis.set(`${HASH_KEY_PREFIX}${hash}`, JSON.stringify(meta));
  await appendToList(meta);

  return {
    plaintext,
    meta: { id, name, prefix: meta.prefix, createdAt: meta.createdAt, lastUsedAt: meta.lastUsedAt },
  };
}

/**
 * 按 ID 获取 API Key 明文(用于前端"再次查看")
 * 需要 requireAuth 已通过
 */
export async function revealApiKey(id: string): Promise<string | null> {
  try {
    const hash = await redis.get(`apikey:idhash:${id}`);
    if (!hash) return null;
    const raw = await redis.get(`${HASH_KEY_PREFIX}${hash}`);
    if (!raw) return null;
    const meta = JSON.parse(raw) as ApiKeyMeta;
    if (!meta.encKey) return null;
    return decryptPlaintext(meta.encKey);
  } catch (err) {
    console.error('揭示 API Key 明文失败:', err);
    return null;
  }
}

/**
 * 校验 API Key 明文,通过则返回元信息并异步更新 lastUsedAt
 */
export async function verifyApiKey(plaintext: string): Promise<ApiKeyMeta | null> {
  if (!plaintext.startsWith(PREFIX)) return null;

  const hash = hashKey(plaintext);
  let meta: ApiKeyMeta | null = null;
  try {
    const raw = await redis.get(`${HASH_KEY_PREFIX}${hash}`);
    if (!raw) return null;
    meta = JSON.parse(raw) as ApiKeyMeta;
  } catch (err) {
    console.error('API Key 校验失败(Redis 不可用,fail-open):', err);
    return null;
  }

  void touchLastUsed(meta);
  return meta;
}

/**
 * 限速检查
 */
export async function checkApiKeyRateLimit(keyId: string): Promise<{ ok: boolean; retryAfter?: number }> {
  const result = await rateLimit(`apikey:${keyId}`, RATE_LIMIT_PER_MIN, RATE_LIMIT_WINDOW_SEC);
  return result.ok ? { ok: true } : { ok: false, retryAfter: result.retryAfter };
}

/**
 * 列出所有 API Key(不含哈希/明文)
 */
export async function listApiKeys(): Promise<ApiKeyListItem[]> {
  try {
    const raw = await redis.get(INDEX_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as ApiKeyListItem[];
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error('列出 API Key 失败:', err);
    return [];
  }
}

/**
 * 按 ID 吊销 API Key
 */
export async function revokeApiKey(id: string): Promise<boolean> {
  try {
    const list = await listApiKeys();
    const target = list.find((k) => k.id === id);
    if (!target) return false;

    const hash = await redis.get(`apikey:idhash:${id}`);
    if (hash) {
      await redis.del(`${HASH_KEY_PREFIX}${hash}`);
      await redis.del(`apikey:idhash:${id}`);
    }

    const newList = list.filter((k) => k.id !== id);
    await redis.set(INDEX_KEY, JSON.stringify(newList));
    return true;
  } catch (err) {
    console.error('吊销 API Key 失败:', err);
    return false;
  }
}

// ============ 内部工具 ============

function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/**
 * 从 JWT_SECRET 派生 32 字节密钥用于 AES-256
 * JWT_SECRET 缺失时直接抛错,避免静默使用弱 fallback 密钥导致 API Key 明文可被解密
 */
function deriveEncKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET 环境变量未配置,无法派生 API Key 加密密钥');
  }
  return createHash('sha256').update(`apikey-enc:${secret}`).digest();
}

/**
 * AES-256-GCM 加密明文
 * 返回 base64(iv):base64(ciphertext):base64(tag)
 */
function encryptPlaintext(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${ciphertext.toString('base64')}:${tag.toString('base64')}`;
}

/**
 * AES-256-GCM 解密
 */
function decryptPlaintext(encKey: string): string {
  const [ivB64, ctB64, tagB64] = encKey.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', getEncKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

async function appendToList(meta: ApiKeyMeta): Promise<void> {
  const list = await listApiKeys();
  const item: ApiKeyListItem = {
    id: meta.id,
    name: meta.name,
    prefix: meta.prefix,
    createdAt: meta.createdAt,
    lastUsedAt: meta.lastUsedAt,
  };
  list.push(item);
  await redis.set(INDEX_KEY, JSON.stringify(list));
  await redis.set(`apikey:idhash:${meta.id}`, meta.hash);
}

async function touchLastUsed(meta: ApiKeyMeta): Promise<void> {
  try {
    const now = new Date().toISOString();
    meta.lastUsedAt = now;
    await redis.set(`${HASH_KEY_PREFIX}${meta.hash}`, JSON.stringify(meta));

    const list = await listApiKeys();
    const idx = list.findIndex((k) => k.id === meta.id);
    if (idx >= 0) {
      list[idx].lastUsedAt = now;
      await redis.set(INDEX_KEY, JSON.stringify(list));
    }
  } catch {
    // 静默忽略
  }
}
