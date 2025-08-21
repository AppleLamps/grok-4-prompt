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
      <div className="modal-content max-w-3xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-premium-100">History</h3>
          <div className="flex gap-2">
            {!!entries.length && (
              <button onClick={onClear} className="px-3 py-2 text-sm rounded-lg bg-premium-800/60 border border-premium-700 hover:bg-premium-700/70 text-premium-300">Clear all</button>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-premium-700 transition-colors" aria-label="Close history">
              <CloseIcon />
            </button>
          </div>
        </div>
        {!sorted.length ? (
          <p className="text-premium-400">No history yet. Generate a prompt to see it here.</p>
        ) : (
          <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
            {sorted.map((item) => (
              <div key={item.id} className="bg-premium-900/60 border border-premium-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-premium-500">
                    {new Date(item.id).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onToggleFav(item.id)} className={`w-9 h-9 flex items-center justify-center rounded-lg border ${item.fav ? 'bg-amber-500/90 border-amber-400 text-white' : 'bg-premium-800/50 border-premium-700 text-premium-300'} hover:opacity-90`} aria-label="Toggle favorite">
                      {item.fav ? <StarSolidIcon /> : <StarIcon />}
                    </button>
                    <button onClick={() => onLoad(item)} className="w-9 h-9 flex items-center justify-center rounded-lg border bg-premium-800/50 border-premium-700 text-premium-300 hover:bg-premium-700/70" aria-label="Load into editor">↺</button>
                    <button onClick={() => onCopy(item.prompt)} className="w-9 h-9 flex items-center justify-center rounded-lg border bg-premium-800/50 border-premium-700 text-premium-300 hover:bg-premium-700/70" aria-label="Copy prompt"><CopyIcon /></button>
                    <button onClick={() => onDelete(item.id)} className="w-9 h-9 flex items-center justify-center rounded-lg border bg-red-500/20 border-red-600 text-red-200 hover:bg-red-500/30" aria-label="Delete"><TrashIcon /></button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="md:col-span-1">
                    <div className="text-premium-400 mb-1">Idea</div>
                    <div className="text-premium-200/90 whitespace-pre-wrap line-clamp-4">{item.idea || '—'}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-premium-400 mb-1">Directions</div>
                    <div className="text-premium-200/90 whitespace-pre-wrap line-clamp-4">{item.directions || '—'}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-premium-400 mb-1">Prompt</div>
                    <div className="text-premium-100 whitespace-pre-wrap line-clamp-4">{item.prompt}</div>
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
