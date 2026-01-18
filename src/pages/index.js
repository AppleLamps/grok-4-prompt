import { useState, useCallback, useEffect, memo, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { compressImage } from '../utils/imageCompression';
import logger from '../utils/logger';
import { copyToClipboard } from '../utils/clipboard';
import { INPUT_LIMITS, COPY_TARGETS } from '../config/constants';
import ErrorBoundary from '../components/ErrorBoundary';
import OutputDisplay from '../components/OutputDisplay';
import SeoHead from '../components/SeoHead';
import { HelpIcon, HistoryIcon, MicIcon, StopIcon, TrashIcon, LightningIcon, ShuffleIcon, UploadBracketIcon } from '../components/IconComponents';
import usePromptGenerator from '../hooks/usePromptGenerator';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useHistory from '../hooks/useHistory';
import { STYLE_PRESETS } from '../config/styles';
import { SEO_FAQ, SEO_PAGES } from '../config/seo';
import { buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema, getBaseSchemas, getSchemaSiteUrl } from '../utils/schema';

// Lazy load modals for better performance
const HelpModal = dynamic(() => import('../components/HelpModal'), {
  ssr: false,
  loading: () => null
});

const HistoryModal = dynamic(() => import('../components/HistoryModal'), {
  ssr: false,
  loading: () => null
});


// Memoized ImageUpload component with Neural Forge styling
const ImageUpload = memo(({ onImageUpload, imagePreview, onImageRemove, isCompressing, compressionProgress, originalSize, compressedSize }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onImageUpload(files[0]);
    }
  }, [onImageUpload]);

  // Show compression loading state when processing without preview
  if (isCompressing && !imagePreview) {
    return (
      <div className="image-upload-area relative flex flex-col items-center justify-center">
        <div className="neural-upload-corners absolute inset-0 pointer-events-none" />
        <div className="loading-spinner mb-3" />
        <p className="text-xs font-semibold uppercase tracking-widest text-neural-accent">
          COMPRESSING... {compressionProgress}%
        </p>
        <p className="text-xs text-neural-dim mt-1">
          {(originalSize / 1024 / 1024).toFixed(2)}MB
        </p>
      </div>
    );
  }

  if (imagePreview) {
    return (
      <div className="space-y-2">
        <div className="image-preview relative">
          <div className="relative w-full h-36">
            {/* Using <img> instead of next/image because src is a dynamic blob URL
                from user-uploaded images, not a static/remote asset that can be optimized */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Upload preview"
              className="preview-image w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={onImageRemove}
            className="image-remove-btn"
            aria-label="Remove image"
          >
            <TrashIcon />
          </button>
        </div>
        <p className="text-xs text-neural-muted text-center">
          {compressedSize > 0 ? `${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB` : ''}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`image-upload-area relative ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      {/* Corner brackets */}
      <div className="neural-upload-corners absolute inset-0 pointer-events-none" />
      <UploadBracketIcon className="text-neural-muted mb-3 w-8 h-8" />
      <p className="text-xs font-semibold uppercase tracking-widest text-neural-text mb-1">IMG_REF_UPLOAD</p>
      <p className="text-xs text-neural-dim">DRAG_DROP_TARGET</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files[0] && onImageUpload(e.target.files[0])}
        className="hidden"
      />
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';

export default function Home() {
  const [idea, setIdea] = useState('');
  const [directions, setDirections] = useState('');
  const [isSurpriseLoading, setIsSurpriseLoading] = useState(false);
  const [copiedType, setCopiedType] = useState(COPY_TARGETS.NONE);
  const [showHelp, setShowHelp] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [activeStyles, setActiveStyles] = useState(new Set());
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [isVideoPrompt, setIsVideoPrompt] = useState(false);
  const [showStylePresets, setShowStylePresets] = useState(false);
  const imageObjectUrlRef = useRef(null);
  const ideaRef = useRef(null);
  const directionsRef = useRef(null);
  const outputRef = useRef(null);

  const stylePresets = STYLE_PRESETS;

  const seoJsonLd = useMemo(() => {
    const siteUrl = getSchemaSiteUrl();
    const base = getBaseSchemas(siteUrl);
    return [
      base.organization,
      base.webSite,
      base.webApplication,
      base.howTo,
      buildBreadcrumbSchema(siteUrl, [{ name: 'Home', path: '/' }]),
      buildFaqSchema(siteUrl),
      buildWebPageSchema({
        siteUrl,
        path: SEO_PAGES.home.path,
        title: SEO_PAGES.home.title,
        description: SEO_PAGES.home.description,
        includeSpeakable: true,
      }),
    ];
  }, []);

  const directionsWithStyles = useMemo(() => {
    const base = (directions || '').trim();
    const styleText = Array.from(activeStyles)
      .map((name) => stylePresets?.[name])
      .filter(Boolean)
      .join(', ');
    if (base && styleText) return `${base}, ${styleText}`;
    return base || styleText || '';
  }, [directions, activeStyles, stylePresets]);

  const {
    history,
    addEntry,
    toggleFavorite: toggleFavoriteEntry,
    deleteEntry: deleteHistoryEntry,
    clearHistory: clearHistoryEntries,
  } = useHistory();

  const {
    generatedPrompt,
    setGeneratedPrompt,
    showOutput,
    setShowOutput,
    isLoading,
    error,
    setError,
    handleSubmit,
  } = usePromptGenerator({
    idea,
    directions,
    uploadedImage,
    isJsonMode,
    isTestMode,
    isVideoPrompt,
    activeStyles,
    stylePresets,
    addHistoryEntry: addEntry,
  });

  const { dictatingTarget, toggleDictation } = useSpeechRecognition({
    onIdeaAppend: (text) => setIdea((v) => (v ? `${v} ` : '') + text),
    onDirectionsAppend: (text) => setDirections((v) => (v ? `${v} ` : '') + text),
    onError: setError,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImageUpload = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    if (file.size > INPUT_LIMITS.IMAGE_MAX_SIZE) {
      setError('Image file size must be less than 10MB.');
      return;
    }

    setError('');
    setOriginalSize(file.size);
    setCompressedSize(0);
    setIsCompressing(true);
    setCompressionProgress(0);
    // Don't show preview during compression to avoid flicker
    setImagePreview(null);

    try {
      // Clean up any existing object URL
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
        imageObjectUrlRef.current = null;
      }

      const compressedFile = await compressImage(file, {
        onProgress: (progress) => setCompressionProgress(Math.round(progress)),
        maxSizeMB: INPUT_LIMITS.IMAGE_TARGET_SIZE / (1024 * 1024),
        maxWidthOrHeight: INPUT_LIMITS.IMAGE_MAX_DIMENSION,
        useWebWorker: true,
        initialQuality: INPUT_LIMITS.IMAGE_INITIAL_QUALITY,
      });

      setCompressedSize(compressedFile.size);
      setUploadedImage(compressedFile);
      // Only create preview URL after compression is complete
      const compressedUrl = URL.createObjectURL(compressedFile);
      imageObjectUrlRef.current = compressedUrl;
      setImagePreview(compressedUrl);

    } catch (compressionError) {
      logger.error('Error during image compression:', compressionError);
      // Fallback to original file with preview
      setUploadedImage(file);
      const fallbackUrl = URL.createObjectURL(file);
      imageObjectUrlRef.current = fallbackUrl;
      setImagePreview(fallbackUrl);
      setError('Error compressing image. Using original file.');
    } finally {
      setIsCompressing(false);
      setCompressionProgress(0);
    }
  }, [setError]);

  const handleImageRemove = useCallback(() => {
    setUploadedImage(null);
    setImagePreview(null);
    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }
  }, []);

  const markCopied = useCallback((type) => {
    setCopiedType(type);
    setTimeout(() => setCopiedType(COPY_TARGETS.NONE), 2000);
  }, []);

  const copyText = useCallback(async (text, type) => {
    if (!text || error) return;
    const result = await copyToClipboard(text);
    if (result.success) {
      markCopied(type);
    } else {
      logger.error('Copy failed:', result.error);
      setError(result.error || 'Failed to copy to clipboard. Please try selecting and copying manually.');
    }
  }, [error, markCopied, setError]);

  const handleCopyDefault = useCallback(() => {
    copyText(generatedPrompt, COPY_TARGETS.DEFAULT);
  }, [copyText, generatedPrompt]);

  const handleCopyJson = useCallback(() => {
    copyText(generatedPrompt, COPY_TARGETS.JSON);
  }, [copyText, generatedPrompt]);

  const handleCopyScene = useCallback(() => {
    if (!generatedPrompt || error) return;
    let sceneText = generatedPrompt;
    try {
      const parsed = JSON.parse(generatedPrompt);
      if (parsed && typeof parsed.scene === 'string') {
        sceneText = parsed.scene;
      }
    } catch (parseErr) {
      logger.warn('Scene copy JSON parse failed:', parseErr);
    }
    copyText(sceneText, COPY_TARGETS.SCENE);
  }, [copyText, generatedPrompt, error]);

  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit, isLoading]);

  const handleSurpriseMe = useCallback(async () => {
    setIsSurpriseLoading(true);
    setError('');
    setShowOutput(false);
    setIdea('');
    setDirections('');
    setActiveStyles(new Set());

    try {
      const response = await fetch('/api/surprise', {
        method: 'POST',
      });
      const ct = response.headers.get('content-type') || '';
      let data;
      if (ct.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) throw new Error(text || 'Failed to get a surprise prompt.');
        data = { prompt: text };
      }
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to get a surprise prompt.');
      }
      const surprisePrompt = (data.prompt || '').toString();
      setGeneratedPrompt(surprisePrompt);
      setShowOutput(true);
      if (addEntry) {
        await addEntry({
          idea: 'Surprise Me',
          directions: '',
          prompt: surprisePrompt,
        });
      }
    } catch (err) {
      logger.error('Surprise Me error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setShowOutput(true);
    } finally {
      setIsSurpriseLoading(false);
    }
    // State setters (setX) are stable references from useState and don't need to be in deps.
    // addEntry is wrapped in useCallback in useHistory and is also stable.
    // setGeneratedPrompt, setShowOutput, setError come from useState in usePromptGenerator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addEntry, setError, setGeneratedPrompt, setShowOutput]);

  const handleClearAll = useCallback(() => {
    setIdea('');
    setDirections('');
    setActiveStyles(new Set());
    setGeneratedPrompt('');
    setError('');
    setShowOutput(false);
    handleImageRemove();
    ideaRef.current?.focus();
  }, [handleImageRemove, setError, setGeneratedPrompt, setShowOutput]);

  const toggleFavorite = useCallback((id) => toggleFavoriteEntry(id), [toggleFavoriteEntry]);

  const loadEntry = useCallback((entry) => {
    setIdea(entry.idea || '');
    setDirections(entry.directions || '');
    setShowHistory(false);
    ideaRef.current?.focus();
  }, []);

  const copyPrompt = useCallback(async (text) => {
    const result = await copyToClipboard(text);
    if (!result.success) {
      logger.warn('History copy failed:', result.error);
    }
  }, []);

  const deleteEntry = useCallback((id) => deleteHistoryEntry(id), [deleteHistoryEntry]);

  const clearHistory = useCallback(() => {
    clearHistoryEntries();
  }, [clearHistoryEntries]);

  // Toggle style preset function
  const toggleStyle = useCallback((styleName) => {
    if (!stylePresets[styleName]) return;
    setActiveStyles((prev) => {
      const next = new Set(prev);
      if (next.has(styleName)) {
        next.delete(styleName);
      } else {
        next.add(styleName);
      }
      return next;
    });
  }, [stylePresets]);

  // Smooth scroll when output appears
  useEffect(() => {
    if (showOutput) {
      requestAnimationFrame(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [showOutput]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
        imageObjectUrlRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <SeoHead
        title={SEO_PAGES.home.title}
        description={SEO_PAGES.home.description}
        path={SEO_PAGES.home.path}
        jsonLd={seoJsonLd}
      />

      <div className="min-h-screen py-6 px-4 sm:py-8 lg:px-6 relative z-10 flex items-center justify-center bg-neural-bg">
        <div className="max-w-5xl w-full mx-auto">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-black focus:text-neural-accent focus:px-4 focus:py-2 focus:border focus:border-neural-border"
          >
            Skip to main content
          </a>
          <div className={`glass-ui transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            {/* Neural Header */}
            <header className="neural-header">
              <div className="flex flex-col gap-1">
                <h1 className="neural-brand font-mono">
                  <span className="text-neural-muted">{'// '}</span>GROKIFY_PROMPT{' '}
                  <span className="text-neural-accent">v2.0</span>
                </h1>
                <p className="text-xs text-neural-dim font-mono uppercase tracking-wider">
                  GROK IMAGINE PROMPTS
                </p>
              </div>
              <a
                href="https://bags.fm/8F2FvujRh6zqoR4wtasocKgw4oPcu3MWK4MG77NwBAGS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm lg:text-base font-mono text-neural-accent hover:text-neural-bright transition-colors animate-pulse"
                style={{ textShadow: '0 0 10px rgba(255, 165, 0, 0.8), 0 0 20px rgba(255, 165, 0, 0.6), 0 0 30px rgba(255, 165, 0, 0.4)' }}
                title="CA: 8F2FvujRh6zqoR4wtasocKgw4oPcu3MWK4MG77NwBAGS"
              >
                <span className="hidden lg:inline">CA: 8F2FvujRh6zqoR4wtasocKgw4oPcu3MWK4MG77NwBAGS</span>
                <span className="lg:hidden">CA: 8F2F...BAGS</span>
              </a>
              <div className="neural-status">
                <span className="neural-status-dot" />
                SYSTEM ONLINE
              </div>
            </header>

            <ErrorBoundary>
              <main id="main-content" className="p-6">
                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
                  {/* Main Grid Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left Column - Primary Input */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Section 01: Primary Input */}
                      <div className="neural-section">
                        <h2 className="neural-section-header">01 // PRIMARY_INPUT_DATA</h2>
                        <div className="relative">
                          <textarea
                            ref={ideaRef}
                            id="idea"
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            className="neural-input min-h-[100px] pr-12"
                            placeholder="ENTER_CONCEPT_DESCRIPTION..."
                            rows={4}
                            maxLength={1000}
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => toggleDictation('idea')}
                            className={`absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center transition-all ${dictatingTarget === 'idea' ? 'bg-red-600 text-white' : 'text-neural-muted hover:text-neural-accent'}`}
                            aria-label="Voice input for idea"
                          >
                            {dictatingTarget === 'idea' ? <StopIcon /> : <MicIcon />}
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-neural-dim font-mono">{idea.length}/1000 CHARS</div>
                      </div>

                      {/* Section 02: Modifiers */}
                      <div className="neural-section">
                        <h2 className="neural-section-header">02 // MODIFIERS</h2>
                        <div className="relative">
                          <textarea
                            ref={directionsRef}
                            id="directions"
                            value={directions}
                            onChange={(e) => setDirections(e.target.value)}
                            className="neural-input min-h-[80px] pr-12"
                            placeholder="STYLE_PARAMS: cinematic, cyberpunk | MOOD: mysterious..."
                            rows={3}
                            maxLength={500}
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => toggleDictation('directions')}
                            className={`absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center transition-all ${dictatingTarget === 'directions' ? 'bg-red-600 text-white' : 'text-neural-muted hover:text-neural-accent'}`}
                            aria-label="Voice input for directions"
                          >
                            {dictatingTarget === 'directions' ? <StopIcon /> : <MicIcon />}
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-neural-dim font-mono">
                          ACTIVE_PARAMS: {directionsWithStyles || 'NULL'}
                        </div>
                      </div>

                      {/* Section 03: Style Matrix */}
                      <div className="neural-section">
                        <h2 className="neural-section-header">03 // STYLE_MATRIX</h2>
                        <button
                          type="button"
                          onClick={() => setShowStylePresets(!showStylePresets)}
                          className="neural-select w-full text-left"
                        >
                          SELECT_PRESETS ({activeStyles.size} ACTIVE)
                        </button>

                        {showStylePresets && (
                          <div className="mt-3 p-4 border border-neural-border bg-black/30">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {Object.keys(stylePresets).map((styleName) => (
                                <button
                                  key={styleName}
                                  type="button"
                                  onClick={() => toggleStyle(styleName)}
                                  className={`px-3 py-2 text-xs font-mono uppercase tracking-wider transition-all text-center ${activeStyles.has(styleName)
                                    ? 'bg-neural-accent text-neural-bg border border-neural-accent'
                                    : 'bg-transparent border border-neural-border text-neural-muted hover:border-neural-accent hover:text-neural-accent'
                                    }`}
                                >
                                  {styleName}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column - Image Upload & Config */}
                    <div className="space-y-4">
                      {/* Image Upload Section */}
                      <div className="neural-section">
                        <h2 className="neural-section-header">04 // IMG_REFERENCE</h2>
                        <ImageUpload
                          onImageUpload={handleImageUpload}
                          imagePreview={imagePreview}
                          onImageRemove={handleImageRemove}
                          isCompressing={isCompressing}
                          compressionProgress={compressionProgress}
                          originalSize={originalSize}
                          compressedSize={compressedSize}
                        />
                      </div>

                      {/* Config Flags */}
                      <div className="neural-section">
                        <h2 className="neural-section-header">05 // CONFIG_FLAGS</h2>
                        <div className="neural-config">
                          {/* Emily's JSON Mode */}
                          <div className="neural-config-item">
                            <div>
                              <span className="neural-config-label">EMILY_JSON_MODE</span>
                              <a href="https://x.com/IamEmily2050" target="_blank" rel="noopener noreferrer" className="block text-xs text-neural-dim hover:text-neural-accent mt-0.5">@IamEmily2050</a>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isJsonMode}
                              onClick={() => setIsJsonMode((v) => !v)}
                              className="neural-toggle"
                              data-checked={isJsonMode}
                              aria-label="Toggle Emily&apos;s JSON Mode"
                            >
                              <span className="neural-toggle-thumb" />
                            </button>
                          </div>

                          {/* Test Mode */}
                          <div className="neural-config-item">
                            <div>
                              <span className="neural-config-label">TEST_ELYSIAN</span>
                              <span className="block text-xs text-neural-dim mt-0.5">Elysian Visions</span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isTestMode}
                              onClick={() => setIsTestMode((v) => !v)}
                              className="neural-toggle"
                              data-checked={isTestMode}
                              aria-label="Toggle Test Mode"
                            >
                              <span className="neural-toggle-thumb" />
                            </button>
                          </div>

                          {/* Video Prompt */}
                          <div className="neural-config-item">
                            <div>
                              <span className="neural-config-label">VIDEO_SEQ</span>
                              <span className="block text-xs text-neural-dim mt-0.5">Text-to-video</span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isVideoPrompt}
                              onClick={() => setIsVideoPrompt((v) => !v)}
                              className="neural-toggle"
                              data-checked={isVideoPrompt}
                              aria-label="Toggle Video Prompt Mode"
                            >
                              <span className="neural-toggle-thumb" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 p-4 border border-neural-border bg-black/20">
                    <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleClearAll}
                        disabled={isLoading || isSurpriseLoading}
                        className="neural-btn flex-1 sm:flex-none"
                      >
                        <TrashIcon className="w-4 h-4" />
                        PURGE_DATA
                      </button>
                      <button
                        type="button"
                        onClick={handleSurpriseMe}
                        disabled={isLoading || isSurpriseLoading}
                        aria-busy={isSurpriseLoading}
                        className={`neural-btn flex-1 sm:flex-none ${isSurpriseLoading ? 'loading' : ''}`}
                      >
                        {isSurpriseLoading ? (
                          <div className="loading-spinner" />
                        ) : (
                          <>
                            <ShuffleIcon className="w-4 h-4" />
                            RANDOMIZE_SEED
                          </>
                        )}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || isSurpriseLoading || (!idea.trim() && !uploadedImage)}
                      aria-busy={isLoading}
                      className={`neural-btn-primary ${isLoading ? 'loading' : ''}`}
                    >
                      {isLoading ? (
                        <div className="loading-spinner" />
                      ) : (
                        <>
                          <LightningIcon className="w-5 h-5" />
                          EXECUTE
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Output Section */}
                <OutputDisplay
                  ref={outputRef}
                  showOutput={showOutput}
                  generatedPrompt={generatedPrompt}
                  error={error}
                  isJsonMode={isJsonMode}
                  copiedType={copiedType}
                  onCopyDefault={handleCopyDefault}
                  onCopyJson={handleCopyJson}
                  onCopyScene={handleCopyScene}
                />

                {/* SEO-friendly content sections - collapsed by default */}
                <section className="mt-10 space-y-4" aria-label="About and frequently asked questions">
                  <details className="neural-section group">
                    <summary className="neural-section-header cursor-pointer list-none flex items-center justify-between">
                      <span id="about">06 // ABOUT_THIS_TOOL</span>
                      <span className="text-neural-accent text-xs ml-2 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="space-y-3 text-sm leading-relaxed text-neural-muted mt-4">
                      <p>
                        GROKIFY_PROMPT is a <strong>Grok Imagine prompt generator</strong>, <strong>AI prompt generator</strong>, and <strong>image prompt maker</strong>{' '}
                        designed for fast, repeatable <strong>prompt engineering</strong>. It helps you turn an idea (and
                        optional reference image) into detailed, high-quality prompts compatible with <strong>xAI Grok Imagine</strong>.
                      </p>
                      <p>
                        Use it to create <strong>GROK IMAGINE PROMPTS</strong> for text-to-image workflows, or switch modes to
                        generate structured <strong>JSON prompts</strong> in the Grok Imagine format. For video workflows, enable VIDEO_SEQ mode
                        to create <strong>image-to-video prompts</strong> with cinematic scene descriptions optimized for frame rate and motion.
                      </p>
                      <p>
                        The <strong>JSON prompt format</strong> includes all parameters for scene, subjects, style, lighting, mood, and camera settings—ready
                        to use with the <strong>Grok Imagine API</strong> for both image generation and video creation.
                      </p>
                    </div>
                  </details>

                  <details className="neural-section group">
                    <summary className="neural-section-header cursor-pointer list-none flex items-center justify-between">
                      <span id="faq">07 // FAQ</span>
                      <span className="text-neural-accent text-xs ml-2 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="space-y-2 mt-4">
                      {SEO_FAQ.map((item) => (
                        <details key={item.question} className="border border-white/10 bg-black/20 p-3">
                          <summary className="cursor-pointer text-sm text-neural-white">
                            {item.question}
                          </summary>
                          <div className="pt-2 text-sm text-neural-dim leading-relaxed">{item.answer}</div>
                        </details>
                      ))}
                    </div>
                  </details>
                </section>
              </main>
            </ErrorBoundary>
          </div>

          {/* Footer */}
          <footer className="text-center py-6 space-y-2">
            <div className="neural-divider mb-4" />
            <nav aria-label="Footer links" className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono uppercase tracking-wider text-neural-dim">
              <a href="#faq" className="hover:text-neural-accent transition-colors">
                FAQ
              </a>
              <a href="#about" className="hover:text-neural-accent transition-colors">
                ABOUT
              </a>
              <Link href="/privacy" className="hover:text-neural-accent transition-colors">
                PRIVACY
              </Link>
              <Link href="/terms" className="hover:text-neural-accent transition-colors">
                TERMS
              </Link>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/sitemap.xml" className="hover:text-neural-accent transition-colors">
                SITEMAP
              </a>
            </nav>
            <p className="text-xs text-neural-dim font-mono uppercase tracking-wider">
              POWERED_BY: OpenRouter API | MODEL: x-ai/grok-4.1-fast
            </p>
            <p className="text-xs text-neural-dim font-mono">
              CREATED_BY: @lamps_apple |{' '}
              <a
                href="https://x.com/lamps_apple"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neural-accent transition-colors"
              >
                FOLLOW_ON_𝕏
              </a>
            </p>
          </footer>
        </div>
      </div>

      {/* Floating Buttons */}
      <button onClick={() => setShowHelp(true)} className="help-button" aria-label="Open help">
        <HelpIcon className="w-5 h-5" />
      </button>
      <button onClick={() => setShowHistory(true)} className="history-button" aria-label="Open history">
        <HistoryIcon className="w-5 h-5" />
      </button>

      {/* Modals */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        entries={history}
        onToggleFav={toggleFavorite}
        onLoad={loadEntry}
        onCopy={copyPrompt}
        onDelete={deleteEntry}
        onClear={clearHistory}
      />
    </>
  );
}
