import { NextResponse } from 'next/server';
import { saveListOverride, getListOverride, ListOverride } from '@/lib/data/list';
import { requireAuth } from '@/lib/auth/guard';

// 合法类型白名单
const ALLOWED_TYPES = ['hot', 'latest'] as const;
type AllowedType = typeof ALLOWED_TYPES[number];

function isAllowedType(t: string): t is AllowedType {
  return (ALLOWED_TYPES as readonly string[]).includes(t);
}

/**
 * GET /api/list/override?type=hot
 * 读取某个 SQL 派生列表的覆盖配置
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    if (!isAllowedType(type)) {
      return NextResponse.json({ error: '类型不合法,仅支持 hot / latest' }, { status: 400 });
    }
    const override = await getListOverride(type);
    return NextResponse.json(override);
  } catch (error) {
    console.error('获取列表覆盖配置失败:', error);
    return NextResponse.json({ error: '获取覆盖配置失败' }, { status: 500 });
  }
}

/**
 * POST /api/list/override
 * body: { type: 'hot' | 'latest', pinned: string[], excluded: string[], limit: number }
 * 保存某个 SQL 派生列表的覆盖配置
 */
export async function POST(request: Request) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;
  try {
    const body = await request.json();
    const { type, pinned, excluded, limit } = body || {};

    if (!isAllowedType(type)) {
      return NextResponse.json({ error: '类型不合法,仅支持 hot / latest' }, { status: 400 });
    }

    const override: ListOverride = {
      pinned: Array.isArray(pinned) ? pinned.filter((u: unknown) => typeof u === 'string') : [],
      excluded: Array.isArray(excluded) ? excluded.filter((u: unknown) => typeof u === 'string') : [],
      limit: typeof limit === 'number' && limit > 0 ? Math.min(limit, 100) : 20,
    };

    await saveListOverride(type, override);
    return NextResponse.json({ success: true, type, override });
  } catch (error) {
    console.error('保存列表覆盖配置失败:', error);
    return NextResponse.json({ error: '保存覆盖配置失败' }, { status: 500 });
  }
}
