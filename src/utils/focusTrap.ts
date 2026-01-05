/**
 * Focus trap utilities for modal accessibility (WCAG 2.4.3).
 * Provides focus management to keep keyboard navigation within modal dialogs.
 */

/**
 * Selector for all focusable elements within a container.
 */
export const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Gets all focusable elements within a container.
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(elements).filter(
    (el) => el.offsetParent !== null // Only visible elements
  );
};

/**
 * Traps focus within a container element.
 * Returns a cleanup function to remove the trap.
 *
 * @param container - The container element to trap focus within
 * @param options - Configuration options
 * @returns Cleanup function to remove the focus trap
 */
export const trapFocus = (
  container: HTMLElement,
  options: {
    /** Element to restore focus to when trap is removed */
    returnFocusTo?: HTMLElement | null;
    /** Whether to focus the first element when trap is activated */
    autoFocus?: boolean;
  } = {}
): (() => void) => {
  const { returnFocusTo = document.activeElement as HTMLElement, autoFocus = true } = options;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: going backwards
      if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: going forwards
      if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  // Add event listener
  document.addEventListener('keydown', handleKeyDown, true);

  // Auto-focus first element if enabled
  if (autoFocus) {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      // Use requestAnimationFrame to ensure the modal is rendered
      requestAnimationFrame(() => {
        focusableElements[0].focus();
      });
    } else {
      // If no focusable elements, focus the container itself
      container.setAttribute('tabindex', '-1');
      container.focus();
    }
  }

  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);

    // Restore focus to the element that was focused before the trap
    if (returnFocusTo && typeof returnFocusTo.focus === 'function') {
      requestAnimationFrame(() => {
        returnFocusTo.focus();
      });
    }
  };
};

/**
 * React hook for focus trap management.
 * Should be called in a useEffect to manage focus trap lifecycle.
 *
 * Example usage:
 * ```tsx
 * useEffect(() => {
 *   if (!isOpen || !modalRef.current) return;
 *   return trapFocus(modalRef.current);
 * }, [isOpen]);
 * ```
 */
export default trapFocus;
