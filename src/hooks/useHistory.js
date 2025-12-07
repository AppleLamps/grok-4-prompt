import { useCallback, useEffect, useRef, useState } from 'react';
import logger from '../utils/logger';

const HISTORY_KEY = 'pg_history';

export default function useHistory() {
  const [history, setHistory] = useState([]);
  const isClientRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    isClientRef.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (Array.isArray(saved)) setHistory(saved);
    } catch (error) {
      logger.warn('Failed to load history from storage', error);
    }
  }, []);

  useEffect(() => {
    if (!isClientRef.current) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      logger.warn('Failed to persist history to storage', error);
    }
  }, [history]);

  const addEntry = useCallback(async ({ idea = '', directions = '', prompt = '' }) => {
    setHistory((h) => [
      {
        id: Date.now(),
        idea,
        directions,
        prompt,
        fav: false,
      },
      ...h,
    ].slice(0, 50));
  }, []);

  const toggleFavorite = useCallback((id) => {
    setHistory((h) => h.map((e) => (e.id === id ? { ...e, fav: !e.fav } : e)));
  }, []);

  const deleteEntry = useCallback((id) => {
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

