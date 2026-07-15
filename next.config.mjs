/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      // Map legacy domains to remotePatterns
      ...[
        'picsum.photos',
        'api.btstu.cn',
        '4040000.xyz',
        'challenges.cloudflare.com',
        'img.4040000.xyz',
        'cdn.cloudflare.steamstatic.com',
        'telegram.org',
        'images-ext-1.discordapp.net',
        'camo.githubusercontent.com',
        'yuzu-mirror.github.io',
        'calibre-ebook.com',
        'rufus.ie',
        'www.charlesproxy.com',
        'www.spacedesk.net',
        'opengraph.githubassets.com'
      ].map(domain => ({
        protocol: 'https',
        hostname: domain,
      }))
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  serverExternalPackages: ['sharp'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3001', 'records-git-fix-hydration-errors-mxrain.vercel.app'],
    },
  },
  output: 'standalone',
  async headers() {
    // 动态读取允许的跨域来源(逗号分隔),未配置时仅允许同源
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // 开发环境追加 localhost
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
    }
    // CORS Allow-Origin 用占位回显由 proxy.ts 动态处理,这里设默认同源策略
    const defaultOrigin = allowedOrigins[0] || '';

    return [
      {
        source: '/api/:path*',
        headers: [
          // 注意:不再设置 Allow-Credentials: true + Allow-Origin: * 的危险组合
          // 凭证模式由 cookie sameSite=strict 自然支持同站,跨站默认不带
          { key: 'Access-Control-Allow-Origin', value: defaultOrigin },
          { key: 'Vary', value: 'Origin' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      {
        // 全站安全响应头
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 允许内联脚本/样式(Next.js 需要);生产环境建议配合 nonce 收紧
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-src 'self' https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
