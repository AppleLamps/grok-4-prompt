// /pages/api/generate.js
// Secure API route for OpenRouter integration
// This route handles all OpenRouter API calls server-side to protect the API key

import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import he from 'he'; // For HTML entity encoding - install via npm install he
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createHash } from 'crypto';

const rateLimiter = new RateLimiterMemory({ points: 5, duration: 60 }); // 5 requests per minute

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

// Helper to read a JSON body when bodyParser is disabled
const readJsonBody = async (req, maxBytes = 1_000_000) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length || 0;
    if (total > maxBytes) {
      const err = new Error('Payload too large');
      err.code = 'PAYLOAD_TOO_LARGE';
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw); } catch { return {}; }
};

// Hoisted helpers so regex are compiled once per worker
const sanitizeToPrompt = (raw) => {
  try {
    let t = (raw || '').toString().trim();
    t = t.replace(/^```(?:[a-zA-Z0-9]+)?\s*[\r\n]?([\s\S]*?)\s*```$/m, '$1').trim();
    if (t.includes('---')) {
      const parts = t.split(/\n?---+\n?/g).map(p => p.trim()).filter(Boolean);
      if (parts.length) t = parts[parts.length - 1];
    }
    const labelMatch = t.match(/(?:^|\n)\s*(?:final\s*)?prompt[^:]*:\s*/i);
    if (labelMatch) {
      t = t.slice(labelMatch.index + labelMatch[0].length).trim();
    }
    t = t
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^[>\-\s]*\*/gm, '')
      .replace(/^>\s*/gm, '');
    t = t.replace(/\s+/g, ' ').trim();
    if (t.length > 1200) {
      t = t.slice(0, 1200);
      const lastSpace = t.lastIndexOf(' ');
      if (lastSpace > 0) t = t.slice(0, lastSpace);
    }
    return t;
  } catch {
    return (raw || '').toString().trim();
  }
};

// Robust JSON extraction with fewer heavy attempts for perf
const parseJsonStrictish = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

  let candidate = raw.trim().replace(/^\uFEFF/, '');
  let parsed = tryParse(candidate);
  if (parsed) return parsed;
  const fenceMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    candidate = fenceMatch[1].trim();
    parsed = tryParse(candidate);
    if (parsed) return parsed;
  }
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidate = candidate.slice(firstBrace, lastBrace + 1).trim();
    parsed = tryParse(candidate);
    if (parsed) return parsed;
  }
  candidate = candidate.replace(/[\u201C\u201D]/g, '"');
  candidate = candidate.replace(/\r\n/g, '\n');
  candidate = candidate.replace(/,\s*([}\]])/g, '$1');
  parsed = tryParse(candidate);
  if (parsed) return parsed;
  for (let i = 1; i <= 6; i++) {
    parsed = tryParse(candidate + '}'.repeat(i));
    if (parsed) return parsed;
  }
  const maxAttempts = Math.min(candidate.length, 600);
  for (let end = candidate.length; end > Math.max(0, candidate.length - maxAttempts); end--) {
    const snippet = candidate.slice(0, end).trim();
    if (snippet.length < 10) break;
    let p = tryParse(snippet);
    if (p) return p;
    for (let j = 1; j <= 4; j++) {
      p = tryParse(snippet + '}'.repeat(j));
      if (p) return p;
    }
  }
  let fallback = candidate.replace(/\s*"[^"]+"\s*:\s*[^,}\]]+$/s, '').trim();
  if (!fallback.endsWith('}')) fallback += '}';
  parsed = tryParse(fallback);
  if (parsed) return parsed;
  return null;
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    });
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

  // Decide parsing strategy: multipart only when needed
  const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data');

  try {
    let fields = {};
    let files = {};

    if (isMultipart) {
      const form = new IncomingForm({
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        keepExtensions: true,
      });
      [fields, files] = await form.parse(req);
    } else {
      const body = await readJsonBody(req, 1_000_000);
      fields = {
        idea: [body.idea ?? ''],
        directions: body.directions ? [body.directions] : [''],
        isJsonMode: [String(body.isJsonMode ?? 'false')],
      };
      files = {};
    }

    // Basic input sanitization to reduce prompt injection risks
    const idea = (fields.idea && fields.idea[0]) ? he.encode(fields.idea[0].trim()) : '';
    const directions = (fields.directions && fields.directions[0]) ? he.encode(fields.directions[0].trim()) : '';
    const imageFile = files.image ? files.image[0] : null;
    // New: JSON mode flag from form fields (string -> boolean)
    const isJsonMode = fields.isJsonMode?.[0] === 'true';

    // Validate that we have either an idea or an image
    if ((!idea || idea.length === 0) && !imageFile) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Either an "idea" or an image must be provided'
      });
    }

    // Check for API key in environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API key is not configured. Please contact the administrator.'
      });
    }

  // helpers hoisted at module scope: sanitizeToPrompt, parseJsonStrictish

    // New: JSON mode system prompt
    const jsonSystemPrompt = `You are an expert-level prompt engineer for advanced text-to-image and text-to-video generative AI. Your task is to take a user's core idea and expand it into a highly detailed, structured JSON object that defines a complete creative shot.



RULES:

1.  Your entire output MUST be a single, raw JSON object. Do not wrap it in markdown, explanations, or any other text.

2.  The JSON structure should be inspired by the user-provided examples, breaking down the concept into logical categories: 'title', 'prompt', 'negative_prompt', 'style', 'composition', 'lighting', 'subject', 'environment', 'camera', 'animation', 'audio', 'output', etc.

3.  The top-level 'prompt' field is MANDATORY. It must contain a concise, powerful, and well-written text prompt (under 1200 characters) that summarizes the detailed JSON structure.

4.  Infer and add technical details where appropriate, such as camera lens (e.g., "50mm"), lighting setups (e.g., "soft top-down key"), and style notes (e.g., "surreal photoreal CGI").

5.  If the user's idea is simple, creatively build upon it to generate a rich, detailed, and complete scene description within the JSON.

6.  If animation is not specified, you can still include an 'animation' block with subtle, slow motions (like a gentle camera push or a "breathing" effect on an object) to add a dynamic quality to the concept.`;


    // Handle image processing if present
    let imageBase64 = null;
    if (imageFile) {
      try {
        const imageBuffer = await fs.readFile(imageFile.filepath);
        imageBase64 = imageBuffer.toString('base64');
        // Clean up temporary file
        await fs.unlink(imageFile.filepath);
      } catch (error) {
        console.error('Error processing image:', error);
        return res.status(500).json({
          error: 'Image processing error',
          message: 'Failed to process the uploaded image. Please try again.'
        });
      }
    }

    // Combine user inputs into a single prompt
    let userPrompt = '';
    
    if (imageFile && (!idea || idea.length === 0) && (!directions || directions.length === 0)) {
      // Image only - recreate the photo
      userPrompt = 'Please analyze this image and create a detailed prompt to recreate it as closely as possible for AI image generation.';
    } else if (imageFile && (idea || directions)) {
      // Image with context
      userPrompt = 'Please analyze this image and create a prompt for AI image generation';
      if (idea && idea.length > 0) {
        userPrompt += ` incorporating this idea: ${idea}`;
      }
      if (directions && directions.length > 0) {
        userPrompt += ` with these additional directions: ${directions}`;
      }
    } else {
      // Text only (original behavior)
      userPrompt = `Idea: ${idea}`;
      if (directions && directions.length > 0) {
        userPrompt += `\n\nAdditional directions: ${directions}`;
      }
    }
    // Reinforce JSON-only output in user message when JSON mode is enabled
    if (isJsonMode) {
      userPrompt += `\n\nReturn only raw JSON. No markdown fences, no explanations, no extra text.`;
    }

    // Prepare request body for OpenRouter API
    const requestBody = {
      model: 'x-ai/grok-4',
      messages: [
        {
          role: 'system',
          content: isJsonMode ? jsonSystemPrompt : `You are Grok-4 Imagine, an AI that writes a single vivid image prompt between 500–1200 characters (including spaces). Output exactly one paragraph.

Rules:

Length 500–1200 characters, complete sentences only.

No markdown, quotes, brackets, or special characters.

Follow this order, with short, concrete phrases: subject first, then action or context, environment/time, camera or lens look (e.g., 85mm headshot, 24mm wide), lighting, composition, mood/color grade, style constraint. 

Use 1–2 precise descriptors per slot; avoid adjective chains. 

Choose a single lighting and composition intent; never mix conflicting cues. 

Describe what to include; do not write negatives ("no/avoid") or any weighting syntax. 

Prefer photographic language (lens/composition/grade) over vague style tags

Style guidance:

Camera & lens: e.g., 24mm landscape look, 35mm reportage, 85mm portrait, 100mm macro; shallow depth of field or deep focus as needed
Lighting: e.g., soft window light, Rembrandt lighting, backlit rim, overcast skylight, golden hour
Composition: e.g., centered, rule of thirds, top-down, wide establishing
Color/mood: e.g., natural color, low-contrast film grade, muted greens, moody blue hour
Style constraints: e.g., natural skin texture, clean reflections, no text overlays`
        }
      ],
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      usage: { include: true }
    };

    // Add user message with or without image
  if (imageBase64) {
      requestBody.messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${imageFile.mimetype};base64,${imageBase64}`
            }
          }
        ]
      });
    } else {
      requestBody.messages.push({
        role: 'user',
        content: userPrompt
      });
    }

    // Make request to OpenRouter API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let openRouterResponse;
    try {
      openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
          'X-Title': 'Prompt Generator'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Check if the OpenRouter API request was successful
    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json().catch(() => ({}));

      // Log error for debugging (don't expose internal errors to client)
      console.error('OpenRouter API Error:', {
        status: openRouterResponse.status,
        statusText: openRouterResponse.statusText,
        error: errorData
      });

      // Return appropriate error messages based on status code
      if (openRouterResponse.status === 401) {
        return res.status(500).json({
          error: 'Authentication error',
          message: 'Invalid API credentials. Please contact the administrator.'
        });
      } else if (openRouterResponse.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait a moment before trying again.'
        });
      } else if (openRouterResponse.status === 402) {
        return res.status(500).json({
          error: 'Billing issue',
          message: 'Service temporarily unavailable. Please try again later.'
        });
      } else {
        return res.status(500).json({
          error: 'External service error',
          message: 'The AI service is currently unavailable. Please try again later.'
        });
      }
    }

    // Parse the response from OpenRouter
    const data = await openRouterResponse.json();

    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Invalid OpenRouter API response structure:', data);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'Received an invalid response from the AI service. Please try again.'
      });
    }

    const rawContent = data.choices[0].message.content?.toString().trim() || '';
    let finalPrompt;
    if (isJsonMode) {
      finalPrompt = parseJsonStrictish(rawContent);
      if (!finalPrompt) {
        console.error('AI returned invalid JSON:', rawContent);
        return res.status(500).json({
          error: 'Invalid response',
          message: 'The AI service returned a malformed JSON response. Please try again.'
        });
      }
    } else {
      finalPrompt = sanitizeToPrompt(rawContent);
    }

    // Validate that we got actual content
    if (!finalPrompt || (isJsonMode && typeof finalPrompt !== 'object')) {
      return res.status(500).json({
        error: 'Empty response',
        message: 'The AI service returned an empty response. Please try again with different input.'
      });
    }

    // Return successful response
    return res.status(200).json({
      success: true,
      prompt: finalPrompt,
      usage: data.usage || null
    });

  } catch (error) {
    // Log the full error for debugging
    console.error('API Route Error:', error);

    // Handle specific error types first
    if (error?.statusCode === 413 || error?.code === 'PAYLOAD_TOO_LARGE') {
      return res.status(413).json({
        error: 'Payload too large',
        message: 'JSON body exceeds 1MB limit.'
      });
    }

    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Gateway timeout',
        message: 'The AI service took too long to respond. Please try again.'
      });
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return res.status(500).json({
        error: 'Network error',
        message: 'Unable to connect to the AI service. Please check your internet connection and try again.'
      });
    }

    // Generic error response (don't expose internal error details)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
}

// Configure API route
export const config = {
  api: {
    bodyParser: false, // Disable default body parser to handle multipart/form-data
  },
};
