import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const githubToken = process.env.GITHUB_TOKEN;
    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
    const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
    try {
        const { path, content } = await request.json();

        // 验证必要参数
        if (!path || !content) {
            return NextResponse.json(
                { error: '缺少必要参数' },
                { status: 400 }
            );
        }

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
                message: `Create file: ${path}`,
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