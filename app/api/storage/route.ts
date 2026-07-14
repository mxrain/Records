import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { r2 } from '@/lib/storage/r2';

const BUCKET = process.env.R2_BUCKET || 'records';
const COOKIE_NAME = 'token';

// 鉴权:仅允许已登录后台用户访问(校验 cookie 中的 JWT)
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

// GET /api/storage?prefix=xxx  列出对象
export async function GET(req: NextRequest) {
  const authErr = ensureAuth(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const prefix = url.searchParams.get('prefix') || undefined;
    const result = await r2.listFiles(BUCKET, prefix);
    const files = (result.files as any[]).map((f) => ({
      key: f.Key,
      size: f.Size,
      lastModified: f.LastModified,
      etag: f.ETag,
    }));
    return NextResponse.json({ bucket: BUCKET, files });
  } catch (e) {
    console.error('列出对象失败:', e);
    return NextResponse.json(
      { error: (e as Error).message || '列出对象失败' },
      { status: 500 }
    );
  }
}

// POST /api/storage  上传对象(multipart/form-data: file, key)
export async function POST(req: NextRequest) {
  const authErr = ensureAuth(req);
  if (authErr) return authErr;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const customKey = formData.get('key');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '缺少 file 字段' }, { status: 400 });
    }
    const objectName =
      (typeof customKey === 'string' && customKey.trim()) || file.name;
    const buf = Buffer.from(await file.arrayBuffer());
    await r2.uploadFile(BUCKET, objectName, buf, file.type || undefined);
    return NextResponse.json({ success: true, key: objectName });
  } catch (e) {
    console.error('上传对象失败:', e);
    return NextResponse.json(
      { error: (e as Error).message || '上传对象失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/storage?key=xxx  删除对象
export async function DELETE(req: NextRequest) {
  const authErr = ensureAuth(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
    }
    await r2.deleteFile(BUCKET, key);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('删除对象失败:', e);
    return NextResponse.json(
      { error: (e as Error).message || '删除对象失败' },
      { status: 500 }
    );
  }
}
