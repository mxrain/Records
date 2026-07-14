import { db } from '@/lib/db';
import { redis } from '@/lib/cache/redis';
import 'server-only';

/**
 * 站点配置类型
 * - 单值类: site_name / site_title_seo / site_description_seo / favicon_url / copyright_text / copyright_year_start
 * - 数组类: social_links
 */
export type SettingValue = string | number | boolean | SocialLink[] | unknown;

export interface SocialLink {
  platform: string;
  icon: string;
  link: string;
  qr_code: string;
  info: string;
}

export interface SiteSetting {
  key: string;
  value: SettingValue;
  description?: string;
}

const CACHE_KEY = 'db:site_settings';
const CACHE_TTL = 600; // 10 分钟

async function invalidateCache() {
  await redis.del(CACHE_KEY);
}

/**
 * 获取所有站点配置
 */
export async function getAllSettings(): Promise<Record<string, SettingValue>> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const result = await db.query('SELECT key, value FROM site_settings');
  const settings: Record<string, SettingValue> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }

  await redis.set(CACHE_KEY, JSON.stringify(settings), CACHE_TTL);
  return settings;
}

/**
 * 获取单个配置值(带类型辅助)
 */
export async function getSetting<T extends SettingValue = SettingValue>(key: string): Promise<T | undefined> {
  const all = await getAllSettings();
  return all[key] as T | undefined;
}

/**
 * 获取带元信息的单个配置
 */
export async function getSettingMeta(key: string): Promise<SiteSetting | null> {
  const result = await db.query(
    'SELECT key, value, description FROM site_settings WHERE key = $1',
    [key]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { key: row.key, value: row.value, description: row.description };
}

/**
 * 获取带元信息的所有配置(后台编辑用)
 */
export async function getAllSettingsMeta(): Promise<SiteSetting[]> {
  const result = await db.query('SELECT key, value, description FROM site_settings ORDER BY key');
  return result.rows.map((row) => ({
    key: row.key,
    value: row.value,
    description: row.description,
  }));
}

/**
 * 更新单个配置
 */
export async function updateSetting(key: string, value: SettingValue): Promise<void> {
  await db.query(
    `INSERT INTO site_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET
       value = $2::jsonb, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );

  await db.query(
    `INSERT INTO change_logs (action, resource_uuid, data)
     VALUES ($1, $2, $3)`,
    ['edit', `setting:${key}`, JSON.stringify({ key, value })]
  );

  await invalidateCache();
}

/**
 * 更新单个配置(带 description)
 */
export async function upsertSetting(key: string, value: SettingValue, description?: string): Promise<void> {
  const desc = description ?? null;
  await db.query(
    `INSERT INTO site_settings (key, value, description, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET
       value = $2::jsonb,
       description = COALESCE($3, site_settings.description),
       updated_at = NOW()`,
    [key, JSON.stringify(value), desc]
  );

  await db.query(
    `INSERT INTO change_logs (action, resource_uuid, data)
     VALUES ($1, $2, $3)`,
    ['edit', `setting:${key}`, JSON.stringify({ key, value })]
  );

  await invalidateCache();
}
