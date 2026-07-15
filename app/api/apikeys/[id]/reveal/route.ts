import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { revealApiKey } from '@/lib/auth/apikey';

/**
 * GET /api/apikeys/[id]/reveal
 * 返回指定 API Key 的明文(用于前端"再次查看")
 * 需要 requireAuth 通过(仅 JWT cookie,不能用 API Key 自身)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAuth(req);
  if (authErr) return authErr;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  const plaintext = await revealApiKey(id);
  if (plaintext === null) {
    return NextResponse.json({ error: '未找到对应 API Key' }, { status: 404 });
  }

  return NextResponse.json({ plaintext });
}
