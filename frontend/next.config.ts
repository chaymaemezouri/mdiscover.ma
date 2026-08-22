import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      {
        source: '/admin/livraison',
        destination: '/admin/commandes',
        permanent: false,
      },
      {
        source: '/admin/retours',
        destination: '/admin/commandes',
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3000' },
      { protocol: 'https', hostname: 'api.mdiscover.ma' },
      { protocol: 'http', hostname: 'api.mdiscover.ma' },
      { protocol: 'https', hostname: 'mdiscover.ma' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
