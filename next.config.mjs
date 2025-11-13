/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8080', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'localhost', pathname: '/uploads/**' }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*'
      }
      ,
      {
        // Proxy uploads so client can request /uploads/uuid without hitting CORS
        source: '/uploads/:path*',
        destination: 'http://localhost:8080/uploads/:path*'
      }
    ];
  }
};

export default nextConfig;
