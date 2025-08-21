/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable React 18 features
    serverComponentsExternalPackages: [],
  },
  // Environment variables configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Performance headers: proper caching during development vs production
          ...(process.env.NODE_ENV === 'production'
            ? [{
                key: 'Cache-Control',
                value: 'public, max-age=31536000, immutable',
              }]
            : []), // Don't set cache-control headers in development
        ],
      },
    ];
  },
  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Compression
  compress: true,
  // Enable SWC minification
  swcMinify: true,
  // Bundle analyzer (optional)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
      return config;
    },
  }),
  // Optimize bundles
  webpack: (config, { isServer }) => {
    // Optimize moment.js
    config.resolve.alias = {
      ...config.resolve.alias,
      'moment': 'moment/moment.js',
    };
    
    // Optimize lodash
    config.resolve.alias = {
      ...config.resolve.alias,
      'lodash': 'lodash-es',
    };
    
    return config;
  },
};

module.exports = nextConfig;
