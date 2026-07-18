import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';


export async function GET(request: NextRequest) {
    const authErr = await requireAuth(request);
    if (authErr) return authErr;

    try {
        
        return NextResponse.json({ issues: "test" });
    } catch (error) {
        console.error('获取问题列表时出错:', error);
        return NextResponse.json(
            { error: "获取问题列表失败" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const authErr = await requireAuth(request);
    if (authErr) return authErr;

    try {
        const data = await request.json();
        const { title, body } = data;
        
        return NextResponse.json({ message: '问题创建成功', issue: "test" });
    } catch (error) {
        console.error('创建问题时出错:', error);
        return NextResponse.json(
            { error: "创建问题失败" },
            
            { status: 500 }
        );
    }
} 