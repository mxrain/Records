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

  await db.query(
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

  await db.query(
    `INSERT INTO change_logs (action, resource_uuid, data)
     VALUES ($1, $2, $3)`,
    ['edit', uuid, JSON.stringify(jsonData)]
  );

  await invalidateCache();
}

export async function deleteResource(uuid: string): Promise<boolean> {
  const result = await db.query('DELETE FROM resources WHERE uuid = $1 RETURNING uuid', [uuid]);
  if (result.rowCount && result.rowCount > 0) {
    await db.query(
      `INSERT INTO change_logs (action, resource_uuid) VALUES ($1, $2)`,
      ['delete', uuid]
    );
    await invalidateCache();
    return true;
  }
  return false;
}

export async function hasResource(uuid: string): Promise<boolean> {
  const result = await db.query('SELECT 1 FROM resources WHERE uuid = $1', [uuid]);
  return result.rowCount ? result.rowCount > 0 : false;
}
