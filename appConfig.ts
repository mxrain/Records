export const config = {
  GITHUB_OWNER: process.env.NEXT_PUBLIC_GITHUB_OWNER || 'mxrain',
  GITHUB_REPO: process.env.NEXT_PUBLIC_GITHUB_REPO || 'zyt',
  GITHUB_RESOURCES_REPO: process.env.NEXT_PUBLIC_GITHUB_RESOURCES_REPO || 'zyt',
  // 在这里添加你的配置项`https://raw.gitmirror.com/${process.env.NEXT_PUBLIC_GITHUB_OWNER}/${process.env.NEXT_PUBLIC_GITHUB_REPO}/refs/heads/master/src/db/zyt`;
  // 如果process.env.NEXT_PUBLIC_GITHUB_OWNER和process.env.NEXT_PUBLIC_GITHUB_REPO为空，则使用默认值mxrain 
  GITHUB_API_URL: `https://api.github.com`,
  apiBaseUrl: `https://raw.gitmirror.com/${process.env.NEXT_PUBLIC_GITHUB_OWNER || 'mxrain'}/${process.env.NEXT_PUBLIC_GITHUB_REPO || 'zyt'}/refs/heads/master/db`,
  resourceBaseUrl: `https://raw.gitmirror.com/${process.env.NEXT_PUBLIC_GITHUB_RESOURCES_OWNER || 'mxrain'}/${process.env.NEXT_PUBLIC_GITHUB_RESOURCES_REPO || 'resources'}/refs/heads/master`,
  maxRetries: 3,
  timeout: 5000,
  // 添加更多配置项...
};
