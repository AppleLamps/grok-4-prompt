/**
 * Centralized configuration constants for the application.
 * This file consolidates all magic numbers and configuration values
 * to improve maintainability and make adjustments easier.
 */

// ============================================================================
// History Configuration
// ============================================================================

export const HISTORY_CONFIG = {
  /** Maximum number of history entries to store */
  MAX_ENTRIES: 50,
  /** LocalStorage key for history data */
  STORAGE_KEY: 'pg_history',
} as const;

// ============================================================================
// Input Limits
// ============================================================================

export const INPUT_LIMITS = {
  /** Maximum character length for the main idea/concept input */
  IDEA_MAX_LENGTH: 1000,
  /** Maximum character length for the directions/modifiers input */
  DIRECTIONS_MAX_LENGTH: 500,
  /** Maximum file size for image uploads (in bytes) - 10MB */
  IMAGE_MAX_SIZE: 10 * 1024 * 1024,
  /** Target size for image compression (in bytes) - 1.5MB */
  IMAGE_TARGET_SIZE: 1.5 * 1024 * 1024,
  /** Maximum dimension for compressed images (in pixels) */
  IMAGE_MAX_DIMENSION: 2000,
  /** Initial quality for image compression (0-1) */
  IMAGE_INITIAL_QUALITY: 0.8,
  /** Size threshold below which compression is skipped (in bytes) - 500KB */
  IMAGE_COMPRESSION_THRESHOLD: 500 * 1024,
} as const;

// ============================================================================
// API Configuration
// ============================================================================

export const API_CONFIG = {
  /** Rate limit: maximum requests allowed per window */
  RATE_LIMIT_POINTS: 5,
  /** Rate limit: time window in seconds */
  RATE_LIMIT_DURATION: 60,
  /** API request timeout in milliseconds */
  REQUEST_TIMEOUT: 20000,
  /** Maximum retries for transient failures */
  MAX_RETRIES: 3,
  /** Base delay for exponential backoff in milliseconds */
  RETRY_BASE_DELAY: 1000,
  /** Maximum body size for JSON requests (in bytes) - 1MB */
  MAX_JSON_BODY_SIZE: 1024 * 1024,
} as const;

// ============================================================================
// Copy Target Types
// ============================================================================

export const COPY_TARGETS = {
  DEFAULT: 'default',
  JSON: 'json',
  SCENE: 'scene',
  NONE: '',
} as const;

export type CopyTarget = typeof COPY_TARGETS[keyof typeof COPY_TARGETS];

// ============================================================================
// Prompt Generation Modes
// ============================================================================

export const PROMPT_MODES = {
  DEFAULT: 'default',
  JSON: 'json',
  VIDEO: 'video',
  TEST: 'test',
} as const;

export type PromptMode = typeof PROMPT_MODES[keyof typeof PROMPT_MODES];

// ============================================================================
// UI Configuration
// ============================================================================

export const UI_CONFIG = {
  /** Duration to show "copied" feedback in milliseconds */
  COPY_FEEDBACK_DURATION: 2000,
  /** Debounce delay for character count updates in milliseconds */
  CHARACTER_COUNT_DEBOUNCE: 100,
} as const;

// ============================================================================
// OpenRouter Models
// ============================================================================

export const OPENROUTER_MODELS = {
  /** Primary model for prompt generation */
  PRIMARY: 'x-ai/grok-4.1-fast',
  /** Model for prompt refinement stage */
  REFINEMENT: 'google/gemini-2.5-flash-lite-preview-06-17',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  RATE_LIMITED: 'You have made too many requests. Please wait 60 seconds before trying again.',
  TIMEOUT: 'The request took too long. Try with a simpler prompt or smaller image.',
  NETWORK: 'Network error. Please check your internet connection and try again.',
  SERVER: 'Our servers are experiencing issues. Please try again in a few minutes.',
  IMAGE: 'There was a problem with your image. Try a different image or remove it.',
  INPUT_TOO_LONG: 'Input exceeds maximum length. Please shorten your text.',
  GENERIC: 'Something went wrong. Please try again or refresh the page.',
  CLIPBOARD_FAILED: 'Failed to copy to clipboard. Try selecting and copying manually.',
} as const;
