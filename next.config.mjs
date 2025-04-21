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
};

export default nextConfig;
