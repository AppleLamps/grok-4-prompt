import { useCallback, useEffect, useRef, useState } from 'react';
import logger from '../utils/logger';
import { HISTORY_CONFIG } from '../config/constants';

const { STORAGE_KEY, MAX_ENTRIES } = HISTORY_CONFIG;

/**
 * Represents a single history entry.
 */
export interface HistoryEntry {
  /** Unique identifier for the entry */
  id: string;
  /** Unix timestamp when the entry was created */
  timestamp: number;
  /** The original idea/concept input */
  idea: string;
  /** Style directions/modifiers */
  directions: string;
  /** The generated prompt output */
  prompt: string;
  /** Whether this entry is marked as favorite */
  fav: boolean;
}

/**
 * Input for creating a new history entry.
 */
export interface NewEntryInput {
  idea?: string;
  directions?: string;
  prompt?: string;
}

/**
 * Return type for the useHistory hook.
 */
export interface UseHistoryReturn {
  /** Array of history entries */
  history: HistoryEntry[];
  /** Add a new entry to history */
  addEntry: (input: NewEntryInput) => void;
  /** Toggle favorite status for an entry */
  toggleFavorite: (id: string) => void;
  /** Delete an entry from history */
  deleteEntry: (id: string) => void;
  /** Clear all history entries */
  clearHistory: () => void;
}

/**
 * Generates a unique ID for history entries.
 * Uses crypto.randomUUID when available, with a fallback for older browsers.
 */
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random string for older browsers
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Custom hook for managing prompt generation history with localStorage persistence.
 */
export default function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const isClientRef = useRef(false);

  // Load history from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    isClientRef.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) setHistory(saved as HistoryEntry[]);
    } catch (error) {
      logger.warn('Failed to load history from storage', error);
    }
  }, []);

  // Persist history to localStorage on changes
  useEffect(() => {
    if (!isClientRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      logger.warn('Failed to persist history to storage', error);
    }
  }, [history]);

  const addEntry = useCallback(({ idea = '', directions = '', prompt = '' }: NewEntryInput) => {
    setHistory((h) => [
      {
        id: generateId(),
        timestamp: Date.now(),
        idea,
        directions,
        prompt,
        fav: false,
      },
      ...h,
    ].slice(0, MAX_ENTRIES));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setHistory((h) => h.map((e) => (e.id === id ? { ...e, fav: !e.fav } : e)));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory((h) => h.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return {
    history,
    addEntry,
    toggleFavorite,
    deleteEntry,
    clearHistory,
  };
}
