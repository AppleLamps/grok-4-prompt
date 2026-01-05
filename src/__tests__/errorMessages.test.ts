import {
  getErrorMessage,
  isAbortError,
  isRateLimitError,
  isNetworkError,
} from '../utils/errorMessages';
import { ERROR_MESSAGES } from '../config/constants';

describe('getErrorMessage', () => {
  it('should return rate limit message for 429 errors', () => {
    expect(getErrorMessage(new Error('Error 429: Too many requests'))).toBe(ERROR_MESSAGES.RATE_LIMITED);
    expect(getErrorMessage('rate limit exceeded')).toBe(ERROR_MESSAGES.RATE_LIMITED);
    expect(getErrorMessage({ message: 'too many requests' })).toBe(ERROR_MESSAGES.RATE_LIMITED);
  });

  it('should return timeout message for timeout errors', () => {
    expect(getErrorMessage(new Error('Request timeout'))).toBe(ERROR_MESSAGES.TIMEOUT);
    expect(getErrorMessage('timed out')).toBe(ERROR_MESSAGES.TIMEOUT);
    expect(getErrorMessage(new Error('AbortError: The operation was aborted'))).toBe(ERROR_MESSAGES.TIMEOUT);
  });

  it('should return network message for network errors', () => {
    expect(getErrorMessage(new Error('network error'))).toBe(ERROR_MESSAGES.NETWORK);
    expect(getErrorMessage('Failed to fetch')).toBe(ERROR_MESSAGES.NETWORK);
  });

  it('should return server message for 5xx errors', () => {
    expect(getErrorMessage(new Error('500 Internal Server Error'))).toBe(ERROR_MESSAGES.SERVER);
    expect(getErrorMessage('502 Bad Gateway')).toBe(ERROR_MESSAGES.SERVER);
    expect(getErrorMessage(new Error('503 Service Unavailable'))).toBe(ERROR_MESSAGES.SERVER);
  });

  it('should return image message for image-related errors', () => {
    expect(getErrorMessage(new Error('Image upload failed'))).toBe(ERROR_MESSAGES.IMAGE);
    expect(getErrorMessage('file too large')).toBe(ERROR_MESSAGES.IMAGE);
  });

  it('should return input too long message for length errors', () => {
    expect(getErrorMessage(new Error('Input exceeds limit'))).toBe(ERROR_MESSAGES.INPUT_TOO_LONG);
    expect(getErrorMessage('text too long')).toBe(ERROR_MESSAGES.INPUT_TOO_LONG);
  });

  it('should return clipboard message for clipboard errors', () => {
    expect(getErrorMessage(new Error('Clipboard access denied'))).toBe(ERROR_MESSAGES.CLIPBOARD_FAILED);
    expect(getErrorMessage('copy failed')).toBe(ERROR_MESSAGES.CLIPBOARD_FAILED);
  });

  it('should return generic message for unknown errors', () => {
    expect(getErrorMessage(new Error('Something weird happened'))).toBe(ERROR_MESSAGES.GENERIC);
    expect(getErrorMessage('unknown error')).toBe(ERROR_MESSAGES.GENERIC);
  });

  it('should handle object with error property', () => {
    expect(getErrorMessage({ error: 'rate limit' })).toBe(ERROR_MESSAGES.RATE_LIMITED);
  });

  it('should return generic for null/undefined', () => {
    expect(getErrorMessage(null)).toBe(ERROR_MESSAGES.GENERIC);
    expect(getErrorMessage(undefined)).toBe(ERROR_MESSAGES.GENERIC);
  });
});

describe('isAbortError', () => {
  it('should return true for AbortError', () => {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    expect(isAbortError(error)).toBe(true);
  });

  it('should return false for other errors', () => {
    expect(isAbortError(new Error('Regular error'))).toBe(false);
  });

  it('should return false for non-Error values', () => {
    expect(isAbortError('string')).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe('isRateLimitError', () => {
  it('should return true for rate limit errors', () => {
    expect(isRateLimitError(new Error('429 too many requests'))).toBe(true);
  });

  it('should return false for other errors', () => {
    expect(isRateLimitError(new Error('500 server error'))).toBe(false);
  });
});

describe('isNetworkError', () => {
  it('should return true for network errors', () => {
    expect(isNetworkError(new Error('network error'))).toBe(true);
  });

  it('should return false for other errors', () => {
    expect(isNetworkError(new Error('timeout'))).toBe(false);
  });
});
