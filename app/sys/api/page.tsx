import fs from 'fs';
import path from 'path';
import ApiListClient from './ApiListClient';

export type ApiSide = 'frontend' | 'backend' | 'github' | 'auth';

// 参数信息
export interface ApiParam {
  name: string;          // 参数名
  location: 'path' | 'query' | 'body';  // 参数位置
  type: string;          // 类型(string/number/boolean/array/object/any)
  required?: boolean;    // 是否必填
  desc?: string;         // 描述
  example?: string;      // 示例值
}

export interface ApiRouteInfo {
  path: string;
  methods: string[];
  file: string;
  desc: string;
  side: ApiSide;
  category: string;
  effect: string;
  params: ApiParam[];
}

// 根据路径与方法判定分类、作用
function classifyRoute(
  routePath: string,
  methods: string[]
): { side: ApiSide; category: string; effect: string } {
  // ===== GitHub 集成 =====
  if (routePath.startsWith('/api/github/')) {
    const sub = routePath.replace('/api/github/', '');
    if (sub.startsWith('addResource')) {
      return { side: 'github', category: 'GitHub 文件', effect: '向 GitHub db/ 目录新增资源 JSON' };
    }
    if (sub.startsWith('createFile')) {
      return { side: 'github', category: 'GitHub 文件', effect: '在 GitHub 仓库创建任意文件' };
    }
    if (sub.startsWith('updateFile')) {
      return { side: 'github', category: 'GitHub 文件', effect: '更新 GitHub 仓库已有文件' };
    }
    if (sub.startsWith('getFileSha')) {
      return { side: 'github', category: 'GitHub 文件', effect: '获取文件 SHA,用于判断是否需要更新' };
    }
    if (sub.startsWith('issues')) {
      return { side: 'github', category: 'GitHub Issues', effect: '读取仓库 Issues 列表' };
    }
    if (sub.startsWith('repository')) {
      return { side: 'github', category: 'GitHub 仓库', effect: '获取仓库元信息(名称、 stars 等)' };
    }
    if (sub.startsWith('user')) {
      return { side: 'github', category: 'GitHub 用户', effect: '获取当前授权用户信息' };
    }
    if (sub.startsWith('zyt-heatmap')) {
      return { side: 'github', category: 'GitHub 活跃度', effect: '生成贡献热图数据' };
    }
    return { side: 'github', category: 'GitHub', effect: 'GitHub 集成接口' };
  }

  // ===== 身份认证 =====
  if (routePath.startsWith('/api/verify')) {
    return { side: 'auth', category: '身份认证', effect: '管理员登录校验,签发 JWT Cookie' };
  }

  // ===== 对象存储(后台) =====
  if (routePath.startsWith('/api/storage/download')) {
    return { side: 'backend', category: '对象存储', effect: '流式下载 R2 存储对象' };
  }
  if (routePath.startsWith('/api/storage')) {
    return { side: 'backend', category: '对象存储', effect: '列出/上传/删除 Cloudflare R2 对象' };
  }

  // ===== 站点设置(后台) =====
  if (routePath.startsWith('/api/settings/')) {
    return { side: 'backend', category: '站点设置', effect: '读取/更新单个站点配置项' };
  }
  if (routePath.startsWith('/api/settings')) {
    return { side: 'backend', category: '站点设置', effect: '读取全部站点配置(网站名/SEO/联系方式)' };
  }

  // ===== 列表管理 =====
  if (routePath.startsWith('/api/list/override')) {
    return { side: 'backend', category: '列表管理', effect: '热门/最新列表的强制覆盖(置顶/排除/限量)' };
  }
  if (routePath.startsWith('/api/list')) {
    return { side: 'frontend', category: '列表管理', effect: '获取首页推荐/热门/最新/置顶列表' };
  }

  // ===== 资源管理 =====
  if (routePath.startsWith('/api/resources-info')) {
    return { side: 'frontend', category: '资源管理', effect: '获取资源统计信息(总数、分类分布)' };
  }
  if (routePath.includes('/api/resources/:')) {
    // /api/resources/[id] 单个资源
    if (methods.includes('DELETE') || methods.includes('PUT')) {
      return { side: 'backend', category: '资源管理', effect: '更新/删除指定资源' };
    }
    return { side: 'frontend', category: '资源管理', effect: '获取单个资源详情' };
  }
  if (routePath.startsWith('/api/resources')) {
    // 列表:GET 给前台用,POST/PUT/DELETE 给后台用
    const writeMethods = methods.filter((m) => m !== 'GET');
    if (writeMethods.length > 0) {
      return { side: 'backend', category: '资源管理', effect: '资源增删改(同时 GET 提供列表)' };
    }
    return { side: 'frontend', category: '资源管理', effect: '获取资源列表' };
  }

  // ===== 分类管理 =====
  if (routePath.startsWith('/api/categories')) {
    if (methods.includes('PUT') || methods.includes('POST') || methods.includes('DELETE')) {
      return { side: 'backend', category: '分类管理', effect: '更新分类树(同时 GET 提供读取)' };
    }
    return { side: 'frontend', category: '分类管理', effect: '获取前台分类树' };
  }

  // ===== 标签管理 =====
  if (routePath.startsWith('/api/tags')) {
    return { side: 'frontend', category: '标签管理', effect: '获取所有标签及计数' };
  }

  // ===== 图标库 =====
  if (routePath.startsWith('/api/icons')) {
    return { side: 'frontend', category: '图标库', effect: '获取可用图标列表' };
  }

  // ===== 前台配置 =====
  if (routePath.startsWith('/api/config')) {
    return { side: 'frontend', category: '前台配置', effect: '获取前台运行时配置' };
  }

  return { side: 'frontend', category: '其他', effect: '' };
}

// 扫描 app/api 目录下所有 route.ts,提取 HTTP 方法并分类
function scanApiRoutes(baseDir: string): Promise<ApiRouteInfo[]> {
  const results: ApiRouteInfo[] = [];

  function scan(dir: string, routePath: string) {
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }

    // 检查当前目录是否含 route.ts
    if (entries.includes('route.ts') || entries.includes('route.tsx')) {
      const routeFile = entries.includes('route.ts') ? 'route.ts' : 'route.tsx';
      const filePath = path.join(dir, routeFile);
      const content = fs.readFileSync(filePath, 'utf8');
      const methods: string[] = [];
      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach((m) => {
        const reg = new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`);
        if (reg.test(content)) methods.push(m);
      });
      // 提取首部注释
      const firstLines = content.slice(0, 600);
      const descMatch = firstLines.match(/\/\*\*([\s\S]*?)\*\//);
      let desc = '';
      if (descMatch) {
        desc = descMatch[1]
          .split('\n')
          .map((l) => l.replace(/^\s*\*\s?/, '').trim())
          .filter(Boolean)
          .join(' ');
      }

      // 提取参数
      const params = extractParams(content, routePath, methods);

      const { side, category, effect } = classifyRoute(routePath, methods);
      results.push({
        path: routePath || '/',
        methods,
        file: path.relative(baseDir, filePath).replace(/\\/g, '/'),
        desc: desc.slice(0, 200),
        side,
        category,
        effect,
        params,
      });
    }

    // 递归子目录
    for (const entry of entries) {
      const full = path.join(dir, entry);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;
      if (entry.startsWith('_') || entry === 'node_modules') continue;
      const routeSeg = entry.startsWith('[') && entry.endsWith(']')
        ? entry.replace(/^\[\.\.\./, ':').replace(/^\[/, ':').replace(/\]$/, '')
        : entry;
      scan(full, `${routePath}/${routeSeg}`);
    }
  }

  scan(baseDir, '/api');
  results.sort((a, b) => {
    // 先按 side 顺序,再按 category,最后按 path
    const sideOrder: ApiSide[] = ['frontend', 'backend', 'github', 'auth'];
    const sa = sideOrder.indexOf(a.side);
    const sb = sideOrder.indexOf(b.side);
    if (sa !== sb) return sa - sb;
    if (a.category !== b.category) return a.category.localeCompare(b.category, 'zh-CN');
    return a.path.localeCompare(b.path);
  });
  return Promise.resolve(results);
}

// 从 route.ts 源码中静态提取参数信息
function extractParams(content: string, routePath: string, methods: string[]): ApiParam[] {
  const params: ApiParam[] = [];
  const seen = new Set<string>();

  const add = (p: ApiParam) => {
    const key = `${p.location}:${p.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      params.push(p);
    }
  };

  // 0. 优先解析函数上方注释:// body: { path: string[], name: string, icon?: string }
  //    这是开发者写的最权威参数说明
  const commentBodyRegex = /\/\/\s*body:\s*\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = commentBodyRegex.exec(content)) !== null) {
    const fieldsStr = m[1];
    parseTypeFields(fieldsStr).forEach((f) => {
      add({ ...f, location: 'body', desc: f.desc || 'Body 字段' });
    });
  }
  // // query: xxx, yyy
  const commentQueryRegex = /\/\/\s*query:\s*([^\n]+)/g;
  while ((m = commentQueryRegex.exec(content)) !== null) {
    m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => {
      add({ name, location: 'query', type: 'string', required: false, desc: 'Query 参数' });
    });
  }
  // // params: xxx, yyy (动态路由参数)
  const commentParamsRegex = /\/\/\s*params:\s*([^\n]+)/g;
  while ((m = commentParamsRegex.exec(content)) !== null) {
    m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => {
      add({ name, location: 'path', type: 'string', required: true, desc: '动态路由参数' });
    });
  }

  // 1. path 参数:从路由路径的 :xxx 提取
  const pathSegs = routePath.split('/').filter(Boolean);
  for (const seg of pathSegs) {
    if (seg.startsWith(':')) {
      const name = seg.slice(1).replace(/[?+]/, '');
      add({
        name,
        location: 'path',
        type: 'string',
        required: !seg.endsWith('?'),
        desc: `路径参数: ${name}`,
      });
    }
  }

  // 2. query 参数:匹配 searchParams.get('xxx')
  const queryRegex = /searchParams\.get(?:<\w+>)?\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  while ((m = queryRegex.exec(content)) !== null) {
    add({
      name: m[1],
      location: 'query',
      type: 'string',
      required: false,
      desc: `Query 参数`,
    });
  }

  // 3. body 参数:直接解构 const { a, b } = await req.json()
  const jsonRegex = /(?:const|let|var)\s+\{([^}]+)\}\s*=\s*await\s+req\.json\(\)/g;
  while ((m = jsonRegex.exec(content)) !== null) {
    const fields = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const field of fields) {
      const name = field.split('=')[0].trim().split(':')[0].trim();
      if (name && !name.startsWith('...')) {
        add({
          name,
          location: 'body',
          type: inferType(content, name),
          required: !field.includes('='),
          desc: `Body 字段`,
        });
      }
    }
  }

  // 4. body 参数:二次解构 const body = await req.json(); const { a, b } = body;
  const jsonAssignRegex = /(?:const|let|var)\s+(\w+)\s*=\s*await\s+req\.json\(\)/g;
  while ((m = jsonAssignRegex.exec(content)) !== null) {
    const varName = m[1];
    // 4a. 找 const { x, y } = bodyVar
    const destructRegex = new RegExp(`(?:const|let|var)\\s+\\{([^}]+)\\}\\s*=\\s*${varName}`, 'g');
    let dm: RegExpExecArray | null;
    while ((dm = destructRegex.exec(content)) !== null) {
      const fields = dm[1].split(',').map((s) => s.trim()).filter(Boolean);
      for (const field of fields) {
        const name = field.split('=')[0].trim().split(':')[0].trim();
        if (name && !name.startsWith('...')) {
          add({
            name,
            location: 'body',
            type: inferType(content, name),
            required: !field.includes('='),
            desc: `Body 字段`,
          });
        }
      }
    }
    // 4b. 找 bodyVar.xxx 属性访问
    const propRegex = new RegExp(`${varName}\\.(\\w+)`, 'g');
    let pm: RegExpExecArray | null;
    while ((pm = propRegex.exec(content)) !== null) {
      add({
        name: pm[1],
        location: 'body',
        type: inferType(content, pm[1]),
        required: false,
        desc: `Body 字段`,
      });
    }
  }

  // 5. 动态路由 params:Promise<{ key: string }> + const { key } = await params
  const paramsTypeRegex = /params:\s*Promise<\{([^}]+)\}>/g;
  const paramTypes: Record<string, string> = {};
  while ((m = paramsTypeRegex.exec(content)) !== null) {
    const fields = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const field of fields) {
      const parts = field.split(':').map((s) => s.trim());
      if (parts.length >= 2) {
        paramTypes[parts[0]] = parts[1].replace(/;$/, '').trim();
      }
    }
  }
  const paramsDestructRegex = /(?:const|let|var)\s+\{([^}]+)\}\s*=\s*await\s+params/g;
  while ((m = paramsDestructRegex.exec(content)) !== null) {
    const fields = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const field of fields) {
      const name = field.split('=')[0].trim().split(':')[0].trim();
      if (name && !name.startsWith('...')) {
        add({
          name,
          location: 'path',
          type: paramTypes[name] || 'string',
          required: true,
          desc: `动态路由参数`,
        });
      }
    }
  }

  return params;
}

// 解析 "path: string[], name: string, icon?: string" 格式的字段声明
function parseTypeFields(fieldsStr: string): { name: string; type: string; required?: boolean; desc?: string }[] {
  const result: { name: string; type: string; required?: boolean; desc?: string }[] = [];
  // 按逗号分割,但要避免分割数组类型 string[] 内部的逗号(其实 string[] 没有内部逗号,object 类型才有)
  // 简单按顶级逗号分割
  const fields = fieldsStr.split(',').map((s) => s.trim()).filter(Boolean);
  for (const field of fields) {
    // 匹配 name?: type 或 name: type
    const fm = field.match(/^(\w+)(\?)?\s*:\s*(.+)$/);
    if (fm) {
      result.push({
        name: fm[1],
        type: fm[3].trim(),
        required: !fm[2],
      });
    }
  }
  return result;
}

// 根据 body 字段名在源码中推断类型
function inferType(content: string, name: string): string {
  if (new RegExp(`${name}\\s*===\\s*(?:true|false)|typeof\\s+${name}\\s*===\\s*['"\`]boolean`).test(content)) {
    return 'boolean';
  }
  if (new RegExp(`${name}\\s*===\\s*\\d|Number\\(${name}\\)|parseInt\\(${name}\\)|parseFloat\\(${name}\\)|\\+${name}`).test(content)) {
    return 'number';
  }
  if (new RegExp(`Array\\.isArray\\(${name}\\)|${name}\\.map\\(|${name}\\.length|${name}\\.forEach`).test(content)) {
    return 'array';
  }
  if (new RegExp(`Object\\.keys\\(${name}\\)|${name}\\.[a-zA-Z_]+\\.[a-zA-Z_]`).test(content)) {
    return 'object';
  }
  return 'string';
}

export default async function ApiPage() {
  const apiDir = path.join(process.cwd(), 'app', 'api');
  const routes = await scanApiRoutes(apiDir);
  return <ApiListClient routes={routes} />;
}
