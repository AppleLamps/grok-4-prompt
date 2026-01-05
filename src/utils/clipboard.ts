/**
 * Clipboard utilities with fallback for older browsers.
 * Provides user-friendly error handling and feedback.
 */

import logger from './logger';

/**
 * Result of a clipboard operation.
 */
export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/**
 * Copies text to clipboard with fallback for older browsers.
 * Uses the modern Clipboard API when available, with execCommand fallback.
 *
 * @param text - The text to copy to clipboard
 * @returns Result indicating success or failure with optional error message
 */
export const copyToClipboard = async (text: string): Promise<ClipboardResult> => {
  // First, try the modern Clipboard API
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (err) {
      logger.warn('Clipboard API failed, trying fallback:', err);
      // Fall through to fallback method
    }
  }

  // Fallback: Use execCommand with a temporary textarea
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // Prevent scrolling to bottom of page on iOS
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // For iOS Safari
    textarea.setSelectionRange(0, textarea.value.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (successful) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Failed to copy to clipboard. Please select and copy manually.',
    };
  } catch (err) {
    logger.error('Clipboard fallback failed:', err);
    return {
      success: false,
      error: 'Unable to access clipboard. Please copy the text manually.',
    };
  }
};

/**
 * Reads text from clipboard.
 * Note: This requires user permission and may not work in all contexts.
 *
 * @returns The clipboard text content, or null if unavailable
 */
export const readFromClipboard = async (): Promise<string | null> => {
  if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
    logger.warn('Clipboard read not supported in this browser');
    return null;
  }

  try {
    return await navigator.clipboard.readText();
  } catch (err) {
    logger.warn('Failed to read clipboard:', err);
    return null;
  }
};

export default copyToClipboard;
