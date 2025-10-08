/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure allowed development origins to prevent cross-origin warnings
  allowedDevOrigins: [
    '10.19.69.84:3000',
    '10.19.69.84:3001',
    'localhost:3000',
    'localhost:3001',
    '127.0.0.1:3000',
    '127.0.0.1:3001'
  ],
  
  // Allow cross-origin requests during development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  }
};

export default nextConfig;
