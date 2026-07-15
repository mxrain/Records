import { NextResponse } from 'next/server';
import { getCategories, addCategory, updateCategory, deleteCategory, moveCategory } from '@/lib/data/categories';
import { requireAuth } from '@/lib/auth/guard';

// 获取全部分类
export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('获取分类数据时出错:', error);
    return NextResponse.json({ error: '获取分类数据失败' }, { status: 500 });
  }
}

// 新增分类
// body: { path: string[], name: string, icon?: string, link?: string }
// path 为父路径(空数组表示根级)
export async function POST(req: Request) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const { path = [], name, icon = '', link = '' } = body;
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: '分类名称不能为空' }, { status: 400 });
    }
    if (!Array.isArray(path)) {
      return NextResponse.json({ error: 'path 必须是数组' }, { status: 400 });
    }
    await addCategory(path, name, icon, link);
    return NextResponse.json({ success: true, path, name });
  } catch (error) {
    console.error('新增分类失败:', error);
    return NextResponse.json(
      { error: (error as Error).message || '新增分类失败' },
      { status: 500 }
    );
  }
}

// 更新分类(改名/图标/链接)
// body: { path: string[], name: string, icon?: string, link?: string }
export async function PUT(req: Request) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const { path, name, icon = '', link = '' } = body;
    if (!Array.isArray(path) || path.length === 0) {
      return NextResponse.json({ error: 'path 不能为空' }, { status: 400 });
    }
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: '分类名称不能为空' }, { status: 400 });
    }
    await updateCategory(path, name, icon, link);
    return NextResponse.json({ success: true, path, name });
  } catch (error) {
    console.error('更新分类失败:', error);
    return NextResponse.json(
      { error: (error as Error).message || '更新分类失败' },
      { status: 500 }
    );
  }
}

// 删除分类
// body: { path: string[] }
export async function DELETE(req: Request) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const { path } = body;
    if (!Array.isArray(path) || path.length === 0) {
      return NextResponse.json({ error: 'path 不能为空' }, { status: 400 });
    }
    await deleteCategory(path);
    return NextResponse.json({ success: true, path });
  } catch (error) {
    console.error('删除分类失败:', error);
    return NextResponse.json(
      { error: (error as Error).message || '删除分类失败' },
      { status: 500 }
    );
  }
}

// 移动分类(拖拽排序)
// body: { sourcePath: string[], targetPath: string[], position: 'before'|'after'|'inside' }
export async function PATCH(req: Request) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const { sourcePath, targetPath, position } = body;
    if (!Array.isArray(sourcePath) || sourcePath.length === 0) {
      return NextResponse.json({ error: 'sourcePath 不能为空' }, { status: 400 });
    }
    if (!Array.isArray(targetPath) || targetPath.length === 0) {
      return NextResponse.json({ error: 'targetPath 不能为空' }, { status: 400 });
    }
    if (!['before', 'after', 'inside'].includes(position)) {
      return NextResponse.json({ error: 'position 必须是 before/after/inside' }, { status: 400 });
    }
    await moveCategory(sourcePath, targetPath, position);
    return NextResponse.json({ success: true, sourcePath, targetPath, position });
  } catch (error) {
    console.error('移动分类失败:', error);
    return NextResponse.json(
      { error: (error as Error).message || '移动分类失败' },
      { status: 500 }
    );
  }
}
