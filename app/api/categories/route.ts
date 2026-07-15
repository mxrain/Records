import { NextResponse } from 'next/server';
import { getCategories, addCategory, updateCategory, deleteCategory, moveCategory } from '@/lib/data/categories';
import { requireAuth } from '@/lib/auth/guard';
import { validateBody } from '@/lib/validation/validate';
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  moveCategorySchema,
} from '@/lib/validation/schemas';

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
  const authErr = await requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const parsed = validateBody(createCategorySchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const { path, name, icon, link } = parsed;
    await addCategory(path ?? [], name, icon ?? '', link ?? '');
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
  const authErr = await requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const parsed = validateBody(updateCategorySchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const { path, name, icon, link } = parsed;
    await updateCategory(path, name, icon ?? '', link ?? '');
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
  const authErr = await requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const parsed = validateBody(deleteCategorySchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const { path } = parsed;
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
  const authErr = await requireAuth(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const parsed = validateBody(moveCategorySchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const { sourcePath, targetPath, position } = parsed;
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
