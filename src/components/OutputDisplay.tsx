import React, { forwardRef } from 'react';
import CopyButtons from './CopyButtons';
import type { CopyTarget } from '../config/constants';

export interface OutputDisplayProps {
  /** Whether to show the output section */
  showOutput: boolean;
  /** The generated prompt text */
  generatedPrompt: string;
  /** Current error message */
  error: string;
  /** Whether JSON mode is active */
  isJsonMode: boolean;
  /** Current copied button type */
  copiedType: CopyTarget;
  /** Handler for copying default text */
  onCopyDefault: () => void;
  /** Handler for copying JSON */
  onCopyJson: () => void;
  /** Handler for copying scene field */
  onCopyScene: () => void;
}

/**
 * Output section displaying generated prompts or errors.
 * Includes ARIA live region for screen reader announcements.
 */
const OutputDisplay = forwardRef<HTMLDivElement, OutputDisplayProps>(
  (
    {
      showOutput,
      generatedPrompt,
      error,
      isJsonMode,
      copiedType,
      onCopyDefault,
      onCopyJson,
      onCopyScene,
    },
    ref
  ) => {
    if (!showOutput) {
      return null;
    }

    return (
      <div
        id="output-section"
        ref={ref}
        className="neural-output mt-6"
        role="region"
        aria-live="polite"
        aria-label="Generated prompt output"
      >
        <div className="neural-output-header flex-wrap gap-2">
          <span className="neural-output-title">OUTPUT_STREAM</span>
          {!error && generatedPrompt && (
            <div className="flex items-center gap-2 flex-wrap">
              <CopyButtons
                isJsonMode={isJsonMode}
                copiedType={copiedType}
                onCopyDefault={onCopyDefault}
                onCopyJson={onCopyJson}
                onCopyScene={onCopyScene}
              />
            </div>
          )}
        </div>
        <div className="neural-output-content">
          {error ? (
            <div className="error-content">{error}</div>
          ) : (
            <pre className="text-sm leading-relaxed text-neural-white whitespace-pre-wrap overflow-auto font-mono">
              <code>{generatedPrompt}</code>
            </pre>
          )}
        </div>
      </div>
    );
  }
);

OutputDisplay.displayName = 'OutputDisplay';

export default OutputDisplay;
