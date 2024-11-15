import { NextResponse } from 'next/server';

const githubToken = process.env.GITHUB_TOKEN;
const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

export async function GET(request: Request) {
  try {
    // 验证环境变量
    if (!githubToken || !owner || !repo) {
      return NextResponse.json(
        { 
          error: '缺少必要的环境变量配置',
          details: '请检查 GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO 配置'
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { 
          error: '缺少文件路径参数',
          details: '请提供要获取 SHA 的文件路径'
        },
        { status: 400 }
      );
    }

    // 验证路径格式
    if (path.includes('..') || path.startsWith('/')) {
      return NextResponse.json(
        { 
          error: '无效的文件路径格式',
          details: '文件路径不能包含 .. 或以 / 开头'
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'NextJS-App'
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('GitHub API 错误:', data);
      return NextResponse.json(
        { 
          error: data.message || 'GitHub API 调用失败',
          details: data.documentation_url,
          path 
        },
        { status: response.status }
      );
    }

    if (!data.sha) {
      return NextResponse.json(
        { 
          error: '未找到文件 SHA',
          details: '指定的文件可能不存在',
          path 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      sha: data.sha,
      path,
      type: data.type,
      size: data.size
    });

  } catch (error) {
    console.error('获取文件 SHA 时出错:', error);
    return NextResponse.json(
      { 
        error: '获取文件 SHA 失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 