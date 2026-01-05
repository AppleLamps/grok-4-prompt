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
      <div className="modal-content font-mono">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[rgba(245,158,11,0.2)]">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[#F59E0B]">{'// '}SYSTEM_HELP</h3>
          <button onClick={onClose} className="p-2 hover:text-[#F59E0B] transition-colors text-[#9CA3AF]" aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>
        <div className="space-y-4 text-[#9CA3AF] text-sm leading-relaxed">
          <div className="p-3 border border-[rgba(255,255,255,0.1)] bg-black/30">
            <h4 className="font-semibold text-[#E5E7EB] mb-2 text-xs uppercase tracking-wider">01 // PRIMARY_INPUT</h4>
            <p>Enter your creative concept in the text area. You can also upload an image without text.</p>
          </div>
          <div className="p-3 border border-[rgba(255,255,255,0.1)] bg-black/30">
            <h4 className="font-semibold text-[#E5E7EB] mb-2 text-xs uppercase tracking-wider">02 // MODIFIERS</h4>
            <p>Provide style preferences, requirements, or context to refine the output.</p>
          </div>
          <div className="p-3 border border-[rgba(255,255,255,0.1)] bg-black/30">
            <h4 className="font-semibold text-[#E5E7EB] mb-2 text-xs uppercase tracking-wider">03 // IMG_REFERENCE</h4>
            <p><span className="text-[#F59E0B]">IMAGE_ONLY:</span> Upload to recreate closely.</p>
            <p><span className="text-[#F59E0B]">IMAGE+TEXT:</span> Upload with idea to modify/enhance.</p>
          </div>
          <div className="p-3 border border-[rgba(255,255,255,0.1)] bg-black/30">
            <h4 className="font-semibold text-[#E5E7EB] mb-2 text-xs uppercase tracking-wider">04 // EXECUTE</h4>
            <p>Click EXECUTE to generate your optimized prompt, then COPY to clipboard.</p>
          </div>
          <div className="p-4 border border-[#F59E0B]/30 bg-[#F59E0B]/5">
            <h4 className="font-semibold text-[#F59E0B] mb-2 text-xs uppercase tracking-wider">HOTKEY_BINDING</h4>
            <p>Press <kbd className="px-2 py-1 bg-black/50 border border-[rgba(255,255,255,0.2)] text-[#E5E7EB]">Ctrl + Enter</kbd> or <kbd className="px-2 py-1 bg-black/50 border border-[rgba(255,255,255,0.2)] text-[#E5E7EB]">Cmd + Enter</kbd> to execute.</p>
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
