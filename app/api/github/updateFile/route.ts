import { NextResponse } from 'next/server';

interface UpdateFileRequest {
  path: string;
  content: string;
  sha: string;
}

interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
}

const githubToken = process.env.GITHUB_TOKEN;
const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

export async function POST(request: Request) {
  try {
    // 验证环境变量
    if (!githubToken || !owner || !repo) {
      return NextResponse.json(
        { error: '缺少必要的环境变量配置' },
        { status: 500 }
      );
    }

    const body: UpdateFileRequest = await request.json();
    const { path, content, sha } = body;

    // 验证请求参数
    if (!path || !content || !sha) {
      return NextResponse.json(
        { error: '缺少必要的请求参数' },
        { status: 400 }
      );
    }

    // 确保 content 是 base64 编码格式
    let base64Content = content;
    try {
      if (!content.match(/^[A-Za-z0-9+/=]+$/)) {
        base64Content = Buffer.from(content).toString('base64');
      }
      // 验证 base64 格式
      Buffer.from(base64Content, 'base64').toString();
    } catch (error) {
      return NextResponse.json(
        { error: '内容编码格式错误' },
        { status: 400 }
      );
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const payload = {
      message: `update: ${path} - ${new Date().toISOString()}`,
      content: base64Content,
      sha: sha,
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as GitHubErrorResponse;

    if (!response.ok) {
      console.error('GitHub API 错误:', data);
      return NextResponse.json(
        { 
          error: data.message || 'GitHub 同步失败',
          details: data.documentation_url 
        }, 
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: 'GitHub 同步成功',
      data,
      path
    });

  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { error: '内部服务器错误' },
      { status: 500 }
    );
  }
} 
