import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAllSettings, upsertSetting } from '@/lib/data/settings';

// 鉴权
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

export interface McpService {
  name: string;          // 服务名(唯一)
  command: string;       // 启动命令,如 npx
  args: string[];        // 命令参数
  env?: Record<string, string>;  // 环境变量
  enabled: boolean;      // 是否启用
  desc?: string;         // 描述
  createdAt: string;     // 创建时间
}

// GET:列出所有 MCP 服务
export async function GET(req: Request) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  try {
    const settings = await getAllSettings();
    const services = (settings.mcp_services as McpService[]) || [];
    return NextResponse.json({ services });
  } catch (error) {
    console.error('读取 MCP 服务失败:', error);
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}

// POST:新增/更新 MCP 服务
// body: McpService
export async function POST(req: Request) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  try {
    const service = await req.json() as McpService;
    if (!service.name || typeof service.name !== 'string') {
      return NextResponse.json({ error: '服务名不能为空' }, { status: 400 });
    }
    if (!service.command) {
      return NextResponse.json({ error: '启动命令不能为空' }, { status: 400 });
    }
    const settings = await getAllSettings();
    const services = (settings.mcp_services as McpService[]) || [];
    const idx = services.findIndex((s) => s.name === service.name);
    if (idx >= 0) {
      services[idx] = { ...services[idx], ...service };
    } else {
      services.push({ ...service, createdAt: new Date().toISOString() });
    }
    await upsertSetting('mcp_services', services);
    return NextResponse.json({ success: true, services });
  } catch (error) {
    console.error('保存 MCP 服务失败:', error);
    return NextResponse.json(
      { error: (error as Error).message || '保存失败' },
      { status: 500 }
    );
  }
}

// DELETE:删除指定 MCP 服务
// body: { name: string }
export async function DELETE(req: Request) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'name 不能为空' }, { status: 400 });
    }
    const settings = await getAllSettings();
    const services = (settings.mcp_services as McpService[]) || [];
    const filtered = services.filter((s) => s.name !== name);
    await upsertSetting('mcp_services', filtered);
    return NextResponse.json({ success: true, services: filtered });
  } catch (error) {
    console.error('删除 MCP 服务失败:', error);
    return NextResponse.json(
      { error: (error as Error).message || '删除失败' },
      { status: 500 }
    );
  }
}
