import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { validateBody } from '@/lib/validation/validate';
import { createApiKeySchema, deleteApiKeySchema } from '@/lib/validation/schemas';
import { createApiKey, listApiKeys, revokeApiKey } from '@/lib/auth/apikey';

/**
 * GET /api/apikeys
 * 列出所有 API Key(不含明文与哈希,仅元信息)
 */
export async function GET(req: Request) {
  const authErr = await requireAuth(req);
  if (authErr) return authErr;
  try {
    const keys = await listApiKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('列出 API Key 失败:', error);
    return NextResponse.json({ error: '列出失败' }, { status: 500 });
  }
}

/**
 * POST /api/apikeys
 * body: { name: string }
 * 签发新 API Key,明文仅此一次返回
 */
export async function POST(req: Request) {
  const authErr = await requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const parsed = validateBody(createApiKeySchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const { name } = parsed;
    const result = await createApiKey(name);
    return NextResponse.json(
      { success: true, key: result.plaintext, meta: result.meta },
      { status: 201 }
    );
  } catch (error) {
    console.error('签发 API Key 失败:', error);
    return NextResponse.json({ error: '签发失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/apikeys
 * body: { id: string }
 * 按 ID 吊销 API Key
 */
export async function DELETE(req: Request) {
  const authErr = await requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const parsed = validateBody(deleteApiKeySchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const { id } = parsed;
    const ok = await revokeApiKey(id);
    if (!ok) {
      return NextResponse.json({ error: '未找到对应 API Key' }, { status: 404 });
    }
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('吊销 API Key 失败:', error);
    return NextResponse.json({ error: '吊销失败' }, { status: 500 });
  }
}
