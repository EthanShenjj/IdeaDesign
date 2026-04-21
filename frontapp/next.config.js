const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL;

function normalizeApiBase(url) {
  if (!url) return 'http://localhost:5001/api';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

const API_BASE_URL = normalizeApiBase(RAW_API_URL).replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${API_BASE_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
