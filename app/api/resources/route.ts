import { NextResponse } from 'next/server';
import { getAllResources } from '@/lib/data/resources';

export async function GET() {
  try {
    const resources = await getAllResources();
    return NextResponse.json(resources);
  } catch (error) {
    console.error('获取资源数据时出错:', error);
    return NextResponse.json(
      { error: '获取资源数据失败' },
      { status: 500 }
    );
  }
}
