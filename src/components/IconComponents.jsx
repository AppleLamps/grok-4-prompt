// Optimized icon components with React.memo for performance
import React from 'react';

export const CopyIcon = React.memo(({ className }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Copy to clipboard</title>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
));

export const CheckIcon = React.memo(({ className }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Copied</title>
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
));

export const HelpIcon = React.memo(({ className = "" }) => (
  <svg className={`${className} text-white`} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <title>Help</title>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
  </svg>
));

export const CloseIcon = React.memo(({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Close</title>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
));

export const UploadIcon = React.memo(({ className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Upload</title>
    <path d="M14.5 3a1 1 0 0 1 1 1v6h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6V4a1 1 0 0 1 1-1h6z"/>
  </svg>
));

export const ImageIcon = React.memo(({ className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Image</title>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
));

export const TrashIcon = React.memo(({ className }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Delete</title>
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
));

export const MicIcon = React.memo(({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Microphone</title>
    <rect x="9" y="2" width="6" height="12" rx="3"/>
    <path d="M5 10a7 7 0 0 0 14 0"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
));

export const StopIcon = React.memo(({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Stop</title>
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
));

export const StarIcon = React.memo(({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Favorite</title>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
));

export const StarSolidIcon = React.memo(({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <title>Favorited</title>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21.02 7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
));

export const HistoryIcon = React.memo(({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>History</title>
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    <polyline points="12 7 12 12 15 15"/>
  </svg>
));

export const LightningIcon = React.memo(({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <title>Execute</title>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
));

export const ShuffleIcon = React.memo(({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Randomize</title>
    <polyline points="16 3 21 3 21 8"/>
    <line x1="4" y1="20" x2="21" y2="3"/>
    <polyline points="21 16 21 21 16 21"/>
    <line x1="15" y1="15" x2="21" y2="21"/>
    <line x1="4" y1="4" x2="9" y2="9"/>
  </svg>
));

export const UploadBracketIcon = React.memo(({ className = '' }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <title>Upload</title>
    <path d="M3 7V3h4"/>
    <path d="M17 3h4v4"/>
    <path d="M21 17v4h-4"/>
    <path d="M7 21H3v-4"/>
    <path d="M12 16V8"/>
    <path d="M8 12l4-4 4 4"/>
  </svg>
));

CopyIcon.displayName = 'CopyIcon';
CheckIcon.displayName = 'CheckIcon';
HelpIcon.displayName = 'HelpIcon';
CloseIcon.displayName = 'CloseIcon';
UploadIcon.displayName = 'UploadIcon';
ImageIcon.displayName = 'ImageIcon';
TrashIcon.displayName = 'TrashIcon';
MicIcon.displayName = 'MicIcon';
StopIcon.displayName = 'StopIcon';
StarIcon.displayName = 'StarIcon';
StarSolidIcon.displayName = 'StarSolidIcon';
HistoryIcon.displayName = 'HistoryIcon';
LightningIcon.displayName = 'LightningIcon';
ShuffleIcon.displayName = 'ShuffleIcon';
UploadBracketIcon.displayName = 'UploadBracketIcon';
