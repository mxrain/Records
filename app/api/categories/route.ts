import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/data/categories';

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('获取分类数据时出错:', error);
    return NextResponse.json({ error: '获取分类数据失败' }, { status: 500 });
  }
}
