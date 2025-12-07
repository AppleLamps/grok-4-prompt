import type { NextApiResponse } from 'next';

export type OpenRouterContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

export interface OpenRouterMessage {
  role: 'system' | 'user';
  content: OpenRouterContent;
}

export interface JsonSchemaObject {
  type: 'object';
  additionalProperties: boolean;
  properties: Record<string, unknown>;
  required: string[];
}

export interface JsonSchemaWrapper {
  name: string;
  schema: JsonSchemaObject;
  strict?: boolean;
}

export interface JsonSchemaResponseFormat {
  type: 'json_schema';
  json_schema: JsonSchemaWrapper;
}

export interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  usage?: { include: boolean };
  response_format?: JsonSchemaResponseFormat;
}

export interface OpenRouterCallOptions {
  apiKey: string;
  body: OpenRouterRequestBody;
  title?: string;
  abortMs?: number;
}

export interface OpenRouterErrorInfo {
  status: number;
  error: string;
  message: string;
  sourceStatus: number;
  details?: unknown;
}

const REFERER =
  process.env.VERCEL_URL && process.env.VERCEL_URL.trim().length > 0
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

/**
 * Shared OpenRouter API caller with a timeout guard.
 */
export async function makeOpenRouterCall({
  apiKey,
  body,
  title = 'Prompt Generator',
  abortMs = 20_000,
}: OpenRouterCallOptions): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), abortMs);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': REFERER,
        'X-Title': title,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Normalize OpenRouter errors to consistent client responses.
 */
export async function mapOpenRouterError(response: Response): Promise<OpenRouterErrorInfo> {
  const payload = await response.json().catch(() => undefined);
  if (response.status === 401) {
    return {
      status: 500,
      error: 'Authentication error',
      message: 'Invalid API credentials. Please contact the administrator.',
      sourceStatus: response.status,
      details: payload,
    };
  }

  if (response.status === 429) {
    return {
      status: 429,
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please wait a moment before trying again.',
      sourceStatus: response.status,
      details: payload,
    };
  }

  return {
    status: 500,
    error: 'External service error',
    message: 'The AI service is currently unavailable. Please try again later.',
    sourceStatus: response.status,
    details: payload,
  };
}

export function sendOpenRouterError(res: NextApiResponse, errorInfo: OpenRouterErrorInfo): void {
  res.status(errorInfo.status).json({
    error: errorInfo.error,
    message: errorInfo.message,
  });
}

