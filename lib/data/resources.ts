import { db } from '@/lib/db';
import { redis } from '@/lib/cache/redis';
import 'server-only';

export interface Resource {
  name: string;
  category: string;
  images: string[];
  tags: string[] | Record<string, string>;
  source_links: Record<string, { link: string; psw: string; size: string }>;
  uploaded: number;
  update_time: number;
  introduction?: string;
  resource_information?: Record<string, string | number>;
  link?: string;
  rating?: number;
  comments?: number;
  download_count?: number;
  download_limit?: number;
  other_information?: Record<string, string | number>;
}

export type ResourcesMap = Record<string, Resource>;

const CACHE_KEY = 'db:resources';
const CACHE_TTL = 300;

async function invalidateCache() {
  await redis.del(CACHE_KEY);
}

function mapRowToResource(row: any): Resource {
  const data = row.json_data;
  return {
    name: data.name || '',
    category: data.category || '',
    images: data.images || [],
    tags: data.tags || {},
    source_links: data.source_links || {},
    uploaded: data.uploaded || 0,
    update_time: data.update_time || 0,
    introduction: data.introduction,
    resource_information: data.resource_information,
    link: data.link,
    rating: data.rating,
    comments: data.comments,
    download_count: data.download_count,
    download_limit: data.download_limit,
    other_information: data.other_information,
  };
}

export async function getAllResources(): Promise<ResourcesMap> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const result = await db.query('SELECT uuid, json_data FROM resources');
  const map: ResourcesMap = {};
  for (const row of result.rows) {
    map[row.uuid] = mapRowToResource(row);
  }

  await redis.set(CACHE_KEY, JSON.stringify(map), CACHE_TTL);
  return map;
}

export async function getResourceByUuid(uuid: string): Promise<Resource | null> {
  const all = await getAllResources();
  return all[uuid] || null;
}

export async function upsertResource(uuid: string, data: Resource): Promise<void> {
  const jsonData = {
    name: data.name,
    category: data.category,
    images: data.images,
    tags: data.tags,
    source_links: data.source_links,
    uploaded: data.uploaded,
    update_time: data.update_time,
    introduction: data.introduction,
    resource_information: data.resource_information,
    link: data.link,
    rating: data.rating,
    comments: data.comments,
    download_count: data.download_count,
    download_limit: data.download_limit,
    other_information: data.other_information,
  };

  // 业务表写入与审计日志必须在同一事务内,避免半写状态
  await db.withTransaction(async (tx) => {
    await tx.query(
      `INSERT INTO resources (uuid, title, category, images, tags, source_links, json_data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (uuid) DO UPDATE SET
         title = $2, category = $3, images = $4, tags = $5, source_links = $6,
         json_data = $7, sync_status = 'pending', updated_at = NOW()`,
      [
        uuid,
        data.name,
        data.category,
        JSON.stringify(data.images),
        JSON.stringify(data.tags),
        JSON.stringify(data.source_links),
        JSON.stringify(jsonData),
      ]
    );

    await tx.query(
      `INSERT INTO change_logs (action, resource_uuid, data)
       VALUES ($1, $2, $3)`,
      ['edit', uuid, JSON.stringify(jsonData)]
    );
  });

  await invalidateCache();
}

export async function deleteResource(uuid: string): Promise<boolean> {
  // 先在事务内读取并删除,同时写入审计日志(含删除前数据快照,便于恢复)
  const deleted = await db.withTransaction(async (tx) => {
    const existing = await tx.query('SELECT json_data FROM resources WHERE uuid = $1', [uuid]);
    if (existing.rowCount === 0) return false;

    await tx.query('DELETE FROM resources WHERE uuid = $1', [uuid]);
    // 保存删除前的完整数据快照,避免误删无法恢复
    await tx.query(
      `INSERT INTO change_logs (action, resource_uuid, data) VALUES ($1, $2, $3)`,
      ['delete', uuid, JSON.stringify({ before: existing.rows[0].json_data })]
    );
    return true;
  });

  if (deleted) {
    await invalidateCache();
  }
  return deleted;
}

export async function hasResource(uuid: string): Promise<boolean> {
  const result = await db.query('SELECT 1 FROM resources WHERE uuid = $1', [uuid]);
  return result.rowCount ? result.rowCount > 0 : false;
}
