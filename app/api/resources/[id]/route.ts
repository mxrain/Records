import { NextRequest, NextResponse } from 'next/server';
import { getResourceByUuid, upsertResource, deleteResource } from '@/lib/data/resources';
import type { Resource } from '@/lib/data/resources';
import { requireAuth } from '@/lib/auth/guard';
import { validateBody } from '@/lib/validation/validate';
import { createResourceSchema, patchResourceSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: '缺少资源 ID' }, { status: 400 });
  }

  try {
    const resource = await getResourceByUuid(id);
    if (!resource) {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 });
    }
    return NextResponse.json(resource);
  } catch (error) {
    console.error('获取资源数据时出错:', error);
    return NextResponse.json({ error: '获取资源数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: '缺少资源 ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = validateBody(createResourceSchema, body);
    if (parsed instanceof NextResponse) return parsed;
    await upsertResource(id, parsed as unknown as Resource);
    return NextResponse.json({ success: true, uuid: id });
  } catch (error) {
    console.error('创建资源时出错:', error);
    return NextResponse.json({ error: '创建资源失败' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: '缺少资源 ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = validateBody(patchResourceSchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const existing = await getResourceByUuid(id);
    if (!existing) {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 });
    }

    const updated: Resource = { ...existing, ...parsed } as Resource;
    await upsertResource(id, updated);
    return NextResponse.json({ success: true, uuid: id });
  } catch (error) {
    console.error('更新资源时出错:', error);
    return NextResponse.json({ error: '更新资源失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: '缺少资源 ID' }, { status: 400 });
  }

  try {
    const deleted = await deleteResource(id);
    if (!deleted) {
      return NextResponse.json({ error: '资源不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('删除资源时出错:', error);
    return NextResponse.json({ error: '删除资源失败' }, { status: 500 });
  }
}
