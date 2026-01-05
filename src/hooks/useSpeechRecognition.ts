import { useCallback, useEffect, useRef, useState } from 'react';
import logger from '../utils/logger';

/** Target field for speech dictation */
export type DictationTarget = 'idea' | 'directions' | null;

/**
 * Configuration options for the speech recognition hook.
 */
export interface UseSpeechRecognitionOptions {
  /** Callback when text is recognized for the idea field */
  onIdeaAppend?: (text: string) => void;
  /** Callback when text is recognized for the directions field */
  onDirectionsAppend?: (text: string) => void;
  /** Callback when an error occurs */
  onError?: (message: string) => void;
}

/**
 * Return type for the useSpeechRecognition hook.
 */
export interface UseSpeechRecognitionReturn {
  /** Currently active dictation target, or null if not dictating */
  dictatingTarget: DictationTarget;
  /** Toggle dictation for the specified target field */
  toggleDictation: (target: 'idea' | 'directions') => Promise<void>;
}

// Type definitions for Web Speech API (not included in default lib.dom.d.ts)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventType {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventType {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionType {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventType) => void) | null;
  onresult: ((ev: SpeechRecognitionEventType) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionType;
}

// Extend Window interface for browser speech recognition APIs
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

/**
 * Custom hook for speech-to-text functionality.
 * Supports native browser APIs and falls back to polyfill.
 */
export default function useSpeechRecognition({
  onIdeaAppend,
  onDirectionsAppend,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const [dictatingTarget, setDictatingTarget] = useState<DictationTarget>(null);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        logger.warn('Failed to stop speech recognition', err);
      }
      recognitionRef.current = null;
      setDictatingTarget(null);
    }
  }, []);

  const toggleDictation = useCallback(
    async (target: 'idea' | 'directions') => {
      if (typeof window === 'undefined') return;
      if (recognitionRef.current) {
        stopRecognition();
        return;
      }

      try {
        let SR: SpeechRecognitionConstructor | undefined =
          window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SR) {
          try {
            // Defensive loading: check if module exports what we expect
            const polyfillModule = await import('web-speech-cognitive-services') as unknown;
            const polyfillTyped = polyfillModule as { SpeechRecognition?: SpeechRecognitionConstructor };
            if (polyfillTyped && polyfillTyped.SpeechRecognition) {
              SR = polyfillTyped.SpeechRecognition;
            } else {
              logger.warn('Speech recognition polyfill loaded but SpeechRecognition not found');
            }
          } catch (polyfillError) {
            logger.warn('Failed to load speech recognition polyfill:', polyfillError);
          }
        }

        if (!SR) {
          onError?.('Speech recognition is not supported in this browser.');
          return;
        }

        const rec = new SR();
        recognitionRef.current = rec;
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.onstart = () => setDictatingTarget(target);
        rec.onend = () => {
          setDictatingTarget(null);
          recognitionRef.current = null;
        };
        rec.onerror = (ev: SpeechRecognitionErrorEventType) => {
          logger.warn('Speech error', ev.error);
          setDictatingTarget(null);
          recognitionRef.current = null;
        };
        rec.onresult = (ev: SpeechRecognitionEventType) => {
          const transcript = ev.results?.[0]?.[0]?.transcript || '';
          if (!transcript) return;
          if (target === 'idea') {
            onIdeaAppend?.(transcript);
          } else if (target === 'directions') {
            onDirectionsAppend?.(transcript);
          }
        };
        rec.start();
      } catch (err) {
        logger.error('Speech init failed', err);
        onError?.('Failed to start voice input.');
      }
    },
    [onDirectionsAppend, onIdeaAppend, onError, stopRecognition]
  );

  // Cleanup on unmount
  useEffect(() => stopRecognition, [stopRecognition]);

  return { dictatingTarget, toggleDictation };
}
