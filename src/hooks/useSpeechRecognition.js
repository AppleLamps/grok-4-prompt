import { useCallback, useEffect, useRef, useState } from 'react';
import logger from '../utils/logger';

export default function useSpeechRecognition({ onIdeaAppend, onDirectionsAppend, onError }) {
  const recognitionRef = useRef(null);
  const [dictatingTarget, setDictatingTarget] = useState(null);

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
    async (target) => {
      if (typeof window === 'undefined') return;
      if (recognitionRef.current) {
        stopRecognition();
        return;
      }

      try {
        let SR = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SR) {
          try {
            const { SpeechRecognition: PolyfillSpeechRecognition } = await import('web-speech-cognitive-services');
            SR = PolyfillSpeechRecognition;
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
        rec.onerror = (ev) => {
          logger.warn('Speech error', ev.error);
          setDictatingTarget(null);
          recognitionRef.current = null;
        };
        rec.onresult = (ev) => {
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

  useEffect(() => stopRecognition, [stopRecognition]);

  return { dictatingTarget, toggleDictation };
}

