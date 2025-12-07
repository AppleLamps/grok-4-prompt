import { useCallback, useEffect, useRef, useState } from 'react';
import logger from '../utils/logger';

const joinDirectionsWithStyles = (directions, activeStyles, stylePresets) => {
  const base = (directions || '').trim();
  const styleText = Array.from(activeStyles || [])
    .map((name) => stylePresets?.[name])
    .filter(Boolean)
    .join(', ');

  if (base && styleText) return `${base}, ${styleText}`;
  return base || styleText || '';
};

export default function usePromptGenerator({
  idea,
  directions,
  uploadedImage,
  isJsonMode,
  isTestMode,
  isVideoPrompt,
  activeStyles,
  stylePresets,
  addHistoryEntry,
}) {
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const generateAbortRef = useRef(null);

  const buildDirections = useCallback(() => {
    return joinDirectionsWithStyles(directions, activeStyles, stylePresets);
  }, [directions, activeStyles, stylePresets]);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const ideaText = (idea || '').trim();
      if (!ideaText && !uploadedImage) {
        setError('Please describe your idea or upload an image.');
        return;
      }

      if (generateAbortRef.current) {
        generateAbortRef.current.abort();
        generateAbortRef.current = null;
      }
      const controller = new AbortController();
      generateAbortRef.current = controller;

      setIsLoading(true);
      setError('');
      setShowOutput(false);

      const combinedDirections = buildDirections();

      try {
        let response;
        if (uploadedImage) {
          const formData = new FormData();
          formData.append('idea', ideaText);
          if (combinedDirections) {
            formData.append('directions', combinedDirections);
          }
          formData.append('image', uploadedImage);
          formData.append('isJsonMode', String(isJsonMode));
          formData.append('isTestMode', String(isTestMode));
          formData.append('isVideoPrompt', String(isVideoPrompt));
          response = await fetch('/api/generate', { method: 'POST', body: formData, signal: controller.signal });
        } else {
          response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              idea: ideaText,
              directions: combinedDirections || undefined,
              isJsonMode,
              isTestMode,
              isVideoPrompt,
            }),
          });
        }

        const ct = response.headers.get('content-type') || '';
        let data;
        if (ct.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          if (!response.ok) throw new Error(text || 'Failed to generate prompt');
          data = { prompt: text };
        }
        if (!response.ok) {
          throw new Error(data?.message || 'Failed to generate prompt');
        }

        const displayPrompt = isJsonMode ? JSON.stringify(data.prompt, null, 2) : (data.prompt || '').toString();

        setGeneratedPrompt(displayPrompt);
        setShowOutput(true);

        if (addHistoryEntry) {
          await addHistoryEntry({
            idea: ideaText,
            directions: combinedDirections,
            prompt: displayPrompt,
          });
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        logger.error('Generation error:', err);
        let errorMessage = 'An unexpected error occurred.';
        if (err.message?.includes('429')) {
          errorMessage = 'Too many requests. Please wait a minute.';
        } else if (err.message?.includes('500')) {
          errorMessage = 'Server error. Try again later.';
        }
        setError(errorMessage);
        setShowOutput(true);
      } finally {
        setIsLoading(false);
        if (generateAbortRef.current === controller) generateAbortRef.current = null;
      }
    },
    [idea, uploadedImage, isJsonMode, isTestMode, isVideoPrompt, buildDirections, addHistoryEntry]
  );

  useEffect(() => {
    return () => {
      if (generateAbortRef.current) {
        generateAbortRef.current.abort();
        generateAbortRef.current = null;
      }
    };
  }, []);

  return {
    generatedPrompt,
    setGeneratedPrompt,
    showOutput,
    setShowOutput,
    isLoading,
    error,
    setError,
    handleSubmit,
  };
}

