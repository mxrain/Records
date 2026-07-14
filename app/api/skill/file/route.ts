import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const SKILL_DIR = process.cwd();
const ALLOWED_FILES = ['AGENTS.md', 'CLAUDE.md', 'README.md', 'DATABASE_SETUP.md', 'SKILL.md'];

// SKILL.md 不存在时的默认内容:控制本后台的分类/资源/列表管理 skill
const DEFAULT_SKILL_CONTENT = `# 四次元资源桶 - 后台管理 Skill

## 功能概述

本 Skill 用于指导 AI Agent 通过本后台 API 进行 **分类、资源、列表** 三类核心内容的管理。
Agent 读取本文件后,即可理解每项操作的接口契约与调用约束,无需额外文档。

## 适用场景

- 新增/重命名/移动/删除分类树节点
- 增删改资源条目,同步至 GitHub db/ 备份
- 配置首页推荐/热门/最新/置顶列表的成员与顺序

## 前置条件

1. 已登录后台,持有有效的 \`token\` cookie(JWT)
2. 所有写操作需携带 \`Content-Type: application/json\`
3. 读操作可匿名访问(部分接口)

## 一、分类管理

### 1. 获取分类树
\`\`\`http
GET /api/categories
\`\`\`
返回 \`Record<string, CategoryData>\`,key 为分类名,值为 \`{ slug, icon, link, items? }\`。

### 2. 新增分类
\`\`\`http
POST /api/categories
body: { path: string[], name: string, icon?: string, link?: string }
\`\`\`
- \`path\`:父级路径,根级传 \`[]\`
- \`name\`:分类名(必填,同时作为 URL slug)
- \`icon\`:lucide 图标名(可选)
- \`link\`:自定义链接(可选,留空使用 \`/{name}\`)

### 3. 更新分类
\`\`\`http
PUT /api/categories
body: { path: string[], name: string, icon?: string, link?: string }
\`\`\`

### 4. 删除分类
\`\`\`http
DELETE /api/categories
body: { path: string[] }
\`\`\`
连同子树一并删除。

### 5. 移动分类(拖拽调整层级)
\`\`\`http
PATCH /api/categories
body: {
  sourcePath: string[],
  targetPath: string[],
  position: 'before' | 'after' | 'inside'
}
\`\`\`
- \`before\`:作为目标同级,放前面
- \`after\`:作为目标同级,放后面
- \`inside\`:作为目标的子级

## 二、资源管理

### 1. 获取资源列表
\`\`\`http
GET /api/resources
GET /api/resources-info?id=xxx
\`\`\`

### 2. 新增资源
\`\`\`http
POST /api/resources
body: { name, category, tags, ... }
\`\`\`
写操作会记录到 \`change_logs\` 表,待同步至 GitHub \`db/\` 目录。

### 3. 更新 / 删除资源
\`\`\`http
PUT /api/resources
DELETE /api/resources
\`\`\`

## 三、列表管理

首页有 4 类列表:\`recommend\`(推荐)、\`hot\`(热门)、\`latest\`(最新)、\`top\`(置顶)。

### 1. 获取列表
\`\`\`http
GET /api/list?type=recommend
\`\`\`
- \`hot\` / \`latest\` 为 SQL 自动派生(按下载量/上传时间排序),无需手动维护
- \`recommend\` / \`top\` 为手动配置

### 2. 覆盖配置(针对 hot/latest)
\`\`\`http
GET /api/list/override?type=hot
POST /api/list/override
body: { type: 'hot'|'latest', config: { pinned: string[], excluded: string[], limit: number } }
\`\`\`
- \`pinned\`:强制置顶的 uuid 列表
- \`excluded\`:排除的 uuid 列表
- \`limit\`:覆盖默认返回数量

## 错误处理

- 401:token 失效或缺失 → 提示用户重新登录
- 400:参数校验失败 → 检查 body 字段
- 500:服务端错误 → 查看 \`change_logs\` 是否有残留事务

## 缓存说明

- 分类、资源读操作走 Redis 缓存(TTL 600s)
- 写操作会自动失效对应缓存键
- 若数据不一致,可等待 TTL 过期或手动触发同步

## 同步至 GitHub

所有写操作仅落库,不会立即推送 GitHub。需在后台"变更历史"中批量同步,
同步会将 PostgreSQL 数据导出为 JSON 写入 \`db/\` 目录并 commit。
`;

function authenticate(req: Request): boolean {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/token=([^;]+)/);
  if (!match) return false;
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;
    jwt.verify(match[1], secret);
    return true;
  } catch {
    return false;
  }
}

// GET:读取指定 skill 文件完整内容
// query: ?name=xxx
export async function GET(req: Request) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const name = url.searchParams.get('name');
    if (!name || !ALLOWED_FILES.includes(name)) {
      return NextResponse.json({ error: '不支持的文件' }, { status: 400 });
    }
    const filePath = path.join(SKILL_DIR, name);
    let content: string;
    let mtime: string;
    let size: number;
    try {
      const stat = fs.statSync(filePath);
      content = fs.readFileSync(filePath, 'utf8');
      mtime = stat.mtime.toISOString();
      size = stat.size;
    } catch {
      // 文件不存在:SKILL.md 返回默认内容,其他报错
      if (name === 'SKILL.md') {
        content = DEFAULT_SKILL_CONTENT;
        mtime = new Date().toISOString();
        size = Buffer.byteLength(content, 'utf8');
      } else {
        throw new Error('文件不存在');
      }
    }
    return NextResponse.json({ name, content, size, mtime });
  } catch (error) {
    console.error('读取 skill 文件失败:', error);
    return NextResponse.json(
      { error: (error as Error).message || '读取失败' },
      { status: 500 }
    );
  }
}
