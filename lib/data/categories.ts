import { db } from '@/lib/db';
import { redis } from '@/lib/cache/redis';
import 'server-only';

export interface CategoryData {
  icon?: string;
  link?: string;
  items?: Record<string, CategoryData>;
  [key: string]: any;
}

export type CategoriesMap = Record<string, CategoryData>;

const CACHE_KEY = 'db:categories';
const CACHE_TTL = 300;

async function invalidateCache() {
  await redis.del(CACHE_KEY);
}

export async function getCategories(): Promise<CategoriesMap> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const result = await db.query('SELECT name, slug, icon, children FROM categories ORDER BY sort_order');
  const map: CategoriesMap = {};
  for (const row of result.rows) {
    map[row.slug] = {
      icon: row.icon || '',
      link: `/${row.slug}`,
      ...(row.children && Object.keys(row.children).length > 0 ? { items: row.children } : {}),
    };
  }

  await redis.set(CACHE_KEY, JSON.stringify(map), CACHE_TTL);
  return map;
}

export async function saveCategories(categories: CategoriesMap): Promise<void> {
  for (const [slug, data] of Object.entries(categories)) {
    const name = slug;
    const icon = data.icon || '';
    const children = data.items || {};
    await db.query(
      `INSERT INTO categories (name, slug, icon, children, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (slug) DO UPDATE SET
         name = $1, icon = $3, children = $4, updated_at = NOW()`,
      [name, slug, icon, JSON.stringify(children)]
    );
  }

  await db.query(
    `INSERT INTO change_logs (action, resource_uuid, data)
     VALUES ($1, $2, $3)`,
    ['edit', 'categories', JSON.stringify(categories)]
  );

  await invalidateCache();
}
