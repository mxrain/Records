import { db } from '@/lib/db';
import { redis } from '@/lib/cache/redis';
import 'server-only';

export interface ListItem {
  uuid: string;
  name: string;
  category: string;
  images: string[];
  tags: string[];
  source_links: Record<string, { link: string; psw: string; size: string }>;
  uploaded: number;
  update_time: number;
  introduction: string;
  resource_information: Record<string, string>;
  link: string;
  rating: number;
  comments: number;
  download_count: number;
  download_limit: number;
  other_information: Record<string, unknown>;
  score?: number;
}

export interface ListData {
  recommend: ListItem[];
  hot: ListItem[];
  latest: ListItem[];
  top: ListItem[];
  carousel: string[];
}

const CACHE_KEY = 'db:list';
const CACHE_TTL = 300;

async function invalidateCache() {
  await redis.del(CACHE_KEY);
}

export async function getList(): Promise<ListData> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const result = await db.query('SELECT list_type, resource_uuids, config FROM list_config');
  const data: ListData = {
    recommend: [],
    hot: [],
    latest: [],
    top: [],
    carousel: [],
  };

  for (const row of result.rows) {
    const uuids: string[] = row.resource_uuids || [];
    if (row.list_type === 'carousel') {
      data.carousel = uuids;
      continue;
    }

    const resources = await db.query(
      `SELECT uuid, json_data FROM resources WHERE uuid = ANY($1)`,
      [uuids]
    );

    const items: ListItem[] = [];
    const resourceMap = new Map<string, any>();
    for (const r of resources.rows) {
      resourceMap.set(r.uuid, r.json_data);
    }

    for (const uuid of uuids) {
      const json = resourceMap.get(uuid);
      if (json) {
        items.push({
          uuid,
          name: json.name || '',
          category: json.category || '',
          images: json.images || [],
          tags: json.tags || [],
          source_links: json.source_links || {},
          uploaded: json.uploaded || 0,
          update_time: json.update_time || 0,
          introduction: json.introduction || '',
          resource_information: json.resource_information || {},
          link: json.link || '',
          rating: json.rating || 0,
          comments: json.comments || 0,
          download_count: json.download_count || 0,
          download_limit: json.download_limit || 0,
          other_information: json.other_information || {},
        });
      }
    }

    const _key = row.list_type as keyof Omit<ListData, 'carousel'>;
    if (_key in data) {
      (data as any)[_key] = items;
    }
  }

  await redis.set(CACHE_KEY, JSON.stringify(data), CACHE_TTL);
  return data;
}

export async function saveList(data: ListData): Promise<void> {
  const types = ['hot', 'latest', 'recommend', 'top', 'carousel'] as const;
  for (const type of types) {
    const uuids = type === 'carousel' ? data.carousel : data[type].map(item => item.uuid);
    await db.query(
      `INSERT INTO list_config (list_type, resource_uuids, config, updated_at)
       VALUES ($1, $2, '{}'::jsonb, NOW())
       ON CONFLICT (list_type) DO UPDATE SET
         resource_uuids = $2, updated_at = NOW()`,
      [type, JSON.stringify(uuids)]
    );
  }

  await db.query(
    `INSERT INTO change_logs (action, resource_uuid, data)
     VALUES ($1, $2, $3)`,
    ['edit', 'list', JSON.stringify(data)]
  );

  await invalidateCache();
}
