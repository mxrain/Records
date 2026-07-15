import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { validateBody } from '@/lib/validation/validate';
import { githubCreateFileSchema } from '@/lib/validation/schemas';
const githubToken = process.env.GITHUB_TOKEN;
const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

export async function POST(request: Request) {
    // 鉴权:防止任意人向 GitHub 仓库写文件
    const authErr = await requireAuth(request);
    if (authErr) return authErr;

    try {
        const body = await request.json();
        const parsed = validateBody(githubCreateFileSchema, body);
        if (parsed instanceof NextResponse) return parsed;
        const { path, content } = parsed;

        // 确保 content 是 base64 编码格式
        let base64Content = content;
        if (!content.match(/^[A-Za-z0-9+/=]+$/)) {
            base64Content = Buffer.from(content).toString('base64');
        }

        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

        // 调用 GitHub API 创建文件
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                message: `创建: ${path}`,
                content: base64Content,
                branch: 'main'
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(
                { error: error.message || 'Failed to create file' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating file:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 