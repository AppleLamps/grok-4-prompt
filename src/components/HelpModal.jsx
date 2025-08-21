import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CloseIcon } from './IconComponents';

const HelpModal = ({ isOpen, onClose }) => {
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

  useEffect(() => {
    const handleEscape = (e) => {
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-premium-100">How to Use</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-premium-700 transition-colors" aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>
        <div className="space-y-4 text-premium-300 leading-relaxed">
          <div>
            <h4 className="font-semibold text-premium-100 mb-2">📝 Describe Your Idea</h4>
            <p>Enter your creative concept or vision in the text area. You can also just upload an image without text!</p>
          </div>
          <div>
            <h4 className="font-semibold text-premium-100 mb-2">🎯 Add Directions (Optional)</h4>
            <p>Provide specific requirements, style preferences, or any other context to refine the prompt.</p>
          </div>
          <div>
            <h4 className="font-semibold text-premium-100 mb-2">🖼️ Upload Image (Optional)</h4>
            <p><strong>Image Only:</strong> Upload an image to recreate it as closely as possible.</p>
            <p><strong>Image + Text:</strong> Upload an image with your idea/directions to modify or enhance it.</p>
          </div>
          <div>
            <h4 className="font-semibold text-premium-100 mb-2">✨ Generate &amp; Copy</h4>
            <p>Click &quot;Generate Prompt&quot; to create your optimized prompt, then use the copy button to grab it.</p>
          </div>
          <div className="bg-premium-800/50 rounded-lg p-4 border border-premium-700">
            <h4 className="font-semibold text-premium-100 mb-2">⌨️ Keyboard Shortcut</h4>
            <p>Press <kbd>Ctrl + Enter</kbd> (or <kbd>Cmd + Enter</kbd> on Mac) to generate your prompt quickly!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export with dynamic import for lazy loading
export default dynamic(() => Promise.resolve(HelpModal), {
  ssr: false,
  loading: () => null
});
