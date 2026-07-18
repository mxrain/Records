import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(request: NextRequest) {
    const authErr = await requireAuth(request);
    if (authErr) return authErr;
    // TODO: 实现获取仓库信息的逻辑
    return NextResponse.json({ message: '仓库信息获取成功' });
}

export async function POST(request: NextRequest) {
    const authErr = await requireAuth(request);
    if (authErr) return authErr;
    // TODO: 实现创建仓库的逻辑
    return NextResponse.json({ message: '仓库创建成功' });
} 