import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Skill 文件目录:项目根目录,列出 .md 控制文件
const SKILL_DIR = process.cwd();

// 允许管理的 skill 文件白名单
const ALLOWED_FILES = ['AGENTS.md', 'CLAUDE.md', 'README.md', 'DATABASE_SETUP.md', 'SKILL.md'];

// 鉴权:校验 token cookie
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

// GET:列出所有 skill 文件及其元信息
export async function GET(req: Request) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  try {
    const files = ALLOWED_FILES.map((name) => {
      const filePath = path.join(SKILL_DIR, name);
      try {
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        return {
          name,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          lineCount: content.split('\n').length,
          preview: content.slice(0, 200),
          exists: true,
        };
      } catch {
        // SKILL.md 不存在时也展示,标记为默认模板
        if (name === 'SKILL.md') {
          return {
            name,
            size: 0,
            mtime: new Date().toISOString(),
            lineCount: 0,
            preview: '(默认模板,点击编辑查看)',
            exists: false,
          };
        }
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('读取 skill 文件列表失败:', error);
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}

// PUT:保存指定 skill 文件
// body: { name: string, content: string }
export async function PUT(req: Request) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  try {
    const { name, content } = await req.json();
    if (!name || !ALLOWED_FILES.includes(name)) {
      return NextResponse.json({ error: '不支持的文件' }, { status: 400 });
    }
    if (typeof content !== 'string') {
      return NextResponse.json({ error: '内容必须是字符串' }, { status: 400 });
    }
    const filePath = path.join(SKILL_DIR, name);
    fs.writeFileSync(filePath, content, 'utf8');
    return NextResponse.json({ success: true, name, size: content.length });
  } catch (error) {
    console.error('保存 skill 文件失败:', error);
    return NextResponse.json(
      { error: (error as Error).message || '保存失败' },
      { status: 500 }
    );
  }
}
