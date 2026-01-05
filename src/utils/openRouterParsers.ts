/**
 * Shared utilities for parsing OpenRouter API responses.
 * Extracted to avoid code duplication between generate.ts and surprise.ts
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface PromptTextPayload {
  prompt: string;
}

export interface JsonPromptSubject {
  description: string;
  position: string;
  action: string;
  color_palette: string[];
}

export interface JsonPromptCamera {
  angle: string;
  lens: string;
  'f-number': string;
  ISO: number;
  depth_of_field: string;
}

export interface JsonPromptPayload {
  scene: string;
  subjects: JsonPromptSubject[];
  style: string;
  color_palette: string[];
  lighting: string;
  mood: string;
  background: string;
  composition: string;
  camera: JsonPromptCamera;
}

export type StructuredPayload = PromptTextPayload | JsonPromptPayload;

export interface ChatCompletionChoice {
  message?: { content?: unknown };
}

export interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
  usage?: unknown;
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Extracts text content from various OpenRouter response formats.
 * Handles string content, array content (multi-part messages), and object content.
 */
export const extractMessageText = (content: unknown): string => {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        const textPart = part as { text?: unknown };
        return typeof textPart?.text === 'string' ? textPart.text : '';
      })
      .join('')
      .trim();
  }

  if (content && typeof content === 'object') {
    const candidate = (content as { text?: unknown }).text;
    if (typeof candidate === 'string') return candidate;
    return JSON.stringify(content);
  }

  return '';
};

/**
 * Parses structured JSON content from an OpenRouter response.
 * @throws Error if the content is empty or not valid JSON
 */
export const parseStructuredContent = <T extends StructuredPayload>(content: unknown): T => {
  const raw = extractMessageText(content);
  if (!raw) {
    throw new Error('Empty AI response');
  }
  return JSON.parse(raw) as T;
};

/**
 * Validates and extracts a text prompt from a structured payload.
 * @throws Error if the payload doesn't contain a valid prompt string
 */
export const ensureTextPrompt = (payload: StructuredPayload): string => {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    typeof (payload as PromptTextPayload).prompt !== 'string'
  ) {
    throw new Error('Invalid structured prompt payload');
  }
  return (payload as PromptTextPayload).prompt.trim();
};

/**
 * Validates and extracts a JSON prompt payload.
 * @throws Error if the payload doesn't match the expected JSON structure
 */
export const ensureJsonPrompt = (payload: StructuredPayload): JsonPromptPayload => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid structured JSON payload');
  }

  const jsonPayload = payload as Partial<JsonPromptPayload>;

  if (
    typeof jsonPayload.scene !== 'string' ||
    !Array.isArray(jsonPayload.subjects) ||
    typeof jsonPayload.style !== 'string' ||
    !Array.isArray(jsonPayload.color_palette) ||
    typeof jsonPayload.lighting !== 'string' ||
    typeof jsonPayload.mood !== 'string' ||
    typeof jsonPayload.background !== 'string' ||
    typeof jsonPayload.composition !== 'string' ||
    !jsonPayload.camera
  ) {
    throw new Error('Invalid structured JSON payload');
  }

  return jsonPayload as JsonPromptPayload;
};

/**
 * Type guard to check if a payload is a text prompt
 */
export const isTextPrompt = (payload: StructuredPayload): payload is PromptTextPayload => {
  return typeof (payload as PromptTextPayload).prompt === 'string';
};

/**
 * Type guard to check if a payload is a JSON prompt
 */
export const isJsonPrompt = (payload: StructuredPayload): payload is JsonPromptPayload => {
  return typeof (payload as JsonPromptPayload).scene === 'string';
};
