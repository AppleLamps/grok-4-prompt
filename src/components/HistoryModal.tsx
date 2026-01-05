import React, { useEffect, useMemo, useRef } from 'react';
import { CloseIcon, StarIcon, StarSolidIcon, CopyIcon, TrashIcon } from './IconComponents';
import { trapFocus } from '../utils/focusTrap';
import type { HistoryEntry } from '../hooks/useHistory';

export interface HistoryModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Array of history entries */
  entries: HistoryEntry[];
  /** Toggle favorite status for an entry */
  onToggleFav: (id: string) => void;
  /** Load an entry into the editor */
  onLoad: (entry: HistoryEntry) => void;
  /** Copy prompt text to clipboard */
  onCopy: (text: string) => void;
  /** Delete an entry */
  onDelete: (id: string) => void;
  /** Clear all entries */
  onClear: () => void;
}

/**
 * History modal displaying past prompts with favorites and actions.
 * Includes focus trap and keyboard navigation for accessibility.
 */
const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  entries,
  onToggleFav,
  onLoad,
  onCopy,
  onDelete,
  onClear,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap for accessibility (WCAG 2.4.3)
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    return trapFocus(modalRef.current);
  }, [isOpen]);

  // Memoize sorted entries to avoid re-sorting on every render
  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      // Sort by favorite status first, then by timestamp
      const favDiff = Number(b.fav) - Number(a.fav);
      if (favDiff !== 0) return favDiff;
      return b.timestamp - a.timestamp;
    });
  }, [entries]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div ref={modalRef} className="modal-content max-w-3xl w-full font-mono">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-neural-border">
          <h3 id="history-modal-title" className="text-sm font-semibold uppercase tracking-widest text-neural-accent">
            {'// '}HISTORY_LOG
          </h3>
          <div className="flex gap-2">
            {!!entries.length && (
              <button
                onClick={onClear}
                className="px-3 py-2 text-xs uppercase tracking-wider border border-white/10 hover:border-red-500/50 text-neural-muted hover:text-red-400 transition-colors"
              >
                PURGE_ALL
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:text-neural-accent transition-colors text-neural-muted"
              aria-label="Close history"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
        {!sorted.length ? (
          <p className="text-neural-dim text-sm">NO_ENTRIES_FOUND. Generate a prompt to populate history.</p>
        ) : (
          <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
            {sorted.map((item) => (
              <div key={item.id} className="bg-black/30 border border-white/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-neural-dim uppercase tracking-wider">
                    TIMESTAMP: {new Date(item.timestamp).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleFav(item.id)}
                      className={`w-8 h-8 flex items-center justify-center border transition-colors ${
                        item.fav
                          ? 'bg-neural-accent border-neural-accent text-neural-bg'
                          : 'border-white/10 text-neural-muted hover:border-neural-accent hover:text-neural-accent'
                      }`}
                      aria-label={item.fav ? 'Remove from favorites' : 'Add to favorites'}
                      aria-pressed={item.fav}
                    >
                      {item.fav ? <StarSolidIcon /> : <StarIcon />}
                    </button>
                    <button
                      onClick={() => onLoad(item)}
                      className="w-8 h-8 flex items-center justify-center border border-white/10 text-neural-muted hover:border-neural-accent hover:text-neural-accent transition-colors"
                      aria-label="Load into editor"
                    >
                      ↺
                    </button>
                    <button
                      onClick={() => onCopy(item.prompt)}
                      className="w-8 h-8 flex items-center justify-center border border-white/10 text-neural-muted hover:border-neural-accent hover:text-neural-accent transition-colors"
                      aria-label="Copy prompt"
                    >
                      <CopyIcon />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="w-8 h-8 flex items-center justify-center border border-red-600/50 text-red-400 hover:bg-red-600/20 transition-colors"
                      aria-label="Delete entry"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-1">
                    <div className="text-neural-accent mb-1 uppercase tracking-wider">INPUT_DATA</div>
                    <div className="text-neural-white whitespace-pre-wrap line-clamp-4">{item.idea || '—'}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-neural-accent mb-1 uppercase tracking-wider">MODIFIERS</div>
                    <div className="text-neural-white whitespace-pre-wrap line-clamp-4">{item.directions || '—'}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-neural-accent mb-1 uppercase tracking-wider">OUTPUT</div>
                    <div className="text-neural-white whitespace-pre-wrap line-clamp-4">{item.prompt}</div>
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

// Simple export - lazy loading is handled by the parent component using next/dynamic
export default HistoryModal;
