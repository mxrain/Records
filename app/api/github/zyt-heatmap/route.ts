import { NextResponse } from 'next/server';

// 定义返回数据的接口
interface Contribution {
  date: string;
  count: number;
  details: string[];
}

export async function GET() {
  try {
    // GitHub API 的配置
    const username = process.env.NEXT_PUBLIC_GITHUB_OWNER;;
    const repository = process.env.NEXT_PUBLIC_GITHUB_REPO;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      // 如果有 GitHub token，可以添加授权来增加 API 限制
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
    };

    // 获取最近一年的提交数据
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // 调用 GitHub API 获取提交记录
    const response = await fetch(
      `https://api.github.com/repos/${username}/${repository}/commits?since=${oneYearAgo.toISOString()}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`);
    }

    const commits = await response.json();

    // 处理提交数据，按日期分组计数和收集详情
    const contributionMap = new Map<string, { count: number; details: string[] }>();
    
    commits.forEach((commit: any) => {
      const date = commit.commit.author.date.split('T')[0];
      const message = commit.commit.message;
      
      if (!contributionMap.has(date)) {
        contributionMap.set(date, { count: 0, details: [] });
      }
      
      const dateData = contributionMap.get(date)!;
      dateData.count += 1;
      dateData.details.push(message);
    });

    // 转换为数组格式
    const contributions: Contribution[] = Array.from(
      contributionMap,
      ([date, { count, details }]) => ({
        date,
        count,
        details
      })
    );

    // 按日期排序
    contributions.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: contributions
    });

  } catch (error) {
    console.error('Error fetching GitHub contributions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch GitHub contributions'
      },
      { status: 500 }
    );
  }
} 