import 'server-only';
import { randomBytes, createHash } from 'crypto';
import { redis } from '@/lib/cache/redis';
import { rateLimit } from '@/lib/auth/ratelimit';

/**
 * API Key 服务
 *
 * 设计要点:
 * - Key 明文格式 `rak_<32hex>`,只在签发时返回一次,后续仅存哈希
 * - 哈希算法 SHA-256,Redis 中只存哈希,无法反推明文
 * - 每次调用更新 lastUsedAt(惰性写入,不阻塞请求)
 * - 限速 60 次/60s,基于已有 rateLimit 工具
 * - Redis 不可用时:校验 fail-open(放行),限速 fail-open(放行)
 *
 * Redis 键结构:
 *   apikey:hash:<sha256>  → JSON ApiKeyMeta(包含 id/name/createdAt/lastUsedAt)
 *   apikey:index          → JSON 数组,仅含元信息(无 hash),用于列表展示
 */

const PREFIX = 'rak_';
const KEY_BYTES = 24; // 24 字节 → 48 hex 字符
const INDEX_KEY = 'apikey:index';
const HASH_KEY_PREFIX = 'apikey:hash:';
const RATE_LIMIT_PER_MIN = 60;
const RATE_LIMIT_WINDOW_SEC = 60;

export interface ApiKeyMeta {
  id: string;            // 短 ID(kxxx),用于列表展示与删除
  name: string;          // 用户定义的名称
  prefix: string;        // 明文前 8 位,用于辨识(rak_xxxx...)
  hash: string;          // SHA-256 哈希
  createdAt: string;     // ISO 时间
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
    prefix: plaintext.slice(0, PREFIX.length + 8), // rak_xxxxxxxx
    hash,
    createdAt: now,
    lastUsedAt: null,
  };

  // 存哈希索引(校验用)
  await redis.set(`${HASH_KEY_PREFIX}${hash}`, JSON.stringify(meta));
  // 追加到列表索引
  await appendToList(meta);

  return {
    plaintext,
    meta: { id, name, prefix: meta.prefix, createdAt: meta.createdAt, lastUsedAt: meta.lastUsedAt },
  };
}

/**
 * 校验 API Key 明文,通过则返回元信息并异步更新 lastUsedAt
 * 失败返回 null
 *
 * 注意:此函数不做限速,限速由调用方用 checkApiKeyRateLimit 单独执行
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

  // 异步更新 lastUsedAt(不阻塞请求,允许丢失)
  void touchLastUsed(meta);

  return meta;
}

/**
 * 单独执行限速检查,返回 ok/false
 * 与 verifyApiKey 解耦,guard 可决定是否阻断
 */
export async function checkApiKeyRateLimit(keyId: string): Promise<{ ok: boolean; retryAfter?: number }> {
  const result = await rateLimit(`apikey:${keyId}`, RATE_LIMIT_PER_MIN, RATE_LIMIT_WINDOW_SEC);
  return result.ok
    ? { ok: true }
    : { ok: false, retryAfter: result.retryAfter };
}

/**
 * 列出所有 API Key(不含哈希)
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

    // 列表中只存 prefix,需要反查 hash 索引删除
    // 由于列表项不含 hash,遍历 hash 索引不可行(没扫描接口)
    // 解决方案:存列表时同时存 id → hash 的映射
    // 但这样改动较大;折中方案:索引列表里也存 hash,但 listApiKeys 返回时剔除
    // 实际上目前 createApiKey 时,索引项只存 {id,name,prefix,createdAt,lastUsedAt}
    // 要删除 hash 索引必须知道 hash,因此用第二个索引 apikey:idhash:<id> → <hash>
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
  // 同时存 id → hash 反向索引,用于吊销
  await redis.set(`apikey:idhash:${meta.id}`, meta.hash);
}

async function touchLastUsed(meta: ApiKeyMeta): Promise<void> {
  try {
    const now = new Date().toISOString();
    meta.lastUsedAt = now;
    await redis.set(`${HASH_KEY_PREFIX}${meta.hash}`, JSON.stringify(meta));

    // 同步更新列表项
    const list = await listApiKeys();
    const idx = list.findIndex((k) => k.id === meta.id);
    if (idx >= 0) {
      list[idx].lastUsedAt = now;
      await redis.set(INDEX_KEY, JSON.stringify(list));
    }
  } catch {
    // lastUsedAt 更新失败不影响请求,静默忽略
  }
}
