import React, { useEffect, useRef } from 'react';
import { CloseIcon } from './IconComponents';
import { trapFocus } from '../utils/focusTrap';

export interface HelpModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * Help modal with usage instructions.
 * Includes focus trap and keyboard navigation for accessibility.
 */
const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Focus trap for accessibility (WCAG 2.4.3)
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    return trapFocus(modalRef.current);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div ref={modalRef} className="modal-content font-mono">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-neural-border">
          <h3 id="help-modal-title" className="text-sm font-semibold uppercase tracking-widest text-neural-accent">
            {'// '}SYSTEM_HELP
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:text-neural-accent transition-colors text-neural-muted"
            aria-label="Close help"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="space-y-4 text-neural-muted text-sm leading-relaxed">
          <div className="p-3 border border-white/10 bg-black/30">
            <h4 className="font-semibold text-neural-white mb-2 text-xs uppercase tracking-wider">
              01 // PRIMARY_INPUT
            </h4>
            <p>Enter your creative concept in the text area. You can also upload an image without text.</p>
          </div>
          <div className="p-3 border border-white/10 bg-black/30">
            <h4 className="font-semibold text-neural-white mb-2 text-xs uppercase tracking-wider">02 // MODIFIERS</h4>
            <p>Provide style preferences, requirements, or context to refine the output.</p>
          </div>
          <div className="p-3 border border-white/10 bg-black/30">
            <h4 className="font-semibold text-neural-white mb-2 text-xs uppercase tracking-wider">
              03 // IMG_REFERENCE
            </h4>
            <p>
              <span className="text-neural-accent">IMAGE_ONLY:</span> Upload to recreate closely.
            </p>
            <p>
              <span className="text-neural-accent">IMAGE+TEXT:</span> Upload with idea to modify/enhance.
            </p>
          </div>
          <div className="p-3 border border-white/10 bg-black/30">
            <h4 className="font-semibold text-neural-white mb-2 text-xs uppercase tracking-wider">04 // EXECUTE</h4>
            <p>Click EXECUTE to generate your optimized prompt, then COPY to clipboard.</p>
          </div>
          <div className="p-4 border border-neural-accent/30 bg-neural-accent/5">
            <h4 className="font-semibold text-neural-accent mb-2 text-xs uppercase tracking-wider">HOTKEY_BINDING</h4>
            <p>
              Press{' '}
              <kbd className="px-2 py-1 bg-black/50 border border-white/20 text-neural-white">Ctrl + Enter</kbd> or{' '}
              <kbd className="px-2 py-1 bg-black/50 border border-white/20 text-neural-white">Cmd + Enter</kbd> to
              execute.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple export - lazy loading is handled by the parent component using next/dynamic
export default HelpModal;
