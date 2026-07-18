import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';


export async function GET(request: NextRequest) {
    const authErr = await requireAuth(request);
    if (authErr) return authErr;

    try {
        
        return NextResponse.json({ user: "test" });
    } catch (error) {
        console.error('获取用户信息时出错:', error);
        return NextResponse.json(
            { error: "获取用户信息失败" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const authErr = await requireAuth(request);
    if (authErr) return authErr;

    try {
        const data = await request.json();
        const { username } = data;
        
        return NextResponse.json({ message: '用户创建成功', user: "test" });
    } catch (error) {
        console.error('创建用户时出错:', error);
        return NextResponse.json(
            { error: "创建用户失败" },
            { status: 500 }
        );
    }
} 