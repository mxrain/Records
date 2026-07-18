import { NextRequest, NextResponse } from 'next/server';
import { getResourceByUuid } from '@/lib/data/resources';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(request: NextRequest) {
  const uuid = request.nextUrl.searchParams.get('uuid');
  if (!uuid) {
    return NextResponse.json({ error: '缺少 UUID 参数' }, { status: 400 });
  }

  try {
    const data = await getResourceByUuid(uuid);
    if (!data) {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取资源数据时出错:', error);
    return NextResponse.json({ error: '获取资源数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // POST 为冗余写接口(与 GET 功能相同),必须鉴权防止未授权数据探测
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  try {
    const { uuid } = await request.json();
    if (!uuid) {
      return NextResponse.json({ error: '缺少 UUID 参数' }, { status: 400 });
    }

    const data = await getResourceByUuid(uuid);
    if (!data) {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取资源数据时出错:', error);
    return NextResponse.json({ error: '获取资源数据失败' }, { status: 500 });
  }
}
