import React from 'react';
import { CopyIcon, CheckIcon } from './IconComponents';
import { COPY_TARGETS, type CopyTarget } from '../config/constants';

export interface CopyButtonsProps {
  /** Whether JSON mode is active (shows JSON + Scene buttons) */
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
 * Copy button variants for the output section.
 * Shows either a single copy button or JSON + Scene buttons depending on mode.
 */
const CopyButtons: React.FC<CopyButtonsProps> = ({
  isJsonMode,
  copiedType,
  onCopyDefault,
  onCopyJson,
  onCopyScene,
}) => {
  if (isJsonMode) {
    return (
      <>
        <button
          onClick={onCopyJson}
          className={`copy-button ${copiedType === COPY_TARGETS.JSON ? 'copied' : ''}`}
          title="Copy full JSON"
        >
          {copiedType === COPY_TARGETS.JSON ? <CheckIcon /> : <CopyIcon />}
          <span>COPY_JSON</span>
        </button>
        <button
          onClick={onCopyScene}
          className={`copy-button ${copiedType === COPY_TARGETS.SCENE ? 'copied' : ''}`}
          title="Copy only the scene field"
        >
          {copiedType === COPY_TARGETS.SCENE ? <CheckIcon /> : <CopyIcon />}
          <span>COPY_SCENE</span>
        </button>
      </>
    );
  }

  return (
    <button
      onClick={onCopyDefault}
      className={`copy-button ${copiedType === COPY_TARGETS.DEFAULT ? 'copied' : ''}`}
      title="Copy to clipboard"
    >
      {copiedType === COPY_TARGETS.DEFAULT ? <CheckIcon /> : <CopyIcon />}
      <span>COPY</span>
    </button>
  );
};

export default CopyButtons;
