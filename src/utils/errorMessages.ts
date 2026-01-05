/**
 * User-friendly error message utilities.
 * Provides specific, actionable error messages based on error types.
 */

import { ERROR_MESSAGES } from '../config/constants';

/**
 * Error keywords and their corresponding user-friendly messages.
 * Order matters - more specific checks should come first.
 */
const ERROR_PATTERNS: Array<{ keywords: string[]; message: string }> = [
  {
    keywords: ['429', 'rate limit', 'too many'],
    message: ERROR_MESSAGES.RATE_LIMITED,
  },
  {
    keywords: ['timeout', 'abort', 'timed out'],
    message: ERROR_MESSAGES.TIMEOUT,
  },
  {
    keywords: ['network', 'fetch failed', 'failed to fetch', 'network error'],
    message: ERROR_MESSAGES.NETWORK,
  },
  {
    keywords: ['500', '502', '503', '504', 'server error', 'internal server'],
    message: ERROR_MESSAGES.SERVER,
  },
  {
    keywords: ['image', 'upload', 'file'],
    message: ERROR_MESSAGES.IMAGE,
  },
  {
    keywords: ['too long', 'exceeds', 'limit', 'length'],
    message: ERROR_MESSAGES.INPUT_TOO_LONG,
  },
  {
    keywords: ['clipboard', 'copy'],
    message: ERROR_MESSAGES.CLIPBOARD_FAILED,
  },
];

/**
 * Converts an error into a user-friendly message.
 * Analyzes the error message content to provide specific, actionable feedback.
 *
 * @param error - The error object or string to convert
 * @returns A user-friendly error message string
 */
export const getErrorMessage = (error: unknown): string => {
  // Extract the error message string
  let errorText = '';

  if (error instanceof Error) {
    errorText = error.message.toLowerCase();
  } else if (typeof error === 'string') {
    errorText = error.toLowerCase();
  } else if (error && typeof error === 'object') {
    const errorObj = error as { message?: string; error?: string };
    errorText = (errorObj.message || errorObj.error || '').toLowerCase();
  }

  // Check against known patterns
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.keywords.some((keyword) => errorText.includes(keyword))) {
      return pattern.message;
    }
  }

  // Fallback to generic message
  return ERROR_MESSAGES.GENERIC;
};

/**
 * Checks if an error is an abort/cancellation error (user cancelled the request).
 * These should typically be handled silently.
 */
export const isAbortError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.name === 'AbortError';
  }
  return false;
};

/**
 * Checks if an error is a rate limit error.
 */
export const isRateLimitError = (error: unknown): boolean => {
  const message = getErrorMessage(error);
  return message === ERROR_MESSAGES.RATE_LIMITED;
};

/**
 * Checks if an error is a network/connectivity error.
 */
export const isNetworkError = (error: unknown): boolean => {
  const message = getErrorMessage(error);
  return message === ERROR_MESSAGES.NETWORK;
};
