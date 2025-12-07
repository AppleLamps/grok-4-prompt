import { useState, useCallback, useEffect, memo, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { compressImage } from '../utils/imageCompression';
import useParallax from '../hooks/useParallax';
import logger from '../utils/logger';
import SpaceBackground from '../components/SpaceBackground';
import ErrorBoundary from '../components/ErrorBoundary';
import { CopyIcon, CheckIcon, HelpIcon, HistoryIcon, MicIcon, StopIcon, ImageIcon, TrashIcon } from '../components/IconComponents';
import usePromptGenerator from '../hooks/usePromptGenerator';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useHistory from '../hooks/useHistory';

// Lazy load modals for better performance
const HelpModal = dynamic(() => import('../components/HelpModal'), {
  ssr: false,
  loading: () => null
});

const HistoryModal = dynamic(() => import('../components/HistoryModal'), {
  ssr: false,
  loading: () => null
});


// Style presets with detailed prompts (module scope to avoid re-creating per render)
const STYLE_PRESETS = {
  'Realistic': 'photorealistic rendering with natural lighting, high detail, and lifelike textures',
  'Cartoon': 'vibrant cartoon style with bold colors, simplified forms, and playful character design',
  'Anime': 'anime art style with expressive characters, dynamic poses, and detailed backgrounds',
  'Oil Painting': 'traditional oil painting technique with rich textures, visible brushstrokes, and classical composition',
  'Cyberpunk': 'cyberpunk aesthetic with neon lighting, dark urban atmosphere, futuristic technology, and dystopian elements',
  'Fantasy': 'fantasy art style with magical elements, ethereal lighting, mystical creatures, and enchanted environments',
  'Steampunk': 'steampunk design with brass machinery, Victorian elements, steam-powered technology, and industrial aesthetics',
  'Sci-Fi': 'science fiction style with advanced technology, sleek designs, futuristic architecture, and space-age elements',
  'Cinematic': 'cinematic composition with dramatic lighting, film-like quality, and professional cinematography',
  'Dark': 'dark and moody atmosphere with deep shadows, muted colors, and mysterious ambiance',
  'Ethereal': 'ethereal and dreamlike quality with soft lighting, flowing elements, and otherworldly beauty',
  'Vintage': 'vintage aesthetic with retro colors, classic styling, and nostalgic atmosphere',
  'Watercolor': 'watercolor painting style with soft washes, flowing pigments, delicate transparency, and organic color bleeding',
  'Minimalist': 'minimalist design with clean lines, simple forms, negative space, and refined elegance',
  'Abstract': 'abstract art style with non-representational forms, bold geometric shapes, and expressive color relationships',
  'Surreal': 'surrealist aesthetic with dreamlike imagery, impossible scenarios, and fantastical visual metaphors',
  'Gothic': 'gothic atmosphere with dramatic architecture, ornate details, mysterious shadows, and romantic darkness',
  'Retro': 'retro design with mid-century modern elements, bold patterns, vintage typography, and nostalgic color palettes',
  'Impressionist': 'impressionist painting style with loose brushwork, light effects, vibrant colors, and atmospheric quality',
  'Documentary': 'documentary photography style with authentic moments, natural lighting, and journalistic storytelling approach'
};


// Memoized components for better performance
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

  if (imagePreview) {
    return (
      <div className="image-preview-container">
        <div className="image-preview">
          <div className="relative w-full h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Upload preview"
              className="preview-image"
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
        <p className="text-sm text-premium-400 mt-2">
          {compressedSize > 0 ? `${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB` : ''}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`image-upload-area ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <ImageIcon className="text-premium-400 mb-2" />
      <p className="text-premium-300 mb-1">Drop an image here or click to upload</p>
      <p className="text-sm text-premium-500">PNG, JPG, GIF up to 10MB</p>
      {isCompressing && (
        <div className="mt-2 text-sm text-premium-400">
          Compressing... {compressionProgress}%
        </div>
      )}
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
  const [copiedType, setCopiedType] = useState('');
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

  // Parallax effect - call hook at top level, but only activate when mounted
  useParallax();

  const handleImageUpload = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be less than 10MB.');
      return;
    }

    setError('');
    setOriginalSize(file.size);
    setCompressedSize(0);
    setIsCompressing(true);
    setCompressionProgress(0);

    try {
      // preview with object URL for lower memory
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
        imageObjectUrlRef.current = null;
      }
      const firstUrl = URL.createObjectURL(file);
      imageObjectUrlRef.current = firstUrl;
      setImagePreview(firstUrl);

      const compressedFile = await compressImage(file, {
        onProgress: (progress) => setCompressionProgress(Math.round(progress)),
        maxSizeMB: 1.5,
        maxWidthOrHeight: 2000,
        useWebWorker: true,
        initialQuality: 0.8,
      });

      setCompressedSize(compressedFile.size);
      setUploadedImage(compressedFile);
      // update preview to compressed version
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
        imageObjectUrlRef.current = null;
      }
      const compressedUrl = URL.createObjectURL(compressedFile);
      imageObjectUrlRef.current = compressedUrl;
      setImagePreview(compressedUrl);

    } catch (error) {
      logger.error('Error during image compression:', error);
      setUploadedImage(file);
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
    setTimeout(() => setCopiedType(''), 2000);
  }, []);

  const copyText = useCallback(async (text, type) => {
    if (!text || error) return;
    try {
      await navigator.clipboard.writeText(text);
      markCopied(type);
    } catch (err) {
      logger.error('Copy failed:', err);
    }
  }, [error, markCopied]);

  const handleCopyDefault = useCallback(() => {
    copyText(generatedPrompt, 'default');
  }, [copyText, generatedPrompt]);

  const handleCopyJson = useCallback(() => {
    copyText(generatedPrompt, 'json');
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
    copyText(sceneText, 'scene');
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
  }, []);

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
    try { await navigator.clipboard.writeText(text); } catch { }
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
      <Head>
        <title>Grok 4 Imagine Prompt Generator</title>
        <meta name="description" content="Create professional, optimized prompts for AI image generation with our premium Grok 4 Imagine prompt generator." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link rel="preconnect" href="https://openrouter.ai" />
        <link rel="dns-prefetch" href="https://openrouter.ai" />
      </Head>

      {mounted && <SpaceBackground />}

      <div className="min-h-screen py-8 px-4 sm:py-12 lg:px-8 relative z-10 flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto">
          <div className={`glass-ui p-8 sm:p-12 lg:p-16 transition-opacity duration-1000 hover-lift ${mounted ? 'opacity-100 animate-slide-in' : 'opacity-0'}`}>
            <header className="text-center mb-12">
              <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gradient mb-6 text-glow tracking-tight">
                  Prompt Generator
                </h1>
                <p className="text-lg sm:text-xl text-premium-200 max-w-2xl mx-auto leading-relaxed">
                  Transform your ideas into vivid, high-quality prompts for Grok 4 Imagine.
                </p>
              </div>
            </header>

            <ErrorBoundary>
              <main>
                <form onSubmit={handleSubmit} className="space-y-8 mb-12" onKeyDown={handleKeyDown}>
                <div>
                  <label htmlFor="idea" className="label-text">Your Idea</label>
                  <div className="relative">
                    <textarea
                      ref={ideaRef}
                      id="idea"
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      className="input-field min-h-[120px] pr-12"
                      placeholder="A futuristic city skyline at dusk..."
                      rows={4}
                      maxLength={1000}
                      disabled={isLoading}
                    />
                    <div className="absolute left-3 bottom-3 text-xs text-premium-500 select-none">Up to 1000 characters</div>
                    <button
                      type="button"
                      onClick={() => toggleDictation('idea')}
                      className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center border ${dictatingTarget === 'idea' ? 'bg-red-500/90 border-red-400 text-white' : 'bg-premium-800/60 border-premium-700 text-premium-300 hover:bg-premium-700/70'}`}
                      aria-label="Voice input for idea"
                    >
                      {dictatingTarget === 'idea' ? <StopIcon /> : <MicIcon />}
                    </button>
                  </div>
                </div>

                {/* Visual separator */}
                <div className="section-divider"></div>

                <div>
                  <label htmlFor="directions" className="label-text">Additional Directions <span className="optional-text">(optional)</span></label>
                  <div className="relative">
                    <textarea
                      ref={directionsRef}
                      id="directions"
                      value={directions}
                      onChange={(e) => setDirections(e.target.value)}
                      className="input-field min-h-[100px] pr-12"
                      placeholder="Style: cinematic, cyberpunk. Mood: mysterious, awe-inspiring..."
                      rows={3}
                      maxLength={500}
                      disabled={isLoading}
                    />
                    <div className="absolute left-3 bottom-3 text-xs text-premium-500 select-none">Optional • up to 500 characters</div>
                    <button
                      type="button"
                      onClick={() => toggleDictation('directions')}
                      className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center border ${dictatingTarget === 'directions' ? 'bg-red-500/90 border-red-400 text-white' : 'bg-premium-800/60 border-premium-700 text-premium-300 hover:bg-premium-700/70'}`}
                      aria-label="Voice input for directions"
                    >
                      {dictatingTarget === 'directions' ? <StopIcon /> : <MicIcon />}
                    </button>
                  </div>

                  {/* Style Preset Buttons */}
                  <div className="mt-3">
                    <div className="text-xs text-premium-400 mb-2 font-medium text-center">Quick Style Presets</div>

                    {/* Dropdown for all screen sizes */}
                    <div className="w-full">
                      <button
                        type="button"
                        onClick={() => setShowStylePresets(!showStylePresets)}
                        className="w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 border flex items-center justify-between shadow-sm input-field"
                      >
                        <span className="text-premium-200">Choose Style Presets ({activeStyles.size} selected)</span>
                        <svg
                          className={`w-5 h-5 transition-transform duration-200 ${showStylePresets ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showStylePresets && (
                        <div className="mt-3 p-4 rounded-lg backdrop-blur-sm" style={{
                          background: 'linear-gradient(180deg, rgba(51,65,85,0.7), rgba(30,41,59,0.6))',
                          border: '1px solid hsl(var(--elev-border))',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.05) inset'
                        }}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 justify-items-center">
                            {Object.keys(stylePresets).map((styleName) => (
                              <button
                                key={styleName}
                                type="button"
                                onClick={() => toggleStyle(styleName)}
                                className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-all duration-300 border text-center ${activeStyles.has(styleName)
                                  ? 'bg-accent-bright/90 border-accent-bright text-white shadow-lg shadow-accent-bright/25'
                                  : 'bg-premium-700/80 border-premium-600 text-premium-200 hover:bg-premium-600/90 hover:border-premium-500 hover:text-premium-50'
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
                </div>

                {/* Visual separator */}
                <div className="section-divider"></div>

                <div>
                  <label className="label-text">Upload Image <span className="optional-text">(optional)</span></label>
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

                {/* Visual separator */}
                <div className="section-divider"></div>

                <div className="flex items-center justify-end -mt-2">
                  <div className="flex items-center gap-6 flex-wrap justify-end">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col text-right">
                        <span className="text-sm font-medium text-premium-200">Emily&apos;s JSON Mode</span>
                        <a href="https://x.com/IamEmily2050" target="_blank" rel="noopener noreferrer" className="text-xs text-premium-400 mt-1 hover:text-premium-300">𝕏 @IamEmily2050</a>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isJsonMode}
                        onClick={() => setIsJsonMode((v) => !v)}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${isJsonMode ? 'bg-amber-400/90' : 'bg-premium-800/60 border border-premium-700'}`}
                        aria-label="Toggle Emily&apos;s JSON Mode"
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isJsonMode ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col text-right">
                        <span className="text-sm font-medium text-premium-200">Test Mode</span>
                        <span className="text-xs text-premium-400 mt-1">Elysian Visions</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isTestMode}
                        onClick={() => setIsTestMode((v) => !v)}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${isTestMode ? 'bg-purple-500/90' : 'bg-premium-800/60 border border-premium-700'}`}
                        aria-label="Toggle Test Mode"
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isTestMode ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col text-right">
                        <span className="text-sm font-medium text-premium-200">Video Prompt</span>
                        <span className="text-xs text-premium-400 mt-1">Text-to-video scene</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isVideoPrompt}
                        onClick={() => setIsVideoPrompt((v) => !v)}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${isVideoPrompt ? 'bg-cyan-400/90' : 'bg-premium-800/60 border border-premium-700'}`}
                        aria-label="Toggle Video Prompt Mode"
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isVideoPrompt ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button type="button" onClick={handleClearAll} disabled={isLoading || isSurpriseLoading} className="premium-button">Clear All</button>
                  <button
                    type="button"
                    onClick={handleSurpriseMe}
                    disabled={isLoading || isSurpriseLoading}
                    aria-busy={isSurpriseLoading}
                    className={`premium-button ${isSurpriseLoading ? 'loading' : ''}`}
                  >
                    {isSurpriseLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="loading-spinner"></div>
                      </div>
                    ) : (
                      'Surprise Me'
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || isSurpriseLoading || (!idea.trim() && !uploadedImage)}
                    aria-busy={isLoading}
                    className={`premium-button ${isLoading ? 'loading' : ''}`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="loading-spinner"></div>
                      </div>
                    ) : (
                      'Generate Prompt'
                    )}
                  </button>
                </div>
              </form>

              {showOutput && (
                <div id="output-section" ref={outputRef} className="animate-fade-in-up">
                  <div className="section-divider"></div>
                  <div className="output-card hover-lift">
                    <div className="flex justify-between items-center p-5 border-b border-premium-600/30 gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-premium-100">Generated Prompt</h3>
                      {!error && generatedPrompt && (
                        <div className="flex items-center gap-2">
                          {isJsonMode ? (
                            <>
                              <button
                                onClick={handleCopyJson}
                                className={`copy-button px-3 py-2 text-sm flex items-center gap-2 ${copiedType === 'json' ? 'copied' : ''}`}
                                title="Copy full JSON"
                              >
                                {copiedType === 'json' ? <CheckIcon /> : <CopyIcon />}
                                <span className="hidden sm:inline">Copy JSON</span>
                              </button>
                              <button
                                onClick={handleCopyScene}
                                className={`copy-button px-3 py-2 text-sm flex items-center gap-2 ${copiedType === 'scene' ? 'copied' : ''}`}
                                title="Copy only the scene field"
                              >
                                {copiedType === 'scene' ? <CheckIcon /> : <CopyIcon />}
                                <span className="hidden sm:inline">Copy Scene</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={handleCopyDefault}
                              className={`copy-button ${copiedType === 'default' ? 'copied' : ''}`}
                              title="Copy to clipboard"
                            >
                              {copiedType === 'default' ? <CheckIcon /> : <CopyIcon />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      {error ? (
                        <div className="error-content">{error}</div>
                      ) : (
                        <pre className="text-base leading-relaxed text-premium-200 whitespace-pre-wrap overflow-auto">
                          <code>{generatedPrompt}</code>
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </main>
            </ErrorBoundary>
          </div>
          <footer className="text-center pt-12 space-y-2">
            <div className="section-divider mb-6"></div>
            <p className="text-sm text-premium-400 font-medium">Powered by OpenRouter API – Model: x-ai/grok-4.1-fast</p>
            <p className="text-sm text-premium-400">
              Created by @lamps_apple | follow on{' '}
              <a
                href="https://x.com/lamps_apple"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-premium-200 transition-colors duration-300 font-medium"
              >
                𝕏
              </a>
            </p>
          </footer>
        </div>
      </div>

      <button onClick={() => setShowHelp(true)} className="help-button animate-float" aria-label="Open help">
        <HelpIcon className="w-5 h-5" />
      </button>
      <button onClick={() => setShowHistory(true)} className="history-button animate-float" aria-label="Open history">
        <HistoryIcon className="w-5 h-5" />
      </button>

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
