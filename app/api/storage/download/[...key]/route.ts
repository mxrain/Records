import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { r2 } from '@/lib/storage/r2';

const BUCKET = process.env.R2_BUCKET || 'records';
const COOKIE_NAME = 'token';

function ensureAuth(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  try {
    jwt.verify(token, secret);
    return null;
  } catch {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
}

// GET /api/storage/download/[...key]  下载对象(流式返回原始字节)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const authErr = ensureAuth(req);
  if (authErr) return authErr;

  try {
    const { key: keyParts } = await params;
    const objectName = keyParts.map(decodeURIComponent).join('/');
    if (!objectName) {
      return NextResponse.json({ error: '缺少 key' }, { status: 400 });
    }
    const result = await r2.getFile(BUCKET, objectName);
    if (!result.data) {
      return NextResponse.json({ error: '对象不存在' }, { status: 404 });
    }
    return new NextResponse(result.data as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': result.contentType || 'application/octet-stream',
        'Content-Length': String(result.contentLength || result.data.length),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(objectName.split('/').pop() || objectName)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('下载对象失败:', e);
    return NextResponse.json(
      { error: (e as Error).message || '下载对象失败' },
      { status: 500 }
    );
  }
}
