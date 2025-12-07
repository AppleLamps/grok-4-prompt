import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createHash } from 'crypto';
import logger from '../../utils/logger';
import { SURPRISE_SYSTEM_PROMPT } from '../../config/prompts';

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

const rateLimiter =
  global.__pgRateLimiter ||
  new RateLimiterMemory({
    points: 5,
    duration: 60,
  });
if (!global.__pgRateLimiter) {
  global.__pgRateLimiter = rateLimiter;
}

const PROMPT_ONLY_SCHEMA = {
  name: 'prompt_response',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      prompt: {
        type: 'string',
        description: 'Fully formatted prompt string for the user',
      },
    },
    required: ['prompt'],
  },
  strict: true,
};

const extractMessageText = (content) => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
  }
  if (content && typeof content === 'object') {
    return JSON.stringify(content);
  }
  if (content && typeof content.text === 'string') return content.text;
  return '';
};

const parseStructuredContent = (content) => {
  const raw = extractMessageText(content);
  if (!raw) throw new Error('Empty AI response');
  return JSON.parse(raw);
};

const ensureTextPrompt = (payload) => {
  if (!payload || typeof payload !== 'object' || typeof payload.prompt !== 'string') {
    throw new Error('Invalid structured prompt payload');
  }
  return payload.prompt.trim();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting - 5 requests per minute per client (IP+UA hash)
  try {
    const key = makeRateKey(req);
    await rateLimiter.consume(key, 1);
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

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const responseFormat = {
      type: 'json_schema',
      json_schema: PROMPT_ONLY_SCHEMA,
    };

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
            content: SURPRISE_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            // Simple user prompt, as all guidance is in the system prompt
            content: 'Create an extraordinary image prompt now.',
          },
        ],
        temperature: 1.2,
        max_tokens: 400,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.4,
        usage: { include: true },
        response_format: responseFormat,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('OpenRouter API Error (surprise):', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      if (response.status === 401) {
        return res.status(500).json({ error: 'Authentication error', message: 'Invalid API credentials. Please contact the administrator.' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded', message: 'Too many requests. Please wait a moment before trying again.' });
      }
      if (response.status === 402) {
        return res.status(500).json({ error: 'Billing issue', message: 'Service temporarily unavailable. Please try again later.' });
      }
      return res.status(500).json({ error: 'External service error', message: 'The AI service is currently unavailable. Please try again later.' });
    }

    const data = await response.json();

    if (!data?.choices?.[0]?.message?.content) {
      logger.error('Invalid OpenRouter API response structure (surprise):', data);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'Received an invalid response from the AI service. Please try again.',
      });
    }

    let parsedPayload;
    try {
      parsedPayload = parseStructuredContent(data.choices[0].message.content);
    } catch (parseError) {
      logger.error('Failed to parse structured response from OpenRouter (surprise):', parseError);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'The AI service returned a malformed response. Please try again.',
      });
    }

    let finalPrompt;
    try {
      finalPrompt = ensureTextPrompt(parsedPayload);
    } catch (validationError) {
      logger.error('Structured response validation failed (surprise):', validationError);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'The AI service returned an invalid response. Please try again.',
      });
    }

    if (!finalPrompt) {
      return res.status(500).json({
        error: 'Empty response',
        message: 'The AI service returned an empty response. Please try again with different input.',
      });
    }

    res.status(200).json({ prompt: finalPrompt, usage: data.usage || null });
  } catch (error) {
    logger.error('Surprise API Error:', error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'The AI service timed out. Please try again.' });
    }
    res.status(500).json({ error: 'Failed to generate a surprise prompt.', details: error.message });
  }
}
