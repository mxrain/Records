import { db } from '@/lib/db';
import { redis } from '@/lib/cache/redis';
import 'server-only';

export interface Tag {
  name: string;
  color?: string;
}

export type TagsMap = Record<string, Tag>;

const CACHE_KEY = 'db:tags';
const CACHE_TTL = 300;

async function invalidateCache() {
  await redis.del(CACHE_KEY);
}

export async function getTags(): Promise<TagsMap> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const result = await db.query(
    `SELECT DISTINCT json_data->'tags' as tags FROM resources WHERE json_data->'tags' IS NOT NULL`
  );

  const map: TagsMap = {};
  for (const row of result.rows) {
    const tags = row.tags;
    if (tags && typeof tags === 'object') {
      for (const [key, value] of Object.entries(tags)) {
        if (typeof value === 'string') {
          map[key] = { name: value };
        } else if (value && typeof value === 'object') {
          map[key] = value as Tag;
        }
      }
    }
  }

  await redis.set(CACHE_KEY, JSON.stringify(map), CACHE_TTL);
  return map;
}

export async function addTag(key: string, tag: Tag): Promise<void> {
  await invalidateCache();
}

export async function updateTag(key: string, tag: Partial<Tag>): Promise<void> {
  await invalidateCache();
}

export async function deleteTag(key: string): Promise<void> {
  await invalidateCache();
}
