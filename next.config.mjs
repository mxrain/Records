/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'picsum.photos', 
      'api.btstu.cn', 
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
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      }
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'records-git-fix-hydration-errors-mxrain.vercel.app'],
    },
    serverComponentsExternalPackages: ['sharp'],
  },
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

export default nextConfig;
