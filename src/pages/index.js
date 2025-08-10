import { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';

// --- Icon Components ---
const CopyIcon = ({ className }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20,6 9,17 4,12"></polyline>
  </svg>
);

const HelpIcon = ({ className = "" }) => (
  <svg className={`${className} text-white`} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
  </svg>
);

const CloseIcon = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const UploadIcon = ({ className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 3a1 1 0 0 1 1 1v6h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6V4a1 1 0 0 1 1-1h6z"/>
  </svg>
);

const ImageIcon = ({ className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const MicIcon = ({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="2" width="6" height="12" rx="3"/>
    <path d="M5 10a7 7 0 0 0 14 0"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
);

const StopIcon = ({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
);

const StarIcon = ({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const StarSolidIcon = ({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21.02 7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const HistoryIcon = ({ className = '' }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    <polyline points="12 7 12 12 15 15"/>
  </svg>
);

// --- Help Modal Component ---
const HelpModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-premium-100">How to Use</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-premium-700 transition-colors" aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>
        <div className="space-y-4 text-premium-300 leading-relaxed">
          <div>
            <h4 className="font-semibold text-premium-100 mb-2">📝 Describe Your Idea</h4>
            <p>Enter your creative concept or vision in the text area. You can also just upload an image without text!</p>
          </div>
          <div>
            <h4 className="font-semibold text-premium-100 mb-2">🎯 Add Directions (Optional)</h4>
            <p>Provide specific requirements, style preferences, or any other context to refine the prompt.</p>
          </div>
          <div>
            <h4 className="font-semibold text-premium-100 mb-2">🖼️ Upload Image (Optional)</h4>
            <p><strong>Image Only:</strong> Upload an image to recreate it as closely as possible.</p>
            <p><strong>Image + Text:</strong> Upload an image with your idea/directions to modify or enhance it.</p>
          </div>
          <div>
            <h4 className="font-semibold text-premium-100 mb-2">✨ Generate & Copy</h4>
            <p>Click "Generate Prompt" to create your optimized prompt, then use the copy button to grab it.</p>
          </div>
          <div className="bg-premium-800/50 rounded-lg p-4 border border-premium-700">
            <h4 className="font-semibold text-premium-100 mb-2">⌨️ Keyboard Shortcut</h4>
            <p>Press <kbd>Ctrl + Enter</kbd> (or <kbd>Cmd + Enter</kbd> on Mac) to generate your prompt quickly!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- History Modal ---
const HistoryModal = ({ isOpen, onClose, entries, onToggleFav, onLoad, onCopy, onDelete, onClear }) => {
  useEffect(() => {
    const handleEscape = (e) => e.key === 'Escape' && onClose();
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sorted = [...entries].sort((a, b) => Number(b.fav) - Number(a.fav) || b.id - a.id);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-3xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-premium-100">History</h3>
          <div className="flex gap-2">
            {!!entries.length && (
              <button onClick={onClear} className="px-3 py-2 text-sm rounded-lg bg-premium-800/60 border border-premium-700 hover:bg-premium-700/70 text-premium-300">Clear all</button>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-premium-700 transition-colors" aria-label="Close history">
              <CloseIcon />
            </button>
          </div>
        </div>
        {!sorted.length ? (
          <p className="text-premium-400">No history yet. Generate a prompt to see it here.</p>
        ) : (
          <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
            {sorted.map((item) => (
              <div key={item.id} className="bg-premium-900/60 border border-premium-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-premium-500">
                    {new Date(item.id).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onToggleFav(item.id)} className={`w-9 h-9 flex items-center justify-center rounded-lg border ${item.fav ? 'bg-amber-500/90 border-amber-400 text-white' : 'bg-premium-800/50 border-premium-700 text-premium-300'} hover:opacity-90`} aria-label="Toggle favorite">
                      {item.fav ? <StarSolidIcon /> : <StarIcon />}
                    </button>
                    <button onClick={() => onLoad(item)} className="w-9 h-9 flex items-center justify-center rounded-lg border bg-premium-800/50 border-premium-700 text-premium-300 hover:bg-premium-700/70" aria-label="Load into editor">↺</button>
                    <button onClick={() => onCopy(item.prompt)} className="w-9 h-9 flex items-center justify-center rounded-lg border bg-premium-800/50 border-premium-700 text-premium-300 hover:bg-premium-700/70" aria-label="Copy prompt"><CopyIcon /></button>
                    <button onClick={() => onDelete(item.id)} className="w-9 h-9 flex items-center justify-center rounded-lg border bg-red-500/20 border-red-600 text-red-200 hover:bg-red-500/30" aria-label="Delete"><TrashIcon /></button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="md:col-span-1">
                    <div className="text-premium-400 mb-1">Idea</div>
                    <div className="text-premium-200/90 whitespace-pre-wrap line-clamp-4">{item.idea || '—'}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-premium-400 mb-1">Directions</div>
                    <div className="text-premium-200/90 whitespace-pre-wrap line-clamp-4">{item.directions || '—'}</div>
                  </div>
                  <div className="md:col-span-1">
                    <div className="text-premium-400 mb-1">Prompt</div>
                    <div className="text-premium-100 whitespace-pre-wrap line-clamp-4">{item.prompt}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dictatingTarget, setDictatingTarget] = useState(null); // 'idea' | 'directions' | null
  const recognitionRef = typeof window !== 'undefined' ? { current: null } : { current: null };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load history on mount
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pg_history') || '[]') : [];
      if (Array.isArray(saved)) setHistory(saved);
    } catch {}
  }, []);

  // Persist history
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pg_history', JSON.stringify(history));
    }
  }, [history]);

  // Background parallax driven by cursor/tilt
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    let rafId = 0;
    let targetX = 0;
    let targetY = 0;

    const animate = () => {
      // ease towards target for smoothness
      const currentX = parseFloat(getComputedStyle(root).getPropertyValue('--parallaxX') || '0');
      const currentY = parseFloat(getComputedStyle(root).getPropertyValue('--parallaxY') || '0');
      const nextX = currentX + (targetX - currentX) * 0.08;
      const nextY = currentY + (targetY - currentY) * 0.08;
      root.style.setProperty('--parallaxX', String(nextX));
      root.style.setProperty('--parallaxY', String(nextY));
      rafId = requestAnimationFrame(animate);
    };

    const handlePointer = (e) => {
      const { innerWidth, innerHeight } = window;
      const nx = (e.clientX / innerWidth) * 2 - 1; // [-1, 1]
      const ny = (e.clientY / innerHeight) * 2 - 1;
      targetX = nx;
      targetY = ny;
    };

    const handleOrientation = (e) => {
      // gamma: left-right (-90, 90), beta: front-back (-180, 180)
      const nx = Math.max(-1, Math.min(1, (e.gamma || 0) / 45));
      const ny = Math.max(-1, Math.min(1, (e.beta || 0) / 90));
      targetX = nx;
      targetY = ny;
    };

    // Respect reduced motion
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!reduced.matches) {
      window.addEventListener('pointermove', handlePointer, { passive: true });
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      rafId = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleImageUpload = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Image file size must be less than 10MB.');
      return;
    }

    setError('');
    setUploadedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleImageRemove = useCallback(() => {
    setUploadedImage(null);
    setImagePreview(null);
  }, []);

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
      handleImageUpload(files[0]);
    }
  }, [handleImageUpload]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!idea.trim() && !uploadedImage) {
      setError('Please describe your idea or upload an image.');
      return;
    }
    setIsLoading(true);
    setError('');
    setShowOutput(false);
    try {
      const formData = new FormData();
      formData.append('idea', idea.trim());
      if (directions.trim()) {
        formData.append('directions', directions.trim());
      }
      if (uploadedImage) {
        formData.append('image', uploadedImage);
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate prompt');
      }
      setGeneratedPrompt(data.prompt);
      setShowOutput(true);
      // Save to history (cap 100 entries)
      setHistory((h) => [{ id: Date.now(), idea, directions, prompt: data.prompt, fav: false }, ...h].slice(0, 100));
      setTimeout(() => {
        document.getElementById('output-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setShowOutput(true);
    } finally {
      setIsLoading(false);
    }
  }, [idea, directions, uploadedImage]);

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

  // Voice to prompt (Web Speech) for specific target
  const toggleDictation = useCallback((target) => {
    try {
      const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
      if (!SR) {
        setError('Speech recognition is not supported in this browser.');
        return;
      }
      // Stop if already running
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
      rec.onend = () => { setDictatingTarget(null); recognitionRef.current = null; };
      rec.onerror = (ev) => { console.warn('Speech error', ev.error); setDictatingTarget(null); recognitionRef.current = null; };
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
  }, []);

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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get a surprise prompt.');
      }
      const surprisePrompt = (data.prompt || '').toString();
      setGeneratedPrompt(surprisePrompt);
      setShowOutput(true);
      setHistory((h) => [{ id: Date.now(), idea: 'Surprise Me', directions: '', prompt: surprisePrompt, fav: false }, ...h].slice(0, 100));
      setTimeout(() => {
        document.getElementById('output-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err) {
      console.error('Surprise Me error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setShowOutput(true);
    } finally {
      setIsSurpriseLoading(false);
    }
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

  return (
    <>
      <Head>
        <title>Grok 4 Imagine Prompt Generator</title>
        <meta name="description" content="Create professional, optimized prompts for AI image generation with our premium Grok 4 Imagine prompt generator." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </Head>

      {/* --- Animated Background --- */}
      <div className="aurora-container">
        <div className="aurora-bg"></div>
        <div id="stars-1"></div>
        <div id="stars-2"></div>
        <div id="stars-3"></div>
        <div className="shooting-star shooting-star-1"></div>
        <div className="shooting-star shooting-star-2"></div>
        <div className="shooting-star shooting-star-3"></div>
      </div>

      <div className="min-h-screen py-8 px-4 sm:py-12 lg:px-8 relative z-10 flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto">
          {/* Main Card */}
          <div className={`glass-ui p-8 sm:p-12 transition-opacity duration-1000 ${mounted ? 'opacity-100 animate-slide-in' : 'opacity-0'}`}>
            <header className="text-center mb-10">
              <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
                <h1 className="text-4xl sm:text-5xl font-bold text-gradient mb-4 text-glow tracking-tight">
                  Prompt Generator
                </h1>
                <p className="text-lg text-premium-300 max-w-2xl mx-auto">
                  Transform your ideas into vivid, high-quality prompts for Grok 4 Imagine.
                </p>
              </div>
            </header>

            <main>
              <form onSubmit={handleSubmit} className="space-y-6 mb-10" onKeyDown={handleKeyDown}>
                <div>
                  <label htmlFor="idea" className="label-text">Your Idea</label>
                  <div className="relative">
                    <textarea id="idea" value={idea} onChange={(e) => setIdea(e.target.value)} className="input-field min-h-[120px] pr-12" placeholder="A futuristic city skyline at dusk..." rows={4} />
                    <button type="button" onClick={() => toggleDictation('idea')} className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center border ${dictatingTarget === 'idea' ? 'bg-red-500/90 border-red-400 text-white' : 'bg-premium-800/60 border-premium-700 text-premium-300 hover:bg-premium-700/70'}`} aria-label="Voice input for idea">
                      {dictatingTarget === 'idea' ? <StopIcon /> : <MicIcon />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="directions" className="label-text">Additional Directions <span className="optional-text">(optional)</span></label>
                  <div className="relative">
                    <textarea id="directions" value={directions} onChange={(e) => setDirections(e.target.value)} className="input-field min-h-[100px] pr-12" placeholder="Style: cinematic, cyberpunk. Mood: mysterious, awe-inspiring..." rows={3} />
                    <button type="button" onClick={() => toggleDictation('directions')} className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center border ${dictatingTarget === 'directions' ? 'bg-red-500/90 border-red-400 text-white' : 'bg-premium-800/60 border-premium-700 text-premium-300 hover:bg-premium-700/70'}`} aria-label="Voice input for directions">
                      {dictatingTarget === 'directions' ? <StopIcon /> : <MicIcon />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label-text">Upload Image <span className="optional-text">(optional)</span></label>
                  {!imagePreview ? (
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
                      <input
                        id="image-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="image-preview-container">
                      <div className="image-preview">
                        <img src={imagePreview} alt="Upload preview" className="preview-image" />
                        <button
                          type="button"
                          onClick={handleImageRemove}
                          className="image-remove-btn"
                          aria-label="Remove image"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                      <p className="text-sm text-premium-400 mt-2">{uploadedImage?.name}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={handleSurpriseMe}
                    disabled={isLoading || isSurpriseLoading}
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
                  <div className="output-card">
                    <div className="flex justify-between items-center p-4 border-b border-premium-700/50">
                      <h3 className="text-md font-semibold text-premium-200">Generated Prompt</h3>
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
                        <div className="text-base leading-relaxed text-premium-200 whitespace-pre-wrap">{generatedPrompt}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
          <footer className="text-center pt-8">
            <p className="text-xs text-premium-500 font-medium">Powered by OpenRouter API – Model: x-ai/grok-4</p>
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