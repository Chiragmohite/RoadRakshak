/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://roadrakshak-gih4.onrender.com/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'https://roadrakshak-gih4.onrender.com/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;