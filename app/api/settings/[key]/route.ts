import { NextRequest, NextResponse } from 'next/server';
import { getSetting, getSettingMeta, updateSetting } from '@/lib/data/settings';

/**
 * GET /api/settings/[key]
 * 返回单个配置值
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const meta = await getSettingMeta(key);
    if (!meta) {
      return NextResponse.json({ error: '配置项不存在' }, { status: 404 });
    }
    return NextResponse.json(meta);
  } catch (error) {
    console.error('获取配置项失败:', error);
    return NextResponse.json({ error: '获取配置项失败' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/[key]
 * body: { value: any, description?: string }
 * 更新单个配置(后台鉴权后调用,鉴权由 proxy.ts 统一处理)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const body = await req.json();
    const { value, description } = body || {};

    if (value === undefined) {
      return NextResponse.json({ error: '缺少 value 字段' }, { status: 400 });
    }

    if (description !== undefined) {
      const { upsertSetting } = await import('@/lib/data/settings');
      await upsertSetting(key, value, description);
    } else {
      await updateSetting(key, value);
    }

    const updated = await getSettingMeta(key);
    return NextResponse.json({ success: true, setting: updated });
  } catch (error) {
    console.error('更新配置项失败:', error);
    return NextResponse.json({ error: '更新配置项失败' }, { status: 500 });
  }
}
