import { NextResponse } from 'next/server';
import { getList } from '@/lib/data/list';

export async function GET() {
  try {
    const listData = await getList();
    return NextResponse.json(listData);
  } catch (error) {
    console.error('获取列表数据时出错:', error);
    return NextResponse.json({ error: '获取列表数据失败' }, { status: 500 });
  }
}
