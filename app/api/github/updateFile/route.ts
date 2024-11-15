import { NextResponse } from 'next/server';

interface UpdateFileRequest {
  path: string;
  content: string;
  sha: string;
  commitMessage?: string; // 可选的提交信息
}

interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
}

const githubToken = process.env.GITHUB_TOKEN;
const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

// GitHub API 文件大小限制 (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // 验证环境变量
    if (!githubToken || !owner || !repo) {
      return NextResponse.json(
        { error: '缺少必要的环境变量配置', details: '请检查 GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO 配置' },
        { status: 500 }
      );
    }

    const body: UpdateFileRequest = await request.json();
    const { path, content, sha, commitMessage } = body;

    // 验证请求参数
    if (!path || !content || !sha) {
      return NextResponse.json(
        { 
          error: '缺少必要的请求参数',
          details: '需要提供 path, content 和 sha'
        },
        { status: 400 }
      );
    }

    // 验证路径格式
    if (path.includes('..') || path.startsWith('/')) {
      return NextResponse.json(
        { error: '无效的文件路径格式' },
        { status: 400 }
      );
    }

    // 确保 content 是 base64 编码格式
    let base64Content: string;
    try {
      if (!content.match(/^[A-Za-z0-9+/=]+$/)) {
        base64Content = Buffer.from(content).toString('base64');
      } else {
        base64Content = content;
      }
      // 验证 base64 格式
      const decodedContent = Buffer.from(base64Content, 'base64');
      
      // 检查文件大小
      if (decodedContent.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: '文件大小超过限制', details: '文件大小不能超过 100MB' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: '内容编码格式错误', details: '请确保内容是有效的文本或 base64 编码' },
        { status: 400 }
      );
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // 构建提交信息
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const defaultMessage = `更新: ${path} [${timestamp}]`;
    
    const payload = {
      message: commitMessage || defaultMessage,
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
        'User-Agent': 'NextJS-App', // 添加 User-Agent
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as GitHubErrorResponse;

    if (!response.ok) {
      console.error('GitHub API 错误:', data);
      return NextResponse.json(
        { 
          error: data.message || 'GitHub 同步失败',
          details: data.documentation_url,
          status: response.status,
          path 
        }, 
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'GitHub 同步成功',
      data,
      path,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { 
        error: '内部服务器错误',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 
