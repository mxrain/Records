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

// 判断 children 是否有内容（兼容数组和对象两种存储格式）
function hasItems(children: any): boolean {
  if (Array.isArray(children)) return children.length > 0;
  if (children && typeof children === 'object') return Object.keys(children).length > 0;
  return false;
}

// 将 children 规范化为以显示名为 key 的对象格式（兼容数组和对象两种存储格式）
function normalizeChildren(children: any): CategoriesMap {
  const map: CategoriesMap = {};
  if (Array.isArray(children)) {
    // 数组格式：[{ name, slug, icon, children, ... }, ...]
    for (const child of children) {
      const displayName = child.name || child.slug;
      const childSlug = child.slug || child.name;
      map[displayName] = {
        icon: child.icon || '',
        link: child.link || `/${childSlug}`,
        ...(hasItems(child.children) ? { items: normalizeChildren(child.children) } : {}),
      };
    }
  } else if (children && typeof children === 'object') {
    // 对象格式：{ slug: { name, icon, link, ... }, ... }
    for (const [key, childRaw] of Object.entries(children)) {
      const child = childRaw as any;
      const displayName = child.name || key;
      const link = child.link || `/${key}`;
      map[displayName] = {
        icon: child.icon || '',
        link,
        ...(hasItems(child.children) ? { items: normalizeChildren(child.children) } : {}),
      };
    }
  }
  return map;
}

// 校验缓存格式是否符合前端期望（items 必须是对象而非数组）
function isCacheValid(map: any): boolean {
  if (!map || typeof map !== 'object') return false;
  return Object.values(map).every((value: any) => {
    if (!value || typeof value !== 'object') return false;
    // items 若存在必须是对象（不能是数组）
    if (value.items !== undefined && !Array.isArray(value.items) && typeof value.items === 'object') {
      return isCacheValid(value.items);
    }
    return value.items === undefined || (typeof value.items === 'object' && !Array.isArray(value.items));
  });
}

export async function getCategories(): Promise<CategoriesMap> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // 校验缓存格式，若 items 为数组（旧格式）则视为缓存失效重新查库
      if (isCacheValid(parsed)) return parsed;
    } catch {}
  }

  const result = await db.query('SELECT name, slug, icon, children FROM categories ORDER BY sort_order');
  const map: CategoriesMap = {};
  for (const row of result.rows) {
    // 以中文显示名作为 key（前端 CategoryMenu 直接用 key 作为显示文本）
    const displayName = row.name || row.slug;
    map[displayName] = {
      icon: row.icon || '',
      link: `/${row.slug}`,
      ...(hasItems(row.children) ? { items: normalizeChildren(row.children) } : {}),
    };
  }

  await redis.set(CACHE_KEY, JSON.stringify(map), CACHE_TTL);
  return map;
}

export async function saveCategories(categories: CategoriesMap): Promise<void> {
  await db.withTransaction(async (tx) => {
    for (const [slug, data] of Object.entries(categories)) {
      const name = slug;
      const icon = data.icon || '';
      const children = data.items || {};
      await tx.query(
        `INSERT INTO categories (name, slug, icon, children, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (slug) DO UPDATE SET
           name = $1, icon = $3, children = $4, updated_at = NOW()`,
        [name, slug, icon, JSON.stringify(children)]
      );
    }

    await tx.query(
      `INSERT INTO change_logs (action, resource_uuid, data)
       VALUES ($1, $2, $3)`,
      ['edit', 'categories', JSON.stringify(categories)]
    );
  });

  await invalidateCache();
}

// 根据路径定位子树(返回父对象与目标 key,便于增删改)
// path 为显示名数组,如 ['游戏','单机']
async function locateNode(
  path: string[]
): Promise<{ parent: CategoriesMap | null; key: string | null; rootSlug: string | null }> {
  if (path.length === 0) return { parent: null, key: null, rootSlug: null };

  const rootName = path[0];
  // 找到根分类行
  const rootRes = await db.query('SELECT slug, name, icon, children FROM categories WHERE name = $1', [rootName]);
  if (rootRes.rows.length === 0) return { parent: null, key: null, rootSlug: null };
  const rootRow = rootRes.rows[0];
  const rootSlug = rootRow.slug;

  if (path.length === 1) {
    return { parent: null, key: rootName, rootSlug };
  }

  // 沿 path 下钻,得到父层 children 对象
  let children: any = rootRow.children || {};
  for (let i = 1; i < path.length - 1; i++) {
    const name = path[i];
    const child = findChildByName(children, name);
    if (!child) return { parent: null, key: null, rootSlug };
    children = child.children || {};
  }
  // parent 是最后一级 children 对象(以显示名为 key)
  const parentMap: CategoriesMap = {};
  if (Array.isArray(children)) {
    for (const c of children) {
      const displayName = c.name || c.slug;
      parentMap[displayName] = {
        icon: c.icon || '',
        link: c.link || `/${c.slug || displayName}`,
        ...(c.children ? { items: normalizeChildren(c.children) } : {}),
      };
    }
  } else {
    for (const [k, v] of Object.entries(children)) {
      const c = v as any;
      const displayName = c.name || k;
      parentMap[displayName] = {
        icon: c.icon || '',
        link: c.link || `/${k}`,
        ...(c.children ? { items: normalizeChildren(c.children) } : {}),
      };
    }
  }
  return { parent: parentMap, key: path[path.length - 1], rootSlug };
}

function findChildByName(children: any, name: string): any | null {
  if (Array.isArray(children)) {
    return children.find((c) => (c.name || c.slug) === name) || null;
  }
  if (children && typeof children === 'object') {
    for (const [k, v] of Object.entries(children)) {
      const c = v as any;
      if ((c.name || k) === name) return c;
    }
  }
  return null;
}

// 新增分类
// path 为父路径(空数组表示根级),name 为新分类显示名
export async function addCategory(
  path: string[],
  name: string,
  icon = '',
  link = ''
): Promise<void> {
  if (!name) throw new Error('分类名称不能为空');

  // 根级新增
  if (path.length === 0) {
    const slug = name;
    await db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO categories (name, slug, icon, children, sort_order, updated_at)
         VALUES ($1, $2, $3, '[]'::jsonb, (SELECT COALESCE(MAX(sort_order),0)+1 FROM categories), NOW())
         ON CONFLICT (slug) DO UPDATE SET
           name = $1, icon = $3, updated_at = NOW()`,
        [name, slug, icon]
      );
      await tx.query(
        `INSERT INTO change_logs (action, resource_uuid, data) VALUES ('add', 'categories', $1)`,
        [JSON.stringify({ path: [], name, icon, link })]
      );
    });
    await invalidateCache();
    return;
  }

  // 子级新增:定位父节点并写入 children
  const rootName = path[0];

  // 事务 + FOR UPDATE 行锁,防止并发读-改-写丢失更新
  await db.withTransaction(async (tx) => {
    // 锁定根分类行,直到事务结束
    const rootRes = await tx.query('SELECT slug, children FROM categories WHERE name = $1 FOR UPDATE', [rootName]);
    if (rootRes.rows.length === 0) throw new Error(`父分类 "${rootName}" 不存在`);
    const rootRow = rootRes.rows[0];

    let children: any[] = Array.isArray(rootRow.children) ? rootRow.children : [];

    // 沿 path 下钻到目标父层
    let cursor: any[] = children;
    for (let i = 1; i < path.length; i++) {
      const nameAtDepth = path[i];
      const idx = cursor.findIndex((c) => (c.name || c.slug) === nameAtDepth);
      if (idx === -1) throw new Error(`父分类 "${nameAtDepth}" 不存在`);
      if (!Array.isArray(cursor[idx].children)) cursor[idx].children = [];
      cursor = cursor[idx].children;
    }

    // 避免重名
    if (cursor.some((c) => (c.name || c.slug) === name)) {
      throw new Error(`分类 "${name}" 已存在`);
    }

    cursor.push({
      name,
      slug: name,
      icon,
      link: link || `/${name}`,
      children: [],
    });

    await tx.query(
      'UPDATE categories SET children = $1::jsonb, updated_at = NOW() WHERE slug = $2',
      [JSON.stringify(children), rootRow.slug]
    );
    await tx.query(
      `INSERT INTO change_logs (action, resource_uuid, data) VALUES ('add', 'categories', $1)`,
      [JSON.stringify({ path, name, icon, link })]
    );
  });

  await invalidateCache();
}

// 更新分类(改名 / 图标 / 链接)
export async function updateCategory(
  path: string[],
  name: string,
  icon = '',
  link = ''
): Promise<void> {
  if (path.length === 0) throw new Error('路径不能为空');
  const oldName = path[path.length - 1];

  // 根级更新
  if (path.length === 1) {
    await db.withTransaction(async (tx) => {
      // 锁定要修改的行
      const oldRes = await tx.query('SELECT slug FROM categories WHERE name = $1 FOR UPDATE', [oldName]);
      if (oldRes.rows.length === 0) throw new Error(`分类 "${oldName}" 不存在`);
      const slug = oldRes.rows[0].slug;
      // 改名时 slug 也跟随改变(保持 name = slug 约定)
      const newSlug = name;
      await tx.query(
        `UPDATE categories SET name = $1, slug = $2, icon = $3, updated_at = NOW()
         WHERE slug = $4`,
        [name, newSlug, icon, slug]
      );
      await tx.query(
        `INSERT INTO change_logs (action, resource_uuid, data) VALUES ('edit', 'categories', $1)`,
        [JSON.stringify({ path, oldName, name, icon, link })]
      );
    });
    await invalidateCache();
    return;
  }

  // 子级更新
  const rootName = path[0];

  await db.withTransaction(async (tx) => {
    // 锁定根分类行,防止并发修改
    const rootRes = await tx.query('SELECT slug, children FROM categories WHERE name = $1 FOR UPDATE', [rootName]);
    if (rootRes.rows.length === 0) throw new Error(`根分类 "${rootName}" 不存在`);
    const rootRow = rootRes.rows[0];
    const children: any[] = Array.isArray(rootRow.children) ? rootRow.children : [];

    // 下钻到父层
    let cursor: any[] = children;
    for (let i = 1; i < path.length - 1; i++) {
      const nameAtDepth = path[i];
      const idx = cursor.findIndex((c) => (c.name || c.slug) === nameAtDepth);
      if (idx === -1) throw new Error(`父分类 "${nameAtDepth}" 不存在`);
      if (!Array.isArray(cursor[idx].children)) cursor[idx].children = [];
      cursor = cursor[idx].children;
    }

    const targetIdx = cursor.findIndex((c) => (c.name || c.slug) === oldName);
    if (targetIdx === -1) throw new Error(`分类 "${oldName}" 不存在`);
    cursor[targetIdx].name = name;
    cursor[targetIdx].slug = name;
    cursor[targetIdx].icon = icon;
    if (link) cursor[targetIdx].link = link;

    await tx.query(
      'UPDATE categories SET children = $1::jsonb, updated_at = NOW() WHERE slug = $2',
      [JSON.stringify(children), rootRow.slug]
    );
    await tx.query(
      `INSERT INTO change_logs (action, resource_uuid, data) VALUES ('edit', 'categories', $1)`,
      [JSON.stringify({ path, oldName, name, icon, link })]
    );
  });

  await invalidateCache();
}

// 删除分类(连同子树)
export async function deleteCategory(path: string[]): Promise<void> {
  if (path.length === 0) throw new Error('路径不能为空');
  const targetName = path[path.length - 1];

  // 根级删除
  if (path.length === 1) {
    await db.withTransaction(async (tx) => {
      // 锁定 + 读取(便于在审计日志中保存快照)
      const existing = await tx.query('SELECT children FROM categories WHERE name = $1 FOR UPDATE', [targetName]);
      if (existing.rows.length === 0) throw new Error(`分类 "${targetName}" 不存在`);
      await tx.query('DELETE FROM categories WHERE name = $1', [targetName]);
      await tx.query(
        `INSERT INTO change_logs (action, resource_uuid, data) VALUES ('delete', 'categories', $1)`,
        [JSON.stringify({ path, name: targetName, before: existing.rows[0].children })]
      );
    });
    await invalidateCache();
    return;
  }

  // 子级删除
  const rootName = path[0];

  await db.withTransaction(async (tx) => {
    // 锁定根分类行
    const rootRes = await tx.query('SELECT slug, children FROM categories WHERE name = $1 FOR UPDATE', [rootName]);
    if (rootRes.rows.length === 0) throw new Error(`根分类 "${rootName}" 不存在`);
    const rootRow = rootRes.rows[0];
    const children: any[] = Array.isArray(rootRow.children) ? rootRow.children : [];

    // 下钻到父层
    let cursor: any[] = children;
    for (let i = 1; i < path.length - 1; i++) {
      const nameAtDepth = path[i];
      const idx = cursor.findIndex((c) => (c.name || c.slug) === nameAtDepth);
      if (idx === -1) throw new Error(`父分类 "${nameAtDepth}" 不存在`);
      if (!Array.isArray(cursor[idx].children)) cursor[idx].children = [];
      cursor = cursor[idx].children;
    }

    const targetIdx = cursor.findIndex((c) => (c.name || c.slug) === targetName);
    if (targetIdx === -1) throw new Error(`分类 "${targetName}" 不存在`);
    const removed = cursor.splice(targetIdx, 1)[0];

    await tx.query(
      'UPDATE categories SET children = $1::jsonb, updated_at = NOW() WHERE slug = $2',
      [JSON.stringify(children), rootRow.slug]
    );
    await tx.query(
      `INSERT INTO change_logs (action, resource_uuid, data) VALUES ('delete', 'categories', $1)`,
      [JSON.stringify({ path, name: targetName, before: removed })]
    );
  });

  await invalidateCache();
}

// ============ 移动分类(拖拽排序) ============
// position: 'before' | 'after' | 'inside'
//   before/after:与 target 同级,放在 target 前/后
//   inside:作为 target 的子级
export async function moveCategory(
  sourcePath: string[],
  targetPath: string[],
  position: 'before' | 'after' | 'inside'
): Promise<void> {
  if (sourcePath.length === 0) throw new Error('源路径不能为空');
  if (targetPath.length === 0) throw new Error('目标路径不能为空');

  const sourceName = sourcePath[sourcePath.length - 1];
  const targetName = targetPath[targetPath.length - 1];

  // 禁止拖到自身
  if (sourcePath.join('>') === targetPath.join('>')) {
    throw new Error('不能移动到自身');
  }
  // 禁止拖到自己的子树
  if (targetPath.join('>').startsWith(sourcePath.join('>') + '>')) {
    throw new Error('不能移动到自身的子分类中');
  }

  // 整个 move 操作必须在单事务内完成:锁定所有根行 → 内存树操作 → 写回 → 审计日志
  // 这样跨多行 UPDATE/INSERT/DELETE 不会出现半完成状态
  await db.withTransaction(async (tx) => {
    // ===== 1. 读取并锁定全部分类行(FOR UPDATE 防止并发 move/edit) =====
    const allRows = (await tx.query('SELECT slug, name, icon, children, sort_order FROM categories ORDER BY sort_order FOR UPDATE')).rows;

    // ===== 2. 在内存树中操作 =====
    type Node = {
      name: string;
      slug: string;
      icon: string;
      link?: string;
      children: Node[];
    };

    function toNode(row: any): Node {
      const childrenRaw = Array.isArray(row.children) ? row.children : [];
      return {
        name: row.name,
        slug: row.slug,
        icon: row.icon || '',
        link: row.link,
        children: childrenRaw.map((c: any) => ({
          name: c.name || c.slug,
          slug: c.slug || c.name,
          icon: c.icon || '',
          link: c.link,
          children: Array.isArray(c.children) ? c.children.map(toNode) : [],
        })),
      };
    }

    const rootNodes: Node[] = allRows.map(toNode);

    function findNodeAndParent(path: string[]): { node: Node; parentChildren: Node[] | null } | null {
      const rootName = path[0];
      const rootIdx = rootNodes.findIndex((n) => n.name === rootName);
      if (rootIdx === -1) return null;
      if (path.length === 1) {
        return { node: rootNodes[rootIdx], parentChildren: null };
      }
      let current = rootNodes[rootIdx];
      for (let i = 1; i < path.length - 1; i++) {
        const idx = current.children.findIndex((c) => c.name === path[i]);
        if (idx === -1) return null;
        current = current.children[idx];
      }
      const targetIdx = current.children.findIndex((c) => c.name === path[path.length - 1]);
      if (targetIdx === -1) return null;
      return { node: current.children[targetIdx], parentChildren: current.children };
    }

    // 3. 从原位置移除 source
    const sourceInfo = findNodeAndParent(sourcePath);
    if (!sourceInfo) throw new Error(`源分类 "${sourceName}" 不存在`);
    const movedNode = sourceInfo.node;
    if (sourceInfo.parentChildren === null) {
      const idx = rootNodes.findIndex((n) => n.name === sourceName);
      rootNodes.splice(idx, 1);
    } else {
      const idx = sourceInfo.parentChildren.findIndex((c) => c.name === sourceName);
      sourceInfo.parentChildren.splice(idx, 1);
    }

    // 4. 插入到目标位置
    if (position === 'inside') {
      const targetInfo = findNodeAndParent(targetPath);
      if (!targetInfo) throw new Error(`目标分类 "${targetName}" 不存在`);
      if (!targetInfo.node.children) targetInfo.node.children = [];
      targetInfo.node.children.push(movedNode);
    } else {
      const targetInfo = findNodeAndParent(targetPath);
      if (!targetInfo) throw new Error(`目标分类 "${targetName}" 不存在`);
      const siblings = targetInfo.parentChildren === null ? rootNodes : targetInfo.parentChildren;
      const targetIdx = siblings.findIndex((c) => c.name === targetName);
      if (targetIdx === -1) throw new Error(`目标分类 "${targetName}" 不存在`);
      const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
      siblings.splice(insertIdx, 0, movedNode);
    }

    // ===== 5. 把内存树写回数据库(同一事务,同锁) =====
    const existingSlugs = new Set(allRows.map((r: any) => r.slug));

    for (const root of rootNodes) {
      const childrenJson = JSON.stringify(root.children.map((c) => ({
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        link: c.link || `/${c.slug}`,
        children: c.children,
      })));

      if (existingSlugs.has(root.slug)) {
        await tx.query(
          'UPDATE categories SET name = $1, icon = $2, children = $3::jsonb, updated_at = NOW() WHERE slug = $4',
          [root.name, root.icon, childrenJson, root.slug]
        );
      } else {
        await tx.query(
          `INSERT INTO categories (name, slug, icon, children, sort_order, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, (SELECT COALESCE(MAX(sort_order),0)+1 FROM categories), NOW())`,
          [root.name, root.slug, root.icon, childrenJson]
        );
      }
    }

    // 删除已不存在的根分类
    const currentRootSlugs = new Set(rootNodes.map((n) => n.slug));
    for (const row of allRows) {
      if (!currentRootSlugs.has((row as any).slug)) {
        await tx.query('DELETE FROM categories WHERE slug = $1', [(row as any).slug]);
      }
    }

    await tx.query(
      `INSERT INTO change_logs (action, resource_uuid, data) VALUES ('move', 'categories', $1)`,
      [JSON.stringify({ sourcePath, targetPath, position })]
    );
  });

  await invalidateCache();
}
