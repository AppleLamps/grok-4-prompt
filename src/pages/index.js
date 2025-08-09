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

export default function Home() {
  const [idea, setIdea] = useState('');
  const [directions, setDirections] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setMounted(true);
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
                  <textarea id="idea" value={idea} onChange={(e) => setIdea(e.target.value)} className="input-field min-h-[120px]" placeholder="A futuristic city skyline at dusk..." rows={4} />
                </div>

                <div>
                  <label htmlFor="directions" className="label-text">Additional Directions <span className="optional-text">(optional)</span></label>
                  <textarea id="directions" value={directions} onChange={(e) => setDirections(e.target.value)} className="input-field min-h-[100px]" placeholder="Style: cinematic, cyberpunk. Mood: mysterious, awe-inspiring..." rows={3} />
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

                <div>
                  <button type="submit" disabled={isLoading || (!idea.trim() && !uploadedImage)} className={`premium-button ${isLoading ? 'loading' : ''}`}>
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
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}