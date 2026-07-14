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

/**
 * 热门/最新列表的覆盖配置
 * - pinned: 强制置顶的 uuid（按数组顺序排在最前）
 * - excluded: 强制排除的 uuid（不出现在自动派生结果中）
 * - limit: 返回条目上限（默认 20）
 */
export interface ListOverride {
  pinned: string[];
  excluded: string[];
  limit: number;
}

const DEFAULT_OVERRIDE: ListOverride = { pinned: [], excluded: [], limit: 20 };
const CACHE_KEY = 'db:list';
const CACHE_TTL = 300;

// SQL 派生模式适用的列表类型
const SQL_DERIVED_TYPES = ['hot', 'latest'] as const;
type SqlDerivedType = typeof SQL_DERIVED_TYPES[number];

async function invalidateCache() {
  await redis.del(CACHE_KEY);
}

// 把 json_data 行映射为 ListItem
function mapRowToItem(row: any): ListItem {
  const j = row.json_data;
  return {
    uuid: row.uuid,
    name: j.name || '',
    category: j.category || '',
    images: j.images || [],
    tags: j.tags || [],
    source_links: j.source_links || {},
    uploaded: j.uploaded || 0,
    update_time: j.update_time || 0,
    introduction: j.introduction || '',
    resource_information: j.resource_information || {},
    link: j.link || '',
    rating: j.rating || 0,
    comments: j.comments || 0,
    download_count: j.download_count || 0,
    download_limit: j.download_limit || 0,
    other_information: j.other_information || {},
  };
}

// 按 uuid 顺序（pinned 顺序）排列资源
function orderByUuids(rows: any[], uuids: string[]): ListItem[] {
  const map = new Map<string, any>(rows.map((r) => [r.uuid, r]));
  const items: ListItem[] = [];
  for (const uuid of uuids) {
    const row = map.get(uuid);
    if (row) items.push(mapRowToItem(row));
  }
  return items;
}

/**
 * SQL 派生 hot/latest 列表
 * - hot: ORDER BY download_count DESC, update_time DESC
 * - latest: ORDER BY uploaded DESC
 * 应用 pinned（置顶）和 excluded（排除）覆盖
 */
async function getSqlDerivedList(type: SqlDerivedType, override: ListOverride): Promise<ListItem[]> {
  const limit = Math.max(1, override.limit || DEFAULT_OVERRIDE.limit);
  const excluded = override.excluded || [];
  const pinned = override.pinned || [];

  // 排序字段与方向(用 bigint,因 uploaded/update_time 为毫秒时间戳超出 int 范围)
  const orderExpr = type === 'hot'
    ? "COALESCE((json_data->>'download_count')::bigint, 0) DESC, COALESCE((json_data->>'update_time')::bigint, 0) DESC"
    : "COALESCE((json_data->>'uploaded')::bigint, 0) DESC";

  // 自动派生部分:排除 pinned 与 excluded,按 SQL 排序取 limit 条
  const excludeAll = [...new Set([...pinned, ...excluded])];
  let autoRows: any[] = [];
  if (excludeAll.length > 0) {
    autoRows = (await db.query(
      `SELECT uuid, json_data FROM resources
       WHERE uuid <> ALL($1)
       ORDER BY ${orderExpr}
       LIMIT $2`,
      [excludeAll, limit]
    )).rows;
  } else {
    autoRows = (await db.query(
      `SELECT uuid, json_data FROM resources
       ORDER BY ${orderExpr}
       LIMIT $1`,
      [limit]
    )).rows;
  }

  const autoItems = autoRows.map(mapRowToItem);

  // pinned 部分:按数组顺序置顶
  let pinnedItems: ListItem[] = [];
  if (pinned.length > 0) {
    const pinnedRows = (await db.query(
      `SELECT uuid, json_data FROM resources WHERE uuid = ANY($1)`,
      [pinned]
    )).rows;
    pinnedItems = orderByUuids(pinnedRows, pinned);
  }

  // 合并:pinned 在前,auto 在后,总条数不超过 limit
  return [...pinnedItems, ...autoItems].slice(0, limit);
}

// 读取 list_config.config(覆盖配置)
function parseOverride(config: any): ListOverride {
  if (!config || typeof config !== 'object') return { ...DEFAULT_OVERRIDE };
  return {
    pinned: Array.isArray(config.pinned) ? config.pinned : [],
    excluded: Array.isArray(config.excluded) ? config.excluded : [],
    limit: typeof config.limit === 'number' && config.limit > 0 ? config.limit : DEFAULT_OVERRIDE.limit,
  };
}

export async function getList(): Promise<ListData> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const result = await db.query('SELECT list_type, resource_uuids, config FROM list_config');
  const rowsByType = new Map<string, any>();
  for (const row of result.rows) {
    rowsByType.set(row.list_type, row);
  }

  const data: ListData = {
    recommend: [],
    hot: [],
    latest: [],
    top: [],
    carousel: [],
  };

  // 处理 carousel
  const carouselRow = rowsByType.get('carousel');
  data.carousel = carouselRow?.resource_uuids || [];

  // 处理 SQL 派生类型(hot / latest)
  for (const type of SQL_DERIVED_TYPES) {
    const row = rowsByType.get(type);
    const override = parseOverride(row?.config);
    data[type] = await getSqlDerivedList(type, override);
  }

  // 处理手动模式类型(recommend / top)
  for (const type of ['recommend', 'top'] as const) {
    const row = rowsByType.get(type);
    const uuids: string[] = row?.resource_uuids || [];
    if (uuids.length === 0) {
      data[type] = [];
      continue;
    }
    const resources = await db.query(
      `SELECT uuid, json_data FROM resources WHERE uuid = ANY($1)`,
      [uuids]
    );
    data[type] = orderByUuids(resources.rows, uuids);
  }

  await redis.set(CACHE_KEY, JSON.stringify(data), CACHE_TTL);
  return data;
}

/**
 * 保存手动模式列表(recommend / top / carousel)
 * 热门/最新不再使用此函数,请用 saveListOverride
 */
export async function saveList(data: ListData): Promise<void> {
  const types = ['recommend', 'top', 'carousel'] as const;
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

/**
 * 保存 SQL 派生列表的覆盖配置(hot / latest)
 * 仅更新 config 字段,不影响 resource_uuids(向后兼容)
 */
export async function saveListOverride(type: SqlDerivedType, override: ListOverride): Promise<void> {
  const config = {
    pinned: override.pinned || [],
    excluded: override.excluded || [],
    limit: override.limit || DEFAULT_OVERRIDE.limit,
  };

  await db.query(
    `INSERT INTO list_config (list_type, resource_uuids, config, updated_at)
     VALUES ($1, '[]'::jsonb, $2::jsonb, NOW())
     ON CONFLICT (list_type) DO UPDATE SET
       config = $2::jsonb, updated_at = NOW()`,
    [type, JSON.stringify(config)]
  );

  await db.query(
    `INSERT INTO change_logs (action, resource_uuid, data)
     VALUES ($1, $2, $3)`,
    ['edit', `list:${type}:override`, JSON.stringify(config)]
  );

  await invalidateCache();
}

/**
 * 读取 SQL 派生列表的覆盖配置
 */
export async function getListOverride(type: SqlDerivedType): Promise<ListOverride> {
  const result = await db.query(
    'SELECT config FROM list_config WHERE list_type = $1',
    [type]
  );
  return parseOverride(result.rows[0]?.config);
}
