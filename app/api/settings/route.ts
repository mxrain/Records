import { NextResponse } from 'next/server';
import { getAllSettings, getAllSettingsMeta } from '@/lib/data/settings';

/**
 * GET /api/settings
 * - 默认(无 query): 返回所有配置的扁平 map(供前台组件消费,key→value)
 * - ?meta=true: 返回带元信息的数组(后台编辑用,含 description)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const withMeta = searchParams.get('meta') === 'true';

    if (withMeta) {
      const list = await getAllSettingsMeta();
      return NextResponse.json(list);
    }
    const settings = await getAllSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('获取站点配置失败:', error);
    return NextResponse.json({ error: '获取站点配置失败' }, { status: 500 });
  }
}
