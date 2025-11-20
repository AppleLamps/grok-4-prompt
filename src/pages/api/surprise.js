// /pages/api/surprise.js
// Requires: rate-limiter-flexible (already in package.json)
// Dependency check + safe import
import logger from '../../utils/logger';

let RateLimiterMemory;
try {
  ({ RateLimiterMemory } = require('rate-limiter-flexible'));
} catch (e) {
  logger.error('[Dependency missing] rate-limiter-flexible is required for rate limiting. Install with: npm install rate-limiter-flexible');
}

import { createHash } from 'crypto';

const rateLimiter = RateLimiterMemory ? new RateLimiterMemory({ points: 5, duration: 60 }) : null; // 5 requests per minute

// Helper: derive client IP robustly and rate-limiter key (IP + UA hashed)
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

// Hoisted sanitizer to avoid recreating regex per request
const sanitizeToPrompt = (raw) => {
  try {
    let t = (raw || '').toString().trim();

    // 1. Remove any markdown or formatting
    t = t.replace(/^```(?:[a-zA-Z0-9]+)?\s*[\r\n]?([\s\S]*?)\s*```$/m, '$1').trim();
    t = t.replace(/^[#*>-]+\s*/gm, '');
    t = t.replace(/\*\*(.*?)\*\*/g, '$1');
    t = t.replace(/\*(.*?)\*/g, '$1');
    t = t.replace(/`([^`]+)`/g, '$1');
    t = t.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // 2. Remove common preambles and labels
    const preambles = [
      /^(?:Here's your|Your new|The requested|An amazing|A unique|Here is a|This is an?|Prepare for a|Concept|Prompt|Image Concept|Description)[:.]?\s*/i,
      /^(?:Final )?(?:Prompt|Concept|Image idea|Image Description|Generated Prompt|AI Response)[:.]?\s*/i,
      /^(?:"|'|\u201C|\u2018|\u201D|\u2019|"|'|"|'|\/|\(|\[|\{|«|»|\||\-|\*|\+|=|_|#|@|>|<|~|`|\^|\$|%|&|\?|!|;|:|\.|,|\s)*/,
      /(?:"|'|\u201C|\u2018|\u201D|\u2019|"|'|"|'|\/|\)|\]|\}|«|»|\||\-|\*|\+|=|_|#|@|>|<|~|`|\^|\$|%|&|\?|!|;|:|\.|,|\s)*$/,
      /^\s*[\r\n]+\s*/,
      /\s*[\r\n]+\s*$/,
      /\s*[\r\n]+\s*/g,
    ];
    preambles.forEach(regex => {
      t = t.replace(regex, '').trim();
    });

    // 3. Clean up any remaining special characters or numbers at start/end
    t = t.replace(/^[^a-zA-Z\u00C0-\u017F]+/, '').trim();
    t = t.replace(/[^a-zA-Z\u00C0-\u017F\s.,!?-]+$/, '').trim();

    // 4. Normalize whitespace
    t = t.replace(/\s+/g, ' ').trim();

    // 5. Strict length enforcement (500-1200 chars)
    const MAX_LENGTH = 1200;
    const MIN_LENGTH = 500;
    if (t.length > MAX_LENGTH) {
      t = t.slice(0, MAX_LENGTH);
      const lastPeriod = t.lastIndexOf('. ');
      const lastExcl = t.lastIndexOf('! ');
      const lastQ = t.lastIndexOf('? ');
      const lastBoundary = Math.max(lastPeriod, lastExcl, lastQ);
      if (lastBoundary > MIN_LENGTH) {
        t = t.slice(0, lastBoundary + 1);
      } else {
        const lastSpace = t.lastIndexOf(' ', MAX_LENGTH);
        if (lastSpace > MIN_LENGTH) t = t.slice(0, lastSpace) + '.';
      }
    }

    if (t.length < 500 || t.length > 1200) {
      if (t.length > 1200) t = t.slice(0, 1197) + '...';
    }
    return t;
  } catch (e) {
    const fallback = (raw || '').toString().trim().slice(0, 1200);
    return fallback.length > 100 ? fallback : 'A stunning landscape with vibrant colors and incredible detail, featuring unique natural formations and atmospheric lighting.';
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting - 5 requests per minute per client (IP+UA hash)
  try {
    if (rateLimiter) {
      const key = makeRateKey(req);
      await rateLimiter.consume(key, 1);
    } else {
      // If dependency is missing, log and proceed without rate limiting (best-effort fallback)
      logger.warn('Rate limiting disabled because rate-limiter-flexible is not available.');
    }
  } catch {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please wait before trying again.'
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    logger.error('OPENROUTER_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // **OPTIMIZED SYSTEM PROMPT FOR SHORTER RESPONSES**
  const systemPrompt = `You are Grok-4 Imagine, an AI that generates creative, vivid image prompts. Your task is to create a single, detailed, and imaginative scene description that is 500–1200 CHARACTERS (including spaces).

  **CRITICAL RULES:**
  1. Response MUST be a single paragraph, 500–1200 characters long
  2. NO markdown, formatting, or special characters
  3. NO quotes, brackets, or other delimiters
  4. Complete sentences only - never cut off mid-word
  5. Focus on one clear, vivid scene or concept
  6. Include visual details, mood, and atmosphere
  7. Be creative and unexpected in your combinations

  **Example Structure (do not include these instructions in output):**
  [Vibrant/Serene/Epic] scene of [main subject] in/on/at [setting], with [key details], [lighting], [mood/atmosphere], [art style if relevant].

  **Inspiration (mix and match elements):**
  - Settings: Cyberpunk cities, alien landscapes, dream worlds, microscopic realms, cosmic vistas
  - Subjects: Mythical creatures, futuristic technology, surreal architecture, natural wonders
  - Styles: Hyperrealistic, painterly, digital art, cinematic, concept art, retro-futuristic
  - Moods: Awe, wonder, mystery, tranquility, energy, melancholy, whimsy

  **IMPORTANT:** Count your characters and ensure the final output is between 500–1200 characters.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
        'X-Title': 'Prompt Generator - Surprise Me'
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4.1-fast', // Using Grok-4.1-fast
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            // Simple user prompt, as all guidance is in the system prompt
            content: 'Create an extraordinary image prompt now.',
          },
        ],
        temperature: 1.2, // Balanced temperature for creativity without excessive verbosity
        max_tokens: 400, // Increased to accommodate longer responses up to 1200 chars
        top_p: 0.9, // Slightly more focused than before
        frequency_penalty: 0.5, // Discourage repetition
        presence_penalty: 0.4, // Encourage topic diversity
        usage: { include: true }
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    const raw = data?.choices?.[0]?.message?.content ?? '';
    const generatedPrompt = sanitizeToPrompt(raw);

    if (!generatedPrompt) {
      logger.error('Model returned empty or malformed content after sanitization:', { raw_response: data?.choices?.[0]?.message?.content, sanitized_output: generatedPrompt });
      return res.status(500).json({ error: 'Empty or malformed response from model after processing.' });
    }

    res.status(200).json({ prompt: generatedPrompt, usage: data.usage || null });
  } catch (error) {
    logger.error('Surprise API Error:', error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'The AI service timed out. Please try again.' });
    }
    res.status(500).json({ error: 'Failed to generate a surprise prompt.', details: error.message });
  }
}
