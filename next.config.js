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
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: (() => {
              const isDev = process.env.NODE_ENV !== 'production';
              const connect = ["'self'", 'https://openrouter.ai'];
              if (process.env.VERCEL_URL) connect.push(`https://${process.env.VERCEL_URL}`);
              const script = isDev
                ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
                : ["'self'", "'unsafe-inline'"]; // avoid 'unsafe-eval' in prod
              return [
                "default-src 'self'",
                `connect-src ${connect.join(' ')}`,
                "img-src 'self' data: blob:",
                `script-src ${script.join(' ')}`,
                "style-src 'self' 'unsafe-inline'",
                "font-src 'self' data:",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
              ].join('; ');
            })(),
          },
          // NOTE: Do not set long-lived Cache-Control for HTML routes here.
          // Next/Vercel already handle caching for static assets safely.
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
