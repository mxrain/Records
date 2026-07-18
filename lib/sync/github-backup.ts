import { db } from '@/lib/db';
import 'server-only';

interface BackupAction {
  id: number;
  action: string;
  resource_uuid: string;
  data: any;
}

async function fetchGitHubFile(path: string): Promise<{ content: string; sha: string } | null> {
  const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'mxrain';
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || 'Records';
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.warn('[GitHub Backup] GITHUB_TOKEN not set, skipping');
    return null;
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Records-Backup',
      },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`[GitHub Backup] fetch ${path} failed: ${res.status}`);
      return null;
    }

    const json = await res.json();
    if (json.content) {
      const content = Buffer.from(json.content, 'base64').toString('utf-8');
      return { content, sha: json.sha };
    }
    return null;
  } catch (e) {
    console.error(`[GitHub Backup] fetch ${path} error:`, e);
    return null;
  }
}

async function putGitHubFile(path: string, content: string, sha: string | undefined, message: string): Promise<boolean> {
  const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'mxrain';
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || 'Records';
  const token = process.env.GITHUB_TOKEN;

  if (!token) return false;

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const body: any = {
      message,
      content: Buffer.from(content).toString('base64'),
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Records-Backup',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[GitHub Backup] put ${path} failed: ${res.status}`, err);
      return false;
    }

    return true;
  } catch (e) {
    console.error(`[GitHub Backup] put ${path} error:`, e);
    return false;
  }
}

async function backupResources(): Promise<boolean> {
  const result = await db.query('SELECT uuid, json_data FROM resources');
  const map: Record<string, any> = {};
  for (const row of result.rows) {
    map[row.uuid] = row.json_data;
  }

  const content = JSON.stringify(map, null, 2);
  const existing = await fetchGitHubFile('db/resources.json');
  return putGitHubFile('db/resources.json', content, existing?.sha, 'Backup: resources.json from PostgreSQL');
}

async function backupCategories(): Promise<boolean> {
  const result = await db.query('SELECT name, slug, icon, children FROM categories ORDER BY sort_order');
  const map: Record<string, any> = {};
  for (const row of result.rows) {
    map[row.slug] = {
      icon: row.icon || '',
      link: `/${row.slug}`,
      ...(row.children && Object.keys(row.children).length > 0 ? { items: row.children } : {}),
    };
  }

  const content = JSON.stringify(map, null, 2);
  const existing = await fetchGitHubFile('db/categories.json');
  return putGitHubFile('db/categories.json', content, existing?.sha, 'Backup: categories.json from PostgreSQL');
}

async function backupList(): Promise<boolean> {
  const result = await db.query('SELECT list_type, resource_uuids FROM list_config');
  const data: any = { recommend: [], hot: [], latest: [], top: [], carousel: [] };

  for (const row of result.rows) {
    if (row.list_type === 'carousel') {
      data.carousel = row.resource_uuids || [];
    } else {
      const uuids = row.resource_uuids || [];
      data[row.list_type] = uuids.map((uuid: string) => ({ uuid }));
    }
  }

  const content = JSON.stringify(data, null, 2);
  const existing = await fetchGitHubFile('db/list.json');
  return putGitHubFile('db/list.json', content, existing?.sha, 'Backup: list.json from PostgreSQL');
}

export async function syncAllToGitHub(): Promise<{ resources: boolean; categories: boolean; list: boolean }> {
  console.log('[GitHub Backup] Starting full sync...');

  const [resources, categories, list] = await Promise.all([
    backupResources(),
    backupCategories(),
    backupList(),
  ]);

  console.log(`[GitHub Backup] ✅ resources=${resources} categories=${categories} list=${list}`);
  return { resources, categories, list };
}

export async function syncPendingChanges(): Promise<number> {
  // 使用 FOR UPDATE SKIP LOCKED 锁定正在处理的行,防止并发触发重复备份:
  // - 两个并发调用只会拿到互斥的行集,不会重复处理同一批 change_logs
  // - 备份成功后才在同一事务内标记 synced=true,失败则行锁释放,下次重试
  // - 注意:GitHub fetch 是网络 IO,放在事务内会延长锁持有时间,
  //   但 change_logs 行级锁粒度小,且每批最多 50 条,影响可控
  return await db.withTransaction(async (tx) => {
    const result = await tx.query(
      `SELECT id, action, resource_uuid, data FROM change_logs
       WHERE synced = false ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED`
    );

    const logs: BackupAction[] = result.rows;
    if (logs.length === 0) return 0;

    let synced = 0;
    for (const log of logs) {
      let ok = false;
      switch (log.action) {
        case 'edit':
        case 'delete':
          ok = await backupResources();
          break;
        case 'categories':
          ok = await backupCategories();
          break;
        case 'list':
          ok = await backupList();
          break;
      }

      if (ok) {
        await tx.query('UPDATE change_logs SET synced = true WHERE id = $1', [log.id]);
        synced++;
      }
      // 失败时不标记 synced=true,行锁释放后下次 syncPendingChanges 会重新处理
    }

    console.log(`[GitHub Backup] Synced ${synced}/${logs.length} pending changes`);
    return synced;
  });
}
