import type { NextApiResponse } from 'next';
import { API_CONFIG } from '../config/constants';
import logger from '../utils/logger';

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
  abortMs = API_CONFIG.REQUEST_TIMEOUT,
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
 * Checks if an error is retryable (transient server error or network issue).
 */
const isRetryableError = (response?: Response, error?: unknown): boolean => {
  // Network errors are retryable
  if (error && error instanceof Error && error.name !== 'AbortError') {
    return true;
  }
  // 5xx server errors are retryable
  if (response && response.status >= 500) {
    return true;
  }
  return false;
};

/**
 * OpenRouter API caller with exponential backoff retry for transient failures.
 * Will retry up to MAX_RETRIES times for 5xx errors and network failures.
 */
export async function makeOpenRouterCallWithRetry(
  options: OpenRouterCallOptions,
  maxRetries = API_CONFIG.MAX_RETRIES
): Promise<Response> {
  let lastError: Error | undefined;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await makeOpenRouterCall(options);

      // Success or non-retryable error (4xx) - return immediately
      if (response.ok || !isRetryableError(response)) {
        return response;
      }

      lastResponse = response;
      lastError = new Error(`Server error: ${response.status}`);
    } catch (err) {
      // Don't retry on user abort
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }

      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry on retryable errors
      if (!isRetryableError(undefined, err)) {
        throw err;
      }
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries - 1) {
      const delay = API_CONFIG.RETRY_BASE_DELAY * Math.pow(2, attempt);
      logger.info(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // If we have a response from the last attempt, return it
  if (lastResponse) {
    return lastResponse;
  }

  // Otherwise throw the last error
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Normalize OpenRouter errors to consistent client responses.
 * Details are logged server-side only and NOT included in client response.
 */
export async function mapOpenRouterError(response: Response): Promise<OpenRouterErrorInfo> {
  // Parse error details for server-side logging only
  const payload = await response.json().catch(() => undefined);

  // Log full error details server-side for debugging
  logger.error('OpenRouter API error details:', {
    status: response.status,
    statusText: response.statusText,
    payload,
  });

  if (response.status === 401) {
    return {
      status: 500,
      error: 'Authentication error',
      message: 'Invalid API credentials. Please contact the administrator.',
      sourceStatus: response.status,
      // Note: details intentionally omitted from client response for security
    };
  }

  if (response.status === 429) {
    return {
      status: 429,
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please wait a moment before trying again.',
      sourceStatus: response.status,
    };
  }

  return {
    status: 500,
    error: 'External service error',
    message: 'The AI service is currently unavailable. Please try again later.',
    sourceStatus: response.status,
  };
}

export function sendOpenRouterError(res: NextApiResponse, errorInfo: OpenRouterErrorInfo): void {
  res.status(errorInfo.status).json({
    error: errorInfo.error,
    message: errorInfo.message,
  });
}

