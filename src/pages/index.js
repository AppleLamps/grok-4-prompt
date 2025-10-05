import { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { compressImage } from '../utils/imageCompression';
import useParallax from '../hooks/useParallax';
import SpaceBackground from '../components/SpaceBackground';
import { CopyIcon, CheckIcon, HelpIcon, HistoryIcon, MicIcon, StopIcon, UploadIcon, ImageIcon, TrashIcon } from '../components/IconComponents';

// Lazy load modals for better performance
const HelpModal = dynamic(() => import('../components/HelpModal'), {
  ssr: false,
  loading: () => null
});

const HistoryModal = dynamic(() => import('../components/HistoryModal'), {
  ssr: false,
  loading: () => null
});

// Lazy compression helpers for large history entries
let lzModulePromise = null;
async function compressIfLarge(text, maxBytes = 5 * 1024) {
  try {
    const bytes = new TextEncoder().encode(text);
    if (bytes.length <= maxBytes) {
      return { compressed: false, data: text };
    }
    if (!lzModulePromise) lzModulePromise = import('lz-string');
    const lz = await lzModulePromise;
    const compressed = lz.compressToUTF16(text);
    return { compressed: true, data: compressed };
  } catch {
    return { compressed: false, data: text };
  }
}

async function decompressIfNeeded(entry) {
  try {
    if (!entry || typeof entry !== 'object') return '';
    if (!entry.compressed) return String(entry.data ?? '');
    if (!lzModulePromise) lzModulePromise = import('lz-string');
    const lz = await lzModulePromise;
    return lz.decompressFromUTF16(String(entry.data ?? '')) || '';
  } catch {
    return '';
  }
}


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
      onClick={() => document.getElementById('image-input').click()}
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
        id="image-input"
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
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSurpriseLoading, setIsSurpriseLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [activeStyles, setActiveStyles] = useState(new Set());
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dictatingTarget, setDictatingTarget] = useState(null);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [showStylePresets, setShowStylePresets] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const imageObjectUrlRef = useRef(null);
  const generateAbortRef = useRef(null);

  // Style presets with detailed prompts
  const stylePresets = STYLE_PRESETS;

  // Memoized values for better performance
  const recognitionRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    setIsClient(true);
  }, []);

  // Load history on mount - only on client
  useEffect(() => {
    if (!isClient) return;
    try {
      const saved = JSON.parse(localStorage.getItem('pg_history') || '[]');
      if (Array.isArray(saved)) setHistory(saved);
    } catch {}
  }, [isClient]);

  // Persist history - only on client
  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem('pg_history', JSON.stringify(history));
  }, [history, isClient]);

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
      console.error('Error during image compression:', error);
      setUploadedImage(file);
      setError('Error compressing image. Using original file.');
    } finally {
      setIsCompressing(false);
      setCompressionProgress(0);
    }
  }, []);

  const handleImageRemove = useCallback(() => {
    setUploadedImage(null);
    setImagePreview(null);
    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!idea.trim() && !uploadedImage) {
      setError('Please describe your idea or upload an image.');
      return;
    }

    // cancel in-flight request
    if (generateAbortRef.current) {
      generateAbortRef.current.abort();
      generateAbortRef.current = null;
    }
    const controller = new AbortController();
    generateAbortRef.current = controller;

    setIsLoading(true);
    setError('');
    setShowOutput(false);

    try {
      let response;
      if (uploadedImage) {
        const formData = new FormData();
        formData.append('idea', idea.trim());
        if (directions.trim()) {
          formData.append('directions', directions.trim());
        }
        formData.append('image', uploadedImage);
        formData.append('isJsonMode', String(isJsonMode));
        response = await fetch('/api/generate', { method: 'POST', body: formData, signal: controller.signal });
      } else {
        // JSON path for text-only
        response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ idea: idea.trim(), directions: directions.trim() || undefined, isJsonMode })
        });
      }

      const ct = response.headers.get('content-type') || '';
      let data;
      if (ct.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) throw new Error(text || 'Failed to generate prompt');
        // If OK but not JSON, wrap minimally
        data = { prompt: text };
      }
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to generate prompt');
      }

      const displayPrompt = isJsonMode
        ? JSON.stringify(data.prompt, null, 2)
        : (data.prompt || '').toString();

      // Compress if large for storage; keep a small preview for UI listing
      const promptEntry = await compressIfLarge(displayPrompt, 5 * 1024);
      const promptPreview = displayPrompt.length > 512
        ? displayPrompt.slice(0, 512) + '…'
        : displayPrompt;

      setGeneratedPrompt(displayPrompt);
      setShowOutput(true);

  setHistory((h) => [{
        id: Date.now(),
        idea,
        directions,
        prompt: promptPreview,
        promptEntry,
        fav: false
  }, ...h].slice(0, 50));
    } catch (err) {
  if (err.name === 'AbortError') return;
      console.error('Generation error:', err);
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
  }, [idea, directions, uploadedImage, isJsonMode]);

  const handleCopy = useCallback(async () => {
    if (!generatedPrompt || error) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [generatedPrompt, error]);

  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit, isLoading]);

  const toggleDictation = useCallback(async (target) => {
    if (typeof window === 'undefined') return;

    try {
      let SR = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SR) {
        try {
          const { SpeechRecognition: PolyfillSpeechRecognition } = await import('web-speech-cognitive-services');
          SR = PolyfillSpeechRecognition;
        } catch (polyfillError) {
          console.warn('Failed to load speech recognition polyfill:', polyfillError);
        }
      }

      if (!SR) {
        setError('Speech recognition is not supported in this browser.');
        return;
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setDictatingTarget(null);
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
        console.warn('Speech error', ev.error);
        setDictatingTarget(null);
        recognitionRef.current = null;
      };
      rec.onresult = (ev) => {
        const transcript = ev.results?.[0]?.[0]?.transcript || '';
        if (!transcript) return;
        if (target === 'idea') {
          setIdea((v) => (v ? v + ' ' : '') + transcript);
        } else if (target === 'directions') {
          setDirections((v) => (v ? v + ' ' : '') + transcript);
        }
      };
      rec.start();
    } catch (err) {
      console.error('Speech init failed', err);
      setError('Failed to start voice input.');
    }
  }, [recognitionRef]);

  const handleSurpriseMe = useCallback(async () => {
    setIsSurpriseLoading(true);
    setError('');
    setShowOutput(false);
    setIdea('');
    setDirections('');

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
      const promptEntry = await compressIfLarge(surprisePrompt, 5 * 1024);
      const promptPreview = surprisePrompt.length > 512
        ? surprisePrompt.slice(0, 512) + '…'
        : surprisePrompt;
      setGeneratedPrompt(surprisePrompt);
      setShowOutput(true);
  setHistory((h) => [{
        id: Date.now(),
        idea: 'Surprise Me',
        directions: '',
        prompt: promptPreview,
        promptEntry,
        fav: false
  }, ...h].slice(0, 50));
    } catch (err) {
      console.error('Surprise Me error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setShowOutput(true);
    } finally {
      setIsSurpriseLoading(false);
    }
  }, []);

  const handleClearAll = useCallback(() => {
    setIdea('');
    setDirections('');
    document.getElementById('idea')?.focus();
  }, []);

  const toggleFavorite = useCallback((id) => {
    setHistory((h) => h.map((e) => (e.id === id ? { ...e, fav: !e.fav } : e)));
  }, []);

  const loadEntry = useCallback((entry) => {
    setIdea(entry.idea || '');
    setDirections(entry.directions || '');
    setShowHistory(false);
    document.getElementById('idea')?.focus();
  }, []);

  const copyPrompt = useCallback(async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  }, []);

  const deleteEntry = useCallback((id) => {
    setHistory((h) => h.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Toggle style preset function
  const toggleStyle = useCallback((styleName) => {
    const stylePrompt = stylePresets[styleName];
    if (!stylePrompt) return;

    setActiveStyles(prev => {
      const newActiveStyles = new Set(prev);
      const isActive = newActiveStyles.has(styleName);

      if (isActive) {
        newActiveStyles.delete(styleName);
      } else {
        newActiveStyles.add(styleName);
      }

      return newActiveStyles;
    });

    setDirections(prev => {
      const stylePrompt = stylePresets[styleName];
      const isCurrentlyActive = activeStyles.has(styleName);

      if (isCurrentlyActive) {
        // Remove the style
        let newDirections = prev;

        // Remove the exact style prompt
        newDirections = newDirections.replace(stylePrompt, '');

        // Clean up any double commas, leading/trailing commas, and extra spaces
        newDirections = newDirections
          .replace(/,\s*,/g, ',')  // Remove double commas
          .replace(/^,\s*/, '')    // Remove leading comma
          .replace(/,\s*$/, '')    // Remove trailing comma
          .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
          .trim();

        return newDirections;
      } else {
        // Add the style
        const newDirections = prev.trim();
        if (newDirections === '') {
          return stylePrompt;
        } else {
          return newDirections + ', ' + stylePrompt;
        }
      }
    });
  }, [stylePresets, activeStyles]);

  // Smooth scroll when output appears
  useEffect(() => {
    if (showOutput) {
      requestAnimationFrame(() => {
        document.getElementById('output-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      if (generateAbortRef.current) {
        generateAbortRef.current.abort();
        generateAbortRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
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

            <main>
              <form onSubmit={handleSubmit} className="space-y-8 mb-12" onKeyDown={handleKeyDown}>
                <div>
                  <label htmlFor="idea" className="label-text">Your Idea</label>
                  <div className="relative">
                    <textarea
                      id="idea"
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      className="input-field min-h-[120px] pr-12"
                      placeholder="A futuristic city skyline at dusk..."
                      rows={4}
                      maxLength={1000}
                    />
                    <div className="absolute left-3 bottom-3 text-xs text-premium-500 select-none">Up to 1000 characters</div>
                    <button
                      type="button"
                      onClick={() => toggleDictation('idea')}
                      className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center border ${dictatingTarget === 'idea' ? 'bg-red-500/90 border-red-400 text-white' : 'bg-premium-800/60 border-premium-700 text-premium-300 hover:bg-premium-700/70'}`}
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
                      id="directions"
                      value={directions}
                      onChange={(e) => setDirections(e.target.value)}
                      className="input-field min-h-[100px] pr-12"
                      placeholder="Style: cinematic, cyberpunk. Mood: mysterious, awe-inspiring..."
                      rows={3}
                      maxLength={500}
                    />
                    <div className="absolute left-3 bottom-3 text-xs text-premium-500 select-none">Optional • up to 500 characters</div>
                    <button
                      type="button"
                      onClick={() => toggleDictation('directions')}
                      className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center border ${dictatingTarget === 'directions' ? 'bg-red-500/90 border-red-400 text-white' : 'bg-premium-800/60 border-premium-700 text-premium-300 hover:bg-premium-700/70'}`}
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
                                className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-all duration-300 border text-center ${
                                  activeStyles.has(styleName)
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
                <div id="output-section" className="animate-fade-in-up">
                  <div className="section-divider"></div>
                  <div className="output-card hover-lift">
                    <div className="flex justify-between items-center p-5 border-b border-premium-600/30">
                      <h3 className="text-lg font-semibold text-premium-100">Generated Prompt</h3>
                      {!error && generatedPrompt && (
                        <button onClick={handleCopy} className={`copy-button ${copied ? 'copied' : ''}`} title="Copy to clipboard">
                          {copied ? <CheckIcon /> : <CopyIcon />}
                        </button>
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
          </div>
          <footer className="text-center pt-12 space-y-2">
            <div className="section-divider mb-6"></div>
            <p className="text-sm text-premium-400 font-medium">Powered by OpenRouter API – Model: x-ai/grok-4-fast</p>
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
