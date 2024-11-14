import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { config } from '@/appConfig';
import { cachedFetch } from '@/lib/cacheUtils';

const GITHUB_API_URL = `${config.GITHUB_API_URL}/repos/${config.GITHUB_OWNER}/${config.GITHUB_REPO}/contents`;

async function fetchResourceData(uuid: string) {
  const resourceUrl = `${GITHUB_API_URL}/${uuid}.json`;
  
  return cachedFetch(`resource-${uuid}`, async () => {
    const response = await axios.get(resourceUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Awesome-Octocat-App',
        'Accept': 'application/vnd.github.v3+json'
      },
      params: {
        ref: 'main'
      }
    });

    if (response.status === 200) {
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    } else {
      throw new Error('GitHub API 请求失败');
    }
  });
}

// GET请求处理函数
export async function GET(request: NextRequest) {
  const uuid = request.nextUrl.searchParams.get('uuid');
  if (!uuid) {
    return NextResponse.json({ error: '缺少 UUID 参数' }, { status: 400 });
  }

  try {
    const data = await fetchResourceData(uuid);
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取资源数据时出错:', error);
    return NextResponse.json(
      { error: '获取资源数据失败', url: `${GITHUB_API_URL}/${uuid}.json`, details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST请求处理函数
export async function POST(request: NextRequest) {
  const { uuid } = await request.json();
  if (!uuid) {
    return NextResponse.json({ error: '缺少 UUID 参数' }, { status: 400 });
  }

  try {
    const data = await fetchResourceData(uuid);
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取资源数据时出错:', error);
    return NextResponse.json(
      { error: '获取资源数据失败', details: (error as Error).message ,url: `${GITHUB_API_URL}/${uuid}.json`},
      { status: 500 }
    );
  }
}
