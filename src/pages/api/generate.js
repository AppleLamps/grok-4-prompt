// /pages/api/generate.js
// Secure API route for OpenRouter integration
// This route handles all OpenRouter API calls server-side to protect the API key

import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import he from 'he'; // For HTML entity encoding - install via npm install he
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createHash } from 'crypto';
import logger from '../../utils/logger';
import {
  DEFAULT_SYSTEM_PROMPT,
  JSON_SYSTEM_PROMPT,
  REFINEMENT_SYSTEM_PROMPT,
  TEST_SYSTEM_PROMPT,
  VIDEO_SYSTEM_PROMPT,
} from '../../config/prompts';

// Singleton rate limiter; TODO: replace with Redis (e.g., Upstash) for production durability.
const rateLimiter =
  global.__pgRateLimiter ||
  new RateLimiterMemory({
    points: 5,
    duration: 60,
  }); // 5 requests per minute
if (!global.__pgRateLimiter) {
  global.__pgRateLimiter = rateLimiter;
}

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

const DEFAULT_PROMPT_SCHEMA = {
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

const JSON_MODE_SCHEMA = {
  name: 'json_prompt_response',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      scene: { type: 'string' },
      subjects: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            description: { type: 'string' },
            position: { type: 'string' },
            action: { type: 'string' },
            color_palette: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['description', 'position', 'action', 'color_palette'],
        },
      },
      style: { type: 'string' },
      color_palette: {
        type: 'array',
        items: { type: 'string' },
      },
      lighting: { type: 'string' },
      mood: { type: 'string' },
      background: { type: 'string' },
      composition: { type: 'string' },
      camera: {
        type: 'object',
        additionalProperties: false,
        properties: {
          angle: { type: 'string' },
          lens: { type: 'string' },
          'f-number': { type: 'string' },
          ISO: { type: 'number' },
          depth_of_field: { type: 'string' },
        },
        required: ['angle', 'lens', 'f-number', 'ISO', 'depth_of_field'],
      },
    },
    required: ['scene', 'subjects', 'style', 'color_palette', 'lighting', 'mood', 'background', 'composition', 'camera'],
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

const ensureJsonPrompt = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid structured JSON payload');
  }
  return payload;
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
        isTestMode: [String(body.isTestMode ?? 'false')],
        isVideoPrompt: [String(body.isVideoPrompt ?? 'false')],
        isMultiPrompt: [String(body.isMultiPrompt ?? 'false')],
      };
      files = {};
    }

    // Basic input sanitization to reduce prompt injection risks
    const idea = (fields.idea && fields.idea[0]) ? he.encode(fields.idea[0].trim()) : '';
    const directions = (fields.directions && fields.directions[0]) ? he.encode(fields.directions[0].trim()) : '';
    const imageFile = files.image ? files.image[0] : null;
    // New: JSON mode flag from form fields (string -> boolean)
    const isJsonMode = fields.isJsonMode?.[0] === 'true';
    // New: Test mode flag from form fields (string -> boolean)
    const isTestMode = fields.isTestMode?.[0] === 'true';
    // New: Video prompt mode flag from form fields (string -> boolean)
    const isVideoPrompt = (fields.isVideoPrompt?.[0] ?? 'false') === 'true';
    // New: Multi-prompt mode flag from form fields (string -> boolean)
    const isMultiPrompt = (fields.isMultiPrompt?.[0] ?? 'false') === 'true';

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
      logger.error('OPENROUTER_API_KEY environment variable is not set');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API key is not configured. Please contact the administrator.'
      });
    }

    // System prompts are imported from src/config/prompts.js
    const jsonSystemPrompt = `You are an expert-level prompt engineer for advanced text-to-image and text-to-video generative AI. Your task is to take a user's core idea and expand it into a highly detailed, structured JSON object that defines a complete creative shot.



RULES:

1.  Your entire output MUST be a single, raw JSON object. Do not wrap it in markdown, explanations, or any other text.

2.  The JSON structure should be inspired by the user-provided examples, breaking down the concept into logical categories: 'title', 'prompt', 'negative_prompt', 'style', 'composition', 'lighting', 'subject', 'environment', 'camera', 'animation', 'audio', 'output', etc.

3.  The top-level 'prompt' field is MANDATORY. It must contain a concise, powerful, and well-written text prompt (under 1200 characters) that summarizes the detailed JSON structure.

4.  Infer and add technical details where appropriate, such as camera lens (e.g., "50mm"), lighting setups (e.g., "soft top-down key"), and style notes (e.g., "surreal photoreal CGI").

5.  If the user's idea is simple, creatively build upon it to generate a rich, detailed, and complete scene description within the JSON.

6.  If animation is not specified, you can still include an 'animation' block with subtle, slow motions (like a gentle camera push or a "breathing" effect on an object) to add a dynamic quality to the concept.`;

    // New: Video prompt system prompt
    const videoSystemPrompt = `ROLE AND GOAL: You are a creative visual storyteller, an expert in crafting prompts for the Grok Imagine video generation model. Your primary purpose is to transform a user's concept into a single, rich, and evocative paragraph. This paragraph should read like a scene from a screenplay, providing vivid detail while empowering Grok with the creative freedom to produce stunning, unexpected results. Your goal is to be a collaborative and inspiring creative partner.

CORE METHODOLOGY: Your entire process should focus on synthesizing user ideas into a single, descriptive paragraph.

Understand the Vision: Start by grasping the user's core concept, the desired mood, and the story they want to tell. If their request is brief (e.g., "a knight fighting a dragon"), ask clarifying questions to inspire more detail, such as "What's the environment like? Is the mood epic and heroic, or dark and gritty? What style are you imagining—hyperrealistic, or more like a fantasy painting?"

Weave the Elements into a Narrative: Instead of listing technical details, seamlessly integrate them into a descriptive paragraph. Every prompt you write should naturally combine these elements:

Visual Style & Medium: Always begin the paragraph by establishing the overall aesthetic. Examples: "A grainy, 16mm vintage film captures...", "An epic, cinematic 8K video in the style of a sci-fi blockbuster shows...", "A watercolor-style animation brings to life..."

Scene and Character: Describe the setting, the characters, and their emotions. Use sensory language to paint a picture.

Action and Motion: Clearly describe the primary action. Instead of listing camera movements, describe them from a viewer's perspective. For example, instead of "Dolly shot," write, "The camera smoothly glides towards the subject..." or "A sweeping aerial shot reveals the vast landscape..."

Mood, Lighting, and Color: Convey the atmosphere through light and color. For example, "...the scene is bathed in the warm, nostalgic glow of golden hour," or "...lit by the cold, neon-drenched streets of a cyberpunk city."

Sound and Dialogue (If applicable): Integrate any sounds or dialogue naturally into the description. For example, "...as a character mutters, 'It can't be,' under their breath," or "...the only sound is the gentle rustling of leaves in the wind."

Prioritize Creative Freedom: Your prompts should be specific enough to guide the AI but open enough to allow for beautiful, surprising interpretations. Focus on the "what" and the "feel," and let Grok handle the "how."

COMMUNICATION STYLE:

Collaborative and Inspiring: Act as a creative partner. Offer suggestions and explain your creative choices in a simple, encouraging way.

Educational: Gently teach the user how to think more visually and narratively about their ideas.

Simple and Direct: Provide the final prompt as a single, clean paragraph that is ready to be copied and pasted. Do not wrap it in code blocks or add any extra formatting.

EXAMPLE TRANSFORMATION:

User Idea: "A person walking in a park, but make it cinematic."

Your Output (Example): "A cinematic, slow-motion shot follows a person as they stroll through a sun-dappled park during golden hour. The camera, positioned low to the ground, captures leaves skittering across the path in the gentle breeze, creating a feeling of peaceful solitude and quiet reflection. The warm light filters through the trees, casting long, soft shadows and highlighting the rich, autumnal colors of the scene."`;

    // Default image prompt system prompt
    const defaultSystemPrompt = `You are Grok-4 Imagine, an AI that writes a single vivid image prompt between 500–1200 characters (including spaces). Output exactly one paragraph.

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
Style constraints: e.g., natural skin texture, clean reflections, no text overlays`;


    // Handle image processing if present
    let imageBase64 = null;
    if (imageFile) {
      try {
        const imageBuffer = await fs.readFile(imageFile.filepath);
        imageBase64 = imageBuffer.toString('base64');
        // Clean up temporary file
        await fs.unlink(imageFile.filepath);
      } catch (error) {
        logger.error('Error processing image:', error);
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

    // Helper function to make OpenRouter API calls
    const makeOpenRouterCall = async (model, systemPrompt, userContent, hasImage = false, imageData = null, responseFormat = null) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const requestBody = {
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        usage: { include: true }
      };

      if (responseFormat) {
        requestBody.response_format = responseFormat;
      }

      // Add user message with or without image
      if (hasImage && imageData) {
        requestBody.messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: userContent
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageFile.mimetype};base64,${imageData}`
              }
            }
          ]
        });
      } else {
        requestBody.messages.push({
          role: 'user',
          content: userContent
        });
      }

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    let openRouterResponse;
    let refinedPrompt = userPrompt;

    // Multi-prompt mode: two-stage approach (works with test mode)
    if (isMultiPrompt) {
      // Stage 1: Refine the prompt using gemini-2.5-flash-lite (supports image analysis)
      try {
        const stage1Response = await makeOpenRouterCall(
          'google/gemini-2.5-flash-lite',
          REFINEMENT_SYSTEM_PROMPT,
          userPrompt,
          !!imageBase64,
          imageBase64
        );

        if (!stage1Response.ok) {
          const errorData = await stage1Response.json().catch(() => ({}));
          logger.error('Stage 1 (refinement) API Error:', {
            status: stage1Response.status,
            error: errorData
          });
          // Fall back to single-stage if refinement fails
          refinedPrompt = userPrompt;
        } else {
          const stage1Data = await stage1Response.json();
          const refined = extractMessageText(stage1Data.choices?.[0]?.message?.content);
          if (refined) {
            refinedPrompt = refined;
            logger.info('Stage 1 refinement completed:', { refinedPrompt: refinedPrompt.substring(0, 100) + '...' });
          } else {
            logger.warn('Stage 1 returned invalid response, using original prompt');
            refinedPrompt = userPrompt;
          }
        }
      } catch (error) {
        logger.error('Stage 1 (refinement) failed:', error);
        // Fall back to original prompt if refinement fails
        refinedPrompt = userPrompt;
      }
    }

    // Stage 2 (or single stage): Generate final prompt using grok-4.1-fast
    const finalSystemPrompt = isJsonMode
      ? JSON_SYSTEM_PROMPT
      : isVideoPrompt
        ? VIDEO_SYSTEM_PROMPT
        : isTestMode
          ? TEST_SYSTEM_PROMPT
          : DEFAULT_SYSTEM_PROMPT;

    const responseFormat = {
      type: 'json_schema',
      json_schema: isJsonMode ? JSON_MODE_SCHEMA : DEFAULT_PROMPT_SCHEMA,
    };

    // Always use Grok 4.1 Fast for final generation to keep behavior consistent
    const finalModel = 'x-ai/grok-4.1-fast';

    try {
      openRouterResponse = await makeOpenRouterCall(
        finalModel,
        finalSystemPrompt,
        refinedPrompt,
        !!imageBase64 && !isMultiPrompt, // Only send image in single-stage mode (already analyzed in stage 1 if multi-prompt)
        imageBase64,
        responseFormat
      );
    } catch (error) {
      logger.error('OpenRouter API call failed:', error);
      return res.status(500).json({
        error: 'External service error',
        message: 'The AI service is currently unavailable. Please try again later.'
      });
    }

    // Check if the OpenRouter API request was successful
    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json().catch(() => ({}));

      // Log error for debugging (don't expose internal errors to client)
      logger.error('OpenRouter API Error:', {
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

    const data = await openRouterResponse.json();

    if (!data?.choices?.[0]?.message?.content) {
      logger.error('Invalid OpenRouter API response structure:', data);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'Received an invalid response from the AI service. Please try again.'
      });
    }

    let parsedPayload;
    try {
      parsedPayload = parseStructuredContent(data.choices[0].message.content);
    } catch (parseError) {
      logger.error('Failed to parse structured response from OpenRouter:', parseError);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'The AI service returned a malformed response. Please try again.'
      });
    }

    let finalPrompt;
    try {
      finalPrompt = isJsonMode ? ensureJsonPrompt(parsedPayload) : ensureTextPrompt(parsedPayload);
    } catch (validationError) {
      logger.error('Structured response validation failed:', validationError);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'The AI service returned an invalid response. Please try again.'
      });
    }

    if (!isJsonMode && !finalPrompt) {
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
    logger.error('API Route Error:', error);

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
