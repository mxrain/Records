import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { config } from '@/appConfig';
import { cachedFetch } from '@/lib/cacheUtils';

const GITHUB_API_URL = `${config.GITHUB_API_URL}/repos/${config.GITHUB_OWNER}/${config.GITHUB_REPO}/contents`;

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const headers = new Headers();
  headers.set('Cache-Control', 'no-store, max-age=0');

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '缺少资源 ID' },
        { status: 400 }
      );
    }

    const resourceUrl = `${GITHUB_API_URL}/${id}.json`;

    const resourceData = await cachedFetch(`resource-${id}`, async () => {
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

    return NextResponse.json(resourceData, { headers });
  } catch (error) {
    console.error('获取资源数据时出错:', error);
    return NextResponse.json(
      { error: '获取资源数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
