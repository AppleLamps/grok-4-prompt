import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createHash } from 'crypto';
import { API_CONFIG } from '../config/constants';

/**
 * In-memory rate limiter for API requests.
 *
 * IMPORTANT LIMITATION: This rate limiter uses in-memory storage, which means:
 * - In serverless environments (Vercel, AWS Lambda), each instance has its own memory
 * - Users can potentially bypass rate limits by hitting different serverless instances
 * - For production with strict rate limiting requirements, consider using a distributed
 *   store like Redis or Upstash:
 *
 *   import { RateLimiterRedis } from 'rate-limiter-flexible';
 *   import Redis from 'ioredis';
 *
 *   const redisClient = new Redis(process.env.REDIS_URL);
 *   const rateLimiter = new RateLimiterRedis({
 *     storeClient: redisClient,
 *     points: API_CONFIG.RATE_LIMIT_POINTS,
 *     duration: API_CONFIG.RATE_LIMIT_DURATION,
 *     keyPrefix: 'pg_rl',
 *   });
 *
 * For this application, in-memory rate limiting provides reasonable protection
 * against casual abuse while keeping infrastructure simple.
 */
const rateLimiter =
  global.__pgRateLimiter ||
  new RateLimiterMemory({
    points: API_CONFIG.RATE_LIMIT_POINTS,
    duration: API_CONFIG.RATE_LIMIT_DURATION,
  });

if (!global.__pgRateLimiter) {
  global.__pgRateLimiter = rateLimiter;
}

// Helper: derive client IP robustly
const getClientIp = (req) => {
  const trustProxy = process.env.VERCEL === '1' || process.env.TRUST_PROXY === 'true';

  const headerCandidates = [
    'cf-connecting-ip',
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'fastly-client-ip',
    'true-client-ip',
    'x-vercel-proxied-for',
  ];

  const isPrivate = (ip) => {
    if (!ip) return true;
    const v4 = ip.includes('.');
    if (v4) {
      return (
        ip.startsWith('10.') ||
        ip.startsWith('127.') ||
        ip.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
        ip === '0.0.0.0'
      );
    }
    // IPv6 private/link-local/loopback
    const lower = ip.toLowerCase();
    return (
      lower === '::1' ||
      lower.startsWith('fc00:') ||
      lower.startsWith('fd00:') ||
      lower.startsWith('fe80:')
    );
  };

  const pickPublicFromXff = (xff) => {
    const parts = (xff || '')
      .toString()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith('::ffff:') ? s.slice(7) : s));
    for (const p of parts) {
      if (!isPrivate(p)) return p;
    }
    return parts[0] || '';
  };

  let ip = '';
  if (trustProxy) {
    for (const h of headerCandidates) {
      const val = req.headers[h];
      if (!val) continue;
      if (h === 'x-forwarded-for') {
        ip = pickPublicFromXff(val.toString());
      } else if (typeof val === 'string') {
        ip = val;
      }
      if (ip) break;
    }
  }
  if (!ip) {
    ip = (req.socket && req.socket.remoteAddress) || '';
  }
  if (!ip) return 'unknown';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
};

const makeRateKey = (req) => {
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';
  return createHash('sha256').update(`${ip}:${ua}`).digest('hex');
};

export { getClientIp, makeRateKey, rateLimiter };

