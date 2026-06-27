import { NextResponse } from 'next/server';
import { getTags } from '@/lib/data/tags';

export async function GET() {
  try {
    const tags = await getTags();
    return NextResponse.json(tags);
  } catch (error) {
    console.error('获取标签数据时出错:', error);
    return NextResponse.json({ error: '获取标签数据失败' }, { status: 500 });
  }
}
