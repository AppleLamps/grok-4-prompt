import { useCallback, useEffect, useRef, useState } from 'react';
import logger from '../utils/logger';
import { getErrorMessage, isAbortError } from '../utils/errorMessages';

/**
 * Style presets mapping from name to value.
 */
export type StylePresets = Record<string, string>;

/**
 * Configuration options for the prompt generator hook.
 */
export interface UsePromptGeneratorOptions {
  /** The main idea/concept input */
  idea: string;
  /** Style directions/modifiers */
  directions: string;
  /** Uploaded image file (optional) */
  uploadedImage: File | null;
  /** Whether to generate in JSON mode */
  isJsonMode: boolean;
  /** Whether in test/Elysian mode */
  isTestMode: boolean;
  /** Whether generating video prompts */
  isVideoPrompt: boolean;
  /** Set of active style preset names */
  activeStyles: Set<string>;
  /** Style presets configuration */
  stylePresets: StylePresets;
  /** Callback to add entry to history */
  addHistoryEntry?: (entry: { idea: string; directions: string; prompt: string }) => void;
}

/**
 * Return type for the usePromptGenerator hook.
 */
export interface UsePromptGeneratorReturn {
  /** The generated prompt text */
  generatedPrompt: string;
  /** Set the generated prompt */
  setGeneratedPrompt: React.Dispatch<React.SetStateAction<string>>;
  /** Whether to show the output section */
  showOutput: boolean;
  /** Set show output state */
  setShowOutput: React.Dispatch<React.SetStateAction<boolean>>;
  /** Whether a request is in progress */
  isLoading: boolean;
  /** Current error message */
  error: string;
  /** Set error message */
  setError: React.Dispatch<React.SetStateAction<string>>;
  /** Form submit handler */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
}

/**
 * Combines directions text with active style presets.
 */
const joinDirectionsWithStyles = (
  directions: string,
  activeStyles: Set<string>,
  stylePresets: StylePresets
): string => {
  const base = (directions || '').trim();
  const styleText = Array.from(activeStyles || [])
    .map((name) => stylePresets?.[name])
    .filter(Boolean)
    .join(', ');

  if (base && styleText) return `${base}, ${styleText}`;
  return base || styleText || '';
};

/**
 * Custom hook for generating prompts via the API.
 */
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
}: UsePromptGeneratorOptions): UsePromptGeneratorReturn {
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const generateAbortRef = useRef<AbortController | null>(null);

  const buildDirections = useCallback(() => {
    return joinDirectionsWithStyles(directions, activeStyles, stylePresets);
  }, [directions, activeStyles, stylePresets]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
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
        let response: Response;
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
        let data: { prompt?: unknown; message?: string };
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

        const displayPrompt = isJsonMode
          ? JSON.stringify(data.prompt, null, 2)
          : (data.prompt || '').toString();

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
        // Silently ignore user-cancelled requests
        if (isAbortError(err)) return;

        logger.error('Generation error:', err);
        // Use centralized error message utility for user-friendly messages
        setError(getErrorMessage(err));
        setShowOutput(true);
      } finally {
        setIsLoading(false);
        if (generateAbortRef.current === controller) generateAbortRef.current = null;
      }
    },
    [idea, uploadedImage, isJsonMode, isTestMode, isVideoPrompt, buildDirections, addHistoryEntry]
  );

  // Cleanup abort controller on unmount
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
