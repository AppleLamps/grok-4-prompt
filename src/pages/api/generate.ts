// Secure API route for OpenRouter integration
// Handles prompt generation with optional image input
import { IncomingForm, type Fields, type Files, type File as FormidableFile } from 'formidable';
import { promises as fs } from 'fs';
import he from 'he';
import type { NextApiHandler, NextApiRequest } from 'next';
import logger from '../../utils/logger';
import { makeRateKey, rateLimiter } from '../../utils/api-helpers';
import { INPUT_LIMITS, OPENROUTER_MODELS, PROMPT_MODES, type PromptMode } from '../../config/constants';
import {
  DEFAULT_SYSTEM_PROMPT,
  JSON_SYSTEM_PROMPT,
  REFINEMENT_SYSTEM_PROMPT,
  TEST_SYSTEM_PROMPT,
  VIDEO_SYSTEM_PROMPT,
} from '../../config/prompts';
import {
  makeOpenRouterCall,
  mapOpenRouterError,
  sendOpenRouterError,
  type JsonSchemaWrapper,
  type JsonSchemaResponseFormat,
  type OpenRouterContent,
  type OpenRouterRequestBody,
} from '../../services/openRouterService';
import {
  extractMessageText,
  parseStructuredContent,
  ensureTextPrompt,
  ensureJsonPrompt,
  type JsonPromptPayload,
  type StructuredPayload,
  type ChatCompletionResponse,
} from '../../utils/openRouterParsers';

type GenerateRequestBody = {
  idea?: string;
  directions?: string;
  isJsonMode?: boolean;
  isTestMode?: boolean;
  isVideoPrompt?: boolean;
  isMultiPrompt?: boolean;
};

type GenerateResponse =
  | { success: true; prompt: string | JsonPromptPayload; usage: unknown }
  | { error: string; message: string };

// ============================================================================
// System Prompt Lookup (replaces nested ternary)
// ============================================================================

const SYSTEM_PROMPTS: Record<PromptMode, string> = {
  [PROMPT_MODES.JSON]: JSON_SYSTEM_PROMPT,
  [PROMPT_MODES.VIDEO]: VIDEO_SYSTEM_PROMPT,
  [PROMPT_MODES.TEST]: TEST_SYSTEM_PROMPT,
  [PROMPT_MODES.DEFAULT]: DEFAULT_SYSTEM_PROMPT,
};

/**
 * Determines which prompt mode to use based on the request flags.
 * Priority order: JSON > Video > Test > Default
 */
const getPromptMode = (flags: {
  isJsonMode: boolean;
  isVideoPrompt: boolean;
  isTestMode: boolean;
}): PromptMode => {
  if (flags.isJsonMode) return PROMPT_MODES.JSON;
  if (flags.isVideoPrompt) return PROMPT_MODES.VIDEO;
  if (flags.isTestMode) return PROMPT_MODES.TEST;
  return PROMPT_MODES.DEFAULT;
};

// ============================================================================
// JSON Schema Definitions
// ============================================================================

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
} satisfies JsonSchemaWrapper;

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
    required: [
      'scene',
      'subjects',
      'style',
      'color_palette',
      'lighting',
      'mood',
      'background',
      'composition',
      'camera',
    ],
  },
  strict: true,
} satisfies JsonSchemaWrapper;

// Helper to read a JSON body when bodyParser is disabled
const readJsonBody = async (req: NextApiRequest, maxBytes = 1_000_000): Promise<GenerateRequestBody> => {
  if (req.body && typeof req.body === 'object') return req.body as GenerateRequestBody;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const length = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length || 0;
    total += length;
    if (total > maxBytes) {
      const err = new Error('Payload too large') as Error & { code?: string; statusCode?: number };
      err.code = 'PAYLOAD_TOO_LARGE';
      err.statusCode = 413;
      throw err;
    }
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

// ============================================================================
// Form Field Helpers
// ============================================================================

const getFieldValue = (value: Fields[string]): string => {
  if (!value) return '';
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : '';
  }
  return typeof value === 'string' ? value : '';
};

const getFileValue = (file: Files[string]): FormidableFile | undefined => {
  if (!file) return undefined;
  if (Array.isArray(file)) return file[0] as FormidableFile;
  return file as FormidableFile;
};

const buildUserContent = (text: string, imageBase64?: string | null, mimeType?: string): OpenRouterContent => {
  if (imageBase64) {
    return [
      { type: 'text', text },
      { type: 'image_url', image_url: { url: `data:${mimeType ?? 'image/png'};base64,${imageBase64}` } },
    ];
  }
  return text;
};

// ============================================================================
// Main Request Handler
// ============================================================================

const handler: NextApiHandler<GenerateResponse> = async (req, res) => {
  // === 1. Request Method Validation ===
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests',
    });
  }

  // === 2. Rate Limiting ===
  try {
    const key = makeRateKey(req);
    await rateLimiter.consume(key, 1);
  } catch {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please wait before trying again.',
    });
  }

  const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data');

  try {
    // === 3. Parse Request Body ===
    let fields: Fields = {};
    let files: Files = {};

    if (isMultipart) {
      const form = new IncomingForm({
        maxFileSize: INPUT_LIMITS.IMAGE_MAX_SIZE,
        keepExtensions: true,
      });
      const [parsedFields, parsedFiles] = await form.parse(req);
      fields = parsedFields;
      files = parsedFiles;
    } else {
      const body = await readJsonBody(req, INPUT_LIMITS.IMAGE_MAX_SIZE);
      fields = {
        idea: body.idea ? [body.idea] : [''],
        directions: body.directions ? [body.directions] : [''],
        isJsonMode: [String(body.isJsonMode ?? 'false')],
        isTestMode: [String(body.isTestMode ?? 'false')],
        isVideoPrompt: [String(body.isVideoPrompt ?? 'false')],
        isMultiPrompt: [String(body.isMultiPrompt ?? 'false')],
      };
      files = {};
    }

    // Extract and sanitize input fields
    const ideaRaw = getFieldValue(fields.idea)?.trim() || '';
    const directionsRaw = getFieldValue(fields.directions)?.trim() || '';

    // === Input Length Validation (Security) ===
    if (ideaRaw.length > INPUT_LIMITS.IDEA_MAX_LENGTH) {
      return res.status(400).json({
        error: 'Input too long',
        message: `Idea must be under ${INPUT_LIMITS.IDEA_MAX_LENGTH} characters.`,
      });
    }
    if (directionsRaw.length > INPUT_LIMITS.DIRECTIONS_MAX_LENGTH) {
      return res.status(400).json({
        error: 'Input too long',
        message: `Directions must be under ${INPUT_LIMITS.DIRECTIONS_MAX_LENGTH} characters.`,
      });
    }

    // HTML encode to prevent XSS
    const idea = he.encode(ideaRaw);
    const directions = he.encode(directionsRaw);
    const imageFile = getFileValue(files.image);
    const isJsonMode = getFieldValue(fields.isJsonMode) === 'true';
    const isTestMode = getFieldValue(fields.isTestMode) === 'true';
    const isVideoPrompt = getFieldValue(fields.isVideoPrompt) === 'true';
    const isMultiPrompt = getFieldValue(fields.isMultiPrompt) === 'true';

    if ((!idea || idea.length === 0) && !imageFile) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Either an "idea" or an image must be provided',
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      logger.error('OPENROUTER_API_KEY environment variable is not set');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API key is not configured. Please contact the administrator.',
      });
    }

    let imageBase64: string | null = null;
    const imageMimeType = imageFile?.mimetype || 'image/png';
    if (imageFile?.filepath) {
      try {
        const imageBuffer = await fs.readFile(imageFile.filepath);
        imageBase64 = imageBuffer.toString('base64');
        await fs.unlink(imageFile.filepath);
      } catch (error) {
        logger.error('Error processing image:', error);
        return res.status(500).json({
          error: 'Image processing error',
          message: 'Failed to process the uploaded image. Please try again.',
        });
      }
    }

    let userPrompt = '';
    if (imageFile && (!idea || idea.length === 0) && (!directions || directions.length === 0)) {
      userPrompt =
        'Please analyze this image and create a detailed prompt to recreate it as closely as possible for AI image generation.';
    } else if (imageFile && (idea || directions)) {
      userPrompt = 'Please analyze this image and create a prompt for AI image generation';
      if (idea && idea.length > 0) {
        userPrompt += ` incorporating this idea: ${idea}`;
      }
      if (directions && directions.length > 0) {
        userPrompt += ` with these additional directions: ${directions}`;
      }
    } else {
      userPrompt = `Idea: ${idea}`;
      if (directions && directions.length > 0) {
        userPrompt += `\n\nAdditional directions: ${directions}`;
      }
    }
    if (isJsonMode) {
      userPrompt += '\n\nReturn only raw JSON. No markdown fences, no explanations, no extra text.';
    }

    // === 4. Optional Refinement Stage ===
    let refinedPrompt = userPrompt;

    if (isMultiPrompt) {
      try {
        const refinementBody: OpenRouterRequestBody = {
          model: OPENROUTER_MODELS.REFINEMENT,
          messages: [
            { role: 'system', content: REFINEMENT_SYSTEM_PROMPT },
            {
              role: 'user',
              content: buildUserContent(userPrompt, imageBase64, imageMimeType),
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          usage: { include: true },
        };

        const stage1Response = await makeOpenRouterCall({
          apiKey,
          body: refinementBody,
          title: 'Prompt Generator - Refinement',
        });

        if (!stage1Response.ok) {
          const errorInfo = await mapOpenRouterError(stage1Response);
          logger.error('Stage 1 (refinement) API Error:', {
            status: stage1Response.status,
            details: errorInfo.details,
          });
          refinedPrompt = userPrompt;
        } else {
          const stage1Data = (await stage1Response.json()) as ChatCompletionResponse;
          const refined = extractMessageText(stage1Data.choices?.[0]?.message?.content);
          if (refined) {
            refinedPrompt = refined;
            logger.info('Stage 1 refinement completed:', {
              refinedPrompt: `${refinedPrompt.substring(0, 100)}...`,
            });
          } else {
            logger.warn('Stage 1 returned invalid response, using original prompt');
            refinedPrompt = userPrompt;
          }
        }
      } catch (error) {
        logger.error('Stage 1 (refinement) failed:', error);
        refinedPrompt = userPrompt;
      }
    }

    // === 5. Select System Prompt and Response Format ===
    const promptMode = getPromptMode({ isJsonMode, isVideoPrompt, isTestMode });
    const finalSystemPrompt = SYSTEM_PROMPTS[promptMode];

    const responseFormat: JsonSchemaResponseFormat = {
      type: 'json_schema',
      json_schema: isJsonMode ? JSON_MODE_SCHEMA : DEFAULT_PROMPT_SCHEMA,
    };

    const finalModel = OPENROUTER_MODELS.PRIMARY;
    const includeImage = Boolean(imageBase64 && !isMultiPrompt);

    const finalBody: OpenRouterRequestBody = {
      model: finalModel,
      messages: [
        { role: 'system', content: finalSystemPrompt },
        {
          role: 'user',
          content: buildUserContent(refinedPrompt, includeImage ? imageBase64 : null, imageMimeType),
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      usage: { include: true },
      response_format: responseFormat,
    };

    let openRouterResponse: Response;
    try {
      openRouterResponse = await makeOpenRouterCall({
        apiKey,
        body: finalBody,
        title: 'Prompt Generator',
      });
    } catch (error) {
      logger.error('OpenRouter API call failed:', error);
      return res.status(500).json({
        error: 'External service error',
        message: 'The AI service is currently unavailable. Please try again later.',
      });
    }

    if (!openRouterResponse.ok) {
      const errorInfo = await mapOpenRouterError(openRouterResponse);
      logger.error('OpenRouter API Error:', {
        status: openRouterResponse.status,
        details: errorInfo.details,
      });
      return sendOpenRouterError(res, errorInfo);
    }

    const data = (await openRouterResponse.json()) as ChatCompletionResponse;

    if (!data?.choices?.[0]?.message?.content) {
      logger.error('Invalid OpenRouter API response structure:', data);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'Received an invalid response from the AI service. Please try again.',
      });
    }

    let parsedPayload: StructuredPayload;
    try {
      parsedPayload = parseStructuredContent(data.choices[0].message?.content);
    } catch (parseError) {
      logger.error('Failed to parse structured response from OpenRouter:', parseError);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'The AI service returned a malformed response. Please try again.',
      });
    }

    let finalPrompt: string | JsonPromptPayload;
    try {
      finalPrompt = isJsonMode ? ensureJsonPrompt(parsedPayload) : ensureTextPrompt(parsedPayload);
    } catch (validationError) {
      logger.error('Structured response validation failed:', validationError);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'The AI service returned an invalid response. Please try again.',
      });
    }

    if (!isJsonMode && !finalPrompt) {
      return res.status(500).json({
        error: 'Empty response',
        message: 'The AI service returned an empty response. Please try again with different input.',
      });
    }

    return res.status(200).json({
      success: true,
      prompt: finalPrompt,
      usage: data.usage || null,
    });
  } catch (error: any) {
    logger.error('API Route Error:', error);

    if (error?.statusCode === 413 || error?.code === 'PAYLOAD_TOO_LARGE') {
      return res.status(413).json({
        error: 'Payload too large',
        message: 'JSON body exceeds 1MB limit.',
      });
    }

    if (error?.name === 'AbortError') {
      return res.status(504).json({
        error: 'Gateway timeout',
        message: 'The AI service took too long to respond. Please try again.',
      });
    }
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      return res.status(500).json({
        error: 'Network error',
        message: 'Unable to connect to the AI service. Please check your internet connection and try again.',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
};

export default handler;

export const config = {
  api: {
    bodyParser: false,
  },
};

