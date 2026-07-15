import { NextResponse } from 'next/server';
import { getAllSettings, upsertSetting } from '@/lib/data/settings';
import { requireAuth } from '@/lib/auth/guard';
import { validateBody } from '@/lib/validation/validate';
import { mcpServiceSchema, deleteMcpSchema } from '@/lib/validation/schemas';

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
  const authErr = await requireAuth(req);
  if (authErr) return authErr;
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
  const authErr = await requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const parsed = validateBody(mcpServiceSchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const service = parsed as McpService;
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
  const authErr = await requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const parsed = validateBody(deleteMcpSchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const { name } = parsed;
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
