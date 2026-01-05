import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CloseIcon, StarIcon, StarSolidIcon, CopyIcon, TrashIcon } from './IconComponents';

const HistoryModal = ({ isOpen, onClose, entries, onToggleFav, onLoad, onCopy, onDelete, onClear }) => {
  useEffect(() => {
    const handleEscape = (e) => e.key === 'Escape' && onClose();
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sorted = [...entries].sort((a, b) => Number(b.fav) - Number(a.fav) || b.id - a.id);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-3xl w-full font-mono">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(245,158,11,0.2)]">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[#F59E0B]">{'// '}HISTORY_LOG</h3>
          <div className="flex gap-2">
            {!!entries.length && (
              <button onClick={onClear} className="px-3 py-2 text-xs uppercase tracking-wider border border-[rgba(255,255,255,0.1)] hover:border-red-500/50 text-[#9CA3AF] hover:text-red-400 transition-colors">PURGE_ALL</button>
            )}
            <button onClick={onClose} className="p-2 hover:text-[#F59E0B] transition-colors text-[#9CA3AF]" aria-label="Close history">
              <CloseIcon />
            </button>
          </div>
        </div>
        {!sorted.length ? (
          <p className="text-[#6B7280] text-sm">NO_ENTRIES_FOUND. Generate a prompt to populate history.</p>
        ) : (
          <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
            {sorted.map((item) => (
              <div key={item.id} className="bg-black/30 border border-[rgba(255,255,255,0.1)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-[#6B7280] uppercase tracking-wider">
                    TIMESTAMP: {new Date(item.id).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onToggleFav(item.id)} className={`w-8 h-8 flex items-center justify-center border transition-colors ${item.fav ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0a0a0a]' : 'border-[rgba(255,255,255,0.1)] text-[#9CA3AF] hover:border-[#F59E0B] hover:text-[#F59E0B]'}`} aria-label="Toggle favorite">
                      {item.fav ? <StarSolidIcon /> : <StarIcon />}
                    </button>
                    <button onClick={() => onLoad(item)} className="w-8 h-8 flex items-center justify-center border border-[rgba(255,255,255,0.1)] text-[#9CA3AF] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors" aria-label="Load into editor">↺</button>
                    <button onClick={() => onCopy(item.prompt)} className="w-8 h-8 flex items-center justify-center border border-[rgba(255,255,255,0.1)] text-[#9CA3AF] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors" aria-label="Copy prompt"><CopyIcon /></button>
                    <button onClick={() => onDelete(item.id)} className="w-8 h-8 flex items-center justify-center border border-red-600/50 text-red-400 hover:bg-red-600/20 transition-colors" aria-label="Delete"><TrashIcon /></button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-1">
                    <div className="text-[#F59E0B] mb-1 uppercase tracking-wider">INPUT_DATA</div>
                    <div className="text-[#E5E7EB] whitespace-pre-wrap line-clamp-4">{item.idea || '—'}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-[#F59E0B] mb-1 uppercase tracking-wider">MODIFIERS</div>
                    <div className="text-[#E5E7EB] whitespace-pre-wrap line-clamp-4">{item.directions || '—'}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-[#F59E0B] mb-1 uppercase tracking-wider">OUTPUT</div>
                    <div className="text-[#E5E7EB] whitespace-pre-wrap line-clamp-4">{item.prompt}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Export with dynamic import for lazy loading
export default dynamic(() => Promise.resolve(HistoryModal), {
  ssr: false,
  loading: () => null
});
