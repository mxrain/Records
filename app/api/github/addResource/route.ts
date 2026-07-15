import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { validateBody } from '@/lib/validation/validate';
import { githubAddResourceSchema } from '@/lib/validation/schemas';

interface AddFileRequest {
  uuid: string;
  data: any;
}

export async function POST(request: Request) {
  // 鉴权:防止任意人改 db/resources.json
  const authErr = await requireAuth(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const parsed = validateBody(githubAddResourceSchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
    const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return NextResponse.json({ error: 'GitHub token 未配置' }, { status: 500 });
    }
    const { uuid, data } = parsed;
    
    // 构建文件路径
    const path = 'db/resources.json';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // 首先获取现有文件内容
    const getResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    let existingContent = {};
    let sha;

    if (getResponse.status === 200) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      existingContent = JSON.parse(content);
    }

    // 添加新数据
    const updatedContent = {
      ...existingContent,
      [uuid]: data
    };

    // 将更新后的内容转换为 Base64
    const content = Buffer.from(JSON.stringify(updatedContent, null, 2)).toString('base64');

    const payload: any = {
      message: `添加资源: ${uuid}`,
      content: content,
      branch: 'main'
    };

    // 如果文件已存在，需要提供 sha
    if (sha) {
      payload.sha = sha;
    }

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: responseData.message || '更新文件失败' }, 
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      message: '资源添加成功', 
      data: responseData 
    });
  } catch (error: any) {
    console.error('API 错误:', error);
    return NextResponse.json(
      { error: error.message || '内部服务器错误' }, 
      { status: 500 }
    );
  }
} 